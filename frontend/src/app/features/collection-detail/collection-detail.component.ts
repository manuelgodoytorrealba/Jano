import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { CollectionsApi, Collection } from '../../core/api/collections.api';
import { SeoService } from '../../core/seo/seo.service';
import { GraphResponseDto } from '../graph/graph.models';
import { GraphComponent } from '../graph/graph.component';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { resolveEntityMediaItem, selectPrimaryVisualMedia } from '../../shared/media/media.utils';

type WorkspaceMode = 'split' | 'image' | 'graph';

@Component({
  standalone: true,
  selector: 'app-collection-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DatePipe, FormsModule, RouterLink, GraphComponent, JanoMediaComponent],
  templateUrl: './collection-detail.component.html',
  styleUrls: ['./collection-detail.component.scss'],
})
export class CollectionDetailComponent {
  private readonly api = inject(CollectionsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly graphResponseCache = new Map<string, GraphResponseDto | null>();
  private readonly notesInput$ = new Subject<string | null>();
  private currentCollectionId = '';
  private lastSavedNotes: string | null = null;

  @ViewChild('notesEditor')
  set notesEditorRef(value: ElementRef<HTMLTextAreaElement> | undefined) {
    if (!value) {
      return;
    }

    requestAnimationFrame(() => this.resizeNotesEditor(value.nativeElement));
  }

  workspaceMode: WorkspaceMode = 'split';
  notesDraft = '';
  notesStatus: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' = 'idle';
  notesError = '';
  readonly workspaceModes: Array<{ value: WorkspaceMode; label: string }> = [
    { value: 'split', label: 'Split View' },
    { value: 'image', label: 'Cover Focus' },
    { value: 'graph', label: 'Graph Focus' },
  ];

  private readonly notesSaveSub = this.notesInput$.pipe(
    debounceTime(700),
    map((notes) => this.normalizeNotes(notes)),
    distinctUntilChanged(),
    switchMap((notes) => {
      if (!this.currentCollectionId || notes === this.lastSavedNotes) {
        this.notesStatus = 'idle';
        this.cdr.markForCheck();
        return EMPTY;
      }

      this.notesStatus = 'saving';
      this.notesError = '';
      this.cdr.markForCheck();

      return this.api.update(this.currentCollectionId, { notes }).pipe(
        tap(() => {
          this.lastSavedNotes = notes;
          this.notesStatus = 'saved';
          this.cdr.markForCheck();
        }),
        catchError(() => {
          this.notesStatus = 'error';
          this.notesError = 'No se pudieron guardar las notas.';
          this.cdr.markForCheck();
          return EMPTY;
        }),
      );
    }),
  ).subscribe();

  readonly collection$ = this.route.paramMap.pipe(
    map((params) => params.get('id') ?? ''),
    switchMap((id) => {
      if (!id) {
        return of(null);
      }

      return this.api.getById(id).pipe(
        tap((collection) => {
          this.currentCollectionId = collection.id;
          this.lastSavedNotes = this.normalizeNotes(collection.notes);
          this.notesDraft = collection.notes ?? '';
          this.notesStatus = 'idle';
          this.notesError = '';
          this.seo.setPageMeta({
            title: `${collection.name} | JANO`,
            description: collection.description ?? `Coleccion personal con ${collection.itemCount} entidades en JANO.`,
            path: `/collections/${collection.id}`,
          });
        }),
        catchError(() => of(null)),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  ngOnDestroy(): void {
    this.notesSaveSub.unsubscribe();
  }

  setWorkspaceMode(mode: WorkspaceMode): void {
    this.workspaceMode = mode;
  }

  coverMedia(collection: Collection): any | null {
    return collection.coverMedia
      ?? resolveEntityMediaItem(collection.items[0]?.entity, 'detail')
      ?? selectPrimaryVisualMedia(collection.items[0]?.entity)
      ?? null;
  }

  coverAlt(collection: Collection): string {
    return collection.coverMedia?.alt ?? collection.name;
  }

  graphResponse(collection: Collection): GraphResponseDto | null {
    const graph = collection.graph;
    const cacheKey = `${collection.id}:${collection.itemCount}:${graph?.nodes.length ?? 0}:${graph?.edges.length ?? 0}`;
    if (this.graphResponseCache.has(cacheKey)) {
      return this.graphResponseCache.get(cacheKey) ?? null;
    }

    if (!graph?.nodes.length) {
      this.rememberGraphResponse(cacheKey, null);
      return null;
    }

    const response: GraphResponseDto = {
      centerId: graph.nodes[0].id,
      nodes: graph.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        slug: node.slug,
        metadata: node.metadata,
      })),
      edges: graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationType: edge.relationType,
        weight: edge.weight,
        justification: edge.justification,
      })),
      filters: {
        entityTypes: Object.keys(graph.summary.entityTypes),
        relationTypes: Object.keys(graph.summary.relationTypes),
      },
    };
    this.rememberGraphResponse(cacheKey, response);
    return response;
  }

  onNotesChanged(value: string, editor: HTMLTextAreaElement): void {
    this.notesDraft = value;
    this.resizeNotesEditor(editor);
    const nextNotes = this.normalizeNotes(value);
    this.notesStatus = nextNotes === this.lastSavedNotes ? 'idle' : 'dirty';
    this.notesError = '';
    this.notesInput$.next(nextNotes);
  }

  graphEdgeCount(collection: Collection): number {
    return collection.graph?.edges.length ?? 0;
  }

  isolatedCount(collection: Collection): number {
    const graph = collection.graph;
    if (!graph) {
      return collection.itemCount;
    }

    const connected = new Set<string>();
    for (const edge of graph.edges) {
      connected.add(edge.source);
      connected.add(edge.target);
    }

    return graph.nodes.filter((node) => !connected.has(node.id)).length;
  }

  entityTypeSummary(collection: Collection): Array<{ type: string; count: number }> {
    return this.summaryEntries(collection.graph?.summary.entityTypes ?? {});
  }

  relationTypeSummary(collection: Collection): Array<{ type: string; count: number }> {
    return this.summaryEntries(collection.graph?.summary.relationTypes ?? {});
  }

  connectedEdges(collection: Collection) {
    return collection.graph?.edges ?? [];
  }

  nodeLabel(collection: Collection, nodeId: string): string {
    return collection.graph?.nodes.find((node) => node.id === nodeId)?.label ?? 'Entidad';
  }

  relationLabel(type: string): string {
    return (type ?? '').toLowerCase().split('_').filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private summaryEntries(source: Record<string, number>): Array<{ type: string; count: number }> {
    return Object.entries(source)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }

  private rememberGraphResponse(cacheKey: string, response: GraphResponseDto | null): void {
    this.graphResponseCache.clear();
    this.graphResponseCache.set(cacheKey, response);
  }

  private normalizeNotes(notes: string | null | undefined): string | null {
    const trimmed = notes?.trim() ?? '';
    return trimmed ? trimmed : null;
  }

  private resizeNotesEditor(editor: HTMLTextAreaElement): void {
    editor.style.height = 'auto';
    editor.style.height = `${Math.max(editor.scrollHeight, 180)}px`;
  }
}
