import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload, AuthContext } from '@clinicos/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

const cookieToken = (request: { headers?: { cookie?: string } }): string | null => {
  const cookie = request.headers?.cookie;
  if (!cookie) return null;
  const entry = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('clinicos_auth='));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice('clinicos_auth='.length));
  } catch {
    return null;
  }
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieToken, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        organizationId: true,
        role: true,
        status: true,
        isPlatformAdmin: true,
        sessionVersion: true,
        userRoles: {
          select: {
            role: {
              select: {
                permissions: {
                  select: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active' || user.organizationId !== payload.organizationId || user.sessionVersion !== payload.sessionVersion) {
      throw new UnauthorizedException('Your session is no longer active');
    }

    const permissions = new Set<string>();
    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.permissions) permissions.add(rolePermission.permission.code);
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      permissions: Array.from(permissions),
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }
}
