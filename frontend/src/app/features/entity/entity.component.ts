import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe, Location } from '@angular/common';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import {
  PublicEntity,
  PublicEntityRelation,
  PublicEntityRelationEndpoint,
} from '../../core/api/entities.models';
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
import { SavedApi } from '../../core/api/saved.api';
import { CollectionsApi } from '../../core/api/collections.api';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { EntityDetailViewComponent } from './entity-detail-view.component';
import { AppChromeRailService } from '../../shared/ui/app-chrome/app-chrome-rail.service';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  allConcepts,
  allMentions,
  allOtherOutgoing,
  allPlaces,
  allRelatedArtworks,
  articleByline,
  articleDateLabel,
  detailFactKicker,
  detailFactSummary,
  detailFacts,
  detailFactTitle,
  detailHeroSubtitle,
  detailMedia,
  entityTypeLabel,
  firstRelated,
  incomingByType,
  isArticle,
  outgoingByType,
  primaryMedia,
  relatedIncoming,
  relatedOutgoing,
  relationDirectionLabel,
  relationLabel,
  storySectionLabel,
  visualAlt,
  visualUrl,
} from './entity-detail.presenter';

type DetailPopupKind = 'saved' | 'manage' | 'removed' | 'share' | 'error' | 'collections';
type DetailWorkspaceMode = 'split' | 'image' | 'graph' | 'info';

@Component({
  standalone: true,
  selector: 'app-entity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, EntityDetailViewComponent],
  templateUrl: './entity-detail-shell.component.html',
  styleUrls: ['./entity.component.scss'],
})
export class EntityComponent implements OnDestroy {
  private api = inject(EntitiesApi);
  private savedApi = inject(SavedApi);
  private collectionsApi = inject(CollectionsApi);
  private location = inject(Location);
  private readonly seo = inject(SeoService);
  private readonly chromeRail = inject(AppChromeRailService);
  private readonly artworkTransition = inject(EntityRouteArtworkTransitionService);
  readonly i18n = inject(I18nService);
  private readonly collectionsRefresh$ = new BehaviorSubject<void>(undefined);

  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private currentEntity = signal<PublicEntity | null>(null);
  readonly preferredWorkspaceMode: DetailWorkspaceMode | null = this.normalizeWorkspaceMode(
    this.route.snapshot.queryParamMap.get('workspace'),
  );

  isSaved = signal(false);
  saveLoading = signal(false);
  saveStatusResolved = signal(false);

  showCollectionsPanel = signal(false);
  collectionsLoading = signal(false);
  addingToCollection = signal(false);
  creatingCollection = signal(false);
  collectionsChooserOpen = signal(false);
  popupKind = signal<DetailPopupKind>('saved');
  popupTitle = signal('');
  collectionMessage = signal('');
  createCollectionName = signal('');
  createCollectionDescription = signal('');
  private popupAutoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly syncContextualRail = effect(() => {
    const entity = this.currentEntity();
    if (!entity) {
      this.chromeRail.clearContextualRail();
      return;
    }

    this.chromeRail.setContextualRail({
      kind: 'detail',
      isSaved: this.isSaved(),
      saveLoading: this.saveLoading() || !this.saveStatusResolved(),
      canSave: this.auth.isLoggedIn && this.saveStatusResolved(),
      onSave: () => this.toggleSave(entity.id),
      onShare: () => this.shareEntity(entity),
      onFocus: () => this.focusTop(),
    });
  });

  ngOnDestroy(): void {
    this.clearPopupAutoClose();
    this.chromeRail.clearContextualRail();
  }

  goBack() {
    this.location.back();
  }

  toggleCollectionsPanel() {
    this.clearPopupAutoClose();
    this.showCollectionsPanel.update((v) => {
      const next = !v;
      if (!next) {
        this.collectionsChooserOpen.set(false);
        this.collectionMessage.set('');
      }
      return next;
    });
  }

  closeCollectionsPanel() {
    this.clearPopupAutoClose();
    this.showCollectionsPanel.set(false);
    this.collectionsChooserOpen.set(false);
    this.popupTitle.set('');
    this.collectionMessage.set('');
  }

