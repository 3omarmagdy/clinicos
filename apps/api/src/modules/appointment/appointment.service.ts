import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AppointmentQueryDto, CreateAppointmentDto, RescheduleAppointmentDto, UpdateAppointmentStatusDto, UpdateVisitDto } from './appointment.dto';
import { AuditService } from '../audit/audit.service';

const patientSelect = { id: true, firstName: true, lastName: true, medicalRecordNumber: true, phone: true } as const;
const doctorSelect = { id: true, firstName: true, lastName: true, email: true } as const;
const unavailableAppointmentStatuses = ['cancelled', 'no_show'];

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listDoctors(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, role: 'doctor', status: 'active' },
      select: doctorSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async list(organizationId: string, query: AppointmentQueryDto) {
    const today = new Date();
    const start = query.from ? new Date(query.from) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = query.to ? new Date(query.to) : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

    return this.prisma.appointment.findMany({
      where: { organizationId, scheduledAt: { gte: start, lt: end }, ...(query.doctorId ? { doctorId: query.doctorId } : {}) },
      include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  private async assertDoctor(organizationId: string, doctorId?: string) {
    if (!doctorId) return;
    const doctor = await this.prisma.user.findFirst({ where: { id: doctorId, organizationId, role: 'doctor', status: 'active' }, select: { id: true } });
    if (!doctor) throw new BadRequestException('Selected doctor is not an active doctor in this clinic');
  }

  private async assertNoConflict(organizationId: string, doctorId: string | undefined, scheduledAt: Date, durationMinutes: number, excludeId?: string) {
    if (!doctorId) return;
    const windowStart = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.appointment.findMany({
      where: { organizationId, doctorId, ...(excludeId ? { id: { not: excludeId } } : {}), status: { notIn: unavailableAppointmentStatuses }, scheduledAt: { gte: windowStart, lte: windowEnd } },
      select: { id: true, scheduledAt: true, durationMinutes: true },
    });
    const requestedEnd = scheduledAt.getTime() + durationMinutes * 60 * 1000;
    const conflict = candidates.some((candidate) => {
      const candidateStart = candidate.scheduledAt.getTime();
      const candidateEnd = candidateStart + candidate.durationMinutes * 60 * 1000;
      return scheduledAt.getTime() < candidateEnd && requestedEnd > candidateStart;
    });
    if (conflict) throw new BadRequestException('The selected doctor already has an overlapping appointment');
  }

  async create(organizationId: string, createdById: string, data: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id: data.patientId, organizationId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient not found');
    await this.assertDoctor(organizationId, data.doctorId);
    const scheduledAt = new Date(data.scheduledAt);
    const durationMinutes = data.durationMinutes ?? 30;
    await this.assertNoConflict(organizationId, data.doctorId, scheduledAt, durationMinutes);

    const appointment = await this.prisma.appointment.create({
      data: { organizationId, createdById, patientId: data.patientId, doctorId: data.doctorId, scheduledAt, durationMinutes, reason: data.reason?.trim(), notes: data.notes?.trim() },
      include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true },
    });
    await this.audit.log({ organizationId, actorId: createdById, action: 'appointment.created', entityType: 'appointment', entityId: appointment.id, summary: 'Created appointment', metadata: { doctorAssigned: Boolean(data.doctorId) } });
    return appointment;
  }

  async reschedule(id: string, organizationId: string, data: RescheduleAppointmentDto, actorId: string) {
    const existing = await this.prisma.appointment.findFirst({ where: { id, organizationId }, select: { id: true, status: true, doctorId: true, durationMinutes: true } });
    if (!existing) throw new NotFoundException('Appointment not found');
    if (['checked_in', 'completed', 'cancelled', 'no_show'].includes(existing.status)) throw new BadRequestException('This appointment can no longer be rescheduled');
    const nextDoctorId = data.doctorId === undefined ? existing.doctorId : data.doctorId;
    await this.assertDoctor(organizationId, nextDoctorId ?? undefined);
    const scheduledAt = new Date(data.scheduledAt);
    const durationMinutes = data.durationMinutes ?? existing.durationMinutes;
    await this.assertNoConflict(organizationId, nextDoctorId ?? undefined, scheduledAt, durationMinutes, id);
    const appointment = await this.prisma.appointment.update({ where: { id }, data: { scheduledAt, durationMinutes, doctorId: nextDoctorId }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true } });
    await this.audit.log({ organizationId, actorId, action: 'appointment.rescheduled', entityType: 'appointment', entityId: id, summary: 'Rescheduled appointment', metadata: { doctorAssigned: Boolean(data.doctorId) } });
    return appointment;
  }

  async updateStatus(id: string, organizationId: string, data: UpdateAppointmentStatusDto, actorId?: string) {
    const existing = await this.prisma.appointment.findFirst({ where: { id, organizationId }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true } });
    if (!existing) throw new NotFoundException('Appointment not found');

    if (data.status === 'checked_in') return this.checkIn(id, organizationId, actorId ?? existing.createdById);
    if (existing.visit && (data.status === 'completed' || data.status === 'cancelled')) {
      await this.updateVisit(id, organizationId, actorId ?? existing.createdById, { status: data.status === 'completed' ? 'completed' : 'cancelled' });
      return this.prisma.appointment.findFirst({ where: { id, organizationId }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true } });
    }
    const appointment = await this.prisma.appointment.update({ where: { id }, data: { status: data.status }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true } });
    await this.audit.log({ organizationId, actorId, action: 'appointment.status_updated', entityType: 'appointment', entityId: id, summary: `Updated appointment status to ${data.status}`, metadata: { status: data.status } });
    return appointment;
  }

  async checkIn(id: string, organizationId: string, actorId: string) {
    const existing = await this.prisma.appointment.findFirst({ where: { id, organizationId }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true } });
    if (!existing) throw new NotFoundException('Appointment not found');
    if (existing.visit) return existing;
    if (['completed', 'cancelled', 'no_show'].includes(existing.status)) throw new BadRequestException('This appointment cannot be checked in');

    const appointment = await this.prisma.appointment.update({ where: { id }, data: { status: 'checked_in' }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, visit: true } });
    const visit = await this.prisma.visit.create({ data: { organizationId, appointmentId: id, patientId: existing.patientId, doctorId: existing.doctorId, createdById: actorId }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect } } });
    await this.audit.log({ organizationId, actorId, action: 'visit.started', entityType: 'visit', entityId: visit.id, summary: 'Started patient visit' });
    return { ...appointment, visit };
  }

  async getVisit(appointmentId: string, organizationId: string) {
    const visit = await this.prisma.visit.findFirst({ where: { appointmentId, organizationId }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, appointment: true } });
    if (!visit) throw new NotFoundException('Visit not found');
    return visit;
  }

  async updateVisit(appointmentId: string, organizationId: string, actorId: string, data: UpdateVisitDto) {
    const visit = await this.prisma.visit.findFirst({ where: { appointmentId, organizationId }, select: { id: true, status: true } });
    if (!visit) throw new NotFoundException('Visit not found');
    const status = data.status ?? visit.status;
    const updated = await this.prisma.visit.update({ where: { id: visit.id }, data: { status, notes: data.notes?.trim(), completedAt: status === 'completed' ? new Date() : null }, include: { patient: { select: patientSelect }, doctor: { select: doctorSelect }, appointment: true } });
    await this.prisma.appointment.update({ where: { id: appointmentId }, data: { status: status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'checked_in' } });
    await this.audit.log({ organizationId, actorId, action: 'visit.updated', entityType: 'visit', entityId: updated.id, summary: `Updated visit status to ${status}`, metadata: { status } });
    return updated;
  }
}
