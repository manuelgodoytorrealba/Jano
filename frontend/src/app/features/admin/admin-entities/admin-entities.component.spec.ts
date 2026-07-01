import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, filter, firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import { AdminEntitiesComponent } from './admin-entities.component';

describe('AdminEntitiesComponent', () => {
  it('loads the archive from URL state and preserves that URL as the editor return target', async () => {
    const queryParamMap = new BehaviorSubject(
      convertToParamMap({
        q: 'memoria',
        type: 'ARTWORK',
        status: 'DRAFT',
        sort: 'title',
        page: '2',
      }),
    );
    const api = {
      list: vi.fn().mockReturnValue(
        of({
          items: [],
          total: 31,
          page: 2,
          limit: 24,
          totalPages: 2,
        }),
      ),
      remove: vi.fn(),
    };
    const router = {
      url: '/admin/entities?q=memoria&type=ARTWORK&status=DRAFT&sort=title&page=2',
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [AdminEntitiesComponent],
      providers: [
        { provide: AdminEntitiesApi, useValue: api },
        { provide: ActivatedRoute, useValue: { queryParamMap } },
        { provide: Router, useValue: router },
      ],
    });
    const component = TestBed.createComponent(AdminEntitiesComponent).componentInstance;

    const vm = await firstValueFrom(component.vm$.pipe(filter((value) => value.state === 'ready')));

    expect(api.list).toHaveBeenCalledWith({
      page: 2,
      limit: 24,
      sort: 'title',
      q: 'memoria',
      type: 'ARTWORK',
      status: 'DRAFT',
    });
    expect(vm.totalPages).toBe(2);
    expect(component.adminListReturnUrl()).toBe(router.url);
  });

  it('writes filter, pagination and debounced search changes back to the URL', () => {
    vi.useFakeTimers();
    const queryParamMap = new BehaviorSubject(convertToParamMap({}));
    const route = { queryParamMap };
    const router = {
      url: '/admin/entities',
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [AdminEntitiesComponent],
      providers: [
        {
          provide: AdminEntitiesApi,
          useValue: { list: vi.fn().mockReturnValue(of({ items: [], total: 0 })) },
        },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
      ],
    });
    const component = TestBed.createComponent(AdminEntitiesComponent).componentInstance;

    component.setType('ARTIST');
    component.goToPage(3, 5);
    component.onSearchChange('  paisaje  ');
    vi.advanceTimersByTime(220);

    expect(router.navigate).toHaveBeenNthCalledWith(1, [], {
      relativeTo: route,
      queryParams: { type: 'ARTIST', page: null },
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
    expect(router.navigate).toHaveBeenNthCalledWith(2, [], {
      relativeTo: route,
      queryParams: { page: 3 },
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
    expect(router.navigate).toHaveBeenNthCalledWith(3, [], {
      relativeTo: route,
      queryParams: { q: 'paisaje', page: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    vi.useRealTimers();
  });

  it('exposes API failures as errors instead of empty archive results', async () => {
    const queryParamMap = new BehaviorSubject(convertToParamMap({}));

    TestBed.configureTestingModule({
      imports: [AdminEntitiesComponent],
      providers: [
        {
          provide: AdminEntitiesApi,
          useValue: { list: vi.fn().mockReturnValue(throwError(() => new Error('offline'))) },
        },
        { provide: ActivatedRoute, useValue: { queryParamMap } },
        {
          provide: Router,
          useValue: { url: '/admin/entities', navigate: vi.fn().mockResolvedValue(true) },
        },
      ],
    });
    const component = TestBed.createComponent(AdminEntitiesComponent).componentInstance;

    const vm = await firstValueFrom(component.vm$.pipe(filter((value) => value.state === 'error')));

    expect(vm.items).toEqual([]);
    expect(vm.error).toBe('No se pudo cargar el archivo editorial.');
  });

  it('builds honest visual and health signals from the admin read model', () => {
    const queryParamMap = new BehaviorSubject(convertToParamMap({}));

    TestBed.configureTestingModule({
      imports: [AdminEntitiesComponent],
      providers: [
        {
          provide: AdminEntitiesApi,
          useValue: { list: vi.fn().mockReturnValue(of({ items: [], total: 0 })) },
        },
        { provide: ActivatedRoute, useValue: { queryParamMap } },
        {
          provide: Router,
          useValue: { url: '/admin/entities', navigate: vi.fn().mockResolvedValue(true) },
        },
      ],
    });
    const component = TestBed.createComponent(AdminEntitiesComponent).componentInstance;
    const item = {
      id: 'concept-1',
      slug: 'memoria-cultural',
      title: 'Memoria cultural',
      type: 'CONCEPT',
      resolvedMedia: {
        thumbnail: {
          id: 'jano-default-entity-image',
          url: '/assets/home/museum-room.jpg',
        },
      },
      editorialSummary: {
        visualSource: 'empty' as const,
        relationsCount: 0,
        sourcesCount: 0,
        translationStatus: {
          es: 'complete' as const,
          en: 'partial' as const,
        },
      },
    };

    expect(component.hasEditorialVisual(item)).toBe(false);
    expect(component.visualInitials(item.title)).toBe('MC');
    expect(component.entityTypeConfig(item.type).color).toBe('#33a177');
    expect(component.healthSignals(item)).toEqual([
      'Sin imagen',
      'Sin fuentes',
      'Sin conexiones',
      'EN pendiente',
    ]);
  });
});
