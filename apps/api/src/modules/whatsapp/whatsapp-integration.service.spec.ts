import { WhatsAppIntegrationService } from './whatsapp-integration.service';

describe('WhatsAppIntegrationService', () => {
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; jest.restoreAllMocks(); });

  it('encrypts credentials and returns only safe integration summaries', async () => {
    process.env.WHATSAPP_ENCRYPTION_KEY = 'test-encryption-key-with-enough-entropy';
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = { whatsAppIntegration: { upsert, findUnique: jest.fn() } };
    const service = new WhatsAppIntegrationService(prisma as never);

    await service.upsert('org-1', {
      phoneNumberId: '123456789', accessToken: 'access-token-secret', appSecret: 'app-secret-value', webhookVerifyToken: 'verify-token-value-long', appointmentTemplate: 'clinic_appointment_reminder', marketingTemplate: 'clinic_offer_v1', enabled: false,
    });

    const create = upsert.mock.calls[0][0].create;
    expect(create.accessTokenCiphertext).not.toContain('access-token-secret');
    expect(create.appSecretCiphertext).not.toContain('app-secret-value');
    expect(create.webhookVerifyTokenHash).not.toContain('verify-token-value-long');

    const record = { ...create, id: 'integration-1', createdAt: new Date(), updatedAt: new Date() };
    const findUnique = prisma.whatsAppIntegration.findUnique as jest.Mock;
    findUnique.mockResolvedValue(record);
    await expect(service.getForOrganization('org-1')).resolves.toMatchObject({ organizationId: 'org-1', accessToken: 'access-token-secret', appSecret: 'app-secret-value', enabled: false });
    await expect(service.summary('org-1')).resolves.toMatchObject({ configured: true, phoneNumberId: '123456789', enabled: false });
    expect((await service.summary('org-1') as Record<string, unknown>)).not.toHaveProperty('accessToken');
  });
});
