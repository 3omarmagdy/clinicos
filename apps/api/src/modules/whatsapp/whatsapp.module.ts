import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppMarketingService } from './whatsapp-marketing.service';
import { WhatsAppService } from './whatsapp.service';
import { MessagingQuotaGuardService } from './messaging-quota-guard.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, SubscriptionModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppMarketingService, MessagingQuotaGuardService],
  exports: [WhatsAppService, WhatsAppMarketingService, MessagingQuotaGuardService],
})
export class WhatsAppModule {}
