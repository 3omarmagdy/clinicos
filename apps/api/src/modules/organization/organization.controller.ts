import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { OrganizationService } from './organization.service';
import type { AuthContext, Organization } from '@clinicos/shared-types';
import { UpdateOrganizationDto } from './organization.dto';

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

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:read')
  @Get('me/dashboard')
  async dashboard(@Req() req: { user: AuthContext }) {
    return this.organizationService.dashboard(req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:update')
  @Put(':id')
  async updateOrganization(
    @Param('id') id: string,
    @Body() data: UpdateOrganizationDto,
    @Req() req: { user: AuthContext },
  ): Promise<Organization | null> {
    return this.organizationService.updateOrganization(id, req.user.organizationId, data, req.user.userId);
  }
}
