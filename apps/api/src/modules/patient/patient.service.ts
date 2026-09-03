import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Patient } from '@clinicos/shared-types';
import type { CreatePatientDto, UpdatePatientDto } from './patient.dto';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  private toPatient(patient: Omit<Patient, 'status'> & { status: string }): Patient {
    return { ...patient, status: patient.status as Patient['status'] };
  }

  async list(organizationId: string, search?: string): Promise<Patient[]> {
    const query = search?.trim();
    const patients = await this.prisma.patient.findMany({
      where: {
        organizationId,
        ...(query ? { OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { medicalRecordNumber: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return patients.map((patient) => this.toPatient(patient));
  }

  async get(id: string, organizationId: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({ where: { id, organizationId } });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.toPatient(patient);
  }

  async create(organizationId: string, data: CreatePatientDto): Promise<Patient> {
    try {
      const patient = await this.prisma.patient.create({
        data: { ...data, organizationId, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined, marketingConsentAt: data.marketingConsent ? new Date() : undefined },
      });
      return this.toPatient(patient);
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('A patient with this medical record number already exists');
      }
      throw error;
    }
  }

  async update(id: string, organizationId: string, data: UpdatePatientDto): Promise<Patient> {
    await this.get(id, organizationId);
    try {
      const patient = await this.prisma.patient.update({
        where: { id }, data: { ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined, marketingConsentAt: data.marketingConsent === true ? new Date() : data.marketingConsent === false ? null : undefined },
      });
      return this.toPatient(patient);
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('A patient with this medical record number already exists');
      }
      throw error;
    }
  }
}
