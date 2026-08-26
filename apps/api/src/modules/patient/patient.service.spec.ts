import { NotFoundException } from '@nestjs/common';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  const organizationId = 'org-a';
  const patient = { id: 'patient-a', organizationId, medicalRecordNumber: 'MRN-001', firstName: 'Ada', lastName: 'Lovelace', status: 'active', createdAt: new Date(), updatedAt: new Date(), dateOfBirth: null, gender: null, phone: null, email: null, address: null, emergencyContactName: null, emergencyContactPhone: null };
  const audit = { log: jest.fn() };
  const subscriptions = { assertCanWrite: jest.fn().mockResolvedValue(undefined), assertLimit: jest.fn().mockResolvedValue(undefined) };

  it('always scopes lookups to the authenticated organization', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new PatientService({ patient: { findFirst } } as never, audit as never, subscriptions as never);
    await expect(service.get('patient-a', organizationId)).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'patient-a', organizationId } });
  });

  it('creates patients with the authenticated organization and a generated MRN when none is supplied', async () => {
    const create = jest.fn().mockResolvedValue(patient);
    const service = new PatientService({ patient: { create } } as never, audit as never, subscriptions as never);
    await service.create(organizationId, { firstName: 'Ada', lastName: 'Lovelace' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId, medicalRecordNumber: expect.stringMatching(/^MRN-[A-F0-9]{12}$/) }),
    }));
  });

  it('searches only within the authenticated organization', async () => {
    const findMany = jest.fn().mockResolvedValue([patient]);
    const service = new PatientService({ patient: { findMany } } as never, audit as never, subscriptions as never);
    await expect(service.list(organizationId, 'Ada')).resolves.toEqual([patient]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId,
        OR: expect.arrayContaining([{ firstName: { contains: 'Ada', mode: 'insensitive' } }]),
      }),
    }));
  });

  it('does not update a patient outside the authenticated organization', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const update = jest.fn();
    const service = new PatientService({ patient: { findFirst, update } } as never, audit as never, subscriptions as never);
    await expect(service.update('patient-other-org', organizationId, { phone: '0100000000' })).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('updates a scoped patient using only the requested changes', async () => {
    const findFirst = jest.fn().mockResolvedValue(patient);
    const update = jest.fn().mockResolvedValue({ ...patient, phone: '0100000000' });
    const service = new PatientService({ patient: { findFirst, update } } as never, audit as never, subscriptions as never);
    await expect(service.update(patient.id, organizationId, { phone: '0100000000' })).resolves.toMatchObject({ phone: '0100000000' });
    expect(update).toHaveBeenCalledWith({ where: { id: patient.id }, data: { phone: '0100000000', dateOfBirth: undefined } });
  });
});
