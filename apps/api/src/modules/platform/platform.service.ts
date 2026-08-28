import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSubscriptionDto } from './platform.dto';
import { AuditService } from '../audit/audit.service';

const planMap = {
  trial: 'FREE_TRIAL',
  clinic: 'CLINIC',
  center: 'CENTER',
  enterprise: 'CENTER',
} as const;

const statusMap = {
  trial: 'TRIALING',
  active: 'ACTIVE',
  suspended: 'PAST_DUE',
  expired: 'EXPIRED',
} as const;

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listOrganizations() {
    const organizations = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, slug: true, createdAt: true,
        subscriptionPlan: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true,
        users: { where: { role: 'owner' }, select: { firstName: true, lastName: true, email: true }, take: 1 },
      },
    });
    return organizations.map(({ users, ...organization }) => ({ ...organization, owner: users[0] ?? null }));
  }

  async updateSubscription(id: string, data: UpdateSubscriptionDto, actorId: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true, subscriptionPlan: true, subscriptionStatus: true },
    });
    if (!existing) throw new NotFoundException('Clinic not found');

    const plan = planMap[data.plan as keyof typeof planMap];
    const status = statusMap[data.status as keyof typeof statusMap];
    if ((plan === 'FREE_TRIAL') !== (status === 'TRIALING')) throw new BadRequestException('Trial plan must use trial status, and paid plans must use an active or closed status.');
    const trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : null;
    const subscriptionEndsAt = data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.subscription.findFirst({ where: { organizationId: id, isCurrent: true }, orderBy: { updatedAt: 'desc' }, select: { id: true } });
      const subscription = current
        ? await tx.subscription.update({ where: { id: current.id }, data: { plan, status, trialEndsAt: plan === 'FREE_TRIAL' ? trialEndsAt : null, currentPeriodEnd: plan === 'FREE_TRIAL' ? null : subscriptionEndsAt, canceledAt: status === 'EXPIRED' ? new Date() : null } })
        : await tx.subscription.create({ data: { organizationId: id, plan, status, trialStartedAt: plan === 'FREE_TRIAL' ? new Date() : null, trialEndsAt: plan === 'FREE_TRIAL' ? trialEndsAt : null, currentPeriodStart: plan === 'FREE_TRIAL' ? null : new Date(), currentPeriodEnd: plan === 'FREE_TRIAL' ? null : subscriptionEndsAt } });

      const organization = await tx.organization.update({
        where: { id },
        data: {
          subscriptionPlan: data.plan,
          subscriptionStatus: data.status,
          trialEndsAt: plan === 'FREE_TRIAL' ? trialEndsAt : null,
          subscriptionEndsAt: plan === 'FREE_TRIAL' ? null : subscriptionEndsAt,
        },
        select: { id: true, name: true, slug: true, subscriptionPlan: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true },
      });

      await tx.subscriptionEvent.create({
        data: {
          organizationId: id,
          subscriptionId: subscription.id,
          actorId,
          action: 'subscription.manually_updated',
          summary: `Platform subscription changed from ${existing.subscriptionPlan}/${existing.subscriptionStatus} to ${data.plan}/${data.status}`,
          metadata: { previousPlan: existing.subscriptionPlan, previousStatus: existing.subscriptionStatus, nextPlan: data.plan, nextStatus: data.status },
        },
      });
      return organization;
    });

    await this.audit.log({ organizationId: id, actorId, action: 'platform.subscription_updated', entityType: 'organization', entityId: id, summary: `Platform subscription changed to ${data.plan}/${data.status}`, metadata: { plan: data.plan, status: data.status } });
    return updated;
  }
}
