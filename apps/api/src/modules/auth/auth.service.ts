import { ConflictException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthToken, LoginCredentials, JwtPayload } from '@clinicos/shared-types';
import type { RegisterClinicDto } from './dto/register-clinic.dto';

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
    const { email, password, organizationSlug } = credentials;

    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        organization: { slug: organizationSlug },
      },
      include: {
        organization: {
          select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true },
        },
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

    // A platform owner can always enter the platform console. Clinic users are
    // blocked when their trial/subscription ends, without exposing other tenants.
    if (!user.isPlatformAdmin) {
      const now = new Date();
      const { subscriptionStatus, trialEndsAt, subscriptionEndsAt } = user.organization;
      const hasExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'suspended'
        || (subscriptionStatus === 'trial' && trialEndsAt !== null && trialEndsAt < now)
        || (subscriptionStatus === 'active' && subscriptionEndsAt !== null && subscriptionEndsAt < now);
      if (hasExpired) throw new UnauthorizedException('Clinic subscription is not active');
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
      isPlatformAdmin: user.isPlatformAdmin,
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

  async registerClinic(data: RegisterClinicDto): Promise<AuthToken & { organizationSlug: string }> {
    const clinicName = data.clinicName.trim().replace(/\s+/g, ' ');
    const email = data.email.trim().toLowerCase();
    const baseSlug = clinicName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 42) || 'clinic';

    let organizationSlug = baseSlug;
    for (let suffix = 2; await this.prisma.organization.findUnique({ where: { slug: organizationSlug }, select: { id: true } }); suffix += 1) {
      organizationSlug = `${baseSlug.slice(0, Math.max(1, 42 - String(suffix).length - 1))}-${suffix}`;
    }

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const permissionDefinitions = [
      ['organization:read', 'organization'], ['organization:update', 'organization'], ['audit:read', 'audit'],
      ['user:create', 'user'], ['user:read', 'user'], ['user:update', 'user'], ['user:delete', 'user'],
      ['patient:read', 'patient'], ['patient:create', 'patient'], ['patient:update', 'patient'],
      ['marketing:export', 'marketing'], ['clinical_record:read', 'clinical_record'], ['clinical_record:create', 'clinical_record'], ['clinical_record:update', 'clinical_record'],
      ['appointment:read', 'appointment'], ['appointment:create', 'appointment'], ['appointment:update', 'appointment'],
    ] as const;

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const [code, category] of permissionDefinitions) {
          await tx.permission.upsert({ where: { code }, update: {}, create: { code, category } });
        }
        const organization = await tx.organization.create({
          data: { name: clinicName, slug: organizationSlug, timezone: 'Africa/Cairo', currency: 'EGP', subscriptionPlan: 'trial', subscriptionStatus: 'trial', trialEndsAt },
        });
        const permissions = await tx.permission.findMany({ where: { code: { in: permissionDefinitions.map(([code]) => code) } } });
        const permissionIds = new Map(permissions.map((permission) => [permission.code, permission.id]));
        const rolePermissions: Record<string, string[]> = {
          Owner: permissionDefinitions.map(([code]) => code),
          Admin: permissionDefinitions.map(([code]) => code),
          Doctor: ['patient:read', 'patient:create', 'patient:update', 'clinical_record:read', 'clinical_record:create', 'clinical_record:update', 'appointment:read', 'appointment:create', 'appointment:update'],
          Receptionist: ['patient:read', 'patient:create', 'appointment:read', 'appointment:create', 'appointment:update'],
        };
        const roles = new Map<string, string>();
        for (const [name, codes] of Object.entries(rolePermissions)) {
          const role = await tx.role.create({
            data: { organizationId: organization.id, name, isBuiltIn: true, description: `${name} access` },
          });
          roles.set(name, role.id);
          await tx.rolePermission.createMany({ data: codes.map((code) => ({ roleId: role.id, permissionId: permissionIds.get(code)! })) });
        }
        const passwordHash = await bcrypt.hash(data.password, 12);
        const owner = await tx.user.create({
          data: { organizationId: organization.id, email, passwordHash, firstName: data.firstName.trim(), lastName: data.lastName.trim(), role: 'owner', status: 'active', userRoles: { create: { roleId: roles.get('Owner')! } } },
        });
        await tx.auditLog.create({ data: { organizationId: organization.id, actorId: owner.id, action: 'organization.registered', entityType: 'organization', entityId: organization.id, summary: 'Clinic workspace created with a 14-day trial' } });
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) throw new ConflictException('Unable to create this clinic workspace. Please try again.');
      throw error;
    }

    const token = await this.login({ email, password: data.password, organizationSlug });
    return { ...token, organizationSlug };
  }
}
