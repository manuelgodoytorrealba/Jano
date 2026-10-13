import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { Collection, CollectionsApi } from '../../core/api/collections.api';
import { SavedApi } from '../../core/api/saved.api';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Injectable()
export class EntitySavedCollectionsFacade implements OnDestroy {
  readonly isSaved = signal(false);
  readonly saveLoading = signal(false);
  readonly saveStatusResolved = signal(false);
  readonly showCollectionsPanel = signal(false);
  readonly collectionsLoading = signal(false);
  readonly addingToCollection = signal(false);
  readonly creatingCollection = signal(false);
  readonly collectionMessage = signal('');
  readonly feedback = signal('');
  readonly feedbackError = signal(false);
  readonly collectionSearch = signal('');
  readonly createOpen = signal(false);
  readonly collectionMembership = signal<Record<string, boolean>>({});
  readonly createCollectionName = signal('');
  readonly createCollectionDescription = signal('');

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private popupAutoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly collections$: Observable<Collection[]>;

  constructor(
    private readonly savedApi: SavedApi,
    private readonly collectionsApi: CollectionsApi,
    private readonly auth: AuthService,
    private readonly i18n: I18nService,
  ) {
    this.collections$ = combineLatest([this.auth.user$, this.refresh$]).pipe(
      switchMap(([user]) => {
        if (!user) {
          this.collectionsLoading.set(false);
          return of([]);
        }
        this.collectionsLoading.set(true);
        return this.collectionsApi.list().pipe(
          tap(() => this.collectionsLoading.set(false)),
          catchError(() => {
            this.collectionsLoading.set(false);
            this.collectionMessage.set(this.i18n.t('collection.loadFailed'));
            return of([]);
          }),
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  ngOnDestroy(): void {
    this.clearPopupAutoClose();
  }

  reset(): void {
    this.clearPopupAutoClose();
    this.isSaved.set(false);
    this.saveStatusResolved.set(false);
    this.closeCollectionsPanel();
    this.feedback.set('');
    this.collectionMembership.set({});
  }

  resolveSavedStatus(entityId: string): void {
    if (!this.auth.isLoggedIn) {
      this.isSaved.set(false);
      this.saveStatusResolved.set(true);
      return;
    }
    this.savedApi.check(entityId).subscribe({
      next: ({ saved }) => {
        this.isSaved.set(saved);
        this.saveStatusResolved.set(true);
      },
      error: () => {
        this.isSaved.set(false);
        this.saveStatusResolved.set(true);
      },
    });
  }

  toggleSave(entityId: string): void {
    if (!this.auth.isLoggedIn || this.saveLoading() || !this.saveStatusResolved()) return;
    if (this.isSaved()) {
      this.removeSavedEntity(entityId);
      return;
    }
    this.saveLoading.set(true);
    this.savedApi.save(entityId).subscribe({
      next: () => {
        this.isSaved.set(true);
        this.saveLoading.set(false);
      },
      error: () => {
        this.saveLoading.set(false);
        this.showFeedback('error', this.i18n.t('error.saveFailed'), this.i18n.t('error.tryAgain'));
      },
    });
  }

  removeSavedEntity(entityId: string): void {
    if (!this.auth.isLoggedIn || this.saveLoading() || !this.saveStatusResolved()) return;
    this.saveLoading.set(true);
    this.savedApi.remove(entityId).subscribe({
      next: () => {
        this.isSaved.set(false);
        this.saveLoading.set(false);
      },
      error: () => {
        this.saveLoading.set(false);
        this.showFeedback(
          'error',
          this.i18n.t('error.removeFailed'),
          this.i18n.t('error.tryAgain'),
        );
      },
    });
  }

  toggleCollectionsPanel(): void {
    if (this.showCollectionsPanel()) this.closeCollectionsPanel();
    else this.openCollectionsChooser();
  }

  closeCollectionsPanel(): void {
    this.showCollectionsPanel.set(false);
    this.collectionMessage.set('');
    this.createOpen.set(false);
    this.collectionSearch.set('');
  }

  openCollectionsChooser(): void {
    this.showCollectionsPanel.set(true);
    this.collectionMessage.set('');
    this.refresh$.next();
  }

  filteredCollections(collections: Collection[]): Collection[] {
    const query = this.collectionSearch().trim().toLocaleLowerCase();
    return collections.filter((collection) => collection.name.toLocaleLowerCase().includes(query));
  }

  containsEntity(collection: Collection, entityId: string): boolean {
    return (
      this.collectionMembership()[collection.id] ??
      collection.items.some((item) => item.entityId === entityId)
    );
  }

  createCollectionAndAttach(entityId: string): void {
    const name = this.createCollectionName().trim();
    const description = this.createCollectionDescription().trim();
    if (!name || this.creatingCollection()) return;
    this.creatingCollection.set(true);
    this.clearPopupAutoClose();
    this.collectionMessage.set('');
    this.collectionsApi.create({ name, description: description || undefined }).subscribe({
      next: (collection) => {
        this.createCollectionName.set('');
        this.createCollectionDescription.set('');
        this.refresh$.next();
        this.creatingCollection.set(false);
        this.createOpen.set(false);
        this.addToCollection(collection.id, entityId);
      },
      error: (error) => {
        this.creatingCollection.set(false);
        this.collectionMessage.set(error?.error?.message ?? this.i18n.t('mySpace.createError'));
      },
    });
  }

  toggleCollection(collection: Collection, entityId: string): void {
    this.setCollectionMembership(
      collection.id,
      entityId,
      !this.containsEntity(collection, entityId),
    );
  }

  addToCollection(collectionId: string, entityId: string): void {
    this.setCollectionMembership(collectionId, entityId, true);
  }

  private setCollectionMembership(collectionId: string, entityId: string, present: boolean): void {
    if (this.addingToCollection()) return;
    this.addingToCollection.set(true);
    this.collectionMessage.set('');
    const request: Observable<unknown> = present
      ? this.collectionsApi.addEntity(collectionId, entityId)
      : this.collectionsApi.removeEntity(collectionId, entityId);
    request.subscribe({
      next: () => {
        this.addingToCollection.set(false);
        this.collectionMembership.update((membership) => ({
          ...membership,
          [collectionId]: present,
        }));
        this.refresh$.next();
      },
      error: (error) => {
        this.addingToCollection.set(false);
        this.collectionMessage.set(
          error?.error?.message ??
            this.i18n.t(present ? 'collection.addError' : 'error.removeFailed'),
        );
      },
    });
  }

  showFeedback(
    kind: 'share' | 'error',
    title: string,
    message: string,
    options?: { autoCloseMs?: number },
  ): void {
    this.clearPopupAutoClose();
    this.feedback.set(kind === 'error' ? `${title}. ${message}` : title);
    this.feedbackError.set(kind === 'error');
    this.popupAutoCloseTimer = setTimeout(
      () => this.feedback.set(''),
      kind === 'error' ? 8000 : (options?.autoCloseMs ?? 2500),
    );
  }

  private clearPopupAutoClose(): void {
    if (this.popupAutoCloseTimer !== null) clearTimeout(this.popupAutoCloseTimer);
    this.popupAutoCloseTimer = null;
  }
}
