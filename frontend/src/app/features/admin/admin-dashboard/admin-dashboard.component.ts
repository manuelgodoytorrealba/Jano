import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import {
  AdminEntitiesApi,
  AdminEntityResponse,
  AdminEntitySearchListItem,
} from '../../../core/api/admin-entities.api';
import { AdminHomeDeck, AdminHomeDecksApi } from '../../../core/api/admin-home-decks.api';
import { Collection, CollectionsApi } from '../../../core/api/collections.api';
import { JanoMediaComponent } from '../../../shared/media/jano-media.component';
import { MediaLike, selectPrimaryVisualMedia } from '../../../shared/media/media.utils';
import { GraphComponent } from '../../graph/graph.component';
import { GraphResponseDto } from '../../graph/graph.models';

type SidebarItem = {
  label: string;
  route?: string;
  queryParams?: Record<string, string>;
  disabled?: boolean;
  note?: string;
  count?: number | null;
};

type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

type QuickFilter = {
  label: string;
  route: string;
  queryParams?: Record<string, string>;
};

type QuickFilterGroup = {
  label: string;
  items: QuickFilter[];
};

type RecentEntityCard = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string | null;
  createdAt: string | null;
  relationsCount: number;
  entity: AdminEntityResponse | null;
};

type WorkspaceActivityItem = {
  id: string;
  kind: 'entity' | 'deck' | 'curation';
  title: string;
  detail: string;
  date: string | null;
  route: string;
};

type FeaturedCollectionCard = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  updatedAt: string;
  coverMedia: MediaLike | null;
};

type WorkspaceGraphCard = {
  title: string;
  subtitle: string;
  route: string;
  ctaLabel: string;
  graphData: GraphResponseDto;
  slug: string;
};

type WorkspaceVm = {
  sidebarGroups: SidebarGroup[];
  recentEntities: RecentEntityCard[];
  featuredDecks: AdminHomeDeck[];
  featuredCollections: FeaturedCollectionCard[];
  activity: WorkspaceActivityItem[];
  graphCard: WorkspaceGraphCard | null;
  quickFilterGroups: QuickFilterGroup[];
};

