import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppMarketingService } from './whatsapp-marketing.service';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppMarketingService],
  exports: [WhatsAppService, WhatsAppMarketingService],
})
export class WhatsAppModule {}
