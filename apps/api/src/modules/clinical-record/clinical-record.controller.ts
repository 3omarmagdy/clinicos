import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext } from '@clinicos/shared-types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateClinicalRecordDto, UpdateClinicalRecordDto } from './clinical-record.dto';
import { ClinicalRecordService } from './clinical-record.service';

@Controller('patients/:patientId/clinical-records')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ClinicalRecordController {
  constructor(private readonly records: ClinicalRecordService) {}

  @Get() @RequirePermissions('clinical_record:read')
  list(@Param('patientId') patientId: string, @Req() req: { user: AuthContext }) {
    return this.records.list(patientId, req.user.organizationId);
  }

  @Get(':recordId') @RequirePermissions('clinical_record:read')
  get(@Param('patientId') patientId: string, @Param('recordId') recordId: string, @Req() req: { user: AuthContext }) {
    return this.records.get(patientId, recordId, req.user.organizationId);
  }

  @Post() @RequirePermissions('clinical_record:create')
  create(@Param('patientId') patientId: string, @Body() data: CreateClinicalRecordDto, @Req() req: { user: AuthContext }) {
    return this.records.create(patientId, req.user.organizationId, req.user.userId, data);
  }

  @Patch(':recordId') @RequirePermissions('clinical_record:update')
  update(@Param('patientId') patientId: string, @Param('recordId') recordId: string, @Body() data: UpdateClinicalRecordDto, @Req() req: { user: AuthContext }) {
    return this.records.update(patientId, recordId, req.user.organizationId, data);
  }
}
