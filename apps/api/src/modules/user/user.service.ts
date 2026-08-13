import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@clinicos/shared-types';

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
}