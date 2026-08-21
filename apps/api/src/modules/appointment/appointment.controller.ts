import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext } from '@clinicos/shared-types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AppointmentService } from './appointment.service';
import { AppointmentQueryDto, CreateAppointmentDto, UpdateAppointmentStatusDto } from './appointment.dto';

@Controller('appointments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Get() @RequirePermissions('appointment:read')
  list(@Req() req: { user: AuthContext }, @Query() query: AppointmentQueryDto) { return this.appointments.list(req.user.organizationId, query); }

  @Post() @RequirePermissions('appointment:create')
  create(@Req() req: { user: AuthContext }, @Body() data: CreateAppointmentDto) { return this.appointments.create(req.user.organizationId, req.user.userId, data); }

  @Patch(':id/status') @RequirePermissions('appointment:update')
  updateStatus(@Req() req: { user: AuthContext }, @Param('id') id: string, @Body() data: UpdateAppointmentStatusDto) { return this.appointments.updateStatus(id, req.user.organizationId, data); }
}
