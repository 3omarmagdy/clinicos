import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({ imports: [PrismaModule, AuthModule, AuditModule, SubscriptionModule], controllers: [AppointmentController], providers: [AppointmentService] })
export class AppointmentModule {}
