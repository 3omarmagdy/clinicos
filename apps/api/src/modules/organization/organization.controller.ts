import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationService } from './organization.service';
import type { Organization } from '@clinicos/shared-types';

@Controller('organizations')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getOrganization(@Param('id') id: string): Promise<Organization | null> {
    return this.organizationService.getOrganization(id);
  }
}
