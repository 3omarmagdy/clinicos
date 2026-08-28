import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateManualPaymentDto, ReviewPaymentDto } from './subscription.dto';
import { EmailService } from '../auth/email.service';

type LimitKey = 'users' | 'doctors' | 'patients' | 'appointments' | 'branches';
type PlanName = 'FREE_TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'CLINIC' | 'CENTER';

export type PlanCatalogEntry = { label: string; priceEgp: number | null; whatsappMonthlyMessages: number | null; whatsappUtilityMessages: number | null; whatsappMarketingMessages: number | null; limits: Record<LimitKey, number | null> };

export const PLAN_CATALOG: Record<PlanName, PlanCatalogEntry> = {
  FREE_TRIAL: { label: 'تجربة مجانية', priceEgp: 0, whatsappMonthlyMessages: 0, whatsappUtilityMessages: 0, whatsappMarketingMessages: 0, limits: { users: 2, doctors: 1, patients: 50, appointments: 50, branches: 1 } },
  STARTER: { label: 'Starter', priceEgp: 449, whatsappMonthlyMessages: 100, whatsappUtilityMessages: 90, whatsappMarketingMessages: 10, limits: { users: 2, doctors: 1, patients: 500, appointments: 300, branches: 1 } },
  PROFESSIONAL: { label: 'Professional', priceEgp: 799, whatsappMonthlyMessages: 300, whatsappUtilityMessages: 270, whatsappMarketingMessages: 30, limits: { users: 5, doctors: 2, patients: 2000, appointments: null, branches: 1 } },
  CLINIC: { label: 'Clinic', priceEgp: 1199, whatsappMonthlyMessages: 1000, whatsappUtilityMessages: 900, whatsappMarketingMessages: 100, limits: { users: 10, doctors: 5, patients: null, appointments: null, branches: 1 } },
  CENTER: { label: 'Center', priceEgp: null, whatsappMonthlyMessages: null, whatsappUtilityMessages: null, whatsappMarketingMessages: null, limits: { users: null, doctors: null, patients: null, appointments: null, branches: null } },
};

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly email: EmailService) {}

  private legacyPlan(plan: string): PlanName {
    const value = plan.toUpperCase();
    if (value === 'TRIAL') return 'FREE_TRIAL';
    if (value === 'ENTERPRISE') return 'CENTER';
    return (value in PLAN_CATALOG ? value : 'FREE_TRIAL') as PlanName;
  }

  private async ensureCurrent(organizationId: string) {
    const current = await this.prisma.subscription.findFirst({ where: { organizationId, isCurrent: true }, orderBy: { updatedAt: 'desc' } });
    if (current) return current;
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { subscriptionPlan: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true } });
    if (!organization) throw new NotFoundException('Clinic not found');
    const plan = this.legacyPlan(organization.subscriptionPlan);
    const status: 'ACTIVE' | 'EXPIRED' | 'TRIALING' = organization.subscriptionStatus === 'active' ? 'ACTIVE' : organization.subscriptionStatus === 'expired' ? 'EXPIRED' : 'TRIALING';
    return this.prisma.subscription.create({ data: { organizationId, plan, status, trialStartedAt: plan === 'FREE_TRIAL' ? new Date() : null, trialEndsAt: plan === 'FREE_TRIAL' ? organization.trialEndsAt : null, currentPeriodEnd: plan === 'FREE_TRIAL' ? null : organization.subscriptionEndsAt } });
  }

  private async resolveStatus(organizationId: string) {
    const subscription = await this.ensureCurrent(organizationId);
    if (subscription.status === 'TRIALING' && subscription.trialEndsAt && subscription.trialEndsAt <= new Date()) {
      const expired = await this.prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'EXPIRED' } });
      await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: 'expired' } });
      return expired;
    }
    if (subscription.status === 'ACTIVE' && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= new Date()) return this.prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'PAST_DUE' } });
    return subscription;
  }

  async paymentInstructions() {
    return {
      bankName: process.env.PAYMENT_BANK_NAME || '',
      accountName: process.env.PAYMENT_ACCOUNT_NAME || '',
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || '',
      iban: process.env.PAYMENT_IBAN || '',
      swiftCode: process.env.PAYMENT_SWIFT_CODE || '',
      instapayAddress: process.env.PAYMENT_INSTAPAY_ADDRESS || '',
      instapayLink: process.env.PAYMENT_INSTAPAY_LINK || '',
      emoneyPhone: process.env.PAYMENT_EMONEY_PHONE || '',
      emoneyAppLink: process.env.PAYMENT_EMONEY_APP_LINK || '',
      reviewWindow: process.env.PAYMENT_REVIEW_WINDOW || 'تتم مراجعة الطلب خلال أيام العمل بعد التحقق من التحويل.',
      note: process.env.PAYMENT_INSTRUCTIONS_NOTE || 'لا ترسل كلمة المرور أو PIN أو OTP أو بيانات البطاقة. أدخل رقم العملية فقط.',
    };
  }

  async current(organizationId: string) {
    const subscription = await this.resolveStatus(organizationId);
    const catalog = PLAN_CATALOG[subscription.plan as PlanName];
    const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [users, doctors, patients, appointments, branches, whatsappMessages, marketingMessages] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, status: 'active' } }),
      this.prisma.user.count({ where: { organizationId, status: 'active', role: 'doctor' } }),
      this.prisma.patient.count({ where: { organizationId } }),
      this.prisma.appointment.count({ where: { organizationId, scheduledAt: { gte: monthStart, lt: nextMonth } } }),
      this.prisma.location.count({ where: { organizationId, status: 'active' } }),
      this.prisma.appointment.count({ where: { organizationId, whatsappReminderSentAt: { gte: monthStart, lt: nextMonth } } }),
      this.prisma.marketingCampaignRecipient.count({ where: { campaign: { organizationId }, status: 'SENT', sentAt: { gte: monthStart, lt: nextMonth } } }),
    ]);
    return { ...subscription, catalog, limits: catalog.limits, usage: { users, doctors, patients, appointments, branches, whatsappMessages: whatsappMessages + marketingMessages, whatsappUtilityMessages: whatsappMessages, whatsappMarketingMessages: marketingMessages }, readOnly: ['EXPIRED', 'PAST_DUE', 'CANCELED'].includes(subscription.status), remainingTrialDays: subscription.trialEndsAt ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / 86_400_000)) : null };
  }

  async assertCanWrite(organizationId: string): Promise<void> {
    const subscription = await this.resolveStatus(organizationId);
    if (['EXPIRED', 'PAST_DUE', 'CANCELED'].includes(subscription.status)) throw new ForbiddenException('Your trial or subscription has ended. You can still view your data, but new changes require an active plan.');
  }

  async assertFeatureAccess(organizationId: string, feature: 'marketing' | 'whatsapp'): Promise<void> {
    const subscription = await this.resolveStatus(organizationId);
    if (['EXPIRED', 'PAST_DUE', 'CANCELED'].includes(subscription.status)) throw new ForbiddenException('This feature requires an active subscription.');
    if (subscription.plan === 'FREE_TRIAL') {
      const message = feature === 'marketing'
        ? 'Marketing tools are available after activating a paid plan.'
        : 'WhatsApp messaging is not enabled during the free trial.';
      throw new ForbiddenException(message);
    }
  }

  async assertLimit(organizationId: string, key: LimitKey, additional = 1): Promise<void> {
    await this.assertCanWrite(organizationId);
    const subscription = await this.resolveStatus(organizationId);
    const maximum = PLAN_CATALOG[subscription.plan as PlanName].limits[key];
    if (maximum === null) return;
    const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const current = key === 'users' ? await this.prisma.user.count({ where: { organizationId, status: 'active' } }) : key === 'doctors' ? await this.prisma.user.count({ where: { organizationId, status: 'active', role: 'doctor' } }) : key === 'patients' ? await this.prisma.patient.count({ where: { organizationId } }) : key === 'appointments' ? await this.prisma.appointment.count({ where: { organizationId, scheduledAt: { gte: monthStart, lt: nextMonth } } }) : await this.prisma.location.count({ where: { organizationId, status: 'active' } });
    if (current + additional > maximum) throw new ConflictException(`Plan limit reached for ${key}. Upgrade the subscription to continue.`);
  }

  async requestPayment(organizationId: string, data: CreateManualPaymentDto, actorId: string) {
    const current = await this.resolveStatus(organizationId); const plan = data.plan as PlanName; const amount = PLAN_CATALOG[plan].priceEgp;
    if (amount === null) throw new ConflictException('Center plans are arranged with the Clinicos team.');
    const reference = data.reference.trim(); const existing = await this.prisma.payment.findFirst({ where: { organizationId, reference, status: 'PENDING' } });
    if (existing) throw new ConflictException('A pending request already uses this payment reference.');
    const payment = await this.prisma.payment.create({ data: { organizationId, subscriptionId: current.id, amount, reference, paymentMethod: data.paymentMethod?.trim() || 'manual_transfer' } });
    await this.prisma.subscriptionEvent.create({ data: { organizationId, subscriptionId: current.id, actorId, action: 'payment.requested', summary: `Manual payment request for ${plan}`, metadata: { paymentId: payment.id, plan, amount } } });
    await this.audit.log({ organizationId, actorId, action: 'subscription.payment_requested', entityType: 'payment', entityId: payment.id, summary: `Requested manual payment for ${plan}` });
    return payment;
  }

  async listPayments(organizationId: string) { return this.prisma.payment.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, currency: true, paymentMethod: true, reference: true, status: true, rejectionReason: true, createdAt: true, reviewedAt: true } }); }
  async listPendingPayments() { return this.prisma.payment.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, include: { organization: { select: { id: true, name: true, slug: true } }, subscription: { select: { plan: true, status: true } } } }); }

  async reviewPayment(paymentId: string, data: ReviewPaymentDto, actorId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { subscription: true } });
    if (!payment) throw new NotFoundException('Payment request not found');
    if (payment.status !== 'PENDING') throw new ConflictException('This payment request has already been reviewed');
    if (data.action === 'reject') {
      const rejectionReason = data.rejectionReason?.trim() || 'Payment could not be verified';
      const rejected = await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REJECTED', reviewedById: actorId, reviewedAt: new Date(), rejectionReason } });
      await this.prisma.subscriptionEvent.create({ data: { organizationId: payment.organizationId, subscriptionId: payment.subscriptionId, actorId, action: 'payment.rejected', summary: 'Manual payment request rejected' } });
      const owner = await this.prisma.user.findFirst({ where: { organizationId: payment.organizationId, role: 'owner', status: 'active' }, select: { email: true, firstName: true } });
      if (owner) {
        try {
          await this.email.sendTransactional({
            to: owner.email,
            subject: 'تحديث طلب الدفع في Clinicos',
            text: `مرحبًا ${owner.firstName}، تم رفض طلب الدفع ذي المرجع ${payment.reference}. السبب: ${rejectionReason}`,
            html: `<p>مرحبًا ${this.escapeHtml(owner.firstName)}،</p><p>تم رفض طلب الدفع ذي المرجع <strong>${this.escapeHtml(payment.reference)}</strong>.</p><p><strong>السبب:</strong> ${this.escapeHtml(rejectionReason)}</p><p>يمكنك إرسال طلب جديد بعد مراجعة بيانات التحويل.</p>`,
            idempotencyKey: `payment-rejected-${payment.id}`,
          });
        } catch {
          // Payment state remains authoritative even if optional notification delivery fails.
        }
      }
      return rejected;
    }
    const plan = this.planForAmount(payment.amount); const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1);
    const [approved] = await this.prisma.$transaction([this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: now, reviewedById: actorId, reviewedAt: now } }), this.prisma.subscription.update({ where: { id: payment.subscriptionId }, data: { plan, status: 'ACTIVE', trialEndsAt: null, currentPeriodStart: now, currentPeriodEnd: end, canceledAt: null } }), this.prisma.organization.update({ where: { id: payment.organizationId }, data: { subscriptionPlan: plan.toLowerCase(), subscriptionStatus: 'active', trialEndsAt: null, subscriptionEndsAt: end } }), this.prisma.subscriptionEvent.create({ data: { organizationId: payment.organizationId, subscriptionId: payment.subscriptionId, actorId, action: 'subscription.activated', summary: `${plan} plan activated after payment approval` } })]);
    await this.audit.log({ organizationId: payment.organizationId, actorId, action: 'subscription.activated', entityType: 'payment', entityId: payment.id, summary: `${plan} plan payment approved` }); return approved;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
  }

  private planForAmount(amount: number): PlanName { return (Object.entries(PLAN_CATALOG).find(([, value]) => value.priceEgp === amount)?.[0] || 'STARTER') as PlanName; }
}
