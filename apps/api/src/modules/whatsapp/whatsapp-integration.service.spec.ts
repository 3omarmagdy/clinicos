import { WhatsAppIntegrationService } from './whatsapp-integration.service';

describe('WhatsAppIntegrationService', () => {
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; jest.restoreAllMocks(); });

  it('encrypts the clinic access token with separate IV/auth tag and returns safe summaries', async () => {
    process.env.WHATSAPP_ENCRYPTION_KEY = 'test-encryption-key-with-enough-entropy';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: '123456789', whatsapp_business_account: { id: 'waba-123456' } }) }) as never;
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = { whatsAppIntegration: { upsert, findUnique: jest.fn() } };
    const service = new WhatsAppIntegrationService(prisma as never);

    await service.upsert('org-1', {
      phoneNumberId: '123456789', wabaId: 'waba-123456', accessToken: 'access-token-secret', appointmentTemplate: 'clinic_appointment_reminder', marketingTemplate: 'clinic_offer_v1', enabled: false,
    });

    expect(global.fetch).toHaveBeenCalledWith('https://graph.facebook.com/v26.0/123456789?fields=id,whatsapp_business_account', { headers: { Authorization: 'Bearer access-token-secret' } });
    const create = upsert.mock.calls[0][0].create;
    expect(create.accessTokenCiphertext).not.toContain('access-token-secret');
    expect(create.accessTokenIv).toEqual(expect.any(String));
    expect(create.accessTokenAuthTag).toEqual(expect.any(String));
    expect(create.wabaId).toBe('waba-123456');
    expect(create).not.toHaveProperty('appSecretCiphertext');
    expect(create).not.toHaveProperty('webhookVerifyTokenHash');

    const record = { ...create, id: 'integration-1', createdAt: new Date(), updatedAt: new Date() };
    const findUnique = prisma.whatsAppIntegration.findUnique as jest.Mock;
    findUnique.mockResolvedValue(record);
    await expect(service.getForOrganization('org-1')).resolves.toMatchObject({ organizationId: 'org-1', wabaId: 'waba-123456', accessToken: 'access-token-secret', enabled: false });
    await expect(service.summary('org-1')).resolves.toMatchObject({ configured: true, phoneNumberId: '123456789', wabaId: 'waba-123456', enabled: false });
    expect((await service.summary('org-1') as Record<string, unknown>)).not.toHaveProperty('accessToken');
  });
});
