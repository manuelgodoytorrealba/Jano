import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    usersService.findByEmail.mockReset();
    usersService.create.mockReset();
    usersService.findById.mockReset();
    jwtService.signAsync.mockReset();
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('logs in with a bcrypt password hash and returns a token payload with role', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      role: 'ADMIN',
      isBeta: true,
      passwordHash,
    });

    await expect(
      service.login({
        email: 'manuel@test3.com',
        password: 'secret123',
      }),
    ).resolves.toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'user-1',
        email: 'manuel@test3.com',
        name: 'Manuel',
        role: 'ADMIN',
        isBeta: true,
      },
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'manuel@test3.com',
      role: 'ADMIN',
      isBeta: true,
    });
  });

  it('normalizes email before lookup during login', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      role: 'ADMIN',
      isBeta: true,
      passwordHash,
    });

    await service.login({
      email: '  MANUEL@TEST3.COM  ',
      password: 'secret123',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('  MANUEL@TEST3.COM  ');
  });

  it('allows login regardless of beta flag', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      role: 'USER',
      isBeta: false,
      passwordHash,
    });

    await expect(
      service.login({
        email: 'manuel@test3.com',
        password: 'secret123',
      }),
    ).resolves.toMatchObject({
      user: {
        id: 'user-1',
        email: 'manuel@test3.com',
        role: 'USER',
        isBeta: false,
      },
    });
  });
});
