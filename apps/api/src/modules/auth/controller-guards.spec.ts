import 'reflect-metadata';
import { AppointmentController } from '../appointment/appointment.controller';
import { ClinicalRecordController } from '../clinical-record/clinical-record.controller';
import { PatientController } from '../patient/patient.controller';
import { PlatformController } from '../platform/platform.controller';
import { WhatsAppController } from '../whatsapp/whatsapp.controller';
import { PERMISSIONS_KEY } from './permissions.decorator';

const GUARDS_KEY = '__guards__';

function guardsFor(controller: object, method?: string): unknown[] {
  const constructor = controller as { prototype: Record<string, unknown> };
  if (method) return Reflect.getMetadata(GUARDS_KEY, constructor.prototype[method] as object) ?? [];
  return Reflect.getMetadata(GUARDS_KEY, controller) ?? [];
}

function permissionsFor(controller: object, method: string): string[] {
  const constructor = controller as { prototype: Record<string, unknown> };
  return Reflect.getMetadata(PERMISSIONS_KEY, constructor.prototype[method] as object) ?? [];
}

describe('controller authorization metadata', () => {
  it('protects appointment, clinical record, and patient controllers at class level', () => {
    for (const controller of [AppointmentController, ClinicalRecordController, PatientController]) {
      const guards = guardsFor(controller);
      expect(guards.length).toBeGreaterThanOrEqual(2);
      expect(guards.some((guard) => typeof guard === 'function')).toBe(true);
    }
  });

  it('requires PlatformAdminGuard on every platform route', () => {
    const classGuards = guardsFor(PlatformController);
    expect(classGuards.some((guard) => (guard as { name?: string })?.name?.includes('PlatformAdminGuard'))).toBe(true);
    for (const method of ['listOrganizations', 'updateSubscription', 'pendingPayments', 'reviewPayment']) {
      expect(guardsFor(PlatformController, method).length).toBeGreaterThanOrEqual(0);
    }
  });

  it('requires explicit permissions on sensitive WhatsApp routes', () => {
    const protectedRoutes: Record<string, string> = {
      testAppointmentReminder: 'appointment:update',
      sendTestReminder: 'organization:update',
      integrationSummary: 'organization:read',
      approvedTemplates: 'organization:update',
      upsertIntegration: 'organization:update',
      listMessages: 'organization:read',
      listCampaigns: 'marketing:send',
      previewCampaign: 'marketing:send',
      createCampaign: 'marketing:send',
      sendCampaign: 'marketing:send',
      status: 'organization:read',
    };
    for (const [method, permission] of Object.entries(protectedRoutes)) {
      expect(guardsFor(WhatsAppController, method).length).toBeGreaterThanOrEqual(2);
      expect(permissionsFor(WhatsAppController, method)).toContain(permission);
    }
    expect(guardsFor(WhatsAppController, 'runReminders')).toHaveLength(0);
    expect(guardsFor(WhatsAppController, 'receiveWebhook')).toHaveLength(0);
  });

  it('keeps worker and webhook routes outside user sessions by design', () => {
    expect(guardsFor(WhatsAppController, 'runReminders')).toHaveLength(0);
    expect(guardsFor(WhatsAppController, 'runRemindersFromVercelCron')).toHaveLength(0);
    expect(guardsFor(WhatsAppController, 'receiveWebhook')).toHaveLength(0);
  });
});
