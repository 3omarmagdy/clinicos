import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClinicalRecordController } from './clinical-record.controller';
import { ClinicalRecordService } from './clinical-record.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, AuthModule, SubscriptionModule],
  controllers: [ClinicalRecordController],
  providers: [ClinicalRecordService],
})
export class ClinicalRecordModule {}
