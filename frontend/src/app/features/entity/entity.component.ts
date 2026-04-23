import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe, Location } from '@angular/common';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { SavedApi } from '../../core/api/saved.api';
import { CollectionsApi } from '../../core/api/collections.api';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { mediaDisplayUrl, resolveEntityMediaItem, selectPrimaryVisualMedia } from '../../shared/media/media.utils';
import { EntityDetailViewComponent } from './entity-detail-view.component';
import { AppChromeRailService } from '../../shared/ui/app-chrome/app-chrome-rail.service';

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
    this.chromeRail.clearContextualRail();
  }

  goBack() {
    this.location.back();
  }

  toggleCollectionsPanel() {
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
    this.showCollectionsPanel.set(false);
    this.collectionsChooserOpen.set(false);
    this.popupTitle.set('');
    this.collectionMessage.set('');
  }

  openCollectionsChooser() {
    this.showCollectionsPanel.set(true);
    this.collectionsChooserOpen.set(true);
    this.popupKind.set('collections');
    this.popupTitle.set('Añadir a colección');
    this.collectionMessage.set('Elige una colección para organizar esta entidad.');
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
        this.openPopup('removed', 'Eliminada de guardados', 'Ya no aparece en My Space.');
      },
      error: () => {
        this.saveLoading.set(false);
        this.openPopup('error', 'No se pudo quitar', 'Inténtalo de nuevo en un momento.');
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
        this.popupTitle.set('No se pudo crear');
        this.collectionMessage.set(err?.error?.message ?? 'No se pudo crear la colección.');
      },
    });
  }

  private openPopup(kind: DetailPopupKind, title: string, message: string, showChooser = false) {
    this.showCollectionsPanel.set(true);
    this.collectionsChooserOpen.set(showChooser);
    this.popupKind.set(kind);
    this.popupTitle.set(title);
    this.collectionMessage.set(message);
  }

  shareEntity(entity: any) {
    if (!entity) {
      return;
    }

    const title = entity.title ?? 'Entidad';
    const text = entity.summary ?? this.detailHeroSubtitle(entity) ?? 'Descubre esta entidad en JANO.';
    const url = typeof window !== 'undefined' ? window.location.href : '';

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav) {
      return;
    }

    const payload = { title, text, url };

    if (typeof nav.share === 'function') {
      nav.share(payload).catch(() => {
        this.openPopup('error', 'No se pudo compartir', 'No se pudo abrir el panel de compartir.');
      });
      return;
    }

    if (nav.clipboard?.writeText && url) {
      nav.clipboard.writeText(url)
        .then(() => {
          this.openPopup('share', 'Enlace copiado', 'Ya puedes compartir esta entidad donde quieras.');
        })
        .catch(() => {
          this.openPopup('error', 'No se pudo compartir', 'No se pudo copiar el enlace de esta entidad.');
        });
      return;
    }

    this.openPopup('error', 'No se pudo compartir', 'Compartir no está disponible en este navegador.');
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
    return this.detailMedia(entity)?.alt || entity?.title || 'Imagen de entidad';
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

    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  storySectionLabel(entity: any): string {
    return this.isArticle(entity) ? 'Artículo' : 'Ensayo';
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
        { label: 'Técnica', value: entity.artwork.technique },
        { label: 'Materiales', value: entity.artwork.materials },
        { label: 'Dimensiones', value: entity.artwork.dimensions },
        { label: 'Ubicación', value: entity.artwork.location },
        { label: 'Colección', value: entity.artwork.collection },
        { label: 'Estado', value: entity.artwork.state },
        { label: 'Nacionalidad autor', value: entity.artwork.authorNation },
      ]);
    }

    if (entity?.type === 'ARTIST' && entity.artist) {
      return this.compactFacts([
        { label: 'País', value: entity.artist.country },
        { label: 'Ciudad', value: entity.artist.city },
        { label: 'Nacimiento', value: entity.artist.birthYear },
        { label: 'Muerte', value: entity.artist.deathYear },
        { label: 'Disciplinas', value: entity.artist.disciplines },
        { label: 'Links', value: entity.artist.links },
      ]);
    }

    return [];
  }

  detailFactKicker(entity: any): string {
    switch (entity?.type) {
      case 'ARTWORK':
        return 'Obra';
      case 'ARTIST':
        return 'Artista';
      case 'ARTICLE':
        return 'Artículo';
      case 'CONCEPT':
        return 'Concepto';
      case 'PERIOD':
        return 'Periodo';
      default:
        return 'Ficha';
    }
  }

  detailFactTitle(entity: any): string {
    switch (entity?.type) {
      case 'ARTWORK':
        return 'Materialidad y contexto';
      case 'ARTIST':
        return 'Trayectoria esencial';
      case 'ARTICLE':
        return 'Contexto editorial';
      case 'CONCEPT':
        return 'Definición base';
      case 'PERIOD':
        return 'Marco histórico';
      default:
        return 'Información principal';
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
    distinctUntilChanged()
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

  entity$ = this.slug$.pipe(
    switchMap((slug) => this.api.get(slug)),
    tap((entity) => {
      this.currentEntity.set(entity);
      this.isSaved.set(false);
      this.saveStatusResolved.set(false);
      this.closeCollectionsPanel();
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
      this.openPopup('manage', 'Ya está guardada', 'Puedes añadirla a una colección, crear una nueva o quitarla de guardados.');
      return;
    }

    this.saveLoading.set(true);

    const req$ = this.savedApi.save(entityId);

    req$.subscribe({
      next: () => {
        this.isSaved.set(true);
        this.saveLoading.set(false);
        this.openPopup('saved', 'Entidad guardada', 'Guardada en My Space. Puedes dejarla así o añadirla a una colección.');
      },
      error: () => {
        this.saveLoading.set(false);
        this.openPopup('error', 'No se pudo guardar', 'Inténtalo de nuevo en un momento.');
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
        this.popupTitle.set(createdNow ? 'Colección creada' : 'Añadida a colección');
        this.collectionMessage.set(
          createdNow
            ? 'La colección ya está creada y esta entidad quedó añadida dentro.'
            : 'La entidad ya está organizada dentro de tu colección.',
        );
      },
      error: (err) => {
        this.addingToCollection.set(false);
        this.popupKind.set('error');
        this.popupTitle.set('No se pudo añadir');
        this.collectionMessage.set(err?.error?.message ?? 'No se pudo añadir a la colección.');
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
      CREATED_BY: 'Creado por',
      BELONGS_TO_MOVEMENT: 'Pertenece al movimiento',
      BELONGS_TO_PERIOD: 'Pertenece al periodo',
      ABOUT_CONCEPT: 'Explora el concepto',
      LOCATED_IN: 'Ubicado en',
      RELATED_TO: 'Relacionado con',
      MENTIONS: 'Menciona',
      ASSOCIATED_WITH: 'Asociado con',
      INSPIRED_BY: 'Inspirado por',
      INFLUENCED_BY: 'Influenciado por',
      PART_OF: 'Forma parte de',
    };

    return labels[type] ?? type.replaceAll('_', ' ').toLowerCase();
  }

  relationDirectionLabel(type: string, direction: 'outgoing' | 'incoming'): string {
    if (direction === 'outgoing') {
      return this.relationLabel(type);
    }

    const incomingLabels: Record<string, string> = {
      CREATED_BY: 'Obra creada por esta entidad',
      BELONGS_TO_MOVEMENT: 'Entidad dentro de este movimiento',
      BELONGS_TO_PERIOD: 'Entidad dentro de este periodo',
      ABOUT_CONCEPT: 'Entidad relacionada con este concepto',
      LOCATED_IN: 'Entidad ubicada aquí',
      RELATED_TO: 'Relacionado con esta entidad',
      MENTIONS: 'Mencionado por',
      ASSOCIATED_WITH: 'Asociado con esta entidad',
      INSPIRED_BY: 'Inspira a',
      INFLUENCED_BY: 'Influye en',
      PART_OF: 'Incluye esta entidad',
    };

    return incomingLabels[type] ?? 'Relacionado con esta entidad';
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
}
