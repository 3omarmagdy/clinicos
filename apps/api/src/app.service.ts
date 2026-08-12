import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      message: 'Welcome to ClinicOS API',
      version: process.env.APP_VERSION || '0.0.1',
      status: 'running',
    };
  }
}
