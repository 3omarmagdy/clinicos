import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UserService } from './user.service';
import type { User, AuthContext } from '@clinicos/shared-types';
import { CreateTeamMemberDto } from './user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Get('me')
  async getMe(@Req() req: { user: AuthContext }): Promise<User | null> {
    return this.userService.getUser(req.user.userId, req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('user:read')
  @Get()
  async listUsers(@Req() req: { user: AuthContext }): Promise<User[]> {
    return this.userService.listUsers(req.user.organizationId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('user:create')
  @Post()
  async create(@Body() data: CreateTeamMemberDto, @Req() req: { user: AuthContext }): Promise<User> {
    return this.userService.createTeamMember(req.user.organizationId, data, req.user.userId);
  }
}
