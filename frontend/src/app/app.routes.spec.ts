import { describe, expect, it } from 'vitest';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { routes } from './app.routes';

describe('route access policy', () => {
  const route = (path: string) => routes.find((item) => item.path === path);

  it('leaves discovery routes public', () => {
    for (const path of [
      'home',
      'search',
      'entities',
      'entities/:type',
      'entity/:slug',
      'research',
    ]) {
      expect(route(path)?.canActivate).toBeUndefined();
    }
  });

  it('keeps personal routes authenticated and admin routes admin-only', () => {
    for (const path of ['my-space', 'collections/:id', 'profile', 'settings']) {
      expect(route(path)?.canActivate).toEqual([authGuard]);
    }
    expect(route('admin')?.canActivate).toEqual([adminGuard]);
  });
});
