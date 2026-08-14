import { JwtStrategy } from './jwt.strategy';
import type { ConfigService } from '@nestjs/config';
import type { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  it('loads the current user from the database and returns the effective role', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'manuel@test3.com',
        name: 'Manuel',
        avatarUrl: null,
        createdAt: undefined,
        role: 'ADMIN',
        isBeta: true,
        accountStatus: 'ACTIVE',
        authVersion: 0,
      }),
    };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const strategy = new JwtStrategy(
      usersService as Pick<UsersService, 'findById'> as UsersService,
      configService as Pick<ConfigService, 'getOrThrow'> as ConfigService,
    );

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'manuel@test3.com',
        role: 'USER',
        authVersion: 0,
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      avatarUrl: null,
      createdAt: undefined,
      role: 'ADMIN',
      isBeta: true,
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });
});
