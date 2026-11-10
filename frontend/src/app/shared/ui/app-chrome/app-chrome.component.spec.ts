import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AppAppearanceService } from '../../../core/app-appearance.service';
import { describe, expect, it } from 'vitest';
import {
  AppChromeComponent,
  isHeaderRouteActive,
  shouldCollapseHeaderInitially,
} from './app-chrome.component';

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

describe('app chrome initial detail layout', () => {
  it.each(['/entity/la-traicion-de-las-imagenes', '/research/a-study'])(
    'keeps the header collapsed before initial navigation for %s',
    async (path) => {
      const previous = window.location.pathname + window.location.search;
      window.history.replaceState({}, '', path);
      let fixture: ReturnType<typeof TestBed.createComponent<AppChromeComponent>> | undefined;
      try {
        await TestBed.configureTestingModule({
          imports: [AppChromeComponent],
          providers: [
            provideRouter([]),
            { provide: AuthService, useValue: { user$: of(null) } },
            { provide: I18nService, useValue: { locale: signal('es'), t: (key: string) => key } },
            { provide: AppAppearanceService, useValue: {} },
          ],
        })
          .overrideComponent(AppChromeComponent, { set: { template: '' } })
          .compileComponents();
        fixture = TestBed.createComponent(AppChromeComponent);
        expect(TestBed.inject(Router).navigated).toBe(false);
        expect(fixture.componentInstance.isDetailRoute()).toBe(true);
        expect(fixture.componentInstance.headerCollapsed()).toBe(true);
      } finally {
        fixture?.destroy();
        TestBed.resetTestingModule();
        window.history.replaceState({}, '', previous);
      }
    },
  );
});
