import { PLAN_CATALOG, SubscriptionService } from './subscription.service';

describe('PLAN_CATALOG WhatsApp entitlements', () => {
  it('keeps the approved monthly prices', () => {
    expect(PLAN_CATALOG.STARTER.priceEgp).toBe(449);
    expect(PLAN_CATALOG.PROFESSIONAL.priceEgp).toBe(799);
    expect(PLAN_CATALOG.CLINIC.priceEgp).toBe(1199);
  });

  it('assigns separate Utility and Marketing quotas by plan', () => {
    expect(PLAN_CATALOG.STARTER).toMatchObject({ whatsappMonthlyMessages: 100, whatsappUtilityMessages: 90, whatsappMarketingMessages: 10 });
    expect(PLAN_CATALOG.PROFESSIONAL).toMatchObject({ whatsappMonthlyMessages: 300, whatsappUtilityMessages: 270, whatsappMarketingMessages: 30 });
    expect(PLAN_CATALOG.CLINIC).toMatchObject({ whatsappMonthlyMessages: 1000, whatsappUtilityMessages: 900, whatsappMarketingMessages: 100 });
  });

  it('does not grant WhatsApp during the free trial', () => {
    expect(PLAN_CATALOG.FREE_TRIAL).toMatchObject({ whatsappMonthlyMessages: 0, whatsappUtilityMessages: 0, whatsappMarketingMessages: 0 });
  });

  it('rejects Marketing access during the free trial', async () => {
    const prisma = { subscription: { findFirst: jest.fn().mockResolvedValue({ plan: 'FREE_TRIAL', status: 'TRIALING', trialEndsAt: new Date(Date.now() + 86_400_000), currentPeriodEnd: null }) } };
    const service = new SubscriptionService(prisma as never, {} as never, {} as never);

    await expect(service.assertFeatureAccess('org-1', 'marketing')).rejects.toThrow('paid plan');
  });

  it('allows paid WhatsApp access while the subscription is active', async () => {
    const prisma = { subscription: { findFirst: jest.fn().mockResolvedValue({ plan: 'STARTER', status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: new Date(Date.now() + 86_400_000) }) } };
    const service = new SubscriptionService(prisma as never, {} as never, {} as never);

    await expect(service.assertFeatureAccess('org-1', 'whatsapp')).resolves.toBeUndefined();
  });

  it('keeps Center custom and unlimited', () => {
    expect(PLAN_CATALOG.CENTER).toMatchObject({ priceEgp: null, whatsappMonthlyMessages: null, whatsappUtilityMessages: null, whatsappMarketingMessages: null });
  });
});
