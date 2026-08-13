import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext, Patient } from '@clinicos/shared-types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreatePatientDto, PatientQueryDto, UpdatePatientDto } from './patient.dto';
import { PatientService } from './patient.service';

@Controller('patients')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PatientController {
  constructor(private readonly patients: PatientService) {}

  @Get() @RequirePermissions('patient:read')
  list(@Req() req: { user: AuthContext }, @Query() query: PatientQueryDto): Promise<Patient[]> { return this.patients.list(req.user.organizationId, query.search); }

  @Get(':id') @RequirePermissions('patient:read')
  get(@Param('id') id: string, @Req() req: { user: AuthContext }): Promise<Patient> { return this.patients.get(id, req.user.organizationId); }

  @Post() @RequirePermissions('patient:create')
  create(@Body() data: CreatePatientDto, @Req() req: { user: AuthContext }): Promise<Patient> { return this.patients.create(req.user.organizationId, data); }

  @Patch(':id') @RequirePermissions('patient:update')
  update(@Param('id') id: string, @Body() data: UpdatePatientDto, @Req() req: { user: AuthContext }): Promise<Patient> { return this.patients.update(id, req.user.organizationId, data); }
}
