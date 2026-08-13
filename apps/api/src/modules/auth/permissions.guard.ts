import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthContext } from '@clinicos/shared-types';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();
    const grantedPermissions = request.user?.permissions ?? [];
    const allowed = requiredPermissions.every((permission) => grantedPermissions.includes(permission));

    if (!allowed) throw new ForbiddenException('You do not have permission to perform this action');
    return true;
  }
}
