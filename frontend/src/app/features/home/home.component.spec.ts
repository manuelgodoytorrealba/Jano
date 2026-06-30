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
  it('keeps valid decks during refreshes and shows errors only without content', async () => {
    let response = new Subject<HomeDeck[]>();
    const listPublic = vi.fn(() => response);
    const readCachedPublic = vi.fn(() => undefined as HomeDeck[] | undefined);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: HomeDecksApi, useValue: { listPublic, readCachedPublic } },
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

    fixture.destroy();
    readCachedPublic.mockReturnValue([deckWithoutImage]);
    response = new Subject<HomeDeck[]>();

    const cachedFixture = TestBed.createComponent(HomeComponent);
    cachedFixture.detectChanges();

    expect(cachedFixture.componentInstance.loadState()).toBe('ready');
    expect(cachedFixture.componentInstance.deckItems()).toHaveLength(1);

    response.error(new Error('offline'));
    expect(cachedFixture.componentInstance.loadState()).toBe('ready');
    expect(cachedFixture.componentInstance.deckItems()).toHaveLength(1);

    cachedFixture.destroy();
    readCachedPublic.mockReturnValue(undefined);
    response = new Subject<HomeDeck[]>();

    const emptyFixture = TestBed.createComponent(HomeComponent);
    emptyFixture.detectChanges();
    response.error(new Error('offline'));

    expect(emptyFixture.componentInstance.loadState()).toBe('error');
    expect(emptyFixture.componentInstance.deckItems()).toEqual([]);
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
