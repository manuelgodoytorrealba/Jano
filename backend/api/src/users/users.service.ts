import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

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

  create(data: {
    email: string;
    passwordHash: string;
    name?: string;
    role?: UserRole;
    isBeta?: boolean;
  }) {
    return this.prisma.user.create({
      data: {
        email: this.normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role ?? UserRole.USER,
        isBeta: data.isBeta ?? false,
      },
    });
  }
}
