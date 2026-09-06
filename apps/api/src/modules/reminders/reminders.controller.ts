import { Controller, Get, Headers, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthContext } from '@clinicos/shared-types';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@Req() req: { user: AuthContext }) {
    return this.reminders.list(req.user.organizationId);
  }

  /** Call this endpoint from a scheduler (for example Vercel Cron). */
  @Post('run')
  async run(@Headers('x-reminder-secret') secret?: string, @Headers('authorization') authorization?: string) {
    const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!this.reminders.isValidWorkerSecret(secret ?? bearer)) throw new UnauthorizedException('Invalid reminder worker secret');
    return this.reminders.run();
  }
}
