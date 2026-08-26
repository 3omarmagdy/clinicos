import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext } from '@clinicos/shared-types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AppointmentService } from './appointment.service';
import { AppointmentQueryDto, CreateAppointmentDto, RescheduleAppointmentDto, UpdateAppointmentStatusDto, UpdateVisitDto } from './appointment.dto';

@Controller('appointments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Get('doctors')
  @RequirePermissions('appointment:read')
  listDoctors(@Req() req: { user: AuthContext }) {
    return this.appointments.listDoctors(req.user.organizationId);
  }

  @Get()
  @RequirePermissions('appointment:read')
  list(@Req() req: { user: AuthContext }, @Query() query: AppointmentQueryDto) {
    return this.appointments.list(req.user.organizationId, query);
  }

  @Post()
  @RequirePermissions('appointment:create')
  create(@Req() req: { user: AuthContext }, @Body() data: CreateAppointmentDto) {
    return this.appointments.create(req.user.organizationId, req.user.userId, data);
  }

  @Patch(':id/status')
  @RequirePermissions('appointment:update')
  updateStatus(@Req() req: { user: AuthContext }, @Param('id') id: string, @Body() data: UpdateAppointmentStatusDto) {
    return this.appointments.updateStatus(id, req.user.organizationId, data, req.user.userId);
  }

  @Patch(':id/reschedule')
  @RequirePermissions('appointment:update')
  reschedule(@Req() req: { user: AuthContext }, @Param('id') id: string, @Body() data: RescheduleAppointmentDto) {
    return this.appointments.reschedule(id, req.user.organizationId, data, req.user.userId);
  }

  @Post(':id/check-in')
  @RequirePermissions('appointment:update')
  checkIn(@Req() req: { user: AuthContext }, @Param('id') id: string) {
    return this.appointments.checkIn(id, req.user.organizationId, req.user.userId);
  }

  @Get(':id/visit')
  @RequirePermissions('appointment:read')
  getVisit(@Req() req: { user: AuthContext }, @Param('id') id: string) {
    return this.appointments.getVisit(id, req.user.organizationId);
  }

  @Patch(':id/visit')
  @RequirePermissions('appointment:update')
  updateVisit(@Req() req: { user: AuthContext }, @Param('id') id: string, @Body() data: UpdateVisitDto) {
    return this.appointments.updateVisit(id, req.user.organizationId, req.user.userId, data);
  }
}
