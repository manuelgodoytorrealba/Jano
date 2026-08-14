import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateProfile: jest.fn(),
    createPasswordResetToken: jest.fn(),
    resetPasswordFromToken: jest.fn(),
    updatePasswordAndInvalidateSessions: jest.fn(),
    createEmailVerificationToken: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn((key: string) =>
      key === 'PASSWORD_RESET_TOKEN_TTL_MINUTES' || key === 'EMAIL_VERIFICATION_TOKEN_TTL_HOURS'
        ? 45
        : 'http://localhost:4200',
    ),
  };
  const mailService = { sendPasswordReset: jest.fn(), sendEmailVerification: jest.fn() };

  beforeEach(async () => {
    usersService.findByEmail.mockReset();
    usersService.create.mockReset();
    usersService.findById.mockReset();
    usersService.updateProfile.mockReset();
    usersService.createPasswordResetToken.mockReset();
    usersService.resetPasswordFromToken.mockReset();
    usersService.updatePasswordAndInvalidateSessions.mockReset();
    usersService.createEmailVerificationToken.mockReset();
    mailService.sendPasswordReset.mockReset();
    mailService.sendEmailVerification.mockReset();
    jwtService.signAsync.mockReset();
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
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
      avatarUrl: null,
      role: 'ADMIN',
      isBeta: true,
      authVersion: 0,
      accountStatus: 'ACTIVE',
      createdAt: new Date('2026-01-01'),
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
        avatarUrl: null,
        role: 'ADMIN',
        isBeta: true,
        createdAt: new Date('2026-01-01'),
      },
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'manuel@test3.com',
      role: 'ADMIN',
      isBeta: true,
      authVersion: 0,
    });
  });

  it('normalizes email before lookup during login', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      avatarUrl: null,
      role: 'ADMIN',
      isBeta: true,
      accountStatus: 'ACTIVE',
      createdAt: new Date('2026-01-01'),
      passwordHash,
    });

    await service.login({
      email: '  MANUEL@TEST3.COM  ',
      password: 'secret123',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('  MANUEL@TEST3.COM  ');
  });

  it('registers a normalized USER on the FREE plan with a bcrypt password hash', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockImplementation(async (data) => ({
      id: 'user-1',
      email: data.email,
      name: data.name ?? null,
      avatarUrl: null,
      role: data.role,
      isBeta: data.isBeta,
      createdAt: new Date('2026-01-01'),
    }));

    await service.register({
      email: '  NEW@EXAMPLE.COM ',
      password: 'password-123',
      name: '  New user  ',
    });

    const createData = usersService.create.mock.calls[0][0];
    expect(createData).toMatchObject({
      email: '  NEW@EXAMPLE.COM ',
      name: 'New user',
      role: 'USER',
      plan: 'FREE',
      isBeta: false,
    });
    expect(createData.passwordHash).not.toBe('password-123');
    await expect(bcrypt.compare('password-123', createData.passwordHash)).resolves.toBe(true);
  });

  it('rejects duplicate registration before creating a user', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({ email: 'existing@example.com', password: 'password-123' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('rejects passwords whose UTF-8 bytes would exceed bcrypts limit', async () => {
    await expect(
      service.register({ email: 'bytes@example.com', password: '😀'.repeat(19) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('uses the same generic error for an unknown email and a wrong password', async () => {
    usersService.findByEmail.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: 'missing@example.com', password: 'password-123' }),
    ).rejects.toEqual(new UnauthorizedException('Invalid credentials'));

    usersService.findByEmail.mockResolvedValueOnce({
      passwordHash: await bcrypt.hash('another-password', 10),
    });
    await expect(
      service.login({ email: 'known@example.com', password: 'password-123' }),
    ).rejects.toEqual(new UnauthorizedException('Invalid credentials'));
  });

  it('allows login regardless of beta flag', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      avatarUrl: null,
      role: 'USER',
      isBeta: false,
      accountStatus: 'ACTIVE',
      createdAt: new Date('2026-01-01'),
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

  it('trims the visible profile name before persisting it', async () => {
    usersService.updateProfile.mockResolvedValue({
      id: 'user-1',
      email: 'manuel@test3.com',
      name: 'Manuel',
      avatarUrl: null,
      role: 'USER',
      isBeta: false,
      createdAt: new Date('2026-01-01'),
    });

    await expect(service.updateProfile('user-1', '  Manuel  ')).resolves.toMatchObject({
      id: 'user-1',
      name: 'Manuel',
    });
    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', { name: 'Manuel' });
  });

  it('hashes reset tokens before persistence and only sends the original in email', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });

    await service.requestPasswordReset({ email: 'user@example.com' });

    const tokenHash = usersService.createPasswordResetToken.mock.calls[0][1];
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    const resetUrl = mailService.sendPasswordReset.mock.calls[0][0].resetUrl as string;
    expect(resetUrl).toContain('/reset-password?token=');
    expect(resetUrl).not.toContain(tokenHash);
  });

  it('rejects an invalid reset token and updates a valid one with a bcrypt hash', async () => {
    usersService.resetPasswordFromToken.mockResolvedValueOnce(false);
    await expect(
      service.resetPassword({ token: 'invalid', password: 'new-password' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    usersService.resetPasswordFromToken.mockResolvedValueOnce(true);
    await service.resetPassword({ token: 'valid', password: 'new-password' });
    const passwordHash = usersService.resetPasswordFromToken.mock.calls[1][1];
    await expect(bcrypt.compare('new-password', passwordHash)).resolves.toBe(true);
  });

  it('requires the current password before changing it', async () => {
    usersService.findById.mockResolvedValue({
      passwordHash: await bcrypt.hash('current-password', 10),
    });
    await service.changePassword('user-1', {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });
    expect(usersService.updatePasswordAndInvalidateSessions).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
    );
  });
});
