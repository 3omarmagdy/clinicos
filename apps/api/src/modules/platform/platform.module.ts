import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [PrismaModule, SubscriptionModule, AuditModule], controllers: [PlatformController], providers: [PlatformService, PlatformAdminGuard] })
export class PlatformModule {}
