import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('loads the current user from the database and returns the effective role', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'manuel@test3.com',
        name: 'Manuel',
        role: 'ADMIN',
        isBeta: true,
      }),
    };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const strategy = new JwtStrategy(usersService as any, configService as any);

    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'manuel@test3.com',
        role: 'USER',
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      role: 'ADMIN',
      isBeta: true,
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });
});
