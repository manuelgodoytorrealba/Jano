import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map, distinctUntilChanged, switchMap, shareReplay, tap, of, catchError } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { SavedApi } from '../../core/api/saved.api';
import { CollectionsApi } from '../../core/api/collections.api';
import { AuthService } from '../../core/auth/auth.service';
import { GraphComponent } from '../graph/graph.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';

@Component({
  standalone: true,
  selector: 'app-entity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, GraphComponent, RichTextComponent],
  templateUrl: './entity.component.html',
  styleUrls: ['./entity.component.scss'],

})
export class EntityComponent {
  private api = inject(EntitiesApi);
  private savedApi = inject(SavedApi);
  private collectionsApi = inject(CollectionsApi);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  showGraph = signal(false);
  isSaved = signal(false);
  saveLoading = signal(false);

  showCollectionsPanel = signal(false);
  collectionsLoading = signal(false);
  addingToCollection = signal(false);
  collectionMessage = signal('');

  toggleGraph() {
    this.showGraph.update((v) => !v);
  }

  toggleCollectionsPanel() {
    this.showCollectionsPanel.update((v) => !v);
  }

  primaryMedia(entity: any) {
    return entity?.mediaLinks?.[0]?.media ?? null;
  }

  private slug$ = this.route.paramMap.pipe(
    map((p) => p.get('slug') ?? ''),
    distinctUntilChanged()
  );

  collections$ = this.auth.user$.pipe(
    switchMap((user) => {
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
      if (!this.auth.isLoggedIn) {
        this.isSaved.set(false);
        return;
      }

      this.savedApi.check(entity.id).subscribe({
        next: (res) => this.isSaved.set(res.saved),
        error: () => this.isSaved.set(false),
      });
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  toggleSave(entityId: string) {
    if (!this.auth.isLoggedIn || this.saveLoading()) return;

    this.saveLoading.set(true);

    const req$ = this.isSaved()
      ? this.savedApi.remove(entityId)
      : this.savedApi.save(entityId);

    req$.subscribe({
      next: () => {
        this.isSaved.update((v) => !v);
        this.saveLoading.set(false);
      },
      error: () => {
        this.saveLoading.set(false);
      },
    });
  }

  addToCollection(collectionId: string, entityId: string) {
    if (this.addingToCollection()) return;

    this.addingToCollection.set(true);
    this.collectionMessage.set('');

    this.collectionsApi.addEntity(collectionId, entityId).subscribe({
      next: () => {
        this.addingToCollection.set(false);
        this.collectionMessage.set('Entity añadida a la colección.');
      },
      error: (err) => {
        this.addingToCollection.set(false);
        this.collectionMessage.set(err?.error?.message ?? 'No se pudo añadir a la colección.');
      },
    });
  }

  relationMedia(entity: any) {
    return entity?.mediaLinks?.[0]?.media ?? null;
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
}