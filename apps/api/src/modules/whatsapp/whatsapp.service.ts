import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpsertWhatsAppConnectionDto, WhatsAppAudienceDto } from './whatsapp.dto';

type MetaSendResult = { id: string };

@Injectable()
export class WhatsAppService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

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
    return { connected: true, phoneNumberId: connection.phoneNumberId, businessAccountId: connection.businessAccountId, isEnabled: connection.isEnabled, lastError: connection.lastError, appointmentTemplate: connection.appointmentTemplate, marketingTemplate: connection.marketingTemplate, templateLanguage: connection.templateLanguage, reminderHoursBefore: connection.reminderHoursBefore };
  }

  async upsertConnection(organizationId: string, dto: UpsertWhatsAppConnectionDto) {
    const current = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    const values = { phoneNumberId: dto.phoneNumberId, businessAccountId: dto.businessAccountId, accessTokenCiphertext: this.encrypt(dto.accessToken), apiVersion: dto.apiVersion ?? 'v21.0', appointmentTemplate: dto.appointmentTemplate, marketingTemplate: dto.marketingTemplate, templateLanguage: dto.templateLanguage ?? 'ar', reminderHoursBefore: dto.reminderHoursBefore ?? 24, isEnabled: dto.isEnabled ?? false, lastError: null };
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

  async listCampaigns(organizationId: string) { return this.prisma.whatsAppCampaign.findMany({ where: { organizationId }, include: { _count: { select: { recipients: true } } }, orderBy: { createdAt: 'desc' } }); }

  private async sendTemplate(connection: { apiVersion: string; phoneNumberId: string; accessTokenCiphertext: string }, phone: string, templateName: string, language: string): Promise<MetaSendResult> {
    const response = await fetch(`https://graph.facebook.com/${connection.apiVersion}/${connection.phoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${this.decrypt(connection.accessTokenCiphertext)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'template', template: { name: templateName, language: { code: language } } }) });
    const body = await response.json() as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (!response.ok || !body.messages?.[0]?.id) throw new Error(body.error?.message ?? `Meta request failed (${response.status})`);
    return { id: body.messages[0].id };
  }

  async sendCampaign(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.whatsAppCampaign.findFirst({ where: { id: campaignId, organizationId }, include: { recipients: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (!['draft', 'scheduled'].includes(campaign.status)) throw new ConflictException('Campaign cannot be sent in its current status');
    const connection = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!connection?.isEnabled) throw new ConflictException('WhatsApp sending is disabled');
    await this.prisma.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: 'sending' } });
    for (const recipient of campaign.recipients) {
      try { const result = await this.sendTemplate(connection, recipient.phone, campaign.templateName, campaign.templateLanguage); await this.prisma.whatsAppCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'sent', providerMessageId: result.id, sentAt: new Date() } }); }
      catch (error) { await this.prisma.whatsAppCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'failed', failureCode: error instanceof Error ? error.message.slice(0, 500) : 'Unknown provider error' } }); }
    }
    return this.prisma.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: 'completed', sentAt: new Date() }, include: { _count: { select: { recipients: true } } } });
  }
}
