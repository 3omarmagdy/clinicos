import { Body, Controller, Get, Headers, Param, Post, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { AuthContext } from '@clinicos/shared-types';
import { CreateMarketingCampaignDto, SendMarketingCampaignDto, UpsertWhatsAppIntegrationDto } from './marketing.dto';
import { WhatsAppMarketingService } from './whatsapp-marketing.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppIntegrationService } from './whatsapp-integration.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService, private readonly marketing: WhatsAppMarketingService, private readonly integrations: WhatsAppIntegrationService) {}

  @Get('webhook')
  async verifyWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    if (mode !== 'subscribe' || !verifyToken || !challenge) throw new UnauthorizedException('Invalid WhatsApp webhook verification');
    const integration = await this.integrations.getByVerifyToken(verifyToken);
    if (!integration) throw new UnauthorizedException('Invalid WhatsApp webhook verification');
    return challenge;
  }

  @Post('webhook')
  receiveWebhook(
    @Body() body: unknown,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() request: Request,
  ) {
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;
    return this.whatsapp.handleWebhook(body, rawBody, signature);
  }

  @Post('reminders/run')
  runReminders(@Headers('authorization') authorization?: string) {
    const expected = process.env.CRON_SECRET || process.env.WHATSAPP_CRON_SECRET;
    if (!expected || authorization !== `Bearer ${expected}`) throw new UnauthorizedException('Invalid automation credential');
    return this.whatsapp.runDueReminders();
  }

  @Get('reminders/run')
  runRemindersFromVercelCron(@Headers('authorization') authorization?: string) {
    return this.runReminders(authorization);
  }

  @Get('integration')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:read')
  integrationSummary(@Req() req: { user: AuthContext }) {
    return this.integrations.summary(req.user.organizationId);
  }

  @Put('integration')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:update')
  async upsertIntegration(@Body() data: UpsertWhatsAppIntegrationDto, @Req() req: { user: AuthContext }) {
    await this.integrations.upsert(req.user.organizationId, data);
    return { saved: true };
  }

  @Get('messages')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:read')
  listMessages(@Req() req: { user: AuthContext }) {
    return this.whatsapp.listMessages(req.user.organizationId);
  }

  @Get('campaigns')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('marketing:send')
  listCampaigns(@Req() req: { user: AuthContext }) {
    return this.marketing.list(req.user.organizationId);
  }

  @Get('quota-violations')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('marketing:send')
  listQuotaViolations(@Req() req: { user: AuthContext }) {
    return this.marketing.listQuotaViolations(req.user.organizationId);
  }

  @Post('campaigns/preview')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('marketing:send')
  previewCampaign(@Body() data: CreateMarketingCampaignDto, @Req() req: { user: AuthContext }) {
    return this.marketing.preview(req.user.organizationId, data);
  }

  @Post('campaigns')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('marketing:send')
  createCampaign(@Body() data: CreateMarketingCampaignDto, @Req() req: { user: AuthContext }) {
    return this.marketing.create(req.user.organizationId, req.user.userId, data);
  }

  @Post('campaigns/:id/send')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('marketing:send')
  sendCampaign(@Param('id') id: string, @Body() data: SendMarketingCampaignDto, @Req() req: { user: AuthContext }) {
    return this.marketing.send(req.user.organizationId, req.user.userId, id, data);
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:read')
  status(@Req() req: { user: AuthContext }) {
    return this.whatsapp.status(req.user.organizationId);
  }
}
