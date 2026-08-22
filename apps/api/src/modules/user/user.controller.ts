import { Body, Controller, Get, Patch, Post, UseGuards, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UserService } from './user.service';
import type { User, AuthContext } from '@clinicos/shared-types';
import { CreateTeamMemberDto, SetTeamMemberPasswordDto } from './user.dto';

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

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('user:update')
  @Patch(':id/password')
  async setTemporaryPassword(@Param('id') id: string, @Body() data: SetTeamMemberPasswordDto, @Req() req: { user: AuthContext }): Promise<{ success: true }> {
    await this.userService.setTeamMemberPassword(req.user.organizationId, id, data.password, req.user.userId);
    return { success: true };
  }
}
