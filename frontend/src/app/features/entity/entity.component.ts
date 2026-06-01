import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe, Location } from '@angular/common';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { SavedApi } from '../../core/api/saved.api';
import { CollectionsApi } from '../../core/api/collections.api';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { mediaDisplayUrl, resolveEntityMediaItem, selectPrimaryVisualMedia } from '../../shared/media/media.utils';
import { EntityDetailViewComponent } from './entity-detail-view.component';
import { AppChromeRailService } from '../../shared/ui/app-chrome/app-chrome-rail.service';
import { I18nService } from '../../core/i18n/i18n.service';

type DetailFact = {
  label: string;
  value: string;
};

type DetailPopupKind = 'saved' | 'manage' | 'removed' | 'share' | 'error' | 'collections';

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
  readonly i18n = inject(I18nService);
  private readonly collectionsRefresh$ = new BehaviorSubject<void>(undefined);

  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private currentEntity = signal<any | null>(null);

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
        this.openPopup('removed', this.i18n.t('popup.removed.title'), this.i18n.t('popup.removed.message'), { autoCloseMs: 2200 });
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

    this.collectionsApi.create({
      name,
      description: description || undefined,
    }).subscribe({
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

  shareEntity(entity: any) {
    if (!entity) {
      return;
    }

    const title = entity.title ?? this.i18n.t('entity.singular');
    const text = entity.summary ?? this.detailHeroSubtitle(entity) ?? this.i18n.t('entity.shareDefault');
    const url = typeof window !== 'undefined' ? window.location.href : '';

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav) {
      return;
    }

    const payload = { title, text, url };

    if (typeof nav.share === 'function') {
      nav.share(payload)
        .then(() => {
          this.openPopup('share', this.i18n.t('share.shared'), this.i18n.t('share.sharedMessage'), { autoCloseMs: 2000 });
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
      nav.clipboard.writeText(url)
        .then(() => {
          this.openPopup('share', this.i18n.t('share.linkCopied'), this.i18n.t('share.linkCopiedMessage'), { autoCloseMs: 2200 });
        })
        .catch(() => {
          this.openPopup('error', this.i18n.t('share.failed'), this.i18n.t('share.copyFailed'));
        });
      return;
    }

    this.openPopup('error', this.i18n.t('share.failed'), this.i18n.t('share.notAvailable'));
  }

  focusTop() {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  primaryMedia(entity: any) {
    return selectPrimaryVisualMedia(entity);
  }

  detailMedia(entity: any) {
    return resolveEntityMediaItem(entity, 'detail') ?? this.primaryMedia(entity);
  }

  visualUrl(entity: any) {
    return mediaDisplayUrl(this.detailMedia(entity));
  }

  visualAlt(entity: any): string {
    return this.detailMedia(entity)?.alt || entity?.title || this.i18n.t('entity.imageAlt');
  }

  isArticle(entity: any): boolean {
    return entity?.type === 'ARTICLE';
  }

  articleByline(entity: any): string | null {
    const contributors = Array.isArray(entity?.contributors) ? entity.contributors : [];
    const authorish =
      contributors.find((item: any) => ['author', 'autor', 'writer', 'editor'].includes(`${item?.role ?? ''}`.trim().toLowerCase()))
      ?? contributors[0]
      ?? null;

    return authorish?.name?.trim() || null;
  }

  articleDateLabel(entity: any): string | null {
    const value = entity?.createdAt ?? null;
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(this.i18n.locale() === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  storySectionLabel(entity: any): string {
    return this.isArticle(entity) ? this.i18n.t('entity.article') : this.i18n.t('entity.essay');
  }

  detailHeroSubtitle(entity: any): string | null {
    const parts: string[] = [];
    const author = entity?.type === 'ARTWORK' ? this.firstRelated(entity, 'CREATED_BY')?.title : null;

    if (author) {
      parts.push(author);
    }

    if (entity?.startYear || entity?.endYear) {
      parts.push(
        entity.startYear && entity.endYear && entity.startYear !== entity.endYear
          ? `${entity.startYear}-${entity.endYear}`
          : `${entity.startYear ?? entity.endYear}`,
      );
    }

    if (entity?.type) {
      parts.push(this.entityTypeLabel(entity.type));
    }

    return parts.length ? parts.join(' · ') : null;
  }

  detailFacts(entity: any): DetailFact[] {
    if (entity?.type === 'ARTWORK' && entity.artwork) {
      return this.compactFacts([
        { label: this.i18n.t('entity.fact.technique'), value: entity.artwork.technique },
        { label: this.i18n.t('entity.fact.materials'), value: entity.artwork.materials },
        { label: this.i18n.t('entity.fact.dimensions'), value: entity.artwork.dimensions },
        { label: this.i18n.t('entity.fact.location'), value: entity.artwork.location },
        { label: this.i18n.t('entity.fact.collection'), value: entity.artwork.collection },
        { label: this.i18n.t('common.status'), value: entity.artwork.state },
        { label: this.i18n.t('entity.fact.authorNation'), value: entity.artwork.authorNation },
      ]);
    }

    if (entity?.type === 'ARTIST' && entity.artist) {
      return this.compactFacts([
        { label: this.i18n.t('entity.fact.country'), value: entity.artist.country },
        { label: this.i18n.t('entity.fact.city'), value: entity.artist.city },
        { label: this.i18n.t('entity.fact.birth'), value: entity.artist.birthYear },
        { label: this.i18n.t('entity.fact.death'), value: entity.artist.deathYear },
        { label: this.i18n.t('entity.fact.disciplines'), value: entity.artist.disciplines },
        { label: this.i18n.t('entity.fact.links'), value: entity.artist.links },
      ]);
    }

    return [];
  }

  detailFactKicker(entity: any): string {
    switch (entity?.type) {
      case 'ARTWORK':
        return this.i18n.t('entities.type.artworkSingular');
      case 'ARTIST':
        return this.i18n.t('entities.type.artistSingular');
      case 'ARTICLE':
        return this.i18n.t('entity.article');
      case 'CONCEPT':
        return this.i18n.t('entities.type.conceptSingular');
      case 'PERIOD':
        return this.i18n.t('entities.type.periodSingular');
      default:
        return this.i18n.t('entity.sheet');
    }
  }

  detailFactTitle(entity: any): string {
    switch (entity?.type) {
      case 'ARTWORK':
        return this.i18n.t('entity.factTitle.artwork');
      case 'ARTIST':
        return this.i18n.t('entity.factTitle.artist');
      case 'ARTICLE':
        return this.i18n.t('entity.factTitle.article');
      case 'CONCEPT':
        return this.i18n.t('entity.factTitle.concept');
      case 'PERIOD':
        return this.i18n.t('entity.factTitle.period');
      default:
        return this.i18n.t('entity.factTitle.default');
    }
  }

  detailFactSummary(entity: any): string | null {
    if (entity?.type === 'ARTICLE') {
      return this.joinFactSummary([
        this.articleByline(entity),
        entity.summary,
      ]);
    }

    if (entity?.type === 'ARTWORK' && entity.artwork) {
      return this.joinFactSummary([
        entity.artwork.technique,
        entity.artwork.materials,
        entity.artwork.dimensions,
        entity.artwork.location,
      ]);
    }

    if (entity?.type === 'ARTIST' && entity.artist) {
      return this.joinFactSummary([
        entity.artist.country,
        entity.artist.city,
        entity.artist.disciplines,
      ]);
    }

    return null;
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
    shareReplay({ bufferSize: 1, refCount: true })
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
    shareReplay({ bufferSize: 1, refCount: true })
  );

  toggleSave(entityId: string) {
    if (!this.auth.isLoggedIn || this.saveLoading() || !this.saveStatusResolved()) return;

    const wasSaved = this.isSaved();
    if (wasSaved) {
      this.openPopup('manage', this.i18n.t('popup.manage.title'), this.i18n.t('popup.manage.message'));
      return;
    }

    this.saveLoading.set(true);

    const req$ = this.savedApi.save(entityId);

    req$.subscribe({
      next: () => {
        this.isSaved.set(true);
        this.saveLoading.set(false);
        this.openPopup('saved', this.i18n.t('popup.saved.title'), this.i18n.t('popup.saved.message'));
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
        this.popupTitle.set(createdNow ? this.i18n.t('collection.created') : this.i18n.t('collection.added')); 
        this.collectionMessage.set(
          createdNow
            ? this.i18n.t('collection.createdAndAdded')
            : this.i18n.t('collection.entityAdded'),
        );
        this.clearPopupAutoClose();
        this.popupAutoCloseTimer = setTimeout(() => {
          this.closeCollectionsPanel();
        }, createdNow ? 2800 : 2400);
      },
      error: (err) => {
        this.addingToCollection.set(false);
        this.popupKind.set('error');
        this.popupTitle.set(this.i18n.t('collection.addFailed'));
        this.collectionMessage.set(err?.error?.message ?? this.i18n.t('collection.addError'));
      },
    });
  }

  outgoingByType(entity: any, type: string) {
    return (entity?.outgoing ?? []).filter((r: any) => r.type === type);
  }

  incomingByType(entity: any, type: string) {
    return (entity?.incoming ?? []).filter((r: any) => r.type === type);
  }

  relatedOutgoing(entity: any, type: string) {
    return this.outgoingByType(entity, type).map((r: any) => r.to);
  }

  relatedIncoming(entity: any, type: string) {
    return this.incomingByType(entity, type).map((r: any) => r.from);
  }

  firstRelated(entity: any, type: string) {
    return this.relatedOutgoing(entity, type)[0] ?? null;
  }

  allConcepts(entity: any) {
    return this.relatedOutgoing(entity, 'ABOUT_CONCEPT');
  }

  allPlaces(entity: any) {
    return this.relatedOutgoing(entity, 'LOCATED_IN');
  }

  allRelatedArtworks(entity: any) {
    const outgoing = this.relatedOutgoing(entity, 'RELATED_TO').filter((e: any) => e.type === 'ARTWORK');
    const incoming = this.relatedIncoming(entity, 'RELATED_TO').filter((e: any) => e.type === 'ARTWORK');

    const map = new Map<string, any>();

    for (const item of [...outgoing, ...incoming]) {
      map.set(item.id, item);
    }

    return Array.from(map.values());
  }

  allOtherOutgoing(entity: any) {
    const hidden = new Set([
      'CREATED_BY',
      'BELONGS_TO_MOVEMENT',
      'BELONGS_TO_PERIOD',
      'ABOUT_CONCEPT',
      'LOCATED_IN',
      'RELATED_TO',
      'MENTIONS',
    ]);

    return (entity?.outgoing ?? []).filter((r: any) => !hidden.has(r.type));
  }

  allMentions(entity: any) {
    return this.outgoingByType(entity, 'MENTIONS');
  }

  relationLabel(type: string): string {
    const labels: Record<string, string> = {
      CREATED_BY: this.i18n.t('relation.createdBy'),
      BELONGS_TO_MOVEMENT: this.i18n.t('relation.belongsToMovement'),
      BELONGS_TO_PERIOD: this.i18n.t('relation.belongsToPeriod'),
      ABOUT_CONCEPT: this.i18n.t('relation.aboutConcept'),
      LOCATED_IN: this.i18n.t('relation.locatedIn'),
      RELATED_TO: this.i18n.t('relation.relatedTo'),
      MENTIONS: this.i18n.t('relation.mentions'),
      ASSOCIATED_WITH: this.i18n.t('relation.associatedWith'),
      INSPIRED_BY: this.i18n.t('relation.inspiredBy'),
      INFLUENCED_BY: this.i18n.t('relation.influencedBy'),
      PART_OF: this.i18n.t('relation.partOf'),
    };

    return labels[type] ?? type.replaceAll('_', ' ').toLowerCase();
  }

  relationDirectionLabel(type: string, direction: 'outgoing' | 'incoming'): string {
    if (direction === 'outgoing') {
      return this.relationLabel(type);
    }

    const incomingLabels: Record<string, string> = {
      CREATED_BY: this.i18n.t('relation.in.createdBy'),
      BELONGS_TO_MOVEMENT: this.i18n.t('relation.in.belongsToMovement'),
      BELONGS_TO_PERIOD: this.i18n.t('relation.in.belongsToPeriod'),
      ABOUT_CONCEPT: this.i18n.t('relation.in.aboutConcept'),
      LOCATED_IN: this.i18n.t('relation.in.locatedIn'),
      RELATED_TO: this.i18n.t('relation.in.relatedTo'),
      MENTIONS: this.i18n.t('relation.in.mentions'),
      ASSOCIATED_WITH: this.i18n.t('relation.in.associatedWith'),
      INSPIRED_BY: this.i18n.t('relation.in.inspiredBy'),
      INFLUENCED_BY: this.i18n.t('relation.in.influencedBy'),
      PART_OF: this.i18n.t('relation.in.partOf'),
    };

    return incomingLabels[type] ?? this.i18n.t('relation.in.relatedTo');
  }

  private compactFacts(items: Array<{ label: string; value: any }>): DetailFact[] {
    return items
      .filter((item) => item.value !== null && item.value !== undefined && `${item.value}`.trim().length > 0)
      .map((item) => ({ label: item.label, value: `${item.value}` }));
  }

  private joinFactSummary(values: Array<any>): string | null {
    const parts = values
      .filter((value) => value !== null && value !== undefined && `${value}`.trim().length > 0)
      .map((value) => `${value}`.trim());

    return parts.length ? parts.join(' · ') : null;
  }

  private entityTypeLabel(type: string): string {
    return type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private clearPopupAutoClose(): void {
    if (this.popupAutoCloseTimer !== null) {
      clearTimeout(this.popupAutoCloseTimer);
      this.popupAutoCloseTimer = null;
    }
  }
}
