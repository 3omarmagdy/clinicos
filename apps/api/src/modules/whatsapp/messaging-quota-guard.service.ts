import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const WINDOW_MINUTES = 15;
const MAX_VIOLATIONS_IN_WINDOW = 5;
const BLOCK_MINUTES = 30;

type Channel = 'utility' | 'marketing';

@Injectable()
export class MessagingQuotaGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertNotBlocked(organizationId: string, actorId: string, channel: Channel) {
    const blocked = await this.prisma.messagingQuotaViolation.findFirst({
      where: { organizationId, actorId, channel, blockedUntil: { gt: new Date() } },
      orderBy: { blockedUntil: 'desc' },
      select: { blockedUntil: true },
    });
    if (blocked?.blockedUntil) throw new ForbiddenException('Messaging access is temporarily blocked after repeated quota violations. Try again later.');
  }

  async record(organizationId: string, actorId: string, channel: Channel, reason: string, attemptedCount = 1) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60_000);
    const recent = await this.prisma.messagingQuotaViolation.count({ where: { organizationId, actorId, channel, createdAt: { gte: windowStart } } });
    const blockedUntil = recent + 1 >= MAX_VIOLATIONS_IN_WINDOW ? new Date(now.getTime() + BLOCK_MINUTES * 60_000) : null;
    await this.prisma.messagingQuotaViolation.create({ data: { organizationId, actorId, channel, reason, attemptedCount, blockedUntil } });
    return { blocked: Boolean(blockedUntil), blockedUntil };
  }
}
