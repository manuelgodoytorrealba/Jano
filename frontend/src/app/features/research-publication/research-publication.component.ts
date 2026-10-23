import { AsyncPipe, DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';
import {
  ResearchApi,
  ResearchPublicPublication,
  ResearchSourceReference,
} from '../../core/api/research.api';
import { NavigationMemoryService } from '../../core/navigation-memory.service';
import { GraphResponseDto } from '../../core/api/graph.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/i18n.pipe';
import { GraphComponent } from '../graph/graph.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';
import { ArticleReadingComponent } from '../../shared/article-reading/article-reading.component';
import { hasArticleImages } from '../../shared/article-blocks';
import { AppChromeRailService } from '../../shared/ui/app-chrome/app-chrome-rail.service';

type PublicationTab = 'content' | 'index' | 'connections' | 'sources';
type ReadingVisit = {
  publicationId: string;
  chapterId: string | null;
  tab: PublicationTab;
  top: number;
};
type PublicationView =
  | { status: 'loading' | 'error' | 'unavailable' }
  | {
      status: 'ready';
      publication: ResearchPublicPublication;
      graph: GraphResponseDto;
      previewGraph: GraphResponseDto;
    };

@Component({
  standalone: true,
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    GraphComponent,
    RichTextComponent,
    ArticleReadingComponent,
  ],
  templateUrl: './research-publication.component.html',
  styleUrl: './research-publication.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchPublicationComponent implements OnDestroy {
  readonly hasArticleImages = hasArticleImages;
  private readonly route = inject(ActivatedRoute);
  private readonly navigation = inject(NavigationMemoryService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private pendingReadingTop: number | null = null;
  private readonly router = inject(Router);
  private readonly api = inject(ResearchApi);
  private readonly i18n = inject(I18nService);
  private readonly chromeRail = inject(AppChromeRailService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  private publicationId: string | null = null;
  private readingScroll: { element: HTMLElement; top: number } | null = null;
  private lockedScrollElement: HTMLElement | null = null;
  private previousOverflow = '';
  private overlayTrigger: HTMLElement | null = null;

  @ViewChild('reading') private reading?: ElementRef<HTMLElement>;
  @ViewChild('chapterTitle') private chapterTitle?: ElementRef<HTMLElement>;
  @ViewChild('overlay') private overlay?: ElementRef<HTMLDialogElement>;
  @ViewChild('mapTrigger') private mapTrigger?: ElementRef<HTMLButtonElement>;

  readonly activeTab = signal<PublicationTab>('content');
  readonly activeChapterId = signal<string | null>(null);
  readonly isMobile = signal(false);
  readonly overlayKind = signal<'image' | 'map' | null>(null);
  readonly shareFeedback = signal('');
  readonly tabs = [
    {
      id: 'content',
      label: 'research.publication.reading',
      description: 'research.publication.readingHint',
    },
    {
      id: 'index',
      label: 'research.publication.index',
      description: 'research.publication.indexHint',
    },
    {
      id: 'connections',
      label: 'research.publication.connections',
      description: 'research.publication.connectionsHint',
    },
    {
      id: 'sources',
      label: 'research.publication.sources',
      description: 'research.publication.sourcesHint',
    },
  ] as const;

  readonly view$ = combineLatest([
    this.route.paramMap,
    this.reload.pipe(startWith(undefined)),
  ]).pipe(
    tap(() => this.closeOverlay()),
    switchMap(([params]) =>
      this.api.getPublished(params.get('id') ?? '').pipe(
        map((publication): PublicationView => {
          const graph = this.graphData(publication);
          return { status: 'ready', publication, graph, previewGraph: this.previewGraph(graph) };
        }),
        tap((view) => {
          if (view.status !== 'ready') return;
          const publication = view.publication;
          if (this.publicationId !== publication.id) {
            this.closeOverlay();
            this.publicationId = publication.id;
            this.activeTab.set('content');
            this.activeChapterId.set(this.route.snapshot.queryParamMap.get('chapter'));
            this.readingScroll = null;
            this.shareFeedback.set('');
            const saved = this.navigation.read<ReadingVisit>('research-reading');
            if (saved?.publicationId === publication.id) {
              this.activeChapterId.set(saved.chapterId);
              this.activeTab.set(
                this.tabs.some((tab) => tab.id === saved.tab) ? saved.tab : 'content',
              );
              this.pendingReadingTop = Number.isFinite(saved.top) ? Math.max(0, saved.top) : 0;
              this.afterRender(() => this.restoreReadingPosition());
            }
          }
          this.chromeRail.setContextualRail({
            kind: 'publication',
            onShare: () => void this.sharePublication(publication.title, publication.objective),
            onFocus: () => this.startReading(),
          });
        }),
        catchError((error: unknown) => {
          this.chromeRail.clearContextualRail();
          return of<PublicationView>({
            status:
              error instanceof HttpErrorResponse && error.status === 404 ? 'unavailable' : 'error',
          });
        }),
        startWith<PublicationView>({ status: 'loading' }),
      ),
    ),
  );

  constructor() {
    this.navigation.register(
      'research-reading',
      () =>
        this.publicationId
          ? ({
              publicationId: this.publicationId,
              chapterId: this.activeChapterId(),
              tab: this.activeTab(),
              top: this.pendingReadingTop ?? (this.isBrowser ? this.scrollOwner().scrollTop : 0),
            } satisfies ReadingVisit)
          : null,
      this.destroyRef,
    );
    afterNextRender(() => {
      const media = window.matchMedia?.('(max-width: 760px)');
      if (!media) return;
      const update = () => this.isMobile.set(media.matches);
      update();
      media.addEventListener('change', update);
      this.destroyRef.onDestroy(() => media.removeEventListener('change', update));
    });
  }

  ngOnDestroy(): void {
    this.closeOverlay();
    this.reload.complete();
    this.chromeRail.clearContextualRail();
  }

  restoreReadingPosition(): void {
    if (!this.isBrowser || this.pendingReadingTop === null) return;
    this.scrollOwner().scrollTop = this.pendingReadingTop;
    const images = this.host.nativeElement.querySelectorAll<HTMLImageElement>(
      '.publication__cover img, .publication__chapter img',
    );
    if ([...images].every((image) => image.complete)) this.pendingReadingTop = null;
  }

  cancelReadingRestore(): void {
    this.pendingReadingTop = null;
  }

  retry(): void {
    this.reload.next();
  }

  chapterIndex(publication: ResearchPublicPublication): number {
    return Math.max(
      0,
      publication.outlineSections.findIndex((section) => section.id === this.activeChapterId()),
    );
  }

  selectChapter(id: string, publication: ResearchPublicPublication): void {
    this.cancelReadingRestore();
    if (!publication.outlineSections.some((section) => section.id === id)) return;
    this.activeChapterId.set(id);
    this.activeTab.set('content');
    this.readingScroll = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { chapter: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.afterRender(() => {
      this.scrollToReading();
      this.chapterTitle?.nativeElement.focus({ preventScroll: true });
    });
  }

  setTab(tab: PublicationTab): void {
    if (tab === this.activeTab()) return;
    if (this.isBrowser && this.activeTab() === 'content') {
      const element = this.scrollOwner();
      this.readingScroll = { element, top: element.scrollTop };
    }
    this.activeTab.set(tab);
    if (tab === 'content' && this.readingScroll !== null) {
      const saved = this.readingScroll;
      this.afterRender(() => {
        saved.element.scrollTop = saved.top;
      });
    }
  }

  onTabKeydown(event: KeyboardEvent, index: number): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? this.tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
    this.setTab(this.tabs[next].id);
    const button = (
      event.currentTarget as HTMLElement
    ).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    button?.focus();
  }

  startReading(): void {
    this.activeTab.set('content');
    this.afterRender(() => this.scrollToReading());
  }

  private scrollToReading(): void {
    this.reading?.nativeElement.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }

  private scrollOwner(): HTMLElement {
    let element = this.reading?.nativeElement.parentElement;
    while (element && element !== this.document.body) {
      if (
        /auto|scroll/.test(window.getComputedStyle(element).overflowY) &&
        (element.scrollHeight > element.clientHeight || element.scrollTop > 0)
      )
        return element;
      element = element.parentElement;
    }
    return (this.document.scrollingElement as HTMLElement | null) ?? this.document.documentElement;
  }

  private afterRender(callback: () => void): void {
    if (this.isBrowser) afterNextRender(callback, { injector: this.injector });
  }

  openOverlay(kind: 'image' | 'map'): void {
    const dialog = this.overlay?.nativeElement;
    if (!this.isBrowser || !dialog || dialog.open) return;
    this.overlayTrigger = this.document.activeElement as HTMLElement | null;
    this.lockedScrollElement = this.scrollOwner();
    this.previousOverflow = this.lockedScrollElement.style.overflow;
    this.overlayKind.set(kind);
    dialog.showModal();
    this.lockedScrollElement.style.overflow = 'hidden';
  }

  closeOverlay(): void {
    const dialog = this.overlay?.nativeElement;
    if (this.isBrowser && dialog?.open) dialog.close();
    this.onOverlayClosed();
  }

  onOverlayClosed(): void {
    if (this.overlay?.nativeElement.open || !this.overlayKind()) return;
    this.overlayKind.set(null);
    if (this.lockedScrollElement) this.lockedScrollElement.style.overflow = this.previousOverflow;
    this.lockedScrollElement = null;
    const target = this.overlayTrigger?.isConnected
      ? this.overlayTrigger
      : this.mapTrigger?.nativeElement;
    target?.focus({ preventScroll: true });
    this.overlayTrigger = null;
  }

  async sharePublication(title: string, text: string | null): Promise<void> {
    if (!this.isBrowser) return;
    this.shareFeedback.set('');
    try {
      const payload = { title, text: text ?? '', url: window.location.href };
      if (typeof navigator.share === 'function') await navigator.share(payload);
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.url);
        this.shareFeedback.set('research.publication.linkCopied');
      } else this.shareFeedback.set('research.publication.shareFailed');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError'))
        this.shareFeedback.set('research.publication.shareFailed');
    }
  }

  publishedDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), { dateStyle: 'long' }).format(
      new Date(value),
    );
  }

  sourceMeta(source: ResearchSourceReference): string {
    return [source.author, source.publisher, source.year]
      .filter((item): item is string | number => item !== null && item !== undefined)
      .join(' · ');
  }

  private previewGraph(graph: GraphResponseDto): GraphResponseDto {
    const ids = new Set([graph.centerId]);
    for (const edge of graph.edges) {
      if (ids.size >= 6) break;
      if (edge.source === graph.centerId) ids.add(edge.target);
      else if (edge.target === graph.centerId) ids.add(edge.source);
    }
    return {
      ...graph,
      nodes: graph.nodes.filter((node) => ids.has(node.id)),
      edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    };
  }

  graphData(publication: ResearchPublicPublication): GraphResponseDto {
    return {
      centerId: publication.entities[0]?.id ?? '',
      nodes: publication.entities.map((entity) => ({
        id: entity.id,
        slug: entity.canonicalEntity?.slug ?? '',
        label: entity.canonicalEntity?.title ?? entity.title,
        type: entity.canonicalEntity?.type ?? entity.kind,
        image: entity.canonicalEntity?.imageUrl
          ? `/api/entities/${encodeURIComponent(entity.canonicalEntity.slug)}/graph-thumbnail`
          : undefined,
        metadata: { summary: entity.summary },
        state: 'confirmed',
      })),
      edges: publication.relations.map((relation) => ({
        id: relation.id,
        source: relation.fromEntity.id,
        target: relation.toEntity.id,
        relationType: relation.relationType?.key ?? relation.relationType?.label ?? 'RELATED_TO',
        label: relation.relationType?.label ?? this.i18n.t('research.publication.relatedTo'),
        directed: relation.relationType?.directed ?? true,
        justification: relation.explanation ?? undefined,
        state: 'confirmed',
      })),
      filters: {
        entityTypes: [
          ...new Set(
            publication.entities.map((entity) => entity.canonicalEntity?.type ?? entity.kind),
          ),
        ],
        relationTypes: [
          ...new Set(
            publication.relations.map(
              (relation) =>
                relation.relationType?.key ?? relation.relationType?.label ?? 'RELATED_TO',
            ),
          ),
        ],
      },
    };
  }
}
