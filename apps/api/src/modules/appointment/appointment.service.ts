import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AppointmentQueryDto, CreateAppointmentDto, UpdateAppointmentStatusDto } from './appointment.dto';
import { AuditService } from '../audit/audit.service';

const patientSelect = { id: true, firstName: true, lastName: true, medicalRecordNumber: true, phone: true } as const;

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(organizationId: string, query: AppointmentQueryDto) {
    const today = new Date();
    const start = query.from ? new Date(query.from) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = query.to ? new Date(query.to) : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return this.prisma.appointment.findMany({
      where: { organizationId, scheduledAt: { gte: start, lt: end } },
      include: { patient: { select: patientSelect } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(organizationId: string, createdById: string, data: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: data.patientId, organizationId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient not found');
    const appointment = await this.prisma.appointment.create({
      data: { organizationId, createdById, patientId: data.patientId, scheduledAt: new Date(data.scheduledAt), durationMinutes: data.durationMinutes ?? 30, reason: data.reason?.trim(), notes: data.notes?.trim() },
      include: { patient: { select: patientSelect } },
    });
    await this.audit.log({ organizationId, actorId: createdById, action: 'appointment.created', entityType: 'appointment', entityId: appointment.id, summary: 'Created appointment' });
    return appointment;
  }

  async updateStatus(id: string, organizationId: string, data: UpdateAppointmentStatusDto, actorId?: string) {
    const existingAppointment = await this.prisma.appointment.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!existingAppointment) throw new NotFoundException('Appointment not found');
    const appointment = await this.prisma.appointment.update({ where: { id }, data: { status: data.status }, include: { patient: { select: patientSelect } } });
    await this.audit.log({ organizationId, actorId, action: 'appointment.status_updated', entityType: 'appointment', entityId: id, summary: `Updated appointment status to ${data.status}` });
    return appointment;
  }
}
