import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthCheckResponse } from '@clinicos/shared-types';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '0.0.1',
    };
  }
}
