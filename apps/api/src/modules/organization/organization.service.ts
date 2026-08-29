import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Organization, CreateOrganizationDTO } from '@clinicos/shared-types';
import type { UpdateOrganizationDto } from './organization.dto';
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
    SURGERY: [{ name: 'استشارة جراحة', durationMinutes: 30 }, { name: 'متابعة بعد العملية', durationMinutes: 30 }, { name: 'عملية جراحية', durationMinutes: 120 }],
    RADIOLOGY: [{ name: 'أشعة عادية', durationMinutes: 20 }, { name: 'موجات صوتية', durationMinutes: 30 }, { name: 'أشعة مقطعية', durationMinutes: 45 }, { name: 'رنين مغناطيسي', durationMinutes: 60 }],
    OBGYN: [{ name: 'كشف نساء وتوليد', durationMinutes: 30 }, { name: 'متابعة حمل', durationMinutes: 30 }, { name: 'سونار', durationMinutes: 30 }],
    OPHTHALMOLOGY: [{ name: 'كشف عيون', durationMinutes: 30 }, { name: 'فحص ليزك', durationMinutes: 45 }, { name: 'متابعة بعد الليزك', durationMinutes: 30 }, { name: 'كشف نظر', durationMinutes: 20 }],
    UROLOGY: [{ name: 'كشف مسالك بولية', durationMinutes: 30 }, { name: 'متابعة', durationMinutes: 30 }, { name: 'سونار مسالك', durationMinutes: 30 }],
    BEAUTY: [{ name: 'استشارة تجميل', durationMinutes: 30 }, { name: 'جلسة عناية بالبشرة', durationMinutes: 60 }, { name: 'حقن تجميلي', durationMinutes: 45 }, { name: 'ليزر', durationMinutes: 45 }],
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
    const existing = await this.prisma.service.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } });
    if (existing.length) return existing;
    const defaults = this.defaultServices[organization.specialty] || this.defaultServices.GENERAL;
    await this.prisma.service.createMany({ data: defaults.map((service) => ({ ...service, organizationId, specialty: organization.specialty })) });
    return this.prisma.service.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } });
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
