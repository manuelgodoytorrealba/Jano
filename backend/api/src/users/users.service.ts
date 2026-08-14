import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPlan, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: this.normalizeEmail(email),
          mode: 'insensitive',
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  updateProfile(id: string, data: { name?: string | null; avatarUrl?: string | null }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      return tx.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
    });
  }

  async resetPasswordFromToken(tokenHash: string, passwordHash: string): Promise<boolean> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      });
      if (!token) return false;

      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) return false;

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, authVersion: { increment: 1 } },
      });
      return true;
    });
  }

  updatePasswordAndInvalidateSessions(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, authVersion: { increment: 1 } },
    });
  }

  createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      return tx.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });
    });
  }

  async verifyEmailFromToken(
    tokenHash: string,
  ): Promise<'verified' | 'already-verified' | 'invalid'> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        include: { user: true },
      });
      if (!token) return 'invalid';
      if (token.user.emailVerifiedAt) return 'already-verified';
      const used = await tx.emailVerificationToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (used.count !== 1) return 'invalid';
      await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: now } });
      await tx.emailVerificationToken.deleteMany({
        where: { userId: token.userId, id: { not: token.id } },
      });
      return 'verified';
    });
  }

  create(data: {
    email: string;
    passwordHash: string;
    name?: string;
    role?: UserRole;
    plan?: UserPlan;
    isBeta?: boolean;
  }) {
    return this.prisma.user.create({
      data: {
        email: this.normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role ?? UserRole.USER,
        plan: data.plan ?? UserPlan.FREE,
        isBeta: data.isBeta ?? false,
      },
    });
  }
}
