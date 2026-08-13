import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Collection, CollectionsApi } from '../../core/api/collections.api';
import { SavedApi, SavedItem } from '../../core/api/saved.api';
import { AuthUser } from '../../core/auth/auth.types';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { I18nService } from '../../core/i18n/i18n.service';

type SavedSort = 'recent' | 'title';
type SavedView = 'grid' | 'list';
type CollectionSort = 'recent' | 'title';
type CollectionView = 'grid' | 'list';

@Component({
  standalone: true,
  selector: 'app-my-space',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DatePipe, JanoMediaComponent],
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
  creating = false;
  createError = '';
  readonly activeTab = signal<'saved' | 'collections'>('saved');
  readonly createPanelOpen = signal(false);
  readonly savedQuery = signal('');
  readonly savedSort = signal<SavedSort>('recent');
  readonly savedType = signal('all');
  readonly savedView = signal<SavedView>('grid');
  readonly savedExpanded = signal(false);
  readonly collectionQuery = signal('');
  readonly collectionSort = signal<CollectionSort>('recent');
  readonly collectionView = signal<CollectionView>('grid');

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

    if (!name || this.creating) return;

    this.creating = true;
    this.createError = '';

    this.collectionsApi
      .create({
        name,
      })
      .subscribe({
        next: () => {
          this.newCollectionName = '';
          this.creating = false;
          this.refresh$.next();
          this.activeTab.set('collections');
          this.createPanelOpen.set(false);
        },
        error: (err) => {
          this.creating = false;
          this.createError = err?.error?.message ?? this.i18n.t('mySpace.createError');
        },
      });
  }

  setTab(tab: 'saved' | 'collections'): void {
    this.activeTab.set(tab);
  }

  openCollectionCreator(): void {
    this.createError = '';
    this.createPanelOpen.set(true);
  }

  closeCollectionCreator(): void {
    this.createError = '';
    this.createPanelOpen.set(false);
  }

  setSavedQuery(value: string): void {
    this.savedQuery.set(value);
    this.savedExpanded.set(false);
  }

  setSavedSort(value: string): void {
    this.savedSort.set(value === 'title' ? 'title' : 'recent');
    this.savedExpanded.set(false);
  }

  setSavedType(value: string): void {
    this.savedType.set(value);
    this.savedExpanded.set(false);
  }

  setSavedView(view: SavedView): void {
    this.savedView.set(view);
  }

  setCollectionQuery(value: string): void {
    this.collectionQuery.set(value);
  }

  setCollectionSort(value: string): void {
    this.collectionSort.set(value === 'title' ? 'title' : 'recent');
  }

  setCollectionView(view: CollectionView): void {
    this.collectionView.set(view);
  }

  visibleCollections(collections: Collection[]): Collection[] {
    const query = this.collectionQuery().trim().toLocaleLowerCase();
    const filtered = collections.filter(
      (collection) =>
        !query ||
        collection.name.toLocaleLowerCase().includes(query) ||
        collection.description?.toLocaleLowerCase().includes(query),
    );
    return [...filtered].sort((a, b) =>
      this.collectionSort() === 'title'
        ? a.name.localeCompare(b.name)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  savedTypes(items: SavedItem[]): string[] {
    return [...new Set(items.map((item) => item.entity.type))].sort((a, b) =>
      this.entityTypeLabel(a).localeCompare(this.entityTypeLabel(b)),
    );
  }

  visibleSaved(items: SavedItem[]): SavedItem[] {
    const query = this.savedQuery().trim().toLocaleLowerCase();
    const type = this.savedType();
    const filtered = items.filter(
      (item) =>
        (type === 'all' || item.entity.type === type) &&
        (!query || item.entity.title.toLocaleLowerCase().includes(query)),
    );

    return [...filtered].sort((a, b) =>
      this.savedSort() === 'title'
        ? a.entity.title.localeCompare(b.entity.title)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  recentSaved(items: SavedItem[]): SavedItem[] {
    const visible = this.visibleSaved(items);
    return this.savedExpanded() ? visible : visible.slice(0, 6);
  }

  toggleSavedExpanded(): void {
    this.savedExpanded.set(!this.savedExpanded());
  }

  savedGroups(items: SavedItem[]): Array<{ type: string; items: SavedItem[] }> {
    return this.savedTypes(this.visibleSaved(items)).map((type) => ({
      type,
      items: this.visibleSaved(items).filter((item) => item.entity.type === type),
    }));
  }

  entityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ARTWORK: 'Obras de arte',
      ARTIST: 'Artistas',
      ARTICLE: 'Artículos',
      CONCEPT: 'Conceptos',
      MOVEMENT: 'Movimientos',
      PERIOD: 'Periodos',
      PLACE: 'Lugares',
      TEXT: 'Lecturas',
      EVENT: 'Eventos',
      ORGANIZATION: 'Organizaciones',
    };
    return labels[type] ?? type;
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
