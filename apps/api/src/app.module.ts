import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';
import { PatientModule } from './modules/patient/patient.module';
import { ClinicalRecordModule } from './modules/clinical-record/clinical-record.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validate: (config) => {
        const isProduction = config.NODE_ENV === 'production';
        const required = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];
        for (const key of required) {
          if (!config[key]) throw new Error(`Missing required environment variable: ${key}`);
        }
        if (isProduction && (config.JWT_SECRET === 'dev_jwt_secret_change_in_production' || String(config.JWT_SECRET).length < 32)) {
          throw new Error('JWT_SECRET must be a unique secret of at least 32 characters in production');
        }
        if (isProduction && (!config.FRONTEND_URL.startsWith('https://') || config.FRONTEND_URL.includes('localhost'))) {
          throw new Error('FRONTEND_URL must be an HTTPS public URL in production');
        }
        return config;
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationModule,
    UserModule,
    PatientModule,
    ClinicalRecordModule,
    AppointmentModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
