import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSubscriptionDto } from './platform.dto';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

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

  async updateSubscription(id: string, data: UpdateSubscriptionDto) {
    const existing = await this.prisma.organization.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Clinic not found');
    return this.prisma.organization.update({
      where: { id },
      data: {
        subscriptionPlan: data.plan,
        subscriptionStatus: data.status,
        trialEndsAt: data.trialEndsAt === undefined ? undefined : data.trialEndsAt ? new Date(data.trialEndsAt) : null,
        subscriptionEndsAt: data.subscriptionEndsAt === undefined ? undefined : data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt) : null,
      },
      select: { id: true, name: true, slug: true, subscriptionPlan: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true },
    });
  }
}
