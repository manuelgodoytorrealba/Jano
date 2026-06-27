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
});
