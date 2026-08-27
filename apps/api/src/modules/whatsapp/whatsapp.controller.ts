import { Body, Controller, Get, Headers, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { AuthContext } from '@clinicos/shared-types';
import { CreateMarketingCampaignDto, SendMarketingCampaignDto } from './marketing.dto';
import { WhatsAppMarketingService } from './whatsapp-marketing.service';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService, private readonly marketing: WhatsAppMarketingService) {}

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

  @Get('campaigns')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('marketing:send')
  listCampaigns(@Req() req: { user: AuthContext }) {
    return this.marketing.list(req.user.organizationId);
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
  status() {
    return this.whatsapp.status();
  }
}
