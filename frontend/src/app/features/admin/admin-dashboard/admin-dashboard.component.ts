import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, startWith } from 'rxjs';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import { AdminHomeDecksApi } from '../../../core/api/admin-home-decks.api';

type EditorialMetric = {
  label: string;
  value: number;
  tone: 'neutral' | 'good' | 'warning';
  route?: string;
  queryParams?: Record<string, string>;
};

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly entitiesApi = inject(AdminEntitiesApi);
  private readonly homeDecksApi = inject(AdminHomeDecksApi);

  readonly vm$ = forkJoin({
    decks: this.homeDecksApi.list().pipe(catchError(() => of([]))),
    published: this.entityCount({ status: 'PUBLISHED' }),
    drafts: this.entityCount({ status: 'DRAFT' }),
    inReview: this.entityCount({ status: 'IN_REVIEW' }),
    recent: this.entitiesApi.list({ page: 1, limit: 5, sort: 'recent' }).pipe(
      map((res) => res.items ?? []),
      catchError(() => of([])),
    ),
  }).pipe(
    map(({ decks, published, drafts, inReview, recent }) => {
      const activeDecks = decks.filter((deck) => deck.isActive);
      const incompleteDecks = decks.filter((deck) =>
        deck.warnings?.some((warning) => warning.severity === 'warning'),
      );

      const metrics: EditorialMetric[] = [
        {
          label: 'Decks activos',
          value: activeDecks.length,
          tone: activeDecks.length ? 'good' : 'warning',
          route: '/admin/home-decks',
        },
        {
          label: 'Decks incompletos',
          value: incompleteDecks.length,
          tone: incompleteDecks.length ? 'warning' : 'good',
          route: '/admin/home-decks',
        },
        {
          label: 'Publicadas',
          value: published,
          tone: 'good',
          route: '/admin/entities',
          queryParams: { status: 'PUBLISHED' },
        },
        {
          label: 'Drafts',
          value: drafts,
          tone: drafts ? 'warning' : 'neutral',
          route: '/admin/entities',
          queryParams: { status: 'DRAFT' },
        },
        {
          label: 'En revisión',
          value: inReview,
          tone: inReview ? 'warning' : 'neutral',
          route: '/admin/entities',
          queryParams: { status: 'IN_REVIEW' },
        },
      ];

      return {
        decks,
        activeDecks,
        incompleteDecks,
        metrics,
        recent,
      };
    }),
    startWith({
      decks: [],
      activeDecks: [],
      incompleteDecks: [],
      metrics: [],
      recent: [],
    }),
  );

  private entityCount(params: { status: 'PUBLISHED' | 'DRAFT' | 'IN_REVIEW' }) {
    return this.entitiesApi.list({ page: 1, limit: 1, sort: 'recent', ...params }).pipe(
      map((res) => res.total ?? 0),
      catchError(() => of(0)),
    );
  }
}
