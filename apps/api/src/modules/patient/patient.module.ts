import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({ imports: [PrismaModule, AuthModule, AuditModule, SubscriptionModule], controllers: [PatientController], providers: [PatientService] })
export class PatientModule {}
