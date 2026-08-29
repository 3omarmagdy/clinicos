import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateMarketingCampaignDto, MarketingCampaignFiltersDto, SendMarketingCampaignDto } from './marketing.dto';
import { PLAN_CATALOG, SubscriptionService } from '../subscription/subscription.service';
import { MessagingQuotaGuardService } from './messaging-quota-guard.service';
import { WhatsAppIntegrationService } from './whatsapp-integration.service';

type ProviderResponse = { ok: boolean; status: number; json(): Promise<unknown> };
type DeliveryResult = { recipientId: string; patientId: string; status: 'sent' | 'failed' | 'skipped'; reason?: string; messageId?: string };

@Injectable()
export class WhatsAppMarketingService {
  private readonly logger = new Logger('WhatsAppMarketingService');

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly quotaGuard: MessagingQuotaGuardService, private readonly subscriptions: SubscriptionService, @Optional() private readonly integrations?: WhatsAppIntegrationService) {}

  async list(organizationId: string) {
    return this.prisma.marketingCampaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, templateName: true, offerText: true, expiresAt: true, status: true,
        createdAt: true, startedAt: true, completedAt: true,
        _count: { select: { recipients: true } },
        recipients: { where: { status: 'SENT' }, select: { id: true } },
      },
    });
  }

  async listQuotaViolations(organizationId: string) {
    return this.prisma.messagingQuotaViolation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, channel: true, reason: true, attemptedCount: true, blockedUntil: true, createdAt: true },
    });
  }

  async preview(organizationId: string, filters: MarketingCampaignFiltersDto) {
    await this.subscriptions.assertFeatureAccess(organizationId, 'marketing');
    const patients = await this.prisma.patient.findMany({
      where: this.audienceWhere(organizationId, filters),
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 10,
      select: { id: true, firstName: true, lastName: true, whatsappPhone: true, phone: true },
    });
    const total = await this.prisma.patient.count({ where: this.audienceWhere(organizationId, filters) });
    return { total, samples: patients.map((patient) => ({ id: patient.id, name: `${patient.firstName} ${patient.lastName}`.trim(), hasWhatsappNumber: Boolean(patient.whatsappPhone || patient.phone) })) };
  }

  async create(organizationId: string, actorId: string, data: CreateMarketingCampaignDto) {
    await this.subscriptions.assertFeatureAccess(organizationId, 'marketing');
    const config = await this.configuration(organizationId, false);
    if (!config || !config.template) throw new BadRequestException('WhatsApp marketing template is not configured yet');

    const service = data.serviceId ? await this.prisma.service.findFirst({ where: { id: data.serviceId, organizationId, isActive: true }, select: { id: true } }) : null;
    if (data.serviceId && !service) throw new BadRequestException('Selected service is not active in this clinic');
    const where = this.audienceWhere(organizationId, data);
    const eligiblePatients = await this.prisma.patient.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 1001,
      select: { id: true },
    });
    if (eligiblePatients.length > 1000) throw new BadRequestException('Campaign is limited to 1000 recipients per batch');
    if (!eligiblePatients.length) throw new BadRequestException('No active patients with WhatsApp marketing consent match these filters');

    const campaign = await this.prisma.marketingCampaign.create({
      data: {
        organizationId,
        serviceId: service?.id,
        createdById: actorId,
        templateName: config.template,
        offerText: data.offerText.trim(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        recipients: {
          create: eligiblePatients.map(({ id: patientId }) => ({ patientId, dedupeKey: `${organizationId}:${config.template}:${patientId}:${Date.now()}` })),
        },
      },
      select: { id: true, templateName: true, offerText: true, expiresAt: true, status: true, createdAt: true },
    });

    await this.audit.log({
      organizationId,
      actorId,
      action: 'whatsapp_marketing.campaign_created',
      entityType: 'marketing_campaign',
      entityId: campaign.id,
      summary: `Created WhatsApp marketing campaign for ${eligiblePatients.length} consented recipients`,
      metadata: { recipientCount: eligiblePatients.length, templateName: config.template },
    });
    return { ...campaign, recipientCount: eligiblePatients.length };
  }

  async send(organizationId: string, actorId: string, campaignId: string, data: SendMarketingCampaignDto) {
    if (!data.confirm) throw new BadRequestException('Explicit confirmation is required before sending');
    await this.subscriptions.assertFeatureAccess(organizationId, 'marketing');
    await this.quotaGuard.assertNotBlocked(organizationId, actorId, 'marketing');
    const config = await this.configuration(organizationId, true);
    if (!config || !config.template) throw new BadRequestException('WhatsApp marketing sending is disabled or the template is not configured/approved yet');
    const sendConfig = { ...config, template: config.template };

    const campaign = await this.prisma.marketingCampaign.findFirst({
      where: { id: campaignId, organizationId },
      include: {
        recipients: { where: { status: 'PENDING' }, take: data.maxRecipients ?? 100, orderBy: { createdAt: 'asc' }, include: { patient: true } },
        organization: { select: { name: true, subscriptionPlan: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === 'COMPLETED') throw new BadRequestException('Campaign has already completed');

    const planLimit = this.monthlyTotalLimitForPlan(campaign.organization.subscriptionPlan);
    const marketingLimit = this.monthlyMarketingLimitForPlan(campaign.organization.subscriptionPlan);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [reminderUsage, marketingUsage] = await Promise.all([
      this.prisma.appointment.count({ where: { organizationId, whatsappReminderSentAt: { gte: monthStart } } }),
      this.prisma.marketingCampaignRecipient.count({ where: { campaign: { organizationId }, status: 'SENT', sentAt: { gte: monthStart } } }),
    ]);
    const usedThisMonth = reminderUsage + marketingUsage;
    if (planLimit === 0 || marketingLimit === 0) {
      await this.quotaGuard.record(organizationId, actorId, 'marketing', 'marketing_not_included_in_plan');
      throw new BadRequestException('WhatsApp marketing is not included in the current plan');
    }
    if (marketingLimit !== null && marketingUsage >= marketingLimit) {
      await this.quotaGuard.record(organizationId, actorId, 'marketing', 'marketing_monthly_limit_reached', campaign.recipients.length);
      throw new BadRequestException('Monthly WhatsApp marketing message limit reached');
    }
    if (planLimit !== null && usedThisMonth >= planLimit) {
      await this.quotaGuard.record(organizationId, actorId, 'marketing', 'whatsapp_monthly_limit_reached', campaign.recipients.length);
      throw new BadRequestException('Monthly WhatsApp message limit reached');
    }
    const availableByMarketing = marketingLimit === null ? campaign.recipients.length : marketingLimit - marketingUsage;
    const availableByTotal = planLimit === null ? campaign.recipients.length : planLimit - usedThisMonth;
    const available = Math.min(campaign.recipients.length, availableByMarketing, availableByTotal);
    const recipients = campaign.recipients.slice(0, available);

    await this.prisma.marketingCampaign.update({ where: { id: campaign.id }, data: { status: 'SENDING', startedAt: campaign.startedAt ?? new Date() } });
    const results: DeliveryResult[] = [];
    for (const recipient of recipients) results.push(await this.sendRecipient({ ...campaign, organizationName: campaign.organization.name }, recipient, sendConfig));

    const pending = await this.prisma.marketingCampaignRecipient.count({ where: { campaignId: campaign.id, status: 'PENDING' } });
    const sent = results.filter((result) => result.status === 'sent').length;
    const failed = results.filter((result) => result.status === 'failed').length;
    const completed = pending === 0;
    await this.prisma.marketingCampaign.update({ where: { id: campaign.id }, data: { status: completed ? 'COMPLETED' : 'DRAFT', completedAt: completed ? new Date() : null } });
    await this.audit.log({
      organizationId,
      actorId,
      action: 'whatsapp_marketing.campaign_batch_sent',
      entityType: 'marketing_campaign',
      entityId: campaign.id,
      summary: `Processed WhatsApp marketing batch: ${sent} sent, ${failed} failed`,
      metadata: { attempted: results.length, sent, failed, pending, completed },
    });
    return { campaignId: campaign.id, status: completed ? 'COMPLETED' : 'DRAFT', sent, failed, pending, results };
  }

  private async sendRecipient(
    campaign: { id: string; organizationId: string; organizationName: string; offerText: string; expiresAt: Date | null },
    recipient: { id: string; patientId: string; patient: { firstName: string; whatsappPhone: string | null; phone: string | null } },
    config: { accessToken: string; phoneNumberId: string; template: string; language: string; apiVersion: string },
  ): Promise<DeliveryResult> {
    const to = this.normalizePhone(recipient.patient.whatsappPhone || recipient.patient.phone);
    if (!to) {
      await this.prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'SKIPPED', failureReason: 'missing_or_invalid_phone' } });
      return { recipientId: recipient.id, patientId: recipient.patientId, status: 'skipped', reason: 'missing_or_invalid_phone' };
    }

    let message: { id: string };
    try {
      message = await this.prisma.whatsAppMessage.create({ data: { organizationId: campaign.organizationId, patientId: recipient.patientId, campaignRecipientId: recipient.id, category: 'marketing', status: 'QUEUED', templateName: config.template } });
    } catch (error) {
      this.logger.error(`WhatsApp message audit record failed for recipient ${recipient.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      await this.prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'FAILED', failureReason: 'message_log_failed' } });
      return { recipientId: recipient.id, patientId: recipient.patientId, status: 'failed', reason: 'message_log_failed' };
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
          { type: 'text', text: recipient.patient.firstName },
          { type: 'text', text: campaign.organizationName },
          { type: 'text', text: campaign.offerText },
          { type: 'text', text: 'انتهاء المدة المحددة' },
        ] }],
      },
    };

    try {
      const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }) as unknown as ProviderResponse;
      const responseBody = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } };
      if (!response.ok) {
        this.logger.error(`WhatsApp marketing delivery failed for recipient ${recipient.id}: ${response.status} ${responseBody.error?.message || 'unknown error'}`);
        await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'FAILED', failureReason: 'provider_rejected_message', failedAt: new Date() } });
        await this.prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'FAILED', failureReason: 'provider_rejected_message' } });
        return { recipientId: recipient.id, patientId: recipient.patientId, status: 'failed', reason: 'provider_rejected_message' };
      }
      const messageId = responseBody.messages?.[0]?.id;
      if (!messageId) {
        await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'FAILED', failureReason: 'provider_missing_message_id', failedAt: new Date() } });
        await this.prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'FAILED', failureReason: 'provider_missing_message_id' } });
        return { recipientId: recipient.id, patientId: recipient.patientId, status: 'failed', reason: 'provider_missing_message_id' };
      }
      const sentAt = new Date();
      await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'SENT', providerMessageId: messageId, sentAt } });
      await this.prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'SENT', providerMessageId: messageId, sentAt } });
      return { recipientId: recipient.id, patientId: recipient.patientId, status: 'sent', messageId };
    } catch (error) {
      this.logger.error(`WhatsApp marketing request failed for recipient ${recipient.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      await this.prisma.whatsAppMessage.update({ where: { id: message.id }, data: { status: 'FAILED', failureReason: 'provider_request_failed', failedAt: new Date() } });
      await this.prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { status: 'FAILED', failureReason: 'provider_request_failed' } });
      return { recipientId: recipient.id, patientId: recipient.patientId, status: 'failed', reason: 'provider_request_failed' };
    }
  }

  private audienceWhere(organizationId: string, filters: MarketingCampaignFiltersDto): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = {
      organizationId,
      ...(filters.patientIds?.length ? { id: { in: filters.patientIds } } : {}),
      status: 'active',
      marketingConsent: true,
      whatsappMarketingOptIn: true,
      OR: [{ whatsappPhone: { not: null } }, { phone: { not: null } }],
      ...(filters.governorate ? { governorate: filters.governorate.trim() } : {}),
      ...(filters.city ? { city: filters.city.trim() } : {}),
      ...(filters.gender ? { gender: filters.gender.trim() } : {}),
      ...(filters.leadSource ? { leadSource: filters.leadSource.trim() } : {}),
    };
    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      const today = new Date();
      const range: Prisma.DateTimeNullableFilter = {};
      if (filters.minAge !== undefined) range.lte = new Date(today.getFullYear() - filters.minAge, today.getMonth(), today.getDate());
      if (filters.maxAge !== undefined) range.gte = new Date(today.getFullYear() - filters.maxAge - 1, today.getMonth(), today.getDate());
      where.dateOfBirth = range;
    }
    return where;
  }

  private monthlyTotalLimitForPlan(plan: string): number | null {
    const normalized = plan.toUpperCase() as keyof typeof PLAN_CATALOG;
    return PLAN_CATALOG[normalized]?.whatsappMonthlyMessages ?? 0;
  }

  private monthlyMarketingLimitForPlan(plan: string): number | null {
    const normalized = plan.toUpperCase() as keyof typeof PLAN_CATALOG;
    return PLAN_CATALOG[normalized]?.whatsappMarketingMessages ?? 0;
  }

  private async configuration(organizationId: string, requireEnabled = false) {
    if (this.integrations) {
      const integration = await this.integrations.getForOrganization(organizationId);
      if (!integration || (requireEnabled && (!integration.enabled || process.env.WHATSAPP_SEND_ENABLED !== 'true'))) return null;
      return { accessToken: integration.accessToken, phoneNumberId: integration.phoneNumberId, template: integration.marketingTemplate, language: integration.templateLanguage, apiVersion: integration.apiVersion };
    }
    if (process.env.NODE_ENV !== 'test') return null;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const template = process.env.WHATSAPP_MARKETING_TEMPLATE;
    if (!accessToken || !phoneNumberId || !template || (requireEnabled && process.env.WHATSAPP_SEND_ENABLED !== 'true')) return null;
    return { accessToken, phoneNumberId, template, language: process.env.WHATSAPP_MARKETING_TEMPLATE_LANGUAGE || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'ar', apiVersion: process.env.WHATSAPP_API_VERSION || 'v26.0' };
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
