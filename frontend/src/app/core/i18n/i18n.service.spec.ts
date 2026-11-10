import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18N_RELEASE } from './i18n-release';
import { I18nService, SSR_ASSET_ORIGIN } from './i18n.service';
import { PLATFORM_ID, REQUEST } from '@angular/core';

describe('I18nService', () => {
  let service: I18nService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('jano.locale', 'es');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), I18nService],
    });
    service = TestBed.inject(I18nService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  function load() {
    service.load().subscribe();
    http.expectOne(`/assets/i18n/es.json?v=${I18N_RELEASE}`).flush({ greeting: 'Hola' });
    http
      .expectOne(`/assets/i18n/en.json?v=${I18N_RELEASE}`)
      .flush({ greeting: 'Hello', englishOnly: 'English only' });
  }

  it('loads both dictionaries and updates translations immediately when the locale changes', () => {
    load();

    expect(service.t('greeting')).toBe('Hola');
    service.setLocale('en');
    expect(service.locale()).toBe('en');
    expect(service.t('greeting')).toBe('Hello');
    expect(localStorage.getItem('jano.locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps the active locale only and exposes missing keys instead of blank UI', () => {
    load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(service.t('englishOnly')).toBe('[englishOnly]');
    expect(service.t('missing.key')).toBe('[missing.key]');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('normalizes browser and unsupported locale values to supported locales', () => {
    expect(service.normalizeLocale('en-GB')).toBe('en');
    expect(service.normalizeLocale('fr-FR')).toBe('es');
    service.setLocale('fr');
    expect(service.locale()).toBe('es');
  });

  it('loads server dictionaries internally instead of requesting the public proxy', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        I18nService,
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: new Request('https://jano.manuelgodoy.eu/home') },
        { provide: SSR_ASSET_ORIGIN, useValue: 'http://127.0.0.1:4200' },
      ],
    });
    service = TestBed.inject(I18nService);
    http = TestBed.inject(HttpTestingController);
    service.load().subscribe();
    http
      .expectOne(`http://127.0.0.1:4200/assets/i18n/es.json?v=${I18N_RELEASE}`)
      .flush({ greeting: 'Hola' });
    http
      .expectOne(`http://127.0.0.1:4200/assets/i18n/en.json?v=${I18N_RELEASE}`)
      .flush({ greeting: 'Hello' });
    expect(service.t('greeting')).toBe('Hola');
  });
});
