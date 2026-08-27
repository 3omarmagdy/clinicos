import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService', () => {
  const originalEnv = { ...process.env };
  const appointment = {
    id: 'appointment-1',
    organizationId: 'org-1',
    scheduledAt: new Date('2026-08-28T09:00:00.000Z'),
    patient: { firstName: 'محمد', phone: '01012345678', whatsappPhone: null, whatsappOptIn: true },
    doctor: { firstName: 'أحمد', lastName: 'علي' },
    organization: { name: 'Clinicos Test Clinic', timezone: 'Africa/Cairo', subscriptionPlan: 'clinic' },
  };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('skips delivery when WhatsApp is not configured', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_APPOINTMENT_TEMPLATE;

    const prisma = {
      appointment: {
        findMany: jest.fn().mockResolvedValue([appointment]),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new WhatsAppService(prisma as never);

    const result = await service.runDueReminders();

    expect(result.results).toEqual([{ appointmentId: 'appointment-1', status: 'skipped', reason: 'whatsapp_not_configured' }]);
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('does not send to trial plans without WhatsApp entitlement', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-number-id';
    process.env.WHATSAPP_APPOINTMENT_TEMPLATE = 'clinic_appointment_reminder';
    const prisma = {
      appointment: {
        findMany: jest.fn().mockResolvedValue([{ ...appointment, organization: { ...appointment.organization, subscriptionPlan: 'trial' } }]),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new WhatsAppService(prisma as never);
    const fetchMock = jest.spyOn(global, 'fetch');

    const result = await service.runDueReminders();

    expect(result.results[0]).toMatchObject({ status: 'skipped', reason: 'whatsapp_not_included_in_plan' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends an approved template and records the provider message id', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-number-id';
    process.env.WHATSAPP_APPOINTMENT_TEMPLATE = 'clinic_appointment_reminder';
    const prisma = {
      appointment: {
        findMany: jest.fn().mockResolvedValue([appointment]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new WhatsAppService(prisma as never);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.test-1' }] }),
    } as Response);

    const result = await service.runDueReminders();

    expect(result.results[0]).toMatchObject({ status: 'sent', messageId: 'wamid.test-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v26.0/phone-number-id/messages',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }),
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appointment-1' },
      data: { whatsappReminderSentAt: expect.any(Date), whatsappReminderMessageId: 'wamid.test-1' },
    });
  });
});
