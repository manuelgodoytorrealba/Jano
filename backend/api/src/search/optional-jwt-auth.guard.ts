import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

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

  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser | null {
    return user ?? null;
  }
}
