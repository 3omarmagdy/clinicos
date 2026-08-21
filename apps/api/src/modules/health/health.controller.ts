import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthCheckResponse } from '@clinicos/shared-types';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }
}
