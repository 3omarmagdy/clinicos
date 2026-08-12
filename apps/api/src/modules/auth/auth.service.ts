import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthToken, LoginCredentials, JwtPayload } from '@clinicos/shared-types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const { email, password } = credentials;

    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: user not found - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      this.logger.warn(`Login failed: user inactive - ${email}`);
      throw new UnauthorizedException('User account is inactive');
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      this.logger.warn(`Login failed: invalid password - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Collect permissions from all roles
    const permissions = new Set<string>();
    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.code);
      }
    }

    // Create JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      permissions: Array.from(permissions),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in: ${email}`);

    return {
      accessToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  validateToken(token: string): JwtPayload {
    return this.jwtService.verify(token);
  }
}
