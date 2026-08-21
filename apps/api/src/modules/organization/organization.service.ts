import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Organization, CreateOrganizationDTO } from '@clinicos/shared-types';
import type { UpdateOrganizationDto } from './organization.dto';

@Injectable()
export class OrganizationService {

  constructor(private prisma: PrismaService) {}

  async getOrganization(id: string, organizationId: string): Promise<Organization | null> {
    if (id !== organizationId) {
      return null;
    }

    return this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
  }

  async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
    return this.prisma.organization.create({
      data,
    });
  }

  async updateOrganization(id: string, organizationId: string, data: UpdateOrganizationDto): Promise<Organization | null> {
    if (id !== organizationId) return null;

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: { name: data.name.trim(), timezone: data.timezone, currency: data.currency },
    });
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
