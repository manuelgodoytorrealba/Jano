import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from './i18n.service';

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
    http.expectOne('/assets/i18n/es.json?v=development').flush({ greeting: 'Hola' });
    http
      .expectOne('/assets/i18n/en.json?v=development')
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
});
