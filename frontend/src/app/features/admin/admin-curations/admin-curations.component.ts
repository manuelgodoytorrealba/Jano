import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { Collection, CollectionsApi } from '../../../core/api/collections.api';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { MediaLike, selectPrimaryVisualMedia } from '../../../shared/media/media.utils';

type AdminCurationCard = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  updatedAt: string;
  isDefault: boolean;
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
  private readonly collectionsApi = inject(CollectionsApi);
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

      return this.collectionsApi.list().pipe(
        map((collections) => ({
          collections: this.toCards(collections),
          total: collections.length,
          connectedCount: collections.filter((collection) => collection.itemCount > 1).length,
          emptyCount: collections.filter((collection) => collection.itemCount === 0).length,
        })),
        catchError(() =>
          of({
            collections: [],
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

    this.collectionsApi.create({
      name,
      description: description || undefined,
    }).subscribe({
      next: (collection) => {
        this.creating = false;
        this.feedback = `Curación "${collection.name}" creada.`;
        this.name = '';
        this.description = '';
        this.refresh$.next();
        void this.router.navigate(['/admin/curations'], {
          queryParams: { created: collection.id },
          replaceUrl: true,
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

  coverMedia(collection: AdminCurationCard): MediaLike | null {
    return collection.coverMedia;
  }

  private toCards(collections: Collection[]): AdminCurationCard[] {
    return [...collections]
      .sort((left, right) => this.toTimestamp(right.updatedAt) - this.toTimestamp(left.updatedAt))
      .map((collection) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description ?? null,
        itemCount: collection.itemCount,
        updatedAt: collection.updatedAt,
        isDefault: collection.isDefault,
        coverMedia: collection.coverMedia ?? selectPrimaryVisualMedia(collection.items[0]?.entity) ?? null,
      }));
  }

  private toTimestamp(value: string | null | undefined): number {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
