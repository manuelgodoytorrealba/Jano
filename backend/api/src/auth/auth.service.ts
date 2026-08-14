import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AccountStatus, Prisma, UserPlan, UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  EMAIL_VERIFICATION_TOKEN_BYTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_RESET_TOKEN_BYTES,
} from './auth.constants';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    this.assertPasswordByteLength(dto.password);
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user;
    try {
      user = await this.usersService.create({
        email: dto.email,
        passwordHash,
        name: dto.name?.trim() || undefined,
        role: UserRole.USER,
        plan: UserPlan.FREE,
        isBeta: false,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }

    await this.sendEmailVerification(user);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    this.assertPasswordByteLength(dto.password);
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.accountStatus !== AccountStatus.ACTIVE)
      throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildAuthResponse(user);
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const result = await this.usersService.verifyEmailFromToken(this.hashResetToken(dto.token));
    if (result === 'invalid') throw new BadRequestException('Invalid or expired verification link');
    return { status: result };
  }

  async resendEmailVerification(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.emailVerifiedAt) return { status: 'already-verified' };
    await this.sendEmailVerification(user);
    return { status: 'sent' };
  }

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return;

    const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url');
    const expiresInMinutes = this.configService.getOrThrow<number>(
      'PASSWORD_RESET_TOKEN_TTL_MINUTES',
    );
    await this.usersService.createPasswordResetToken(
      user.id,
      this.hashResetToken(token),
      new Date(Date.now() + expiresInMinutes * 60_000),
    );
    const resetUrl = `${this.configService.getOrThrow<string>('APP_PUBLIC_URL')}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await this.mailService.sendPasswordReset({ to: user.email, resetUrl, expiresInMinutes });
    } catch (error) {
      console.error(
        'Password reset email delivery failed',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    this.assertPasswordByteLength(dto.password);
    const updated = await this.usersService.resetPasswordFromToken(
      this.hashResetToken(dto.token),
      await bcrypt.hash(dto.password, 10),
    );
    if (!updated) throw new BadRequestException('Invalid or expired reset link');
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    this.assertPasswordByteLength(dto.currentPassword);
    this.assertPasswordByteLength(dto.newPassword);
    const user = await this.usersService.findById(userId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Invalid current password');
    }
    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('New password must be different');
    await this.usersService.updatePasswordAndInvalidateSessions(
      userId,
      await bcrypt.hash(dto.newPassword, 10),
    );
  }

  async updateProfile(userId: string, name: string | undefined) {
    const user = await this.usersService.updateProfile(userId, {
      ...(name !== undefined ? { name: name.trim() || null } : {}),
    });
    return this.profile(user);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.usersService.updateProfile(userId, { avatarUrl });
    return this.profile(user);
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    isBeta: boolean;
    authVersion: number;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isBeta: user.isBeta,
      authVersion: user.authVersion ?? 0,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.profile(user),
    };
  }

  private profile(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    isBeta: boolean;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isBeta: user.isBeta,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  private assertPasswordByteLength(password: string) {
    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_LENGTH) {
      throw new BadRequestException(`Password must be at most ${PASSWORD_MAX_LENGTH} bytes`);
    }
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendEmailVerification(user: { id: string; email: string }) {
    const expiresInHours = this.configService.getOrThrow<number>(
      'EMAIL_VERIFICATION_TOKEN_TTL_HOURS',
    );
    const token = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('base64url');
    await this.usersService.createEmailVerificationToken(
      user.id,
      this.hashResetToken(token),
      new Date(Date.now() + expiresInHours * 3_600_000),
    );
    const verificationUrl = `${this.configService.getOrThrow<string>('APP_PUBLIC_URL')}/verify-email?token=${encodeURIComponent(token)}`;
    try {
      await this.mailService.sendEmailVerification({
        to: user.email,
        verificationUrl,
        expiresInHours,
      });
    } catch (error) {
      console.error(
        'Email verification delivery failed',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
