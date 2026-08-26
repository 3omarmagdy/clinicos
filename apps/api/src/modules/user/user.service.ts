import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@clinicos/shared-types';
import type { CreateTeamMemberDto } from './user.dto';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../subscription/subscription.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, private readonly audit: AuditService, private readonly subscriptions: SubscriptionService) {}

  private toUser(user: {
    id: string;
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    isPlatformAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      ...user,
      role: user.role as User['role'],
      status: user.status as User['status'],
    };
  }

  async getUser(id: string, organizationId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isPlatformAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user ? this.toUser(user) : null;
  }

  async getUserByEmail(email: string, organizationId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, organizationId },
      select: {
        id: true,
        organizationId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isPlatformAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user ? this.toUser(user) : null;
  }

  async listUsers(organizationId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        organizationId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isPlatformAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users.map((user) => this.toUser(user));
  }

  async createTeamMember(organizationId: string, data: CreateTeamMemberDto, actorId?: string): Promise<User> {
    await this.subscriptions.assertLimit(organizationId, 'users');
    if (data.role === 'doctor') await this.subscriptions.assertLimit(organizationId, 'doctors');
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { organizationId, email }, select: { id: true } });
    if (existing) throw new ConflictException('A team member with this email already exists in this clinic');

    const roleName = data.role.charAt(0).toUpperCase() + data.role.slice(1);
    const role = await this.prisma.role.findFirst({ where: { organizationId, name: roleName }, select: { id: true } });
    if (!role) throw new NotFoundException(`Built-in role ${roleName} is not configured for this clinic`);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email,
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role,
        status: 'active',
        userRoles: { create: { roleId: role.id } },
      },
      select: { id: true, organizationId: true, email: true, firstName: true, lastName: true, role: true, status: true, isPlatformAdmin: true, createdAt: true, updatedAt: true },
    });
    await this.audit.log({ organizationId, actorId, action: 'team_member.created', entityType: 'user', entityId: user.id, summary: `Created ${user.role} team member` });
    return this.toUser(user);
  }

  async setTeamMemberPassword(organizationId: string, userId: string, password: string, actorId?: string): Promise<void> {
    await this.subscriptions.assertCanWrite(organizationId);
    const member = await this.prisma.user.findFirst({ where: { id: userId, organizationId }, select: { id: true, role: true } });
    if (!member) throw new NotFoundException('Team member not found in this clinic');
    await this.prisma.user.update({ where: { id: member.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
    await this.audit.log({ organizationId, actorId, action: 'team_member.password_reset', entityType: 'user', entityId: member.id, summary: `Reset ${member.role} team member password` });
  }
}
