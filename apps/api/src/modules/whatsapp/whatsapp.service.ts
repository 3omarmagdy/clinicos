import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CATALOG } from '../subscription/subscription.service';

type WhatsAppApiResponse = { ok: boolean; status: number; json(): Promise<unknown> };
type ReminderResult = { appointmentId: string; status: 'sent' | 'skipped' | 'failed'; reason?: string; messageId?: string };

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsAppService');

  constructor(private readonly prisma: PrismaService) {}

  async listMessages(organizationId: string) {
    return this.prisma.whatsAppMessage.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, category: true, status: true, templateName: true, failureReason: true,
        sentAt: true, deliveredAt: true, readAt: true, failedAt: true, createdAt: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    });
  }

  status() {
    return {
      enabled: process.env.WHATSAPP_SEND_ENABLED === 'true',
      configured: Boolean(process.env.WHATSAPP_SEND_ENABLED === 'true' && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_APPOINTMENT_TEMPLATE),
      templateName: process.env.WHATSAPP_APPOINTMENT_TEMPLATE || null,
      reminderLeadHours: this.reminderLeadHours(),
      monthlyMessageLimit: this.monthlyMessageLimit(),
    };
  }

  async handleWebhook(payload: unknown, rawBody: Buffer | undefined, signature?: string): Promise<{ processed: number; ignored: number }> {
    const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
    const expectedPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!appSecret || !rawBody || !signature || !this.verifyWebhookSignature(rawBody, signature, appSecret)) throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    if (!expectedPhoneNumberId || !this.isRecord(payload) || payload.object !== 'whatsapp_business_account') throw new BadRequestException('Invalid WhatsApp webhook payload');

    let processed = 0;
    let ignored = 0;
    for (const entry of this.asArray(payload.entry)) {
      if (!this.isRecord(entry)) continue;
      for (const change of this.asArray(entry.changes)) {
        if (!this.isRecord(change) || !this.isRecord(change.value)) continue;
        const value = change.value;
        const metadata = this.isRecord(value.metadata) ? value.metadata : null;
        if (metadata?.phone_number_id !== expectedPhoneNumberId) throw new UnauthorizedException('WhatsApp webhook phone number mismatch');
        for (const status of this.asArray(value.statuses)) {
          if (!this.isRecord(status) || typeof status.id !== 'string' || typeof status.status !== 'string') { ignored += 1; continue; }
          const result = await this.updateMessageStatus(status.id, status.status, status.timestamp, status.errors);
          if (result) processed += 1; else ignored += 1;
        }
      }
    }
    return { processed, ignored };
  }

  private async updateMessageStatus(providerMessageId: string, providerStatus: string, timestamp: unknown, errors: unknown): Promise<boolean> {
    const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' };
    const nextStatus = statusMap[providerStatus];
    if (!nextStatus) return false;
    const existing = await this.prisma.whatsAppMessage.findUnique({ where: { providerMessageId }, select: { id: true, status: true } });
    if (!existing) return false;
    const rank: Record<string, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 };
    if (nextStatus !== 'FAILED' && (rank[existing.status] ?? 0) > rank[nextStatus]) return true;
    const eventAt = this.webhookEventDate(timestamp);
    const data: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === 'SENT') data.sentAt = eventAt;
    if (nextStatus === 'DELIVERED') data.deliveredAt = eventAt;
    if (nextStatus === 'READ') data.readAt = eventAt;
    if (nextStatus === 'FAILED') {
      data.failedAt = eventAt;
      const firstError = this.asArray(errors)[0];
      const errorCode = this.isRecord(firstError) && typeof firstError.code === 'number' ? firstError.code : null;
      data.failureReason = errorCode ? `provider_error_${errorCode}` : 'provider_failed_message';
    }
    await this.prisma.whatsAppMessage.update({ where: { id: existing.id }, data });
    return true;
  }

  private verifyWebhookSignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
    if (!signature.startsWith('sha256=')) return false;
    const received = Buffer.from(signature.slice(7), 'hex');
    const expected = createHmac('sha256', appSecret).update(rawBody).digest();
    return received.length === expected.length && timingSafeEqual(received, expected);
  }

  private webhookEventDate(timestamp: unknown): Date {
    const seconds = typeof timestamp === 'string' ? Number(timestamp) : typeof timestamp === 'number' ? timestamp : NaN;
    return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date();
  }

  private isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
  private asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

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
    patient: { id: string; firstName: string; phone: string | null; whatsappPhone: string | null; whatsappOptIn: boolean };
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
    let message: { id: string };
    try {
      message = await this.prisma.whatsAppMessage.create({ data: { organizationId: appointment.organizationId, patientId: appointment.patient.id, appointmentId: appointment.id, category: 'utility', status: 'QUEUED', templateName: config.template } });
    } catch (error) {
      this.logger.error(`WhatsApp message audit record failed for appointment ${appointment.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { appointmentId: appointment.id, status: 'failed', reason: 'message_log_failed' };
    }

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
        await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'FAILED', failureReason: 'provider_rejected_message', failedAt: new Date() } });
        return { appointmentId: appointment.id, status: 'failed', reason: 'provider_rejected_message' };
      }
      const messageId = responseBody.messages?.[0]?.id;
      if (!messageId) {
        await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'FAILED', failureReason: 'provider_missing_message_id', failedAt: new Date() } });
        return { appointmentId: appointment.id, status: 'failed', reason: 'provider_missing_message_id' };
      }
      const sentAt = new Date();
      await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'SENT', providerMessageId: messageId, sentAt } });
      await this.prisma.appointment.update({ where: { id: appointment.id }, data: { whatsappReminderSentAt: sentAt, whatsappReminderMessageId: messageId } });
      return { appointmentId: appointment.id, status: 'sent', messageId };
    } catch (error) {
      this.logger.error(`WhatsApp delivery request failed for appointment ${appointment.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'FAILED', failureReason: 'provider_request_failed', failedAt: new Date() } });
      return { appointmentId: appointment.id, status: 'failed', reason: 'provider_request_failed' };
    }
  }

  private configuration() {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const template = process.env.WHATSAPP_APPOINTMENT_TEMPLATE;
    if (process.env.WHATSAPP_SEND_ENABLED !== 'true' || !accessToken || !phoneNumberId || !template) return null;
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
    const normalized = plan.toUpperCase() as keyof typeof PLAN_CATALOG;
    return PLAN_CATALOG[normalized]?.whatsappUtilityMessages ?? 0;
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
