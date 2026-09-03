import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService', () => {
  const organizationId = 'clinic-a';
  const config = { get: jest.fn() };

  it('keeps audience queries tenant-scoped and returns only matching patients', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a', firstName: 'Ada', lastName: 'Patient', phone: '+201012345678', marketingConsent: true, customerType: 'regular', dateOfBirth: new Date('1990-01-01'), appointments: [] }]);
    const service = new WhatsAppService({ patient: { findMany } } as never, config as never);
    const audience = await service.audience(organizationId, { customerType: 'regular', minAge: 18, maxAge: 50 });
    expect(audience).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId, customerType: 'regular' }) }));
  });

  it('does not create marketing recipients for patients without explicit consent', async () => {
    const patientFindMany = jest.fn().mockResolvedValue([{ id: 'a', firstName: 'No', lastName: 'Consent', phone: '+201012345678', marketingConsent: false, customerType: 'regular', dateOfBirth: null, appointments: [] }]);
    const create = jest.fn();
    const service = new WhatsAppService({ whatsAppConnection: { findUnique: jest.fn().mockResolvedValue({ templateLanguage: 'ar' }) }, patient: { findMany: patientFindMany }, whatsAppCampaign: { create } } as never, config as never);
    await service.createCampaign(organizationId, 'user-a', { name: 'Offer', templateName: 'offer_template', audience: { customerType: 'regular' } });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recipients: { create: [] } }) }));
  });
});
