import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
@Module({ imports: [PrismaModule, AuditModule, AuthModule], controllers: [SubscriptionController], providers: [SubscriptionService], exports: [SubscriptionService] })
export class SubscriptionModule {}
