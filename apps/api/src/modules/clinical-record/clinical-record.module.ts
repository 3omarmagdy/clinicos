import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClinicalRecordController } from './clinical-record.controller';
import { ClinicalRecordService } from './clinical-record.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ClinicalRecordController],
  providers: [ClinicalRecordService],
})
export class ClinicalRecordModule {}
