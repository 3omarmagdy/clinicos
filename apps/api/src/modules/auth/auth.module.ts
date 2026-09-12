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

function parseJwtLifetime(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(\d+)([mhd])$/.exec(value.trim().toLowerCase());
  if (!match) return 30 * 24 * 60 * 60;
  const amount = Number(match[1]);
  const multiplier = match[2] === 'd' ? 24 * 60 * 60 : match[2] === 'h' ? 60 * 60 : 60;
  return amount * multiplier;
}

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
          // jsonwebtoken accepts a numeric lifetime in seconds. Converting the
          // configurable value here also keeps this compatible with its strict
          // TypeScript `SignOptions` type.
          expiresIn: parseJwtLifetime(configService.get<string>('JWT_EXPIRES_IN') ?? '30d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy, PermissionsGuard],
  exports: [AuthService, EmailService, PermissionsGuard],
})
export class AuthModule {}