type SidebarCounts = {
  ARTIST: number;
  ARTWORK: number;
  CONCEPT: number;
  MOVEMENT: number;
  PERIOD: number;
  PLACE: number;
  ARTICLE: number;
  CURATIONS: number;
  DECKS: number;
};

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [AsyncPipe, DatePipe, RouterLink, JanoMediaComponent, GraphComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly adminEntitiesApi = inject(AdminEntitiesApi);
  private readonly homeDecksApi = inject(AdminHomeDecksApi);
  private readonly collectionsApi = inject(CollectionsApi);
  readonly graphExpanded = signal(true);
  readonly leftSidebarVisible = signal(true);
  readonly rightSidebarVisible = signal(true);
  readonly vm$ = forkJoin({
    decks: this.homeDecksApi.list().pipe(catchError(() => of([]))),
    recent: this.adminEntitiesApi.list({ page: 1, limit: 5, sort: 'recent' }).pipe(
      map((res) => res.items ?? []),
      catchError(() => of([])),
    ),
    collections: this.collectionsApi.list().pipe(catchError(() => of([]))),
    workspaceGraph: this.adminEntitiesApi.workspaceGraph().pipe(catchError(() => of(null))),
    sidebarCounts: this.sidebarCounts().pipe(catchError(() => of(this.emptySidebarCounts()))),
  }).pipe(
    switchMap(({ decks, recent, collections, workspaceGraph, sidebarCounts }) =>
      forkJoin({
        recentEntities: this.buildRecentEntityCards(recent),
        graphCard: this.buildGraphCard(workspaceGraph),
      }).pipe(
        map(({ recentEntities, graphCard }) => ({
          sidebarGroups: this.sidebarGroups(sidebarCounts),
          recentEntities,
          featuredDecks: this.featuredDecks(decks),
          featuredCollections: this.featuredCollections(collections),
          activity: this.buildActivity(recentEntities, decks, collections),
          graphCard,
          quickFilterGroups: this.quickFilterGroups(),
        })),
      ),
    ),
    startWith({
      sidebarGroups: this.sidebarGroups(this.emptySidebarCounts()),
      recentEntities: [],
      featuredDecks: [],
      featuredCollections: [],
      activity: [],
      graphCard: null,
      quickFilterGroups: this.quickFilterGroups(),
    } satisfies WorkspaceVm),
  );

  typeLabel(type: string | null | undefined): string {
    switch ((type ?? '').toUpperCase()) {
      case 'ARTIST':
        return 'Artists';
      case 'ARTWORK':
        return 'Artworks';
      case 'CONCEPT':
        return 'Concepts';
      case 'MOVEMENT':
        return 'Movements';
      case 'PERIOD':
        return 'Periods';
      case 'PLACE':
        return 'Places';
      case 'ARTICLE':
      case 'TEXT':
        return 'Articles';
      default:
        return type?.trim() || 'Entities';
    }
  }

  statusLabel(status: string | null | undefined): string {
    switch ((status ?? '').toUpperCase()) {
      case 'PUBLISHED':
        return 'Publicada';
      case 'IN_REVIEW':
        return 'En revisión';
      case 'DRAFT':
        return 'Borrador';
      default:
        return 'Actualizada';
    }
  }

  relationLabel(count: number): string {
    return count === 1 ? '1 relación' : `${count} relaciones`;
  }

  activityKindLabel(kind: WorkspaceActivityItem['kind']): string {
    switch (kind) {
      case 'deck':
        return 'Deck';
      case 'curation':
        return 'Curación';
      default:
        return 'Entidad';
    }
  }

  collectionCoverMedia(collection: FeaturedCollectionCard): MediaLike | null {
    return collection.coverMedia;
  }

  deckPreviewEntities(deck: AdminHomeDeck) {
    return [...(deck.entities ?? [])]
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
      .slice(0, 3);
  }

  toggleGraphExpanded(): void {
    this.graphExpanded.update((value) => !value);
  }

  toggleLeftSidebar(): void {
    this.leftSidebarVisible.update((value) => !value);
  }

  toggleRightSidebar(): void {
    this.rightSidebarVisible.update((value) => !value);
  }

  private sidebarGroups(counts: SidebarCounts): SidebarGroup[] {
    return [
      {
        label: 'Archive',
        items: [
          { label: 'Artists', route: '/admin/entities', queryParams: { type: 'ARTIST' }, count: counts['ARTIST'] },
          { label: 'Artworks', route: '/admin/entities', queryParams: { type: 'ARTWORK' }, count: counts['ARTWORK'] },
          { label: 'Concepts', route: '/admin/entities', queryParams: { type: 'CONCEPT' }, count: counts['CONCEPT'] },
          { label: 'Movements', route: '/admin/entities', queryParams: { type: 'MOVEMENT' }, count: counts['MOVEMENT'] },
          { label: 'Periods', route: '/admin/entities', queryParams: { type: 'PERIOD' }, count: counts['PERIOD'] },
          { label: 'Places', route: '/admin/entities', queryParams: { type: 'PLACE' }, count: counts['PLACE'] },
          { label: 'Articles', route: '/admin/entities', queryParams: { type: 'ARTICLE' }, count: counts['ARTICLE'] },
        ],
      },
      {
        label: 'Curated',
        items: [
          { label: 'Curations', route: '/admin/curations', count: counts['CURATIONS'] },
          { label: 'Decks', route: '/admin/home-decks', count: counts['DECKS'] },
        ],
      },
      {
        label: 'System',
        items: [
          { label: 'Relations', disabled: true, note: 'Próximamente' },
          { label: 'Tags', disabled: true, note: 'Próximamente' },
          { label: 'Media', disabled: true, note: 'Próximamente' },
          { label: 'Users', disabled: true, note: 'Próximamente' },
        ],
      },
    ];
  }

  private quickFilterGroups(): QuickFilterGroup[] {
    return [
      {
        label: 'Tipo de entidad',
        items: [
          { label: 'Artists', route: '/admin/entities', queryParams: { type: 'ARTIST' } },
          { label: 'Artworks', route: '/admin/entities', queryParams: { type: 'ARTWORK' } },
          { label: 'Concepts', route: '/admin/entities', queryParams: { type: 'CONCEPT' } },
          { label: 'Articles', route: '/admin/entities', queryParams: { type: 'ARTICLE' } },
        ],
      },
      {
        label: 'Estado',
        items: [
          { label: 'Publicadas', route: '/admin/entities', queryParams: { status: 'PUBLISHED' } },
          { label: 'En revisión', route: '/admin/entities', queryParams: { status: 'IN_REVIEW' } },
          { label: 'Borradores', route: '/admin/entities', queryParams: { status: 'DRAFT' } },
        ],
      },
      {
        label: 'Periodo',
        items: [
          { label: 'Ver periodos', route: '/admin/entities', queryParams: { type: 'PERIOD' } },
        ],
      },
    ];
  }

  private buildRecentEntityCards(recent: AdminEntitySearchListItem[]) {
    if (!recent.length) {
      return of([] as RecentEntityCard[]);
    }

    return forkJoin(recent.map((item) => this.buildRecentEntityCard(item)));
  }

  private buildRecentEntityCard(item: AdminEntitySearchListItem) {
    return forkJoin({
      entity: this.adminEntitiesApi.getById(item.id).pipe(catchError(() => of(null))),
      outgoing: this.adminEntitiesApi.listRelations(item.id).pipe(catchError(() => of([]))),
      incoming: this.adminEntitiesApi.listIncomingRelations(item.id).pipe(catchError(() => of([]))),
    }).pipe(
      map(({ entity, outgoing, incoming }) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        type: item.type,
        status: item.status ?? 'DRAFT',
        updatedAt: item.updatedAt ?? null,
        createdAt: item.createdAt ?? null,
        relationsCount: outgoing.length + incoming.length,
        entity,
      })),
    );
  }

  private featuredDecks(decks: AdminHomeDeck[]): AdminHomeDeck[] {
    return [...decks]
      .sort((left, right) => this.sortByRecent(right.updatedAt, left.updatedAt))
      .slice(0, 3);
  }

  private featuredCollections(collections: Collection[]): FeaturedCollectionCard[] {
    return [...collections]
      .sort((left, right) => this.sortByRecent(right.updatedAt, left.updatedAt))
      .slice(0, 3)
      .map((collection) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description ?? null,
        itemCount: collection.itemCount,
        updatedAt: collection.updatedAt,
        coverMedia:
          collection.coverMedia
          ?? selectPrimaryVisualMedia(collection.items[0]?.entity)
          ?? null,
      }));
  }

  private buildActivity(
    recentEntities: RecentEntityCard[],
    decks: AdminHomeDeck[],
    collections: Collection[],
  ): WorkspaceActivityItem[] {
    const entityItems: WorkspaceActivityItem[] = recentEntities.map((entity) => ({
      id: `entity-${entity.id}`,
      kind: 'entity',
      title: entity.title,
      detail: `${this.typeLabel(entity.type)} · ${this.statusLabel(entity.status)}`,
      date: entity.updatedAt ?? entity.createdAt,
      route: `/admin/entities/${entity.id}/edit`,
    }));

    const deckItems: WorkspaceActivityItem[] = decks.map((deck) => ({
      id: `deck-${deck.id}`,
      kind: 'deck',
      title: deck.title,
      detail: `${deck.surface} · ${deck.isActive ? 'Activo' : 'Inactivo'}`,
      date: deck.updatedAt,
      route: `/admin/home-decks/${deck.id}/edit`,
    }));

    const collectionItems: WorkspaceActivityItem[] = collections.map((collection) => ({
      id: `collection-${collection.id}`,
      kind: 'curation',
      title: collection.name,
      detail: `${collection.itemCount} piezas conectadas`,
      date: collection.updatedAt,
      route: '/admin/curations',
    }));

    return [...entityItems, ...deckItems, ...collectionItems]
      .sort((left, right) => this.sortByRecent(right.date, left.date))
      .slice(0, 6);
  }

  private buildGraphCard(graphData: GraphResponseDto | null): Observable<WorkspaceGraphCard | null> {
    if (!graphData?.nodes?.length) {
      return of<WorkspaceGraphCard | null>(null);
    }

    return of({
      title: 'JANO',
      subtitle: `${graphData.nodes.filter((node) => !node.id.startsWith('workspace-')).length} entidades en el mapa editorial completo`,
      route: '/admin/entities',
      ctaLabel: 'Explorar archivo',
      graphData,
      slug: 'workspace-jano',
    } satisfies WorkspaceGraphCard);
  }

  private sidebarCounts(): Observable<SidebarCounts> {
    return forkJoin({
      ARTIST: this.entityCount({ type: 'ARTIST' }),
      ARTWORK: this.entityCount({ type: 'ARTWORK' }),
      CONCEPT: this.entityCount({ type: 'CONCEPT' }),
      MOVEMENT: this.entityCount({ type: 'MOVEMENT' }),
      PERIOD: this.entityCount({ type: 'PERIOD' }),
      PLACE: this.entityCount({ type: 'PLACE' }),
      ARTICLE: forkJoin([
        this.entityCount({ type: 'ARTICLE' }),
        this.entityCount({ type: 'TEXT' }),
      ]).pipe(map(([article, text]) => article + text)),
      CURATIONS: this.collectionsApi.list().pipe(map((collections) => collections.length), catchError(() => of(0))),
      DECKS: this.homeDecksApi.list().pipe(map((decks) => decks.length), catchError(() => of(0))),
    });
  }

  private emptySidebarCounts(): SidebarCounts {
    return {
      ARTIST: 0,
      ARTWORK: 0,
      CONCEPT: 0,
      MOVEMENT: 0,
      PERIOD: 0,
      PLACE: 0,
      ARTICLE: 0,
      CURATIONS: 0,
      DECKS: 0,
    };
  }

  private entityCount(params: { status?: 'PUBLISHED' | 'DRAFT' | 'IN_REVIEW'; type?: string }) {
    return this.adminEntitiesApi.list({ page: 1, limit: 1, sort: 'recent', ...params }).pipe(
      map((res) => res.total ?? 0),
      catchError(() => of(0)),
    );
  }

  private sortByRecent(left: string | null | undefined, right: string | null | undefined): number {
    return this.toTimestamp(left) - this.toTimestamp(right);
  }

  private toTimestamp(value: string | null | undefined): number {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
