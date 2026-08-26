import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClinicalRecordDto, UpdateClinicalRecordDto } from './clinical-record.dto';
import { SubscriptionService } from '../subscription/subscription.service';

const authorSelect = { id: true, firstName: true, lastName: true } as const;

@Injectable()
export class ClinicalRecordService {
  constructor(private readonly prisma: PrismaService, private readonly subscriptions: SubscriptionService) {}

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
    return this.prisma.clinicalRecord.create({
      data: { ...data, patientId, organizationId, authorId },
      include: { author: { select: authorSelect } },
    });
  }

  async update(patientId: string, recordId: string, organizationId: string, data: UpdateClinicalRecordDto) {
    await this.subscriptions.assertCanWrite(organizationId);
    await this.get(patientId, recordId, organizationId);
    return this.prisma.clinicalRecord.update({
      where: { id: recordId },
      data,
      include: { author: { select: authorSelect } },
    });
  }
}
