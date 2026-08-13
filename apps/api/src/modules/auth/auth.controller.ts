import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginCredentials, AuthToken } from '@clinicos/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() credentials: LoginCredentials): Promise<AuthToken> {
    if (
      !credentials ||
      typeof credentials.email !== 'string' ||
      typeof credentials.password !== 'string' ||
      typeof credentials.organizationSlug !== 'string' ||
      !credentials.email.trim() ||
      !credentials.password ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(credentials.organizationSlug)
    ) {
      throw new BadRequestException('Email, password, and clinic code are required');
    }

    return this.authService.login(credentials);
  }
}
