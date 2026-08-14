import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { AccountStatus } from '@prisma/client';

function tokenFromCookie(request: { headers?: { cookie?: string } } | undefined): string | null {
  const cookieHeader = request?.headers?.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((item) => item.trim());
  const tokenCookie = cookies.find((item) => item.startsWith('jano_access_token='));
  if (!tokenCookie) return null;

  return decodeURIComponent(tokenCookie.slice('jano_access_token='.length));
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    const jwtSecret = configService.getOrThrow<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        tokenFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: string; email: string; role: string; authVersion?: number }) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.accountStatus !== AccountStatus.ACTIVE)
      throw new UnauthorizedException('Account unavailable');
    if ((payload.authVersion ?? 0) !== user.authVersion) {
      throw new UnauthorizedException('Session invalidated');
    }

    return {
      userId: user.id,
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      avatarUrl: user.avatarUrl ?? null,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      role: user.role,
      isBeta: user.isBeta,
    };
  }
}
