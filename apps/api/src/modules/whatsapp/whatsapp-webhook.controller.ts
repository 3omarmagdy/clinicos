import { Body, Controller, Get, Headers, HttpCode, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { WhatsAppService } from './whatsapp.service';

// Keep the documented webhook URL and the legacy URL working during rollout.
@Controller(['webhooks/whatsapp', 'whatsapp/webhook'])
export class WhatsAppWebhookController {
  constructor(private readonly config: ConfigService, private readonly whatsapp: WhatsAppService) {}

  @Get()
  verify(@Query('hub.mode') mode?: string, @Query('hub.verify_token') token?: string, @Query('hub.challenge') challenge?: string) {
    const expected = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && expected && token === expected && challenge) return challenge;
    throw new UnauthorizedException('Webhook verification failed');
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() body: unknown, @Headers('x-hub-signature-256') signature: string | undefined, @Req() request: Request & { rawBody?: Buffer }) {
    const secret = this.config.get<string>('WHATSAPP_APP_SECRET');
    if (secret) {
      const raw = request.rawBody;
      if (!raw || !signature?.startsWith('sha256=')) throw new UnauthorizedException('Invalid webhook signature');
      const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
      if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new UnauthorizedException('Invalid webhook signature');
    }
    await this.whatsapp.handleWebhook(body);
    return { received: true };
  }
}
