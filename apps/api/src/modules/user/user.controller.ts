import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import type { User, AuthContext } from '@clinicos/shared-types';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: { user: AuthContext }): Promise<User | null> {
    return this.userService.getUser(req.user.userId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async listUsers(@Req() req: { user: AuthContext }): Promise<User[]> {
    return this.userService.listUsers(req.user.organizationId);
  }
}
