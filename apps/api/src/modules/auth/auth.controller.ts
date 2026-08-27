import { BadRequestException, Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { LoginCredentials, AuthToken } from '@clinicos/shared-types';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';

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

  @Post('forgot-password')
  async requestPasswordReset(@Body() data: RequestPasswordResetDto): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(data);
  }

  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(data);
  }

  /** Creates an isolated clinic workspace and signs in its first owner. */
  @Post('register-clinic')
  async registerClinic(@Body() data: RegisterClinicDto): Promise<AuthToken & { organizationSlug: string }> {
    return this.authService.registerClinic(data);
  }

  /** Starts Google OAuth for a known user within one clinic workspace. */
  @Get('google')
  async startGoogleLogin(@Query('organizationSlug') organizationSlug: string, @Res() response: Response): Promise<void> {
    response.redirect(await this.authService.createGoogleAuthorizationUrl(organizationSlug));
  }

  /** Receives Google's callback and redirects to the web app with a one-time code. */
  @Get('google/callback')
  async completeGoogleLogin(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') oauthError: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const loginUrl = this.authService.getFrontendLoginUrl();
    if (oauthError || !code || !state) {
      response.redirect(`${loginUrl}?googleError=cancelled`);
      return;
    }

    try {
      const oneTimeCode = await this.authService.completeGoogleAuthorization(code, state);
      response.redirect(`${this.authService.getFrontendGoogleCallbackUrl()}?code=${encodeURIComponent(oneTimeCode)}`);
    } catch {
      response.redirect(`${loginUrl}?googleError=failed`);
    }
  }

  /** Exchanges a short-lived OAuth code for the normal Clinico access token. */
  @Post('google/exchange')
  async exchangeGoogleLogin(@Body('code') code: unknown): Promise<AuthToken> {
    if (typeof code !== 'string' || !code) throw new BadRequestException('Google login code is required');
    return this.authService.exchangeGoogleLoginCode(code);
  }
}
