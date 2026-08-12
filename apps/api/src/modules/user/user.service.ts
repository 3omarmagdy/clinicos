import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@clinicos/shared-types';

@Injectable()
export class UserService {

  constructor(private prisma: PrismaService) {}

  async getUser(id: string, organizationId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  }

  async getUserByEmail(email: string, organizationId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        organizationId,
      },
    });
  }

  async listUsers(organizationId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { organizationId },
    });
  }
}
