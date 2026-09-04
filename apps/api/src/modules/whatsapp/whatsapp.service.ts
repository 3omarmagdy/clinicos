import { ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpsertWhatsAppConnectionDto, WhatsAppAudienceDto } from './whatsapp.dto';

type MetaSendResult = { id: string };
type MetaWebhookValue = {
  metadata?: { phone_number_id?: string };
  statuses?: Array<{ id?: string; status?: string; errors?: unknown[] }>;
  messages?: Array<{ id?: string; from?: string; type?: string }>;
};
type MetaWebhookPayload = { entry?: Array<{ changes?: Array<{ value?: MetaWebhookValue }> }> };

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private workerTimer?: NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.config.get<string>('WHATSAPP_WORKER_ENABLED') !== 'true') return;
    this.workerTimer = setInterval(() => { void this.runWorkerCycle(); }, 30_000);
    void this.runWorkerCycle();
  }
  onModuleDestroy() { if (this.workerTimer) clearInterval(this.workerTimer); }
  async runWorkerCycle() { try { await this.enqueueScheduledCampaigns(); await this.processReminderSchedule(); await this.processQueue(); await this.processReminderQueue(); } catch (error) { this.logger.error('WhatsApp worker cycle failed', error instanceof Error ? error.stack : undefined); } }

  private encryptionKey(): Buffer {
    const value = this.config.get<string>('WHATSAPP_TOKEN_ENCRYPTION_KEY');
    if (!value) throw new ServiceUnavailableException('WhatsApp secure storage is not configured');
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32) throw new ServiceUnavailableException('WhatsApp secure storage key is invalid');
    return key;
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
  }

  private decrypt(value: string): string {
    const [ivText, tagText, cipherText] = value.split('.');
    if (!ivText || !tagText || !cipherText) throw new ServiceUnavailableException('Stored WhatsApp credentials are invalid');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(ivText, 'base64'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(cipherText, 'base64')), decipher.final()]).toString('utf8');
  }

  private normalizePhone(phone: string | null): string | null {
    if (!phone) return null;
    let digits = phone.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (/^01[0125]\d{8}$/.test(digits)) digits = `20${digits.slice(1)}`;
    return /^\d{8,15}$/.test(digits) ? digits : null;
  }

  async status(organizationId: string) {
    const connection = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!connection) return { connected: false };
    return { connected: true, phoneNumberId: connection.phoneNumberId, businessAccountId: connection.businessAccountId, isEnabled: connection.isEnabled, lastError: connection.lastError, appointmentTemplate: connection.appointmentTemplate, marketingTemplate: connection.marketingTemplate, templateLanguage: connection.templateLanguage, reminderHoursBefore: connection.reminderHoursBefore, remindersEnabled: connection.remindersEnabled };
  }

  async upsertConnection(organizationId: string, dto: UpsertWhatsAppConnectionDto) {
    const current = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!dto.accessToken && !current) throw new ConflictException('Access Token is required for a new WhatsApp connection');
    const values = { phoneNumberId: dto.phoneNumberId, businessAccountId: dto.businessAccountId, accessTokenCiphertext: dto.accessToken ? this.encrypt(dto.accessToken) : current!.accessTokenCiphertext, apiVersion: dto.apiVersion ?? 'v21.0', appointmentTemplate: dto.appointmentTemplate, marketingTemplate: dto.marketingTemplate, templateLanguage: dto.templateLanguage ?? 'ar', reminderHoursBefore: dto.reminderHoursBefore ?? 24, remindersEnabled: dto.remindersEnabled ?? false, isEnabled: dto.isEnabled ?? false, lastError: null };
    await this.prisma.whatsAppConnection.upsert({ where: { organizationId }, create: { organizationId, ...values }, update: values });
    return { ...(await this.status(organizationId)), updated: Boolean(current) };
  }

  async disconnect(organizationId: string) { await this.prisma.whatsAppConnection.deleteMany({ where: { organizationId } }); return { connected: false }; }

  private ageOn(dateOfBirth: Date, now = new Date()) { const age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear(); return age - (now < new Date(Date.UTC(now.getUTCFullYear(), dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate())) ? 1 : 0); }

  async audience(organizationId: string, filters: WhatsAppAudienceDto) {
    const patients = await this.prisma.patient.findMany({ where: { organizationId, status: 'active', ...(filters.customerType && filters.customerType !== 'all' ? { customerType: filters.customerType } : {}), ...(filters.gender ? { gender: { equals: filters.gender, mode: 'insensitive' } } : {}), ...(filters.tag ? { tags: { some: { name: { equals: filters.tag, mode: 'insensitive' } } } } : {}) }, include: { appointments: { include: { service: true }, orderBy: { scheduledAt: 'desc' } } }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
    const now = new Date();
    return patients.filter((patient) => {
      const age = patient.dateOfBirth ? this.ageOn(patient.dateOfBirth, now) : null;
      if (filters.minAge !== undefined && (age === null || age < filters.minAge)) return false;
      if (filters.maxAge !== undefined && (age === null || age > filters.maxAge)) return false;
      const upcoming = patient.appointments.some((item) => item.status === 'booked' && item.scheduledAt >= now);
      const missed = patient.appointments.some((item) => item.status === 'missed');
      const completed = patient.appointments.some((item) => item.status === 'completed');
      if (filters.appointment === 'upcoming' && !upcoming) return false;
      if (filters.appointment === 'none_upcoming' && upcoming) return false;
      if (filters.appointment === 'missed' && !missed) return false;
      if (filters.appointment === 'completed' && !completed) return false;
      if (filters.serviceId && !patient.appointments.some((item) => item.serviceId === filters.serviceId)) return false;
      const latest = patient.appointments[0]?.scheduledAt;
      if (filters.lastVisit && filters.lastVisit !== 'any') {
        if (!latest) return filters.lastVisit === 'over_6m';
        const days = (now.getTime() - latest.getTime()) / 86_400_000;
        const max = { '7d': 7, '30d': 30, '3m': 90, '6m': 180 }[filters.lastVisit];
        if (filters.lastVisit === 'over_6m' ? days <= 180 : days > (max ?? 0)) return false;
      }
      return true;
    }).map((patient) => ({ id: patient.id, name: `${patient.firstName} ${patient.lastName}`, phone: patient.phone, marketingConsent: patient.marketingConsent, customerType: patient.customerType }));
  }

  async createCampaign(organizationId: string, userId: string, dto: CreateCampaignDto) {
    const connection = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!connection) throw new ConflictException('Connect WhatsApp before creating a campaign');
    const selected = await this.audience(organizationId, dto.audience);
    const recipients = selected.filter((patient) => patient.marketingConsent && this.normalizePhone(patient.phone));
    return this.prisma.whatsAppCampaign.create({ data: { organizationId, createdById: userId, name: dto.name, templateName: dto.templateName, templateLanguage: dto.templateLanguage ?? connection.templateLanguage, audience: dto.audience as Prisma.InputJsonValue, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined, status: dto.scheduledAt ? 'scheduled' : 'draft', recipients: { create: recipients.map((patient) => ({ patientId: patient.id, phone: this.normalizePhone(patient.phone)! })) } }, include: { _count: { select: { recipients: true } } } });
  }

  async listCampaigns(organizationId: string) {
    const campaigns = await this.prisma.whatsAppCampaign.findMany({ where: { organizationId }, include: { recipients: { select: { status: true } } }, orderBy: { createdAt: 'desc' } });
    return campaigns.map(({ recipients, ...campaign }) => ({ ...campaign, analytics: recipients.reduce<Record<string, number>>((totals, recipient) => ({ ...totals, [recipient.status]: (totals[recipient.status] ?? 0) + 1 }), { recipients: recipients.length, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0 }) }));
  }

  private async sendTemplate(connection: { apiVersion: string; phoneNumberId: string; accessTokenCiphertext: string }, phone: string, templateName: string, language: string): Promise<MetaSendResult> {
    const response = await fetch(`https://graph.facebook.com/${connection.apiVersion}/${connection.phoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${this.decrypt(connection.accessTokenCiphertext)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'template', template: { name: templateName, language: { code: language } } }) });
    const body = await response.json() as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (!response.ok || !body.messages?.[0]?.id) throw new Error(body.error?.message ?? `Meta request failed (${response.status})`);
    return { id: body.messages[0].id };
  }

  async sendCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.whatsAppCampaign.findFirst({ where: { id: campaignId, organizationId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (!['draft', 'scheduled'].includes(campaign.status)) throw new ConflictException('Campaign cannot be sent in its current status');
    const connection = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!connection?.isEnabled) throw new ConflictException('WhatsApp sending is disabled');
    return this.prisma.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: 'sending', queueStartedAt: new Date(), scheduledAt: new Date(), recipients: { updateMany: { where: { status: 'pending' }, data: { nextAttemptAt: new Date() } } } } });
  }

  private retryAt(attempts: number) { return new Date(Date.now() + Math.min(60 * 60_000, (2 ** Math.min(attempts, 8)) * 1_000)); }
  private isRetryable(error: string) { return /timeout|temporar|rate|429|5\d\d|network/i.test(error); }

  /** Database-backed worker. Safe to run frequently and after process restarts. */
  async processQueue(limit = 20) {
    const now = new Date();
    const due = await this.prisma.whatsAppCampaignRecipient.findMany({ where: { status: 'pending', nextAttemptAt: { lte: now }, OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }] }, include: { campaign: true }, take: limit, orderBy: { nextAttemptAt: 'asc' } });
    for (const candidate of due) {
      const claimed = await this.prisma.whatsAppCampaignRecipient.updateMany({ where: { id: candidate.id, status: 'pending', OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }] }, data: { lockedAt: now, attempts: { increment: 1 } } });
      if (claimed.count !== 1) continue;
      const connection = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId: candidate.campaign.organizationId } });
      try {
        if (!connection?.isEnabled) throw new Error('WhatsApp account disconnected');
        const result = await this.sendTemplate(connection, candidate.phone, candidate.campaign.templateName, candidate.campaign.templateLanguage);
        await this.prisma.$transaction([
          this.prisma.whatsAppCampaignRecipient.update({ where: { id: candidate.id }, data: { status: 'sent', providerMessageId: result.id, sentAt: new Date(), lockedAt: null, lastError: null } }),
          this.prisma.whatsAppMessage.upsert({ where: { providerMessageId: result.id }, create: { organizationId: candidate.campaign.organizationId, patientId: candidate.patientId, campaignRecipientId: candidate.id, direction: 'outbound', providerMessageId: result.id, status: 'sent', payload: { campaignId: candidate.campaignId } }, update: { status: 'sent' } }),
        ]);
      } catch (error) {
        const reason = error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp API error';
        const retry = candidate.attempts + 1 < 5 && this.isRetryable(reason);
        await this.prisma.whatsAppCampaignRecipient.update({ where: { id: candidate.id }, data: retry ? { lockedAt: null, lastError: reason, nextAttemptAt: this.retryAt(candidate.attempts + 1) } : { status: 'failed', failureCode: reason, lastError: reason, lockedAt: null } });
      }
    }
    await this.completeFinishedCampaigns();
    return { processed: due.length };
  }

  private async completeFinishedCampaigns() {
    const sending = await this.prisma.whatsAppCampaign.findMany({ where: { status: 'sending' }, include: { recipients: { select: { status: true } } } });
    await Promise.all(sending.filter((campaign) => campaign.recipients.length > 0 && campaign.recipients.every((recipient) => ['sent', 'delivered', 'read', 'failed', 'skipped'].includes(recipient.status))).map((campaign) => this.prisma.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: 'completed', sentAt: new Date() } })));
  }

  async enqueueScheduledCampaigns() {
    const campaigns = await this.prisma.whatsAppCampaign.findMany({ where: { status: 'scheduled', scheduledAt: { lte: new Date() } } });
    for (const campaign of campaigns) await this.prisma.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: 'sending', queueStartedAt: new Date(), recipients: { updateMany: { where: { status: 'pending' }, data: { nextAttemptAt: new Date() } } } } });
    return campaigns.length;
  }

  async processReminderSchedule() {
    const connections = await this.prisma.whatsAppConnection.findMany({ where: { isEnabled: true, remindersEnabled: true, appointmentTemplate: { not: null } }, include: { organization: true } });
    let queued = 0;
    for (const connection of connections) {
      const until = new Date(Date.now() + (connection.reminderHoursBefore * 60 * 60_000) + 5 * 60_000);
      const after = new Date(Date.now() + (connection.reminderHoursBefore * 60 * 60_000) - 5 * 60_000);
      const appointments = await this.prisma.appointment.findMany({ where: { organizationId: connection.organizationId, status: 'booked', reminderSentAt: null, scheduledAt: { gte: after, lte: until }, patient: { marketingConsent: true } }, include: { patient: true } });
      for (const appointment of appointments) {
        const phone = this.normalizePhone(appointment.patient.phone); if (!phone) continue;
        const existing = await this.prisma.whatsAppMessage.findFirst({ where: { appointmentId: appointment.id, direction: 'outbound' }, select: { id: true } });
        if (existing) continue;
        try {
          await this.prisma.whatsAppMessage.create({ data: { organizationId: connection.organizationId, patientId: appointment.patientId, appointmentId: appointment.id, direction: 'outbound', status: 'pending', payload: { type: 'appointment_reminder', phone, templateName: connection.appointmentTemplate, language: connection.templateLanguage } } });
          queued++;
        } catch (error) {
          if (!(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')) throw error;
        }
      }
    }
    return queued;
  }

  private async processReminderQueue(limit = 20) {
    const messages = await this.prisma.whatsAppMessage.findMany({ where: { direction: 'outbound', status: 'pending', appointmentId: { not: null } }, include: { patient: true }, take: limit, orderBy: { createdAt: 'asc' } });
    for (const message of messages) {
      const payload = message.payload as { phone?: string; templateName?: string; language?: string };
      const phone = payload.phone ?? this.normalizePhone(message.patient?.phone ?? null);
      if (!phone || !payload.templateName) { await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'failed', payload: { ...payload, error: 'Invalid phone number or template' } } }); continue; }
      const connection = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId: message.organizationId } });
      try {
        if (!connection?.isEnabled) throw new Error('WhatsApp account disconnected');
        const result = await this.sendTemplate(connection, phone, payload.templateName, payload.language ?? connection.templateLanguage);
        await this.prisma.$transaction([
          this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'sent', providerMessageId: result.id } }),
          ...(message.appointmentId ? [this.prisma.appointment.update({ where: { id: message.appointmentId }, data: { reminderSentAt: new Date() } })] : []),
        ]);
      } catch (error) {
        const reason = error instanceof Error ? error.message.slice(0, 500) : 'WhatsApp API error';
        await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'failed', payload: { ...payload, error: reason } } });
      }
    }
    return messages.length;
  }

  /** Queue and immediately process one reminder from the test button. */
  async sendReminderTest(organizationId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      include: { patient: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.reminderSentAt) throw new ConflictException('A reminder was already sent for this appointment');
    const connection = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!connection?.isEnabled) throw new ConflictException('WhatsApp sending is disabled');
    if (!connection.appointmentTemplate) throw new ConflictException('Appointment template is not configured');
    if (!appointment.patient.marketingConsent) throw new ConflictException('Patient has not granted WhatsApp consent');
    const phone = this.normalizePhone(appointment.patient.phone);
    if (!phone) throw new ConflictException('Patient phone number is invalid');
    const message = await this.prisma.whatsAppMessage.create({
      data: {
        organizationId,
        patientId: appointment.patientId,
        appointmentId,
        direction: 'outbound',
        status: 'pending',
        payload: { type: 'appointment_reminder', phone, templateName: connection.appointmentTemplate, language: connection.templateLanguage },
      },
    });
    await this.processReminderQueue(1);
    return this.prisma.whatsAppMessage.findUnique({ where: { id: message.id } });
  }

  async handleWebhook(payload: unknown) {
    const entries = (payload as MetaWebhookPayload)?.entry ?? [];
    for (const entry of entries) for (const change of entry.changes ?? []) {
      const value = change.value; const phoneNumberId = value?.metadata?.phone_number_id; if (!phoneNumberId) continue;
      const connection = await this.prisma.whatsAppConnection.findFirst({ where: { phoneNumberId } }); if (!connection) continue;
      for (const status of value?.statuses ?? []) {
        if (!status.id || !['sent', 'delivered', 'read', 'failed'].includes(status.status ?? '')) continue;
        const timestamp = new Date(); const update = status.status === 'delivered' ? { status: 'delivered', deliveredAt: timestamp } : status.status === 'read' ? { status: 'read', readAt: timestamp } : status.status === 'failed' ? { status: 'failed', failureCode: JSON.stringify(status.errors ?? []).slice(0, 500) } : { status: 'sent' };
        await this.prisma.$transaction([
          this.prisma.whatsAppCampaignRecipient.updateMany({ where: { providerMessageId: status.id }, data: update }),
          this.prisma.whatsAppMessage.updateMany({ where: { organizationId: connection.organizationId, providerMessageId: status.id }, data: { status: status.status! } }),
        ]);
      }
      for (const message of value?.messages ?? []) if (message.id) await this.prisma.whatsAppMessage.upsert({ where: { providerMessageId: message.id }, create: { organizationId: connection.organizationId, direction: 'inbound', providerMessageId: message.id, status: 'received', payload: message as Prisma.InputJsonValue }, update: {} });
    }
    await this.completeFinishedCampaigns();
  }
}