  openCollectionsChooser() {
    this.clearPopupAutoClose();
    this.showCollectionsPanel.set(true);
    this.collectionsChooserOpen.set(true);
    this.popupKind.set('collections');
    this.popupTitle.set(this.i18n.t('collection.addTo'));
    this.collectionMessage.set(this.i18n.t('collection.chooseForEntity'));
  }

  removeSavedEntity(entityId: string) {
    if (!this.auth.isLoggedIn || this.saveLoading() || !this.saveStatusResolved()) {
      return;
    }

    this.saveLoading.set(true);

    this.savedApi.remove(entityId).subscribe({
      next: () => {
        this.isSaved.set(false);
        this.saveLoading.set(false);
        this.openPopup(
          'removed',
          this.i18n.t('popup.removed.title'),
          this.i18n.t('popup.removed.message'),
          { autoCloseMs: 2200 },
        );
      },
      error: () => {
        this.saveLoading.set(false);
        this.openPopup('error', this.i18n.t('error.removeFailed'), this.i18n.t('error.tryAgain'));
      },
    });
  }

  createCollectionAndAttach(entityId: string) {
    const name = this.createCollectionName().trim();
    const description = this.createCollectionDescription().trim();

    if (!name || this.creatingCollection()) {
      return;
    }

    this.creatingCollection.set(true);
    this.clearPopupAutoClose();
    this.popupKind.set('collections');
    this.collectionMessage.set('');

    this.collectionsApi
      .create({
        name,
        description: description || undefined,
      })
      .subscribe({
        next: (collection) => {
          this.createCollectionName.set('');
          this.createCollectionDescription.set('');
          this.collectionsRefresh$.next();
          this.creatingCollection.set(false);
          this.addToCollection(collection.id, entityId, true);
        },
        error: (err) => {
          this.creatingCollection.set(false);
          this.popupKind.set('error');
          this.popupTitle.set(this.i18n.t('collection.createFailed'));
          this.collectionMessage.set(err?.error?.message ?? this.i18n.t('mySpace.createError'));
        },
      });
  }

  private openPopup(
    kind: DetailPopupKind,
    title: string,
    message: string,
    options?: { showChooser?: boolean; autoCloseMs?: number },
  ) {
    this.clearPopupAutoClose();
    this.showCollectionsPanel.set(true);
    this.collectionsChooserOpen.set(options?.showChooser ?? false);
    this.popupKind.set(kind);
    this.popupTitle.set(title);
    this.collectionMessage.set(message);

    if (options?.autoCloseMs) {
      this.popupAutoCloseTimer = setTimeout(() => {
        this.closeCollectionsPanel();
      }, options.autoCloseMs);
    }
  }

  shareEntity(entity: PublicEntity | null) {
    if (!entity) {
      return;
    }

    const title = entity.title ?? this.i18n.t('entity.singular');
    const text =
      entity.summary ?? this.detailHeroSubtitle(entity) ?? this.i18n.t('entity.shareDefault');
    const url = typeof window !== 'undefined' ? window.location.href : '';

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav) {
      return;
    }

    const payload = { title, text, url };

    if (typeof nav.share === 'function') {
      nav
        .share(payload)
        .then(() => {
          this.openPopup('share', this.i18n.t('share.shared'), this.i18n.t('share.sharedMessage'), {
            autoCloseMs: 2000,
          });
        })
        .catch((error: any) => {
          if (error?.name === 'AbortError') {
            return;
          }

          this.openPopup('error', this.i18n.t('share.failed'), this.i18n.t('share.openFailed'));
        });
      return;
    }

    if (nav.clipboard?.writeText && url) {
      nav.clipboard
        .writeText(url)
        .then(() => {
          this.openPopup(
            'share',
            this.i18n.t('share.linkCopied'),
            this.i18n.t('share.linkCopiedMessage'),
            { autoCloseMs: 2200 },
          );
        })
        .catch(() => {
          this.openPopup('error', this.i18n.t('share.failed'), this.i18n.t('share.copyFailed'));
        });
      return;
    }

