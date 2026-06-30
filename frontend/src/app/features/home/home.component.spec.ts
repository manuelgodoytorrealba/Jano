import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AppAppearanceService } from '../../core/app-appearance.service';
import { AdminHomeDecksApi } from '../../core/api/admin-home-decks.api';
import { HomeDeck, HomeDecksApi } from '../../core/api/home-decks.api';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('shows backend empty/error states without inventing fallback decks or images', async () => {
    const response = new Subject<HomeDeck[]>();
    const listPublic = vi.fn(() => response);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: HomeDecksApi, useValue: { listPublic } },
        { provide: AdminHomeDecksApi, useValue: {} },
        { provide: AuthService, useValue: { currentUser: null } },
        { provide: SeoService, useValue: { setPageMeta: vi.fn() } },
        {
          provide: I18nService,
          useValue: { locale: signal('es'), t: (key: string) => key },
        },
        {
          provide: AppAppearanceService,
          useValue: { currentBackgroundImageUrl: () => '/background.jpg' },
        },
      ],
    })
      .overrideComponent(HomeComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    response.next([]);
    expect(component.loadState()).toBe('empty');
    expect(component.deckItems()).toEqual([]);

    response.next([deckWithoutImage]);
    expect(component.loadState()).toBe('ready');
    expect(component.deckItems()[0]?.image).toBe('');

    response.error(new Error('offline'));
    expect(component.loadState()).toBe('error');
    expect(component.deckItems()).toEqual([]);
  });
});

const deckWithoutImage: HomeDeck = {
  id: 'deck-1',
  surface: 'HOME',
  slug: 'artwork',
  title: 'Artworks',
  subtitle: null,
  description: null,
  ctaLabel: null,
  ctaUrl: null,
  ctaRoute: '/entities/artwork',
  image: null,
  sortOrder: 0,
  entities: [],
};
