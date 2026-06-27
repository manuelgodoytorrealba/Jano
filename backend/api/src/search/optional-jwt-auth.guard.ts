import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../auth/authenticated-user.type';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      const request = context.switchToHttp().getRequest();
      request.user = null;
    }

    return true;
  }

  handleRequest<TUser extends AuthenticatedUser | null>(_err: unknown, user: TUser): TUser | null {
    return user ?? null;
  }
}
