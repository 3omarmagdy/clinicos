import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClinicalRecordDto, UpdateClinicalRecordDto } from './clinical-record.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { AuditService } from '../audit/audit.service';

const authorSelect = { id: true, firstName: true, lastName: true } as const;

@Injectable()
export class ClinicalRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly audit: AuditService,
  ) {}

  private async assertPatientInOrganization(patientId: string, organizationId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient not found');
  }

  async list(patientId: string, organizationId: string) {
    await this.assertPatientInOrganization(patientId, organizationId);
    return this.prisma.clinicalRecord.findMany({
      where: { patientId, organizationId },
      include: { author: { select: authorSelect } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(patientId: string, recordId: string, organizationId: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id: recordId, patientId, organizationId },
      include: { author: { select: authorSelect } },
    });
    if (!record) throw new NotFoundException('Clinical record not found');
    return record;
  }

  async create(patientId: string, organizationId: string, authorId: string, data: CreateClinicalRecordDto) {
    await this.subscriptions.assertCanWrite(organizationId);
    await this.assertPatientInOrganization(patientId, organizationId);
    const record = await this.prisma.clinicalRecord.create({
      data: { ...data, patientId, organizationId, authorId },
      include: { author: { select: authorSelect } },
    });
    await this.audit.log({ organizationId, actorId: authorId, action: 'clinical_record.created', entityType: 'clinical_record', entityId: record.id, summary: 'Created clinical record' });
    return record;
  }

  async revisions(patientId: string, recordId: string, organizationId: string) {
    await this.get(patientId, recordId, organizationId);
    return this.prisma.clinicalRecordRevision.findMany({
      where: { clinicalRecordId: recordId, patientId, organizationId },
      select: { id: true, revisionNumber: true, changedFields: true, createdAt: true, changedBy: { select: authorSelect } },
      orderBy: { revisionNumber: 'desc' },
    });
  }

  async update(patientId: string, recordId: string, organizationId: string, data: UpdateClinicalRecordDto, actorId: string, actorRole: string) {
    await this.subscriptions.assertCanWrite(organizationId);
    const record = await this.get(patientId, recordId, organizationId);
    if (!['owner', 'admin'].includes(actorRole) && record.authorId !== actorId) {
      throw new ForbiddenException('Only the author or a clinic administrator can amend this clinical record');
    }

    const changedFields = (Object.keys(data) as Array<keyof UpdateClinicalRecordDto>).filter((field) => data[field] !== undefined && data[field] !== record[field]);
    if (changedFields.length === 0) return record;

    const snapshot = {
      category: record.category,
      content: record.content,
      symptoms: record.symptoms,
      diagnosis: record.diagnosis,
      treatmentPlan: record.treatmentPlan,
      authorId: record.authorId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const revisionNumber = (await tx.clinicalRecordRevision.count({ where: { clinicalRecordId: recordId } })) + 1;
      await tx.clinicalRecordRevision.create({
        data: { clinicalRecordId: recordId, organizationId, patientId, revisionNumber, snapshot, changedFields, changedById: actorId },
      });
      return tx.clinicalRecord.update({
        where: { id: recordId },
        data,
        include: { author: { select: authorSelect } },
      });
    });
    await this.audit.log({ organizationId, actorId, action: 'clinical_record.amended', entityType: 'clinical_record', entityId: recordId, summary: 'Amended clinical record', metadata: { changedFields } });
    return updated;
  }
}
