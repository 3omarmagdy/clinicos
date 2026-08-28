import { ForbiddenException } from '@nestjs/common';
import { MessagingQuotaGuardService } from './messaging-quota-guard.service';

describe('MessagingQuotaGuardService', () => {
  it('allows a user without an active block', async () => {
    const prisma = { messagingQuotaViolation: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new MessagingQuotaGuardService(prisma as never);

    await expect(service.assertNotBlocked('org-1', 'user-1', 'marketing')).resolves.toBeUndefined();
  });

  it('rejects a user with an active block', async () => {
    const blockedUntil = new Date(Date.now() + 10_000);
    const prisma = { messagingQuotaViolation: { findFirst: jest.fn().mockResolvedValue({ blockedUntil }) } };
    const service = new MessagingQuotaGuardService(prisma as never);

    await expect(service.assertNotBlocked('org-1', 'user-1', 'marketing')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a temporary block on the fifth violation in the window', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { messagingQuotaViolation: { count: jest.fn().mockResolvedValue(4), create } };
    const service = new MessagingQuotaGuardService(prisma as never);

    const result = await service.record('org-1', 'user-1', 'marketing', 'marketing_monthly_limit_reached', 11);

    expect(result.blocked).toBe(true);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-1', actorId: 'user-1', channel: 'marketing', attemptedCount: 11, blockedUntil: expect.any(Date) }) }));
  });
});
