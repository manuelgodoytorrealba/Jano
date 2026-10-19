import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of } from 'rxjs';
import { ResearchApi } from '../../core/api/research.api';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { EntitiesExplorer3dComponent } from '../entities-explorer-3d/entities-explorer-3d.component';
import { EntitiesExplorerTotemComponent } from '../entities-explorer-totem/entities-explorer-totem.component';
import { EntitiesListFilterRailComponent } from '../entities/entities-list-filter-rail.component';
import { ResearchPublicationsComponent } from './research-publications.component';

describe('ResearchPublicationsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ResearchPublicationsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ResearchApi,
          useValue: {
            listPublished: () =>
              of([
                {
                  id: 'research-1',
                  title: 'Materia y memoria',
                  objective: 'Una lectura editorial.',
                  scope: null,
                  coverImageUrl: '/cover.jpg',
                  status: 'PUBLISHED',
                  lastActiveAt: '2026-08-10',
                  updatedAt: '2026-08-11',
                  publishedAt: '2026-08-12',
                },
              ]),
          },
        },
      ],
    }).overrideComponent(ResearchPublicationsComponent, {
      remove: {
        imports: [
          EntitiesExplorer3dComponent,
          EntitiesExplorerTotemComponent,
          EntitiesListFilterRailComponent,
          JanoMediaComponent,
        ],
      },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    });
  });

  it('adapts published data and keeps the deck stable while changing the active card', () => {
    const component = TestBed.runInInjectionContext(() => new ResearchPublicationsComponent());
    const deck = component.items()!;
    const [publication] = deck;

    expect(publication.resolvedMedia?.card?.url).toBe('/cover.jpg');
    expect(publication.resolvedMedia?.['explorer3d']).toMatchObject({ url: '/cover.jpg' });
    expect(publication.slug).toBe('research-1');
    expect(publication.contentLevel).toBeUndefined();
    component.activeIndex.set(1);
    expect(component.items()).toBe(deck);
    component.filter('memoria');
    expect(component.items()).toEqual([publication]);
    component.filter('sin coincidencias');
    expect(component.items()).toEqual([]);
  });

  it('waits for published data before showing an empty catalog', () => {
    const publications = new Subject<[]>();
    TestBed.overrideProvider(ResearchApi, { useValue: { listPublished: () => publications } });
    const component = TestBed.runInInjectionContext(() => new ResearchPublicationsComponent());
    expect(component.items()).toBeNull();
    publications.next([]);
    expect(component.items()).toEqual([]);
  });

  it('uses the vertical home deck only on mobile and preserves the desktop explorer', () => {
    const fixture = TestBed.createComponent(ResearchPublicationsComponent);
    fixture.componentInstance.isMobile.set(true);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const totem = host.querySelector('app-entities-explorer-totem');
    expect(totem).not.toBeNull();
    expect(totem?.getAttribute('routePrefix')).toBe('/research');
    expect(totem?.getAttribute('openActionKey')).toBe('research.publication.open');
    expect(host.querySelector('app-entities-explorer-3d')).toBeNull();

    fixture.componentInstance.isMobile.set(false);
    fixture.detectChanges();
    expect(host.querySelector('app-entities-explorer-totem')).toBeNull();
    expect(host.querySelector('app-entities-explorer-3d')).not.toBeNull();
  });

  it('opens research destinations for a card, a tap and an artwork payload', () => {
    const component = TestBed.runInInjectionContext(() => new ResearchPublicationsComponent());
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.open(component.items()![0]);
    component.open('research-2');
    component.open({
      slug: 'research-3',
      title: 'Una investigación',
      imageUrl: '/cover.jpg',
      sourceBounds: { left: 0, top: 0, width: 100, height: 100 },
      sourceSurface: 'explorer-totem',
    });
    expect(navigate.mock.calls).toEqual([
      [['/research', 'research-1']],
      [['/research', 'research-2']],
      [['/research', 'research-3']],
    ]);
  });

  it('keeps the information panel closed when returning to Explorer', () => {
    const component = TestBed.runInInjectionContext(() => new ResearchPublicationsComponent());
    component.infoOpen.set(false);
    component.setView('explore');
    expect(component.infoOpen()).toBe(false);
  });
});
