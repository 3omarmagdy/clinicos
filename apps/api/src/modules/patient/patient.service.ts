import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type { Patient } from '@clinicos/shared-types';
import type { CreatePatientDto, MarketingAudienceQueryDto, UpdatePatientDto } from './patient.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private toPatient(patient: Omit<Patient, 'status'> & { status: string }): Patient {
    return { ...patient, status: patient.status as Patient['status'] };
  }

  async list(organizationId: string, search?: string): Promise<Patient[]> {
    const query = search?.trim();

    const patients = await this.prisma.patient.findMany({
      where: {
        organizationId,
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { medicalRecordNumber: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { occupation: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
                { governorate: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return patients.map((patient) => this.toPatient(patient));
  }

  async get(id: string, organizationId: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, organizationId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.toPatient(patient);
  }

  async create(
    organizationId: string,
    data: CreatePatientDto, actorId?: string,
  ): Promise<Patient> {
    const {
      dateOfBirth,
      admittedAt,
      medicalRecordNumber,
      marketingConsent,
      marketingConsentAt,
      ...patientData
    } = data;

    delete patientData.age;

    try {
      const patient = await this.prisma.patient.create({
        data: {
          ...patientData,
          organizationId,
          medicalRecordNumber:
            medicalRecordNumber ?? this.generateMedicalRecordNumber(),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          admittedAt: admittedAt ? new Date(admittedAt) : undefined,

          marketingConsent: marketingConsent ?? false,

          marketingConsentAt: marketingConsentAt
            ? new Date(marketingConsentAt)
            : marketingConsent
              ? new Date()
              : undefined,
        },
      });

      await this.audit.log({ organizationId, actorId, action: 'patient.created', entityType: 'patient', entityId: patient.id, summary: `Created patient ${patient.medicalRecordNumber}` });
      return this.toPatient(patient);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A patient with this medical record number already exists',
        );
      }

      throw error;
    }
  }

  /**
   * Imports a small, validated migration batch. Each lookup includes the
   * organization id, so one clinic can never see or de-duplicate another
   * clinic's contacts.
   */
  async import(organizationId: string, patients: CreatePatientDto[], actorId?: string) {
    const phonesInFile = patients.map((patient) => patient.phone?.trim()).filter((phone): phone is string => Boolean(phone));
    const existing = new Set((await this.prisma.patient.findMany({
      where: { organizationId, phone: { in: phonesInFile } },
      select: { phone: true },
    })).map((patient) => patient.phone).filter((phone): phone is string => Boolean(phone)));

    const records: Array<Record<string, unknown>> = [];
    const skippedRows: number[] = [];
    const batchPhones = new Set<string>();

    for (const [index, patient] of patients.entries()) {
      const phone = patient.phone?.trim();

      if (phone) {
        if (batchPhones.has(phone)) {
          skippedRows.push(index + 1);
          continue;
        }

        if (existing.has(phone)) {
          skippedRows.push(index + 1);
          continue;
        }

        batchPhones.add(phone);
      }

      const { dateOfBirth, admittedAt, medicalRecordNumber, marketingConsent, marketingConsentAt, ...patientData } = patient;
      delete patientData.age;
      records.push({
        ...patientData,
        phone,
        organizationId,
        medicalRecordNumber: medicalRecordNumber ?? this.generateMedicalRecordNumber(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        admittedAt: admittedAt ? new Date(admittedAt) : undefined,
        marketingConsent: marketingConsent ?? false,
        marketingConsentAt: marketingConsentAt ? new Date(marketingConsentAt) : marketingConsent ? new Date() : undefined,
      });
    }

    const result = records.length ? await this.prisma.patient.createMany({ data: records as never[] }) : { count: 0 };
    await this.audit.log({ organizationId, actorId, action: 'patient.imported', entityType: 'patient_import', summary: `Imported ${result.count} patient records; skipped ${skippedRows.length}`, metadata: { created: result.count, skipped: skippedRows.length } });
    return { created: result.count, skipped: skippedRows.length, skippedRows };
  }

  private audienceWhere(organizationId: string, filters: MarketingAudienceQueryDto): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = {
      organizationId,
      status: 'active',
      marketingConsent: true,
      ...(filters.governorate ? { governorate: filters.governorate.trim() } : {}),
      ...(filters.city ? { city: filters.city.trim() } : {}),
      ...(filters.gender ? { gender: filters.gender.trim() } : {}),
      ...(filters.leadSource ? { leadSource: filters.leadSource.trim() } : {}),
    };

    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      const today = new Date();
      const range: Prisma.DateTimeNullableFilter = {};
      if (filters.minAge !== undefined) range.lte = new Date(today.getFullYear() - filters.minAge, today.getMonth(), today.getDate());
      if (filters.maxAge !== undefined) range.gte = new Date(today.getFullYear() - filters.maxAge - 1, today.getMonth(), today.getDate());
      where.dateOfBirth = range;
    }
    return where;
  }

  async marketingAudience(organizationId: string, filters: MarketingAudienceQueryDto) {
    const where = this.audienceWhere(organizationId, filters);
    const [total, samples] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, firstName: true, lastName: true, phone: true, city: true, governorate: true, leadSource: true },
      }),
    ]);
    return { total, samples };
  }

  async exportMarketingAudience(organizationId: string, filters: MarketingAudienceQueryDto, actorId?: string) {
    const audience = await this.prisma.patient.findMany({
      where: this.audienceWhere(organizationId, filters),
      orderBy: { createdAt: 'asc' },
      select: { firstName: true, lastName: true, phone: true, email: true, gender: true, city: true, governorate: true, dateOfBirth: true, leadSource: true, marketingConsentAt: true },
    });
    await this.audit.log({ organizationId, actorId, action: 'marketing_audience.exported', entityType: 'marketing_audience', summary: `Exported ${audience.length} consented marketing contacts`, metadata: { count: audience.length } });
    return audience;
  }

  private generateMedicalRecordNumber(): string {
    return `MRN-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdatePatientDto, actorId?: string,
  ): Promise<Patient> {
    await this.get(id, organizationId);

    try {
      const {
        dateOfBirth,
        admittedAt,
        marketingConsent,
        marketingConsentAt,
        ...patientData
      } = data;

      const updateData: Record<string, unknown> = {
        ...patientData,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        admittedAt: admittedAt ? new Date(admittedAt) : undefined,
      };

      if (marketingConsent !== undefined) {
        updateData.marketingConsent = marketingConsent;

        if (marketingConsent) {
          updateData.marketingConsentAt = marketingConsentAt
            ? new Date(marketingConsentAt)
            : new Date();
        } else {
          updateData.marketingConsentAt = null;
        }
      } else if (marketingConsentAt !== undefined) {
        updateData.marketingConsentAt = marketingConsentAt
          ? new Date(marketingConsentAt)
          : null;
      }

      const patient = await this.prisma.patient.update({
        where: { id },
        data: updateData,
      });

      await this.audit.log({ organizationId, actorId, action: 'patient.updated', entityType: 'patient', entityId: patient.id, summary: `Updated patient ${patient.medicalRecordNumber}` });
      return this.toPatient(patient);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A patient with this medical record number already exists',
        );
      }

      throw error;
    }
  }
}
