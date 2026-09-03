import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext } from '@clinicos/shared-types';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CreateCampaignDto, UpsertWhatsAppConnectionDto, WhatsAppAudienceDto } from './whatsapp.dto';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Get('connection') @RequirePermissions('whatsapp:view')
  status(@Req() req: { user: AuthContext }) { return this.whatsapp.status(req.user.organizationId); }

  @Post('connection') @RequirePermissions('whatsapp:connect')
  connect(@Body() dto: UpsertWhatsAppConnectionDto, @Req() req: { user: AuthContext }) { return this.whatsapp.upsertConnection(req.user.organizationId, dto); }

  @Delete('connection') @RequirePermissions('whatsapp:connect')
  disconnect(@Req() req: { user: AuthContext }) { return this.whatsapp.disconnect(req.user.organizationId); }

  @Get('audience') @RequirePermissions('whatsapp:view')
  audience(@Query() filters: WhatsAppAudienceDto, @Req() req: { user: AuthContext }) { return this.whatsapp.audience(req.user.organizationId, filters); }

  @Get('campaigns') @RequirePermissions('whatsapp:campaign:view')
  list(@Req() req: { user: AuthContext }) { return this.whatsapp.listCampaigns(req.user.organizationId); }

  @Post('campaigns') @RequirePermissions('whatsapp:campaign:create')
  create(@Body() dto: CreateCampaignDto, @Req() req: { user: AuthContext }) { return this.whatsapp.createCampaign(req.user.organizationId, req.user.userId, dto); }

  @Post('campaigns/:id/send') @RequirePermissions('whatsapp:campaign:send')
  send(@Param('id') id: string, @Req() req: { user: AuthContext }) { return this.whatsapp.sendCampaign(req.user.organizationId, id); }
}
