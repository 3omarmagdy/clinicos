import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';

@Module({ imports: [PrismaModule, AuthModule], controllers: [PatientController], providers: [PatientService] })
export class PatientModule {}
