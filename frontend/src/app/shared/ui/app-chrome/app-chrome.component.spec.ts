import { describe, expect, it } from 'vitest';
import { isHeaderRouteActive, shouldCollapseHeaderInitially } from './app-chrome.component';

describe('app chrome navigation state', () => {
  it('keeps entity pages in Archive without masking Articles', () => {
    expect(isHeaderRouteActive('/entities', '/entities/artwork')).toBe(true);
    expect(isHeaderRouteActive('/entities', '/entities/artist')).toBe(true);
    expect(isHeaderRouteActive('/entities', '/entities/article')).toBe(false);
    expect(isHeaderRouteActive('/entities/article', '/entities/article')).toBe(true);
  });

  it('starts every compact route with the menu collapsed', () => {
    expect(shouldCollapseHeaderInitially(true, '/home')).toBe(true);
    expect(shouldCollapseHeaderInitially(true, '/entities/artwork')).toBe(true);
    expect(shouldCollapseHeaderInitially(false, '/home')).toBe(false);
  });
});
