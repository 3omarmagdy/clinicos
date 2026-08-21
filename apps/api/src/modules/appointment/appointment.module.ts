import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

@Module({ imports: [PrismaModule, AuthModule], controllers: [AppointmentController], providers: [AppointmentService] })
export class AppointmentModule {}
