import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { PERMISSIONS_KEY } from './permissions.decorator';

function contextFor(user: object, permissions: string[] = ['patient:read']): ExecutionContext {
  const request = { user: { ...user, permissions } };
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe('PermissionsGuard', () => {
  it('allows a request with every required permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['patient:read', 'appointment:read']) } as unknown as Reflector;
    expect(new PermissionsGuard(reflector).canActivate(contextFor({ userId: 'user-a' }, ['patient:read', 'appointment:read']))).toBe(true);
  });

  it('returns a 403 when a required permission is missing', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['patient:update']) } as unknown as Reflector;
    expect(() => new PermissionsGuard(reflector).canActivate(contextFor({ userId: 'user-a' }, ['patient:read']))).toThrow(ForbiddenException);
  });

  it('allows routes without a permission decorator', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    expect(new PermissionsGuard(reflector).canActivate(contextFor({ userId: 'user-a' }, []))).toBe(true);
    expect(PERMISSIONS_KEY).toBe('permissions');
  });
});

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  it('allows a platform administrator', () => {
    expect(guard.canActivate(contextFor({ userId: 'owner-a', isPlatformAdmin: true }))).toBe(true);
  });

  it('returns a 403 for a clinic user even when authenticated', () => {
    expect(() => guard.canActivate(contextFor({ userId: 'owner-a', isPlatformAdmin: false }))).toThrow(ForbiddenException);
  });
});
