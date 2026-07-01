import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { AdminEntitiesApi, AdminEntitySearchListItem } from '../../../core/api/admin-entities.api';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { getEntityTypeConfig } from '../../graph/graph.config';

type AdminType =
  | ''
  | 'ARTWORK'
  | 'ARTIST'
  | 'ARTICLE'
  | 'CONCEPT'
  | 'MOVEMENT'
  | 'PERIOD'
  | 'TEXT'
  | 'PLACE';
type AdminStatus = '' | 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
type ArchiveSort = 'updated' | 'title' | 'recent';

type ArchiveQuery = {
  q: string;
  type: AdminType;
  status: AdminStatus;
  sort: ArchiveSort;
  page: number;
};

type ArchiveViewModel = ArchiveQuery & {
  state: 'loading' | 'ready' | 'error';
  items: AdminEntitySearchListItem[];
  total: number;
  totalPages: number;
  error: string;
};

const PAGE_SIZE = 24;

@Component({
  standalone: true,
  selector: 'app-admin-entities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, AsyncPipe, DatePipe, JanoMediaComponent],
  templateUrl: './admin-entities.component.html',
  styleUrls: ['./admin-entities.component.scss'],
})
export class AdminEntitiesComponent {
  private readonly api = inject(AdminEntitiesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly types: Exclude<AdminType, ''>[] = [
    'ARTWORK',
    'ARTIST',
    'ARTICLE',
    'CONCEPT',
    'MOVEMENT',
    'PERIOD',
    'TEXT',
    'PLACE',
  ];
  readonly statuses: Exclude<AdminStatus, ''>[] = ['DRAFT', 'IN_REVIEW', 'PUBLISHED'];
  readonly sorts: Array<{ value: ArchiveSort; label: string }> = [
    { value: 'updated', label: 'Última edición' },
    { value: 'title', label: 'Título A-Z' },
    { value: 'recent', label: 'Fecha de creación' },
  ];

  search = '';
  selectedType: AdminType = '';
  selectedStatus: AdminStatus = '';
  selectedSort: ArchiveSort = 'updated';
  deletingId = '';
  feedbackMessage = '';
  feedbackKind: 'success' | 'error' = 'success';

  private readonly refresh$ = new BehaviorSubject(0);
  private readonly searchChanges$ = new Subject<string>();

  private readonly query$ = this.route.queryParamMap.pipe(
    map((params) => this.parseQuery(params)),
    distinctUntilChanged((left, right) => this.sameQuery(left, right)),
    tap((query) => {
      this.search = query.q;
      this.selectedType = query.type;
      this.selectedStatus = query.status;
      this.selectedSort = query.sort;
    }),
  );

  readonly vm$ = combineLatest([this.query$, this.refresh$]).pipe(
    switchMap(([query]) =>
      this.api
        .list({
          page: query.page,
          limit: PAGE_SIZE,
          sort: query.sort,
          q: query.q || undefined,
          type: query.type || undefined,
          status: query.status || undefined,
        })
        .pipe(
          map((response): ArchiveViewModel => {
            const total = response.total ?? 0;
            return {
              ...query,
              state: 'ready',
              items: response.items ?? [],
              total,
              totalPages: Math.max(1, response.totalPages ?? Math.ceil(total / PAGE_SIZE)),
              error: '',
            };
          }),
          catchError(() =>
            of<ArchiveViewModel>({
              ...query,
              state: 'error',
              items: [],
              total: 0,
              totalPages: 1,
              error: 'No se pudo cargar el archivo editorial.',
            }),
          ),
          startWith<ArchiveViewModel>({
            ...query,
            state: 'loading',
            items: [],
            total: 0,
            totalPages: 1,
            error: '',
          }),
        ),
    ),
  );

  constructor() {
    this.searchChanges$
      .pipe(debounceTime(220), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.updateQuery({ q: q.trim() || null, page: null }, true));
  }

  onSearchChange(value: string): void {
    this.searchChanges$.next(value ?? '');
  }

  setType(type: AdminType): void {
    this.updateQuery({ type: type || null, page: null });
  }

  setStatus(status: AdminStatus): void {
    this.updateQuery({ status: status || null, page: null });
  }

  setSort(sort: ArchiveSort): void {
    this.updateQuery({ sort: sort === 'updated' ? null : sort, page: null });
  }

  goToPage(page: number, totalPages: number): void {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    this.updateQuery({ page: nextPage === 1 ? null : nextPage });
  }

  refresh(): void {
    this.refresh$.next(this.refresh$.value + 1);
  }

  resetFilters(): void {
    this.search = '';
    this.selectedType = '';
    this.selectedStatus = '';
    this.updateQuery({ q: null, type: null, status: null, page: null });
  }

  hasActiveFilters(): boolean {
    return !!(this.search.trim() || this.selectedType || this.selectedStatus);
  }

  adminListReturnUrl(): string {
    return this.router.url.startsWith('/admin/entities') ? this.router.url : '/admin/entities';
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      ARTWORK: 'Obra',
      ARTIST: 'Artista',
      ARTICLE: 'Artículo',
      CONCEPT: 'Concepto',
      MOVEMENT: 'Movimiento',
      PERIOD: 'Periodo',
      TEXT: 'Texto',
      PLACE: 'Lugar',
    };
    return labels[type] ?? type;
  }

