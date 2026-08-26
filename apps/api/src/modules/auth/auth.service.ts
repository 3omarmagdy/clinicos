import { BadRequestException, ConflictException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthToken, LoginCredentials, JwtPayload } from '@clinicos/shared-types';
import type { RegisterClinicDto } from './dto/register-clinic.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

type AuthorizedUser = {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  status: string;
  isPlatformAdmin: boolean;
  organization: { subscriptionStatus: string; trialEndsAt: Date | null; subscriptionEndsAt: Date | null };
  userRoles: Array<{ role: { permissions: Array<{ permission: { code: string } }> } }>;
};

// Keep the OAuth response contract explicit. The API package intentionally
// excludes the DOM library from its TypeScript config, so the ambient
// `Response` type can resolve to Express' server response instead of the
// fetch response returned by Node/Vercel.
type OAuthFetchResponse = {
  ok: boolean;
  json(): Promise<unknown>;
};

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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

    this.assertUserCanSignIn(user);

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      this.logger.warn(`Login failed: invalid password - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.issueToken(user);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    this.logger.log(`User logged in: ${email}`);
    return token;
  }

  private issueToken(user: AuthorizedUser): AuthToken {
    // Collect permissions from all roles.
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

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private assertUserCanSignIn(user: AuthorizedUser): void {
    if (user.status !== 'active') throw new UnauthorizedException('User account is inactive');
    // Expiry does not lock clinicians out of their records. Write operations are
    // centrally restricted by SubscriptionService, while this keeps the tenant
    // able to review and export its own data safely.
  }

  getFrontendLoginUrl(): string {
    return `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/login`;
  }

  getFrontendGoogleCallbackUrl(): string {
    return `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/auth/google/callback`;
  }

  private getGoogleConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI') || 'http://localhost:3001/api/v1/auth/google/callback';
    if (!clientId || !clientSecret) throw new BadRequestException('Google sign-in is not configured');
    return { clientId, clientSecret, redirectUri };
  }

  async createGoogleAuthorizationUrl(organizationSlug: string): Promise<string> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(organizationSlug)) throw new BadRequestException('A valid clinic code is required');
    const { clientId, redirectUri } = this.getGoogleConfig();
    const state = this.jwtService.sign({ purpose: 'google-login', organizationSlug }, { expiresIn: '10m' });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async completeGoogleAuthorization(code: string, state: string): Promise<string> {
    let organizationSlug: string;
    try {
      const decoded = this.jwtService.verify<{ purpose?: string; organizationSlug?: string }>(state);
      if (decoded.purpose !== 'google-login' || !decoded.organizationSlug) throw new Error('Invalid state');
      organizationSlug = decoded.organizationSlug;
    } catch {
      throw new UnauthorizedException('Google login session expired');
    }

    const { clientId, clientSecret, redirectUri } = this.getGoogleConfig();
    const tokenResponse = (await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })) as unknown as OAuthFetchResponse;
    if (!tokenResponse.ok) throw new UnauthorizedException('Google token exchange failed');
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new UnauthorizedException('Google token missing');

    const profileResponse = (await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })) as unknown as OAuthFetchResponse;
    if (!profileResponse.ok) throw new UnauthorizedException('Google profile lookup failed');
    const profile = await profileResponse.json() as { email?: string; email_verified?: boolean };
    if (!profile.email || profile.email_verified !== true) throw new UnauthorizedException('A verified Google email is required');

    const user = await this.prisma.user.findFirst({
      where: { email: profile.email.toLowerCase(), organization: { slug: organizationSlug } },
      include: { organization: { select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true } }, userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user) throw new UnauthorizedException('No matching clinic account exists for this Google email');
    this.assertUserCanSignIn(user);

    const oneTimeCode = randomBytes(32).toString('base64url');
    await this.prisma.oAuthLoginCode.create({
      data: { organizationId: user.organizationId, userId: user.id, codeHash: this.hashCode(oneTimeCode), expiresAt: new Date(Date.now() + 60_000) },
    });
    return oneTimeCode;
  }

  async exchangeGoogleLoginCode(code: string): Promise<AuthToken> {
    const codeHash = this.hashCode(code);
    const record = await this.prisma.oAuthLoginCode.findUnique({
      where: { codeHash },
      include: { user: { include: { organization: { select: { subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true } }, userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new UnauthorizedException('Google login code expired');
    const consumed = await this.prisma.oAuthLoginCode.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (consumed.count !== 1) throw new UnauthorizedException('Google login code already used');
    this.assertUserCanSignIn(record.user);
    await this.prisma.user.update({ where: { id: record.user.id }, data: { lastLoginAt: new Date() } });
    this.logger.log(`User logged in with Google: ${record.user.email}`);
    return this.issueToken(record.user);
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
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
        const subscription = await tx.subscription.create({ data: { organizationId: organization.id, plan: 'FREE_TRIAL', status: 'TRIALING', trialStartedAt: new Date(), trialEndsAt } });
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
        await tx.subscriptionEvent.create({ data: { organizationId: organization.id, subscriptionId: subscription.id, actorId: owner.id, action: 'trial.started', summary: '14-day free trial started' } });
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
