import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';

@Module({ imports: [PrismaModule, AuthModule, AuditModule], controllers: [PatientController], providers: [PatientService] })
export class PatientModule {}
