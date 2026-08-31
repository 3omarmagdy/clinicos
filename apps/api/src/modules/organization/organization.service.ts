import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Organization, CreateOrganizationDTO } from '@clinicos/shared-types';
import type { CreateServiceDto, UpdateOrganizationDto, UpdateServiceDto } from './organization.dto';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class OrganizationService {

  private readonly defaultServices: Record<string, Array<{ name: string; durationMinutes: number }>> = {
    DENTAL: [
      { name: 'كشف أسنان', durationMinutes: 30 }, { name: 'حشو عادي', durationMinutes: 45 }, { name: 'حشو عصب', durationMinutes: 90 },
      { name: 'خلع', durationMinutes: 30 }, { name: 'تنظيف وتلميع', durationMinutes: 45 }, { name: 'تركيبات', durationMinutes: 60 },
      { name: 'تقويم', durationMinutes: 45 }, { name: 'زراعة', durationMinutes: 90 }, { name: 'أسنان أطفال', durationMinutes: 30 },
    ],
    SURGERY: [{ name: 'استشارة جراحة عامة', durationMinutes: 30 }, { name: 'متابعة بعد العملية', durationMinutes: 30 }, { name: 'تغيير غيار جراحي', durationMinutes: 30 }, { name: 'خياطة جرح', durationMinutes: 45 }, { name: 'استئصال ورم', durationMinutes: 120 }, { name: 'عملية جراحية', durationMinutes: 120 }],
    RADIOLOGY: [{ name: 'أشعة سينية عادية', durationMinutes: 20 }, { name: 'أشعة أسنان بانوراما', durationMinutes: 20 }, { name: 'أشعة مقطعية CT', durationMinutes: 45 }, { name: 'أشعة مقطعية بالصبغة', durationMinutes: 60 }, { name: 'رنين مغناطيسي MRI', durationMinutes: 60 }, { name: 'رنين مغناطيسي بالصبغة', durationMinutes: 75 }, { name: 'موجات صوتية على البطن والحوض', durationMinutes: 30 }, { name: 'موجات صوتية على الحمل', durationMinutes: 30 }, { name: 'دوبلر ملون', durationMinutes: 30 }, { name: 'ماموجرام', durationMinutes: 30 }, { name: 'قياس كثافة العظام', durationMinutes: 30 }, { name: 'أشعة نووية', durationMinutes: 60 }],
    OBGYN: [{ name: 'كشف نساء وتوليد', durationMinutes: 30 }, { name: 'متابعة حمل', durationMinutes: 30 }, { name: 'سونار حمل', durationMinutes: 30 }, { name: 'سونار ثلاثي ورباعي الأبعاد', durationMinutes: 45 }, { name: 'متابعة ما بعد الولادة', durationMinutes: 30 }, { name: 'تركيب وإزالة اللولب', durationMinutes: 30 }, { name: 'استشارة تأخر الإنجاب', durationMinutes: 45 }, { name: 'كشف وعلاج مشاكل النساء', durationMinutes: 30 }],
    OPHTHALMOLOGY: [{ name: 'كشف عيون شامل', durationMinutes: 30 }, { name: 'كشف نظر', durationMinutes: 20 }, { name: 'فحص ليزك', durationMinutes: 45 }, { name: 'عملية ليزك', durationMinutes: 60 }, { name: 'متابعة بعد الليزك', durationMinutes: 30 }, { name: 'كشف مياه بيضاء', durationMinutes: 30 }, { name: 'كشف شبكية', durationMinutes: 30 }, { name: 'قياس ضغط العين', durationMinutes: 20 }],
    UROLOGY: [{ name: 'كشف مسالك بولية', durationMinutes: 30 }, { name: 'متابعة', durationMinutes: 30 }, { name: 'سونار مسالك', durationMinutes: 30 }, { name: 'تفتيت حصوات', durationMinutes: 60 }, { name: 'تركيب قسطرة', durationMinutes: 30 }, { name: 'استشارة عقم الرجال', durationMinutes: 45 }],
    BEAUTY: [{ name: 'استشارة تجميل', durationMinutes: 30 }, { name: 'جلسة عناية بالبشرة', durationMinutes: 60 }, { name: 'تنظيف بشرة', durationMinutes: 45 }, { name: 'حقن تجميلي', durationMinutes: 45 }, { name: 'فيلر', durationMinutes: 45 }, { name: 'بوتوكس', durationMinutes: 45 }, { name: 'ليزر إزالة الشعر', durationMinutes: 60 }, { name: 'ليزر علاج البشرة', durationMinutes: 60 }],
    LAB: [{ name: 'صورة دم كاملة CBC', durationMinutes: 15 }, { name: 'سكر صائم', durationMinutes: 15 }, { name: 'سكر تراكمي HbA1c', durationMinutes: 15 }, { name: 'وظائف كبد', durationMinutes: 15 }, { name: 'وظائف كلى', durationMinutes: 15 }, { name: 'تحليل دهون', durationMinutes: 15 }, { name: 'تحليل بول كامل', durationMinutes: 15 }, { name: 'تحليل براز كامل', durationMinutes: 15 }, { name: 'مزرعة بول', durationMinutes: 15 }, { name: 'تحليل الغدة الدرقية', durationMinutes: 15 }, { name: 'تحليل فيتامين د', durationMinutes: 15 }, { name: 'تحليل حمل', durationMinutes: 15 }, { name: 'تحاليل هرمونات', durationMinutes: 15 }],
    GENERAL: [{ name: 'كشف طبي', durationMinutes: 30 }, { name: 'متابعة', durationMinutes: 30 }, { name: 'استشارة', durationMinutes: 30 }],
  };

  constructor(private prisma: PrismaService, private readonly audit: AuditService, private readonly subscriptions: SubscriptionService) {}

  async getOrganization(id: string, organizationId: string): Promise<Organization | null> {
    if (id !== organizationId) {
      return null;
    }

    return this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
  }

  async listServices(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { specialty: true } });
    if (!organization) return [];
    const existing = await this.prisma.service.findMany({ where: { organizationId }, select: { name: true } });
    const existingNames = new Set(existing.map((service) => service.name));
    const defaults = this.defaultServices[organization.specialty] || this.defaultServices.GENERAL;
    const missing = defaults.filter((service) => !existingNames.has(service.name));
    if (missing.length) await this.prisma.service.createMany({ data: missing.map((service) => ({ ...service, organizationId, specialty: organization.specialty })) });
    return this.prisma.service.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createService(organizationId: string, actorId: string, data: CreateServiceDto) {
    await this.subscriptions.assertCanWrite(organizationId);
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { specialty: true } });
    if (!organization) throw new NotFoundException('Clinic not found');
    try {
      const service = await this.prisma.service.create({ data: { organizationId, name: data.name.trim(), specialty: organization.specialty, durationMinutes: data.durationMinutes, price: data.price } });
      await this.audit.log({ organizationId, actorId, action: 'service.created', entityType: 'service', entityId: service.id, summary: 'Created clinic service' });
      return service;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) throw new BadRequestException('A service with this name already exists');
      throw error;
    }
  }

  async updateService(id: string, organizationId: string, actorId: string, data: UpdateServiceDto) {
    await this.subscriptions.assertCanWrite(organizationId);
    const existing = await this.prisma.service.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Service not found');
    const service = await this.prisma.service.update({ where: { id }, data: { ...(data.name !== undefined ? { name: data.name.trim() } : {}), ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}), ...(data.price !== undefined ? { price: data.price } : {}), ...(data.isActive !== undefined ? { isActive: data.isActive } : {}) } });
    await this.audit.log({ organizationId, actorId, action: 'service.updated', entityType: 'service', entityId: service.id, summary: 'Updated clinic service' });
    return service;
  }

  async deleteService(id: string, organizationId: string, actorId: string) {
    await this.subscriptions.assertCanWrite(organizationId);
    const existing = await this.prisma.service.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Service not found');
    const service = await this.prisma.service.update({ where: { id }, data: { isActive: false } });
    await this.audit.log({ organizationId, actorId, action: 'service.deactivated', entityType: 'service', entityId: service.id, summary: 'Deactivated clinic service' });
    return service;
  }

  async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
    return this.prisma.organization.create({
      data,
    });
  }

  async updateOrganization(id: string, organizationId: string, data: UpdateOrganizationDto, actorId?: string): Promise<Organization | null> {
    if (id !== organizationId) return null;
    await this.subscriptions.assertCanWrite(organizationId);

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name.trim(),
        facilityType: data.facilityType,
        specialty: data.specialty,
        timezone: data.timezone,
        currency: data.currency,
        prescriptionHeader: data.prescriptionHeader?.trim() || null,
        prescriptionSubheader: data.prescriptionSubheader?.trim() || null,
        prescriptionPhone: data.prescriptionPhone?.trim() || null,
        prescriptionAddress: data.prescriptionAddress?.trim() || null,
        prescriptionLogoUrl: data.prescriptionLogoUrl?.trim() || null,
      },
    });
    await this.audit.log({ organizationId, actorId, action: 'organization.updated', entityType: 'organization', entityId: organizationId, summary: 'Updated clinic settings' });
    return organization;
  }

  async dashboard(organizationId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + 1);
    const sevenDays = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + 7);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [patients, consentedPatients, newPatientsThisMonth, todayAppointments, upcomingAppointments, attendance] = await Promise.all([
      this.prisma.patient.count({ where: { organizationId, status: 'active' } }),
      this.prisma.patient.count({ where: { organizationId, status: 'active', marketingConsent: true } }),
      this.prisma.patient.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
      this.prisma.appointment.count({ where: { organizationId, scheduledAt: { gte: todayStart, lt: tomorrow }, status: { not: 'cancelled' } } }),
      this.prisma.appointment.count({ where: { organizationId, scheduledAt: { gte: now, lt: sevenDays }, status: { not: 'cancelled' } } }),
      this.prisma.appointment.groupBy({ by: ['status'], where: { organizationId, scheduledAt: { gte: todayStart, lt: tomorrow } }, _count: { _all: true } }),
    ]);

    return {
      patients,
      consentedPatients,
      newPatientsThisMonth,
      todayAppointments,
      upcomingAppointments,
      todayByStatus: Object.fromEntries(attendance.map((row) => [row.status, row._count._all])),
    };
  }
}
