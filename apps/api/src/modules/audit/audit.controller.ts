import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext } from '@clinicos/shared-types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuditService } from './audit.service';

class AuditQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  take?: number;
}

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get() @RequirePermissions('audit:read')
  list(@Req() req: { user: AuthContext }, @Query() query: AuditQueryDto) {
    return this.audit.list(req.user.organizationId, query.take);
  }
}
