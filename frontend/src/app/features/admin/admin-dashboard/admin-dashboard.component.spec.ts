import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import { AdminHomeDecksApi } from '../../../core/api/admin-home-decks.api';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  it('builds the desk from the three compact editorial reads', async () => {
    const api = {
      list: vi.fn().mockReturnValue(
        of({
          items: [
            {
              id: 'artist-1',
              slug: 'francisco-de-goya',
              title: 'Francisco de Goya',
              type: 'ARTIST',
              status: 'PUBLISHED',
              editorialSummary: {
                visualSource: 'explicit',
                relationsCount: 4,
                sourcesCount: 2,
                translationStatus: { es: 'complete', en: 'complete' },
              },
            },
            {
              id: 'concept-1',
              slug: 'memoria-cultural',
              title: 'Memoria cultural',
              type: 'CONCEPT',
              status: 'IN_REVIEW',
              editorialSummary: {
                visualSource: 'empty',
                relationsCount: 0,
                sourcesCount: 0,
                translationStatus: { es: 'complete', en: 'partial' },
              },
            },
          ],
          total: 2,
        }),
      ),
      workspaceGraph: vi.fn().mockReturnValue(
        of({
          centerId: 'workspace-center-jano',
          nodes: [
            {
              id: 'workspace-center-jano',
              label: 'JANO',
              type: 'CONCEPT',
              slug: 'workspace-jano',
            },
            {
              id: 'artist-1',
              label: 'Francisco de Goya',
              type: 'ARTIST',
              slug: 'francisco-de-goya',
            },
          ],
          edges: [],
        }),
      ),
    };
    const decksApi = {
      list: vi.fn().mockReturnValue(
        of([
          {
            id: 'deck-1',
            surface: 'RECOMMENDED',
            slug: 'goya',
            title: 'Goya y la crisis moderna',
            entities: [],
            translations: [],
            isActive: true,
            updatedAt: '2026-06-30T12:00:00.000Z',
          },
        ]),
      ),
    };

    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        { provide: AdminEntitiesApi, useValue: api },
        { provide: AdminHomeDecksApi, useValue: decksApi },
      ],
    });
    const component = TestBed.createComponent(AdminDashboardComponent).componentInstance;
    const vm = await firstValueFrom(
      component.vm$.pipe(
        filter(
          (value) =>
            value.recent.state === 'ready' &&
            value.decks.state === 'ready' &&
            value.graph.state === 'ready',
        ),
      ),
    );

    component.graphExpanded.set(false);
    await component.toggleGraphFocus();
    expect(component.graphFocusMode()).toBe(true);
    expect(component.graphExpanded()).toBe(true);
    component.exitGraphFocus();
    expect(component.graphFocusMode()).toBe(false);

    expect(api.list).toHaveBeenCalledOnce();
    expect(api.list).toHaveBeenCalledWith({
      page: 1,
      limit: 8,
      sort: 'updated',
    });
    expect(api.workspaceGraph).toHaveBeenCalledOnce();
    expect(decksApi.list).toHaveBeenCalledOnce();
    expect(vm.sidebarGroups[0].items[0].count).toBe(1);
    expect(vm.attention).toEqual([
      expect.objectContaining({
        signals: ['Sin imagen', 'Sin fuentes', 'Sin conexiones', 'EN pendiente'],
      }),
    ]);
  });
});
