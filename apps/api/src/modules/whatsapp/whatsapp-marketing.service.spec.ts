import { WhatsAppMarketingService } from './whatsapp-marketing.service';

describe('WhatsAppMarketingService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('creates a draft only from the consented WhatsApp marketing audience', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-number-id';
    process.env.WHATSAPP_MARKETING_TEMPLATE = 'clinic_offer_v1';
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([{ id: 'patient-1' }]),
        count: jest.fn(),
      },
      marketingCampaign: {
        create: jest.fn().mockResolvedValue({ id: 'campaign-1', templateName: 'clinic_offer_v1', offerText: 'خصم', expiresAt: null, status: 'DRAFT', createdAt: new Date() }),
        findMany: jest.fn(),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new WhatsAppMarketingService(prisma as never, audit as never);

    const result = await service.create('org-1', 'owner-1', { offerText: 'خصم 20%' });

    expect(result).toMatchObject({ id: 'campaign-1', recipientCount: 1 });
    expect(prisma.marketingCampaign.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ templateName: 'clinic_offer_v1', recipients: { create: [expect.objectContaining({ patientId: 'patient-1' })] } }),
    }));
  });

  it('sends one approved marketing template and records its provider id', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-number-id';
    process.env.WHATSAPP_MARKETING_TEMPLATE = 'clinic_offer_v1';
    const prisma = {
      patient: { findMany: jest.fn(), count: jest.fn() },
      appointment: { count: jest.fn().mockResolvedValue(0) },
      marketingCampaign: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'campaign-1', organizationId: 'org-1', offerText: 'خصم 20%', expiresAt: null, status: 'DRAFT', startedAt: null,
          organization: { name: 'عيادة الاختبار', subscriptionPlan: 'clinic' },
          recipients: [{ id: 'recipient-1', patientId: 'patient-1', patient: { firstName: 'محمد', whatsappPhone: '01012345678', phone: null } }],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      marketingCampaignRecipient: {
        count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new WhatsAppMarketingService(prisma as never, audit as never);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.marketing-1' }] }) } as Response);

    const result = await service.send('org-1', 'owner-1', 'campaign-1', { confirm: true, maxRecipients: 1 });

    expect(result).toMatchObject({ sent: 1, failed: 0, pending: 0 });
    expect(fetchMock).toHaveBeenCalledWith('https://graph.facebook.com/v26.0/phone-number-id/messages', expect.objectContaining({ method: 'POST' }));
    expect(prisma.marketingCampaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'recipient-1' }, data: expect.objectContaining({ status: 'SENT', providerMessageId: 'wamid.marketing-1' }) }));
  });
});
