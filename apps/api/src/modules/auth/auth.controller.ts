import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthContext, AuthToken, LoginCredentials } from '@clinicos/shared-types';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setSession(response: Response, token: AuthToken): void {
    const secure = process.env.NODE_ENV === 'production';
    const options = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: token.expiresIn * 1000 };
    response.cookie('clinicos_auth', token.accessToken, options);
    // This is deliberately not a credential. It contains only display hints
    // for the client; every API authorization decision is recomputed server-side.
    const hint = Buffer.from(JSON.stringify(this.authService.getSessionHint(token.accessToken))).toString('base64url');
    response.cookie('clinicos_session', hint, { ...options, httpOnly: false });
  }

  private clearSession(response: Response): void {
    const secure = process.env.NODE_ENV === 'production';
    response.clearCookie('clinicos_auth', { httpOnly: true, secure, sameSite: 'lax', path: '/' });
    response.clearCookie('clinicos_session', { httpOnly: false, secure, sameSite: 'lax', path: '/' });
  }

  @Post('login')
  async login(@Body() credentials: LoginCredentials, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<Pick<AuthToken, 'expiresIn'>> {
    if (
      !credentials ||
      typeof credentials.email !== 'string' ||
      typeof credentials.password !== 'string' ||
      typeof credentials.organizationSlug !== 'string' ||
      !credentials.email.trim() ||
      credentials.email.length > 254 ||
      !credentials.password ||
      credentials.password.length > 128 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(credentials.organizationSlug) ||
      credentials.organizationSlug.length > 80
    ) {
      throw new BadRequestException('Email, password, and clinic code are required');
    }

    const token = await this.authService.login(credentials, request.ip);
    this.setSession(response, token);
    return { expiresIn: token.expiresIn };
  }

  @Post('forgot-password')
  async requestPasswordReset(@Body() data: RequestPasswordResetDto, @Req() request: Request): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(data, request.ip);
  }

  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(data);
  }

  /** Creates an isolated clinic workspace and signs in its first owner. */
  @Post('register-clinic')
  async registerClinic(@Body() data: RegisterClinicDto, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<{ organizationSlug: string; expiresIn: number }> {
    const result = await this.authService.registerClinic(data, request.ip);
    this.setSession(response, result);
    return { organizationSlug: result.organizationSlug, expiresIn: result.expiresIn };
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
  async exchangeGoogleLogin(@Body('code') code: unknown, @Res({ passthrough: true }) response: Response): Promise<Pick<AuthToken, 'expiresIn'>> {
    if (typeof code !== 'string' || !code) throw new BadRequestException('Google login code is required');
    const token = await this.authService.exchangeGoogleLoginCode(code);
    this.setSession(response, token);
    return { expiresIn: token.expiresIn };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() request: Request & { user: AuthContext }, @Res({ passthrough: true }) response: Response): Promise<{ success: true }> {
    await this.authService.revokeSessions(request.user.userId);
    this.clearSession(response);
    return { success: true };
  }
}
