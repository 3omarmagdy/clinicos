import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { OrganizationService } from './organization.service';
import type { AuthContext, Organization } from '@clinicos/shared-types';

@Controller('organizations')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:read')
  @Get(':id')
  async getOrganization(
    @Param('id') id: string,
    @Req() req: { user: AuthContext },
  ): Promise<Organization | null> {
    return this.organizationService.getOrganization(id, req.user.organizationId);
  }
}
