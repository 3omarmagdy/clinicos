import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Organization, CreateOrganizationDTO } from '@clinicos/shared-types';

@Injectable()
export class OrganizationService {

  constructor(private prisma: PrismaService) {}

  async getOrganization(id: string, organizationId: string): Promise<Organization | null> {
    if (id !== organizationId) {
      return null;
    }

    return this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
  }

  async createOrganization(data: CreateOrganizationDTO): Promise<Organization> {
    return this.prisma.organization.create({
      data,
    });
  }
}
