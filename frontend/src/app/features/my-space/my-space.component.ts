import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CollectionsApi } from '../../core/api/collections.api';
import { SavedApi } from '../../core/api/saved.api';
import { AuthUser } from '../../core/auth/auth.types';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-my-space',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, JanoMediaComponent],
  templateUrl: './my-space.component.html',
  styleUrls: ['./my-space.component.scss'],
})
export class MySpaceComponent {
  auth = inject(AuthService);
  private collectionsApi = inject(CollectionsApi);
  private savedApi = inject(SavedApi);
  private router = inject(Router);
  readonly i18n = inject(I18nService);

  private refresh$ = new BehaviorSubject<void>(undefined);
  private removedSavedIds$ = new BehaviorSubject<Set<string>>(new Set());
  private removedCollectionItemKeys$ = new BehaviorSubject<Set<string>>(new Set());

  newCollectionName = '';
  newCollectionDescription = '';
  creating = false;
  createError = '';

  saved$ = combineLatest([this.auth.user$, this.refresh$, this.removedSavedIds$]).pipe(
    switchMap(([user, _, removedSavedIds]) => {
      if (!user) return of([]);

      return this.savedApi.list().pipe(
        map((items) => items.filter((item) => !removedSavedIds.has(item.entity.id))),
        catchError(() => of([])),
      );
    }),
  );

  collections$ = combineLatest([
    this.auth.user$,
    this.refresh$,
    this.removedCollectionItemKeys$,
  ]).pipe(
    switchMap(([user, _, removedKeys]) => {
      if (!user) return of([]);

      return this.collectionsApi.list().pipe(
        map((collections) =>
          collections.map((collection) => {
            const filteredItems = collection.items.filter(
              (item) => !removedKeys.has(this.collectionItemKey(collection.id, item.entity.id)),
            );
            return {
              ...collection,
              items: filteredItems,
              itemCount:
                typeof collection.itemCount === 'number'
                  ? Math.max(
                      filteredItems.length,
                      collection.itemCount -
                        ((collection.items?.length ?? 0) - filteredItems.length),
                    )
                  : filteredItems.length,
            };
          }),
        ),
        catchError(() => of([])),
      );
    }),
  );

  cleanWiki(text: string): string {
    return (text ?? '').replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
  }

  isAdmin(user: AuthUser | null | undefined): boolean {
    return String(user?.role ?? '').toUpperCase() === 'ADMIN';
  }

  roleLabel(user: AuthUser | null | undefined): string {
    return this.isAdmin(user) ? this.i18n.t('role.admin') : this.i18n.t('role.member');
  }

  previewItems<T>(items: readonly T[] | null | undefined, limit = 4): T[] {
    return (items ?? []).slice(0, limit);
  }

  remainingItems(total: number | null | undefined, shown: number): number {
    return Math.max(0, Number(total ?? 0) - shown);
  }

  createCollection() {
    const name = this.newCollectionName.trim();
    const description = this.newCollectionDescription.trim();

    if (!name || this.creating) return;

    this.creating = true;
    this.createError = '';

    this.collectionsApi
      .create({
        name,
        description: description || undefined,
      })
      .subscribe({
        next: () => {
          this.newCollectionName = '';
          this.newCollectionDescription = '';
          this.creating = false;
          this.refresh$.next();
        },
        error: (err) => {
          this.creating = false;
          this.createError = err?.error?.message ?? this.i18n.t('mySpace.createError');
        },
      });
  }

  removeSaved(entityId: string) {
    this.markSavedRemoved(entityId);
    this.savedApi.remove(entityId).subscribe({
      next: () => this.refresh$.next(),
      error: () => {
        this.restoreSavedRemoved(entityId);
      },
    });
  }

  removeFromCollection(collectionId: string, entityId: string) {
    const key = this.collectionItemKey(collectionId, entityId);
    this.markCollectionItemRemoved(key);
    this.collectionsApi.removeEntity(collectionId, entityId).subscribe({
      next: () => this.refresh$.next(),
      error: () => {
        this.restoreCollectionItemRemoved(key);
      },
    });
  }

  goToCollection(collectionId: string) {
    void this.router.navigate(['/collections', collectionId]);
  }

  go(slug: string) {
    void this.router.navigate(['/entity', slug]);
  }

  goToAdmin() {
    void this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
    this.refresh$.next();
    void this.router.navigate(['/login']);
  }

  private collectionItemKey(collectionId: string, entityId: string | null | undefined): string {
    return `${collectionId}:${entityId ?? ''}`;
  }

  private markSavedRemoved(entityId: string): void {
    const next = new Set(this.removedSavedIds$.value);
    next.add(entityId);
    this.removedSavedIds$.next(next);
  }

  private restoreSavedRemoved(entityId: string): void {
    if (!this.removedSavedIds$.value.has(entityId)) {
      return;
    }

    const next = new Set(this.removedSavedIds$.value);
    next.delete(entityId);
    this.removedSavedIds$.next(next);
  }

  private markCollectionItemRemoved(key: string): void {
    const next = new Set(this.removedCollectionItemKeys$.value);
    next.add(key);
    this.removedCollectionItemKeys$.next(next);
  }

  private restoreCollectionItemRemoved(key: string): void {
    if (!this.removedCollectionItemKeys$.value.has(key)) {
      return;
    }

    const next = new Set(this.removedCollectionItemKeys$.value);
    next.delete(key);
    this.removedCollectionItemKeys$.next(next);
  }
}
