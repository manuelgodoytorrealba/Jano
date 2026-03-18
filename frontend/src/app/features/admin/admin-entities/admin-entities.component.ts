import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';

type AdminType = '' | 'ARTWORK' | 'ARTIST' | 'CONCEPT' | 'MOVEMENT' | 'PERIOD' | 'TEXT' | 'PLACE';
type AdminStatus = '' | 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';

@Component({
  standalone: true,
  selector: 'app-admin-entities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, AsyncPipe],
  templateUrl: './admin-entities.component.html',
  styleUrls: ['./admin-entities.component.scss'],
})
export class AdminEntitiesComponent {
  private api = inject(AdminEntitiesApi);
  private route = inject(ActivatedRoute);

  types: Exclude<AdminType, ''>[] = [
    'ARTWORK',
    'ARTIST',
    'CONCEPT',
    'MOVEMENT',
    'PERIOD',
    'TEXT',
    'PLACE',
  ];

  statuses: Exclude<AdminStatus, ''>[] = [
    'DRAFT',
    'IN_REVIEW',
    'PUBLISHED',
  ];

  search = '';
  selectedType: AdminType = '';
  selectedStatus: AdminStatus = '';

  loading = false;
  deletingId = '';
  feedbackMessage = '';

  private refresh$ = new BehaviorSubject<void>(undefined);
  private search$ = new BehaviorSubject<string>('');

  vm$ = combineLatest([
    this.refresh$,
    this.search$.pipe(
      debounceTime(220),
      distinctUntilChanged(),
      startWith(''),
    ),
  ]).pipe(
    switchMap(([_, q]) => {
      this.loading = true;
      this.feedbackMessage = '';

      return this.api.list({
        page: 1,
        limit: 60,
        sort: 'recent',
        q: q.trim() || undefined,
        type: this.selectedType || undefined,
        status: this.selectedStatus || undefined,
      }).pipe(
        map((res) => {
          this.loading = false;
          return res;
        }),
        catchError(() => {
          this.loading = false;
          return of({ items: [], total: 0 });
        }),
      );
    }),
  );

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const type = (params.get('type') ?? '').toUpperCase() as AdminType;
      const status = (params.get('status') ?? '').toUpperCase() as AdminStatus;
      const q = params.get('q') ?? '';

      this.selectedType = this.types.includes(type as Exclude<AdminType, ''>) ? type : '';
      this.selectedStatus = this.statuses.includes(status as Exclude<AdminStatus, ''>) ? status : '';
      this.search = q;

      this.search$.next(q);
      this.refresh();
    });
  }

  onSearchChange(value: string) {
    this.search$.next(value ?? '');
  }

  refresh() {
    this.refresh$.next();
  }

  resetFilters() {
    this.search = '';
    this.selectedType = '';
    this.selectedStatus = '';
    this.search$.next('');
    this.refresh();
  }

  hasActiveFilters() {
    return !!(this.search.trim() || this.selectedType || this.selectedStatus);
  }

  remove(id: string, title: string) {
    const ok = window.confirm(`¿Borrar "${title}"?`);
    if (!ok) return;

    this.deletingId = id;
    this.feedbackMessage = '';

    this.api.remove(id).subscribe({
      next: () => {
        this.deletingId = '';
        this.feedbackMessage = 'Entity eliminada';
        this.refresh();
      },
      error: () => {
        this.deletingId = '';
        this.feedbackMessage = 'No se pudo borrar la entity';
      },
    });
  }
}