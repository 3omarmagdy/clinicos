import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginCredentials, AuthToken } from '@clinicos/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() credentials: LoginCredentials): Promise<AuthToken> {
    return this.authService.login(credentials);
  }
}
