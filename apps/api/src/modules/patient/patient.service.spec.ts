import { NotFoundException } from '@nestjs/common';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  const organizationId = 'org-a';
  const patient = { id: 'patient-a', organizationId, medicalRecordNumber: 'MRN-001', firstName: 'Ada', lastName: 'Lovelace', status: 'active', createdAt: new Date(), updatedAt: new Date(), dateOfBirth: null, gender: null, phone: null, email: null, address: null, emergencyContactName: null, emergencyContactPhone: null };

  it('always scopes lookups to the authenticated organization', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new PatientService({ patient: { findFirst } } as never);
    await expect(service.get('patient-a', organizationId)).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'patient-a', organizationId } });
  });

  it('creates patients with the authenticated organization rather than client input', async () => {
    const create = jest.fn().mockResolvedValue(patient);
    const service = new PatientService({ patient: { create } } as never);
    await service.create(organizationId, { firstName: 'Ada', lastName: 'Lovelace', medicalRecordNumber: 'MRN-001' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId }) }));
  });
});
