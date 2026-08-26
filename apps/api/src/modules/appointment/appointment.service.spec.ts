import { NotFoundException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';

describe('AppointmentService', () => {
  const organizationId = 'org-a';
  const actorId = 'user-a';
  const patient = { id: 'patient-a', firstName: 'Ada', lastName: 'Lovelace', medicalRecordNumber: 'MRN-001', phone: null };
  const doctor = { id: 'doctor-a', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const subscriptions = { assertCanWrite: jest.fn().mockResolvedValue(undefined), assertLimit: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => jest.clearAllMocks());

  it('creates an organization-scoped appointment without accepting a tenant id from the request', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'appointment-a', patient });
    const prisma = { patient: { findFirst: jest.fn().mockResolvedValue(patient) }, appointment: { create } };
    const service = new AppointmentService(prisma as never, audit as never, subscriptions as never);

    await service.create(organizationId, actorId, { patientId: patient.id, scheduledAt: '2026-08-27T09:00:00.000Z' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId, createdById: actorId, patientId: patient.id }),
    }));
  });

  it('rejects a doctor that belongs to another organization', async () => {
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue(patient) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new AppointmentService(prisma as never, audit as never, subscriptions as never);

    await expect(service.create(organizationId, actorId, { patientId: patient.id, doctorId: doctor.id, scheduledAt: '2026-08-27T09:00:00.000Z' })).rejects.toThrow('active doctor in this clinic');
  });

  it('starts one visit on check-in and keeps the appointment scoped', async () => {
    const appointment = { id: 'appointment-a', organizationId, patientId: patient.id, doctorId: doctor.id, createdById: actorId, status: 'confirmed', patient, doctor, visit: null };
    const appointmentFindFirst = jest.fn().mockResolvedValue(appointment);
    const appointmentUpdate = jest.fn().mockResolvedValue({ ...appointment, status: 'checked_in' });
    const visitCreate = jest.fn().mockResolvedValue({ id: 'visit-a', patient, doctor, status: 'in_progress' });
    const prisma = { appointment: { findFirst: appointmentFindFirst, update: appointmentUpdate }, visit: { create: visitCreate } };
    const service = new AppointmentService(prisma as never, audit as never, subscriptions as never);

    const result = await service.checkIn(appointment.id, organizationId, actorId);

    expect(appointmentFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: appointment.id, organizationId } }));
    expect(visitCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId, appointmentId: appointment.id, patientId: patient.id, doctorId: doctor.id, createdById: actorId }) }));
    expect(result.visit).toMatchObject({ id: 'visit-a', status: 'in_progress' });
  });

  it('does not expose an appointment from another organization', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new AppointmentService({ appointment: { findFirst } } as never, audit as never, subscriptions as never);

    await expect(service.updateStatus('appointment-other-org', organizationId, { status: 'confirmed' }, actorId)).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'appointment-other-org', organizationId } }));
  });
});