    this.openPopup('error', this.i18n.t('share.failed'), this.i18n.t('share.notAvailable'));
  }

  private normalizeWorkspaceMode(value: string | null): DetailWorkspaceMode | null {
    switch ((value ?? '').trim()) {
      case 'split':
      case 'image':
      case 'graph':
      case 'info':
        return value as DetailWorkspaceMode;
      default:
        return null;
    }
  }

  focusTop() {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  primaryMedia(entity: PublicEntity | null) {
    return primaryMedia(entity);
  }

  detailMedia(entity: PublicEntity | null) {
    return detailMedia(entity);
  }

  visualUrl(entity: PublicEntity | null) {
    return visualUrl(entity);
  }

  visualAlt(entity: PublicEntity | null): string {
    return visualAlt(entity, (key) => this.i18n.t(key));
  }

  isArticle(entity: PublicEntity | null): boolean {
    return isArticle(entity);
  }

  articleByline(entity: PublicEntity | null): string | null {
    return articleByline(entity);
  }

  articleDateLabel(entity: PublicEntity | null): string | null {
    return articleDateLabel(entity, this.i18n.locale());
  }

  storySectionLabel(entity: PublicEntity | null): string {
    return storySectionLabel(entity, (key) => this.i18n.t(key));
  }

  detailHeroSubtitle(entity: PublicEntity | null): string | null {
    return detailHeroSubtitle(entity, { locale: this.i18n.locale(), t: (key) => this.i18n.t(key) });
  }

  detailFacts(entity: PublicEntity | null) {
    return detailFacts(entity, { locale: this.i18n.locale(), t: (key) => this.i18n.t(key) });
  }

  detailFactKicker(entity: PublicEntity | null): string {
    return detailFactKicker(entity, (key) => this.i18n.t(key));
  }

  detailFactTitle(entity: PublicEntity | null): string {
    return detailFactTitle(entity, (key) => this.i18n.t(key));
  }

  detailFactSummary(entity: PublicEntity | null): string | null {
    return detailFactSummary(entity);
  }

  private slug$ = this.route.paramMap.pipe(
    map((p) => p.get('slug') ?? ''),
    distinctUntilChanged(),
    tap(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }

      this.currentEntity.set(null);
      this.isSaved.set(false);
      this.saveStatusResolved.set(false);
      this.closeCollectionsPanel();
    }),
    tap((slug) => {
      if (typeof window === 'undefined') {
        return;
      }

      this.artworkTransition.beginArrivalFromState(
        this.router.getCurrentNavigation()?.extras.state ?? window.history.state,
        slug,
      );
      this.artworkTransition.resumeForSlug(slug);
    }),
  );

  collections$ = combineLatest([this.auth.user$, this.collectionsRefresh$]).pipe(
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
          return of([]);
        }),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  entity$ = combineLatest([this.slug$, toObservable(this.i18n.locale)]).pipe(
    switchMap(([slug]) => this.api.get(slug).pipe(startWith(null))),
    tap((entity) => {
      if (!entity) {
        return;
      }

      this.currentEntity.set(entity);
      this.seo.setPageMeta({
        title: `${entity.title} | JANO`,
        description: entity.summary ?? `Explore ${entity.title} in JANO.`,
        path: `/entity/${entity.slug}`,
        image: this.visualUrl(entity),
      });

      if (!this.auth.isLoggedIn) {
        this.isSaved.set(false);
        this.saveStatusResolved.set(true);
        return;
      }

      this.savedApi.check(entity.id).subscribe({
        next: (res) => {
          this.isSaved.set(res.saved);
          this.saveStatusResolved.set(true);
        },
        error: () => {
          this.isSaved.set(false);
          this.saveStatusResolved.set(true);
        },
      });
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  toggleSave(entityId: string) {
    if (!this.auth.isLoggedIn || this.saveLoading() || !this.saveStatusResolved()) return;

    const wasSaved = this.isSaved();
    if (wasSaved) {
      this.openPopup(
        'manage',
        this.i18n.t('popup.manage.title'),
        this.i18n.t('popup.manage.message'),
      );
      return;
    }

    this.saveLoading.set(true);

    const req$ = this.savedApi.save(entityId);

    req$.subscribe({
      next: () => {
        this.isSaved.set(true);
        this.saveLoading.set(false);
        this.openPopup(
          'saved',
          this.i18n.t('popup.saved.title'),
          this.i18n.t('popup.saved.message'),
        );
      },
      error: () => {
        this.saveLoading.set(false);
        this.openPopup('error', this.i18n.t('error.saveFailed'), this.i18n.t('error.tryAgain'));
      },
    });
  }

  addToCollection(collectionId: string, entityId: string, createdNow = false) {
    if (this.addingToCollection()) return;

    this.addingToCollection.set(true);
    this.collectionMessage.set('');

    this.collectionsApi.addEntity(collectionId, entityId).subscribe({
      next: () => {
        this.addingToCollection.set(false);
        this.collectionsChooserOpen.set(false);
        this.collectionsRefresh$.next();
        this.popupKind.set('saved');
        this.popupTitle.set(
          createdNow ? this.i18n.t('collection.created') : this.i18n.t('collection.added'),
        );
        this.collectionMessage.set(
          createdNow
            ? this.i18n.t('collection.createdAndAdded')
            : this.i18n.t('collection.entityAdded'),
        );
        this.clearPopupAutoClose();
        this.popupAutoCloseTimer = setTimeout(
          () => {
            this.closeCollectionsPanel();
          },
          createdNow ? 2800 : 2400,
        );
      },
      error: (err) => {
        this.addingToCollection.set(false);
        this.popupKind.set('error');
        this.popupTitle.set(this.i18n.t('collection.addFailed'));
        this.collectionMessage.set(err?.error?.message ?? this.i18n.t('collection.addError'));
      },
    });
  }

  outgoingByType(entity: PublicEntity | null, type: string): PublicEntityRelation[] {
    return outgoingByType(entity, type);
  }

  incomingByType(entity: PublicEntity | null, type: string): PublicEntityRelation[] {
    return incomingByType(entity, type);
  }

  relatedOutgoing(entity: PublicEntity | null, type: string): PublicEntityRelationEndpoint[] {
    return relatedOutgoing(entity, type);
  }

  relatedIncoming(entity: PublicEntity | null, type: string): PublicEntityRelationEndpoint[] {
    return relatedIncoming(entity, type);
  }

  firstRelated(entity: PublicEntity | null, type: string): PublicEntityRelationEndpoint | null {
    return firstRelated(entity, type);
  }

  allConcepts(entity: PublicEntity | null): PublicEntityRelationEndpoint[] {
    return allConcepts(entity);
  }

  allPlaces(entity: PublicEntity | null): PublicEntityRelationEndpoint[] {
    return allPlaces(entity);
  }

  allRelatedArtworks(entity: PublicEntity | null): PublicEntityRelationEndpoint[] {
    return allRelatedArtworks(entity);
  }

  allOtherOutgoing(entity: PublicEntity | null): PublicEntityRelation[] {
    return allOtherOutgoing(entity);
  }

  allMentions(entity: PublicEntity | null): PublicEntityRelation[] {
    return allMentions(entity);
  }

  relationLabel(type: string): string {
    return relationLabel(type, (key) => this.i18n.t(key));
  }

  relationDirectionLabel(type: string, direction: 'outgoing' | 'incoming'): string {
    return relationDirectionLabel(type, direction, (key) => this.i18n.t(key));
  }

  private entityTypeLabel(type: string): string {
    return entityTypeLabel(type, (key) => this.i18n.t(key));
  }

  private clearPopupAutoClose(): void {
    if (this.popupAutoCloseTimer !== null) {
      clearTimeout(this.popupAutoCloseTimer);
      this.popupAutoCloseTimer = null;
    }
  }
}
