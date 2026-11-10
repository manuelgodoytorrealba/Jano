import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { AppAppearanceService, DEFAULT_BACKGROUND_IMAGE_URL } from './app-appearance.service';
import { AppSettingsApi, PublicAppSettings } from './api/app-settings.api';

describe('background loading state', () => {
  let response: Subject<PublicAppSettings>;
  let service: AppAppearanceService;
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined }));
    response = new Subject<PublicAppSettings>();
    TestBed.configureTestingModule({
      providers: [{ provide: AppSettingsApi, useValue: { getPublicSettings: () => response } }],
    });
    service = TestBed.inject(AppAppearanceService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('waits for settings and then keeps the configured background', () => {
    service.load().subscribe();
    expect(service.backgroundSettingsLoaded()).toBe(false);
    response.next({ backgroundImageUrl: '/uploads/app-backgrounds/custom.webp' });
    expect(service.backgroundSettingsLoaded()).toBe(true);
    expect(service.currentBackgroundImageUrl()).toBe('/uploads/app-backgrounds/custom.webp');
    response.complete();
  });
  it('keeps the default background available when settings fail', () => {
    service.load().subscribe();
    response.error(new Error('offline'));
    expect(service.backgroundSettingsLoaded()).toBe(true);
    expect(service.currentBackgroundImageUrl()).toBe(DEFAULT_BACKGROUND_IMAGE_URL);
  });
});
