import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicEntity } from '../../core/api/entities.models';
import { AuthService } from '../../core/auth/auth.service';
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { NavigationMemoryService } from '../../core/navigation-memory.service';
import { SeoService } from '../../core/seo/seo.service';
import { AppChromeRailService } from '../../shared/ui/app-chrome/app-chrome-rail.service';
import { EntitySavedCollectionsFacade } from './entity-saved-collections.facade';
import { EntityComponent } from './entity.component';

describe('entity route visit memory', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reuses a restored entity without resetting its reading position', () => {
    const entity = { id: 'eco', slug: 'eco', title: 'Eco', type: 'ARTWORK' } as PublicEntity;
    const get = vi.fn(() => of(entity));
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: EntitiesApi, useValue: { get } },
        { provide: AuthService, useValue: {} },
        { provide: SeoService, useValue: { setPageMeta: vi.fn() } },
        { provide: AppChromeRailService, useValue: { setContextualRail: vi.fn() } },
        { provide: I18nService, useValue: { locale: signal('es') } },
        {
          provide: EntitySavedCollectionsFacade,
          useValue: {
            reset: vi.fn(),
            resolveSavedStatus: vi.fn(),
            isSaved: () => false,
            saveLoading: () => false,
            saveStatusResolved: () => true,
          },
        },
        { provide: Router, useValue: { getCurrentNavigation: () => null } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ slug: 'eco' })),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: EntityRouteArtworkTransitionService,
          useValue: { beginArrivalFromState: vi.fn(), resumeForSlug: vi.fn() },
        },
        {
          provide: NavigationMemoryService,
          useValue: {
            read: (slot: string) =>
              slot === 'detail' ? { slug: 'eco', windowY: 900 } : { locale: 'es', entity },
          },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new EntityComponent());
    const entities: Array<PublicEntity | null> = [];
    const subscription = component.entity$.subscribe((value) => entities.push(value));
    TestBed.tick();
    expect(scroll).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(entities.at(-1)?.slug).toBe('eco');
    subscription.unsubscribe();
  });
});
