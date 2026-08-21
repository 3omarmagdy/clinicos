import { NotFoundException } from '@nestjs/common';
import { ClinicalRecordService } from './clinical-record.service';

const organizationId = 'org-a';
const patientId = 'patient-a';
const record = {
  id: 'record-a', organizationId, patientId, authorId: 'doctor-a', category: 'clinical_note', content: 'Improving.',
  symptoms: null, diagnosis: null, treatmentPlan: null, createdAt: new Date(), updatedAt: new Date(),
  author: { id: 'doctor-a', firstName: 'Dr', lastName: 'A' },
};

describe('ClinicalRecordService', () => {
  it('creates a record only after the patient is found in the authenticated organization', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: patientId });
    const create = jest.fn().mockResolvedValue(record);
    const service = new ClinicalRecordService({ patient: { findFirst }, clinicalRecord: { create } } as never);

    await expect(service.create(patientId, organizationId, 'doctor-a', { category: 'clinical_note', content: 'Improving.' })).resolves.toEqual(record);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ patientId, organizationId, authorId: 'doctor-a' }) }));
  });

  it('lists records scoped to the authenticated organization and patient', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: patientId });
    const findMany = jest.fn().mockResolvedValue([record]);
    const service = new ClinicalRecordService({ patient: { findFirst }, clinicalRecord: { findMany } } as never);

    await expect(service.list(patientId, organizationId)).resolves.toEqual([record]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patientId, organizationId } }));
  });

  it('rejects a record belonging to another organization', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new ClinicalRecordService({ clinicalRecord: { findFirst } } as never);

    await expect(service.get(patientId, 'record-other-org', organizationId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not update a cross-organization record', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const update = jest.fn();
    const service = new ClinicalRecordService({ clinicalRecord: { findFirst, update } } as never);

    await expect(service.update(patientId, 'record-other-org', organizationId, { content: 'Changed' })).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('updates an in-scope record without changing its author or tenant', async () => {
    const findFirst = jest.fn().mockResolvedValue(record);
    const update = jest.fn().mockResolvedValue({ ...record, content: 'Changed' });
    const service = new ClinicalRecordService({ clinicalRecord: { findFirst, update } } as never);

    await expect(service.update(patientId, record.id, organizationId, { content: 'Changed' })).resolves.toMatchObject({ content: 'Changed' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: record.id }, data: { content: 'Changed' } }));
  });
});
