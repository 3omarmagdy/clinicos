import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { OrganizationService } from './organization.service';
import type { AuthContext, Organization } from '@clinicos/shared-types';
import { CreateServiceDto, UpdateOrganizationDto, UpdateServiceDto } from './organization.dto';

@Controller('organizations')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:read')
  @Get('me/services')
  async services(@Req() req: { user: AuthContext }) {
    return this.organizationService.listServices(req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:update')
  @Post('me/services')
  async createService(@Body() data: CreateServiceDto, @Req() req: { user: AuthContext }) {
    return this.organizationService.createService(req.user.organizationId, req.user.userId, data);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:update')
  @Put('me/services/:serviceId')
  async updateService(@Param('serviceId') serviceId: string, @Body() data: UpdateServiceDto, @Req() req: { user: AuthContext }) {
    return this.organizationService.updateService(serviceId, req.user.organizationId, req.user.userId, data);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:update')
  @Delete('me/services/:serviceId')
  async deleteService(@Param('serviceId') serviceId: string, @Req() req: { user: AuthContext }) {
    return this.organizationService.deleteService(serviceId, req.user.organizationId, req.user.userId);
  }

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
