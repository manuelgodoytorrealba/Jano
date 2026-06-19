import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { AdminHomeDeck, AdminHomeDecksApi } from '../../../core/api/admin-home-decks.api';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { MediaLike } from '../../../shared/media/media.utils';

type AdminCurationCard = {
  id: string;
  title: string;
  description: string | null;
  entityCount: number;
  updatedAt: string;
  isActive: boolean;
  coverMedia: MediaLike | null;
};

@Component({
  standalone: true,
  selector: 'app-admin-curations',
  imports: [AsyncPipe, DatePipe, FormsModule, RouterLink, JanoMediaComponent],
  templateUrl: './admin-curations.component.html',
  styleUrl: './admin-curations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCurationsComponent {
  private readonly curationsApi = inject(AdminHomeDecksApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('nameInput')
  set nameInputRef(value: ElementRef<HTMLInputElement> | undefined) {
    if (!value || !this.autoFocusCreate) {
      return;
    }

    requestAnimationFrame(() => value.nativeElement.focus());
  }

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private autoFocusCreate = false;

  name = '';
  description = '';
  creating = false;
  feedback = '';
  error = '';

  readonly vm$ = combineLatest([this.route.url, this.refresh$]).pipe(
    switchMap(([segments]) => {
      this.autoFocusCreate = segments.some((segment) => segment.path === 'new');

      return this.curationsApi.list().pipe(
        map((decks) => {
          const curations = decks.filter((deck) => deck.surface === 'RECOMMENDED');
          return {
            curations: this.toCards(curations),
            total: curations.length,
            connectedCount: curations.filter((curation) => curation.entities.length > 1).length,
            emptyCount: curations.filter((curation) => curation.entities.length === 0).length,
          };
        }),
        catchError(() =>
          of({
            curations: [],
            total: 0,
            connectedCount: 0,
            emptyCount: 0,
          }),
        ),
      );
    }),
  );

  createCuration(): void {
    const name = this.name.trim();
    const description = this.description.trim();

    if (!name || this.creating) {
      return;
    }

    this.creating = true;
    this.feedback = '';
    this.error = '';

    this.curationsApi
      .create({
        surface: 'RECOMMENDED',
        slug: this.slugify(name),
        title: name,
        subtitle: 'Curación editorial',
        description: description || undefined,
        ctaLabel: 'Explorar curación',
        isActive: true,
      })
      .subscribe({
        next: (curation) => {
          this.creating = false;
          this.feedback = 'Curación "' + curation.title + '" creada.';
          this.name = '';
          this.description = '';
          this.refresh$.next();
          void this.router.navigate(['/admin/home-decks', curation.id, 'edit'], {
            queryParams: { returnTo: '/admin/curations' },
          });
        },
        error: (err) => {
          this.creating = false;
          this.error = err?.error?.message ?? 'No se pudo crear la curación.';
        },
      });
  }

  openCreateRoute(): void {
    void this.router.navigate(['/admin/curations/new']);
  }

  coverMedia(curation: AdminCurationCard): MediaLike | null {
    return curation.coverMedia;
  }

  private toCards(decks: AdminHomeDeck[]): AdminCurationCard[] {
    return [...decks]
      .sort((left, right) => this.toTimestamp(right.updatedAt) - this.toTimestamp(left.updatedAt))
      .map((deck) => ({
        id: deck.id,
        title: deck.title,
        description: deck.description ?? null,
        entityCount: deck.entities.length,
        updatedAt: deck.updatedAt,
        isActive: deck.isActive,
        coverMedia: deck.image ?? null,
      }));
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-/, '');
    return slug.endsWith('-') ? slug.slice(0, -1) : slug;
  }

  private toTimestamp(value: string | null | undefined): number {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
