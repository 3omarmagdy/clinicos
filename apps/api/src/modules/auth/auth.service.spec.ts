import { AuthService } from './auth.service';

describe('AuthService login protection', () => {
  it('stops repeated login attempts before looking up the account', async () => {
    const prisma = {
      authLoginFailure: { count: jest.fn().mockResolvedValue(8), create: jest.fn(), deleteMany: jest.fn() },
      user: { findFirst: jest.fn() },
    };
    const service = new AuthService(prisma as never, {} as never, {} as never, {} as never);

    await expect(service.login({ email: 'doctor@example.com', password: 'wrong-password', organizationSlug: 'clinic-one' }, '127.0.0.1')).rejects.toThrow('Too many login attempts');
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
