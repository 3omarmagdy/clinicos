import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import type { AuthContext, Patient } from '@clinicos/shared-types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreatePatientDto, ImportPatientsDto, MarketingAudienceQueryDto, PatientQueryDto, UpdatePatientDto } from './patient.dto';
import { PatientService } from './patient.service';

@Controller('patients')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PatientController {
  constructor(private readonly patients: PatientService) {}

  @Get() @RequirePermissions('patient:read')
  list(@Req() req: { user: AuthContext }, @Query() query: PatientQueryDto): Promise<Patient[]> { return this.patients.list(req.user.organizationId, query.search); }

  @Get('marketing-audience') @RequirePermissions('marketing:export')
  audience(@Req() req: { user: AuthContext }, @Query() query: MarketingAudienceQueryDto) {
    return this.patients.marketingAudience(req.user.organizationId, query);
  }

  @Get('marketing-audience/export') @RequirePermissions('marketing:export')
  async exportAudience(@Req() req: { user: AuthContext }, @Query() query: MarketingAudienceQueryDto, @Res() response: Response) {
    const patients = await this.patients.exportMarketingAudience(req.user.organizationId, query, req.user.userId);
    const escape = (value: string | Date | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = patients.map((patient) => [patient.firstName, patient.lastName, patient.phone, patient.email, patient.gender, patient.city, patient.governorate, patient.dateOfBirth?.toISOString().slice(0, 10) ?? null, patient.leadSource, patient.marketingConsentAt?.toISOString() ?? null].map(escape).join(','));
    const csv = `\uFEFFfirst_name,last_name,phone,email,gender,city,governorate,date_of_birth,lead_source,marketing_consent_at\n${rows.join('\n')}`;
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="clinicos-consented-audience.csv"');
    response.send(csv);
  }

  @Get(':id') @RequirePermissions('patient:read')
  get(@Param('id') id: string, @Req() req: { user: AuthContext }): Promise<Patient> { return this.patients.get(id, req.user.organizationId); }

  @Post() @RequirePermissions('patient:create')
  create(@Body() data: CreatePatientDto, @Req() req: { user: AuthContext }): Promise<Patient> { return this.patients.create(req.user.organizationId, data, req.user.userId); }

  @Post('import') @RequirePermissions('patient:create')
  import(@Body() data: ImportPatientsDto, @Req() req: { user: AuthContext }) {
    return this.patients.import(req.user.organizationId, data.patients, req.user.userId);
  }

  @Post(':id/whatsapp-opt-out') @RequirePermissions('patient:update')
  disableWhatsApp(@Param('id') id: string, @Req() req: { user: AuthContext }): Promise<Patient> { return this.patients.disableWhatsApp(id, req.user.organizationId, req.user.userId); }

  @Patch(':id') @RequirePermissions('patient:update')
  update(@Param('id') id: string, @Body() data: UpdatePatientDto, @Req() req: { user: AuthContext }): Promise<Patient> { return this.patients.update(id, req.user.organizationId, data, req.user.userId); }
}
