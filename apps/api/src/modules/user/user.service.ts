import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@clinicos/shared-types';
import type { CreateTeamMemberDto } from './user.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private toUser(user: {
    id: string;
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return users.map((user) => this.toUser(user));
  }

  async createTeamMember(organizationId: string, data: CreateTeamMemberDto): Promise<User> {
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
      select: { id: true, organizationId: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true, updatedAt: true },
    });
    return this.toUser(user);
  }
}
