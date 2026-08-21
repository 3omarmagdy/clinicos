import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthContext } from '@clinicos/shared-types';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();
    if (request.user?.isPlatformAdmin) return true;
    throw new ForbiddenException('Platform administrator access is required');
  }
}
