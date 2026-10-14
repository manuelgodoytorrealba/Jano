import { signal } from '@angular/core';
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AppAppearanceService } from './core/app-appearance.service';
import { EntityRouteArtworkTransitionService } from './core/entity-route-artwork-transition.service';
import { ViewportService } from './core/viewport.service';
import { of } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AppAppearanceService,
          useValue: {
            load: () => of(true),
            currentBackgroundImageUrl: () => null,
            resolvedTheme: signal('dark'),
          },
        },
        {
          provide: EntityRouteArtworkTransitionService,
          useValue: {
            cancel: () => undefined,
            isActive: () => false,
          },
        },
        {
          provide: ViewportService,
          useValue: {
            start: () => undefined,
          },
        },
      ],
    })
      .overrideComponent(App, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should expose the app title signal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as { title: () => string };
    expect(app.title()).toBe('jano-web-app');
  });
  it('matches the mobile browser chrome to the detail surface in both themes', () => {
    const media = window.matchMedia('(max-width: 860px)');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true });
    const fixture = TestBed.createComponent(App);
    vi.spyOn(fixture.componentInstance, 'isEntityDetailRoute').mockReturnValue(true);
    fixture.detectChanges();
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#222222',
    );
    TestBed.inject(AppAppearanceService).resolvedTheme.set('light');
    fixture.detectChanges();
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#e7e2d8',
    );
  });
});
