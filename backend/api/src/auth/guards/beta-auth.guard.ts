import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { PUBLIC_ROUTE_KEY } from '../public.decorator';

@Injectable()
export class BetaAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = super.canActivate(context);

    if (result instanceof Promise) {
      return result.then((allowed) => this.ensureBeta(context, allowed));
    }

    if (result instanceof Observable) {
      return new Observable<boolean>((subscriber) => {
        const subscription = result.subscribe({
          next: (allowed) => {
            try {
              subscriber.next(this.ensureBeta(context, allowed));
              subscriber.complete();
            } catch (error) {
              subscriber.error(error);
            }
          },
          error: (error) => subscriber.error(error),
        });

        return () => subscription.unsubscribe();
      });
    }

    return this.ensureBeta(context, result);
  }

  private ensureBeta(context: ExecutionContext, allowed: boolean): boolean {
    if (!allowed) return false;

    const request = context.switchToHttp().getRequest();

    if (request.user?.isBeta !== true) {
      throw new ForbiddenException('Private beta access required');
    }

    return true;
  }
}
