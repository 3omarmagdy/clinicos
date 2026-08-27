import { Controller, Get, Headers, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Post('reminders/run')
  runReminders(@Headers('authorization') authorization?: string) {
    const expected = process.env.WHATSAPP_CRON_SECRET;
    if (!expected || authorization !== `Bearer ${expected}`) throw new UnauthorizedException('Invalid automation credential');
    return this.whatsapp.runDueReminders();
  }

  @Get('reminders/run')
  runRemindersFromVercelCron(@Headers('authorization') authorization?: string) {
    return this.runReminders(authorization);
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('organization:read')
  status() {
    return this.whatsapp.status();
  }
}
