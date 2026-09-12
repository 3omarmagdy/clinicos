import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from './permissions.guard';
import { EmailService } from './email.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Keep normal navigation and page refreshes signed in. Production
          // can override this with JWT_EXPIRES_IN (for example, 30d).
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') ?? '30d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy, PermissionsGuard],
  exports: [AuthService, EmailService, PermissionsGuard],
})
export class AuthModule {}
