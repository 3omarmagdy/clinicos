import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload, AuthContext } from '@clinicos/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthContext> {
    // Re-check the account on every request so an administrator can suspend an
    // unknown or abusive account immediately, without waiting for JWT expiry.
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, organizationId: payload.organizationId },
      select: { status: true, email: true },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      userId: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
      permissions: payload.permissions,
      email: user.email,
    };
  }
}