  entityTypeConfig(type: string) {
    return getEntityTypeConfig(type);
  }

  hasEditorialVisual(item: AdminEntitySearchListItem): boolean {
    const source = item.editorialSummary?.visualSource;
    return (source === 'explicit' || source === 'fallback') && !!item.resolvedMedia?.thumbnail;
  }

  visualInitials(title: string): string {
    return title
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toLocaleUpperCase('es');
  }

  visualVariant(id: string): number {
    return Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4;
  }

  relationCountLabel(item: AdminEntitySearchListItem): string {
    const count = item.editorialSummary?.relationsCount ?? 0;
    return count === 1 ? '1 relación' : `${count} relaciones`;
  }

  sourceCountLabel(item: AdminEntitySearchListItem): string {
    const count = item.editorialSummary?.sourcesCount ?? 0;
    return count === 1 ? '1 fuente' : `${count} fuentes`;
  }

  languageLabel(item: AdminEntitySearchListItem): string {
    const languages = Object.entries(item.editorialSummary?.translationStatus ?? {})
      .filter(([, status]) => status !== 'missing')
      .map(([locale]) => locale.toUpperCase());
    return languages.length ? languages.join(' / ') : 'Sin idiomas';
  }

  healthSignals(item: AdminEntitySearchListItem): string[] {
    const summary = item.editorialSummary;
    if (!summary) return [];

    const signals: string[] = [];
    if (summary.visualSource === 'empty') signals.push('Sin imagen');
    if (summary.sourcesCount === 0) signals.push('Sin fuentes');
    if (summary.relationsCount === 0) signals.push('Sin conexiones');

    for (const [locale, status] of Object.entries(summary.translationStatus)) {
      if (status !== 'complete') signals.push(`${locale.toUpperCase()} pendiente`);
    }

    return signals;
  }

  statusLabel(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      DRAFT: 'Borrador',
      IN_REVIEW: 'En revisión',
      PUBLISHED: 'Publicada',
    };
    return labels[status ?? ''] ?? 'Sin estado';
  }

  statusClass(status: string | null | undefined): string {
    return `archive-pill archive-pill--${(status ?? 'draft').toLowerCase().replace('_', '-')}`;
  }

  remove(id: string, title: string): void {
    if (!window.confirm(`¿Borrar "${title}"? Esta acción no se puede deshacer.`)) return;

    this.deletingId = id;
    this.feedbackMessage = '';

    this.api.remove(id).subscribe({
      next: () => {
        this.deletingId = '';
        this.feedbackKind = 'success';
        this.feedbackMessage = 'Entidad eliminada.';
        this.refresh();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deletingId = '';
        this.feedbackKind = 'error';
        this.feedbackMessage = 'No se pudo eliminar la entidad.';
        this.cdr.markForCheck();
      },
    });
  }

  private parseQuery(params: ParamMap): ArchiveQuery {
    const type = (params.get('type') ?? '').toUpperCase() as AdminType;
    const status = (params.get('status') ?? '').toUpperCase() as AdminStatus;
    const sort = params.get('sort') as ArchiveSort | null;
    const page = Number(params.get('page'));

    return {
      q: (params.get('q') ?? '').trim(),
      type: this.types.includes(type as Exclude<AdminType, ''>) ? type : '',
      status: this.statuses.includes(status as Exclude<AdminStatus, ''>) ? status : '',
      sort: this.sorts.some((item) => item.value === sort) ? (sort as ArchiveSort) : 'updated',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }

  private sameQuery(left: ArchiveQuery, right: ArchiveQuery): boolean {
    return (
      left.q === right.q &&
      left.type === right.type &&
      left.status === right.status &&
      left.sort === right.sort &&
      left.page === right.page
    );
  }

  private updateQuery(
    queryParams: Record<string, string | number | null>,
    replaceUrl = false,
  ): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
