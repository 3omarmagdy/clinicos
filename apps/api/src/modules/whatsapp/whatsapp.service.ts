import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type WhatsAppApiResponse = { ok: boolean; status: number; json(): Promise<unknown> };
type ReminderResult = { appointmentId: string; status: 'sent' | 'skipped' | 'failed'; reason?: string; messageId?: string };

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsAppService');

  constructor(private readonly prisma: PrismaService) {}

  status() {
    return {
      configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_APPOINTMENT_TEMPLATE),
      templateName: process.env.WHATSAPP_APPOINTMENT_TEMPLATE || null,
      reminderLeadHours: this.reminderLeadHours(),
      monthlyMessageLimit: this.monthlyMessageLimit(),
    };
  }

  async runDueReminders(): Promise<{ windowStart: string; windowEnd: string; results: ReminderResult[] }> {
    const now = new Date();
    const leadMs = this.reminderLeadHours() * 60 * 60 * 1000;
    const windowMs = this.reminderWindowMinutes() * 60 * 1000;
    const windowStart = new Date(now.getTime() + leadMs - windowMs);
    const windowEnd = new Date(now.getTime() + leadMs + windowMs);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: windowStart, lt: windowEnd },
        status: { in: ['scheduled', 'confirmed'] },
        whatsappReminderSentAt: null,
        patient: { whatsappOptIn: true },
      },
      include: {
        patient: true,
        doctor: { select: { firstName: true, lastName: true } },
        organization: { select: { name: true, timezone: true, subscriptionPlan: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });

    const results: ReminderResult[] = [];
    for (const appointment of appointments) {
      results.push(await this.sendForAppointment(appointment));
    }
    return { windowStart: windowStart.toISOString(), windowEnd: windowEnd.toISOString(), results };
  }

  private async sendForAppointment(appointment: {
    id: string;
    organizationId: string;
    scheduledAt: Date;
    patient: { firstName: string; phone: string | null; whatsappPhone: string | null; whatsappOptIn: boolean };
    doctor: { firstName: string; lastName: string } | null;
    organization: { name: string; timezone: string; subscriptionPlan: string };
  }): Promise<ReminderResult> {
    if (!appointment.patient.whatsappOptIn) return { appointmentId: appointment.id, status: 'skipped', reason: 'patient_not_opted_in' };
    const to = this.normalizePhone(appointment.patient.whatsappPhone || appointment.patient.phone);
    if (!to) return { appointmentId: appointment.id, status: 'skipped', reason: 'missing_or_invalid_phone' };

    const config = this.configuration();
    if (!config) return { appointmentId: appointment.id, status: 'skipped', reason: 'whatsapp_not_configured' };

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const usedThisMonth = await this.prisma.appointment.count({ where: { organizationId: appointment.organizationId, whatsappReminderSentAt: { gte: currentMonthStart } } });
    const planLimit = this.monthlyLimitForPlan(appointment.organization.subscriptionPlan);
    const globalLimit = config.monthlyLimit;
    const effectiveLimit = planLimit === null ? globalLimit : globalLimit === null ? planLimit : Math.min(planLimit, globalLimit);
    if (effectiveLimit === 0) return { appointmentId: appointment.id, status: 'skipped', reason: 'whatsapp_not_included_in_plan' };
    if (effectiveLimit !== null && usedThisMonth >= effectiveLimit) return { appointmentId: appointment.id, status: 'skipped', reason: 'monthly_reminder_limit_reached' };

    const dateFormatter = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', timeStyle: 'short', timeZone: appointment.organization.timezone || 'Africa/Cairo' });
    const doctorName = appointment.doctor ? `${appointment.doctor.firstName} ${appointment.doctor.lastName}`.trim() : 'فريق العيادة';
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: config.template,
        language: { code: config.language },
        components: [{ type: 'body', parameters: [
          { type: 'text', text: appointment.patient.firstName },
          { type: 'text', text: dateFormatter.format(appointment.scheduledAt) },
          { type: 'text', text: doctorName },
          { type: 'text', text: appointment.organization.name },
        ] }],
      },
    };

    try {
      const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }) as unknown as WhatsAppApiResponse;
      const responseBody = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } };
      if (!response.ok) {
        this.logger.error(`WhatsApp delivery failed for appointment ${appointment.id}: ${response.status} ${responseBody.error?.message || 'unknown error'}`);
        return { appointmentId: appointment.id, status: 'failed', reason: 'provider_rejected_message' };
      }
      const messageId = responseBody.messages?.[0]?.id;
      await this.prisma.appointment.update({ where: { id: appointment.id }, data: { whatsappReminderSentAt: new Date(), whatsappReminderMessageId: messageId } });
      return { appointmentId: appointment.id, status: 'sent', messageId };
    } catch (error) {
      this.logger.error(`WhatsApp delivery request failed for appointment ${appointment.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { appointmentId: appointment.id, status: 'failed', reason: 'provider_request_failed' };
    }
  }

  private configuration() {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const template = process.env.WHATSAPP_APPOINTMENT_TEMPLATE;
    if (!accessToken || !phoneNumberId || !template) return null;
    return {
      accessToken,
      phoneNumberId,
      template,
      language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'ar',
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v26.0',
      monthlyLimit: this.monthlyMessageLimit(),
    };
  }

  private monthlyLimitForPlan(plan: string): number | null {
    const normalized = plan.toUpperCase();
    if (normalized === 'STARTER') return 100;
    if (normalized === 'PROFESSIONAL') return 300;
    if (normalized === 'CLINIC') return 1000;
    if (normalized === 'CENTER' || normalized === 'ENTERPRISE') return null;
    return 0;
  }

  private monthlyMessageLimit(): number | null {
    const value = Number(process.env.WHATSAPP_MONTHLY_MESSAGE_LIMIT || 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }

  private reminderLeadHours(): number {
    const value = Number(process.env.WHATSAPP_REMINDER_LEAD_HOURS || 24);
    return Number.isFinite(value) && value > 0 ? value : 24;
  }

  private reminderWindowMinutes(): number {
    // Hobby Vercel runs once per day, so the default window spans 12 hours on each side of the 24-hour target.
    const value = Number(process.env.WHATSAPP_REMINDER_WINDOW_MINUTES || 720);
    return Number.isFinite(value) && value >= 5 ? value : 15;
  }

  private normalizePhone(value?: string | null): string | null {
    if (!value) return null;
    const raw = value.trim();
    const digits = raw.replace(/\D/g, '');
    if (raw.startsWith('+') && /^\+\d{10,15}$/.test(raw.replace(/[\s()-]/g, ''))) return raw.replace(/[\s()-]/g, '');
    if (digits.startsWith('20') && digits.length === 12) return `+${digits}`;
    if (digits.startsWith('01') && digits.length === 11) return `+20${digits.slice(1)}`;
    return null;
  }
}
