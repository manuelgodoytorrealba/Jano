import { ArticleHeroComponent } from '../../shared/article-reading/article-hero.component';
import { ArticleReadingComponent } from '../../shared/article-reading/article-reading.component';
import { EntityConnectionsPreviewComponent } from './entity-connections-preview.component';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  Renderer2,
  SimpleChanges,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RelationControlsComponent } from './relation-controls.component';
import { EntityScrollProgressComponent } from './entity-scroll-progress.component';
import { GraphComponent } from '../graph/graph.component';
import {
  PublicEntity,
  PublicEntityRelation,
  PublicEntityRelationEndpoint,
  PublicEntityTagItem,
} from '../../core/api/entities.models';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
import { NavigationMemoryService } from '../../core/navigation-memory.service';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  articleByline,
  articleDateLabel,
  detailFactKicker,
  detailFactSummary,
  detailFacts,
  detailFactTitle,
  detailHeroSubtitle,
  detailMedia,
  entityTags,
  entityTypeLabel,
  externalSourceLink,
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

type DetailWorkspaceMode = 'split' | 'image' | 'graph' | 'info';
type GraphWorkspaceMode = 'split' | 'image' | 'graph';
type GraphEntityInfo = {
  title: string;
  subtitle: string | null;
  summary: string | null;
  badges: string[];
};

type DetailVisitState = {
  slug: string;
  tab: string;
  windowY: number;
  workspaceMode: DetailWorkspaceMode;
  workspaceFocused: boolean;
  outgoingLimit: number;
  incomingLimit: number;
  focusHref: string | null;
  focusId: string | null;
};

@Component({
  standalone: true,
  selector: 'app-entity-detail-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RelationControlsComponent,
    EntityConnectionsPreviewComponent,
    RouterLink,
    GraphComponent,
    RichTextComponent,
    ArticleReadingComponent,
    ArticleHeroComponent,
    JanoMediaComponent,
    EntityScrollProgressComponent,
  ],
  templateUrl: './entity-detail-view.component.html',
  styleUrls: [
    './entity-detail-view.component.scss',
    './entity-information-tabs.scss',
    './entity-mobile.scss',
  ],
})
export class EntityDetailViewComponent implements OnDestroy, OnChanges {
  readonly externalSourceLink = externalSourceLink;
  private static readonly MOBILE_BREAKPOINT = 760;
  private static readonly INITIAL_RELATION_LIMIT = 3;
  private static readonly WORKSPACE_TRANSITION_MS = 320;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  readonly artworkTransition = inject(EntityRouteArtworkTransitionService);
  readonly i18n = inject(I18nService);
  readonly navigation = inject(NavigationMemoryService);
  private readonly injector = inject(Injector);
  private restoredVisitKey = '';
  private mobileReadingScrollY = 0;
  private pendingScroll: number | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  @Input() entity: PublicEntity | null = null;
  @Input() showActions = false;
  @Input() isSaved = false;
  @Input() saveLoading = false;
  @Input() collectionsLoading = false;
  @Input() collectionsOpen = false;
  @Input() actionFeedback = '';
  @Input() actionFeedbackError = false;
  @Input() renderGraph = true;
  @Input() preferredWorkspaceMode: DetailWorkspaceMode | null = null;
  @Input() richTextPreviewAccess: 'public' | 'admin' = 'public';

  @Output() saveToggle = new EventEmitter<string>();
  @Output() collectionsToggle = new EventEmitter<void>();
  @Output() shareToggle = new EventEmitter<void>();
  isMobileViewport = false;
  readonly informationTabs = [
    {
      id: 'context',
      label: 'entity.context',
      description: 'entity.contextDescription',
      icon: 'M16 8C12.5 5.4 7.5 5.1 3 6.7v19c4.5-1.6 9.5-1.3 13 1.3 3.5-2.6 8.5-2.9 13-1.3v-19C24.5 5.1 19.5 5.4 16 8Z',
      detail:
        'M16 8v19M7 11c2.2-.4 4.2-.1 6 1M7 15c2.2-.4 4.2-.1 6 1M7 19c2.2-.4 4.2-.1 6 1M19 12c1.8-1.1 3.8-1.4 6-1M19 16c1.8-1.1 3.8-1.4 6-1M19 20c1.8-1.1 3.8-1.4 6-1',
    },
    {
      id: 'sheet',
      label: 'entity.sheet',
      description: 'entity.sheetDescription',
      icon: 'M10 4h15a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
      detail: 'M5 25V4a2 2 0 0 1 2-2h15M12 9h5v5h-5ZM20 9h3M20 13h3M12 19h11M12 23h11M12 27h7',
    },
    {
      id: 'relations',
      label: 'entity.relations',
      description: 'entity.relationsDescription',
      icon: 'M20 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM8 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM30 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM11 27a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM30 26a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
      detail:
        'm7.3 8.9 5.6 4.7m6.1-.3 5.8-5.4M13.6 19.2l-3.8 5.4m9.2-6 5.8 5.4M8 6.7c4.6-2 9.9-2.2 16-.7M11 27c4.7 1.7 9 1.3 13-.5',
    },
    {
      id: 'sources',
      label: 'entity.sources',
      description: 'entity.sourcesDescription',
      icon: 'M3 5h7v23H3ZM10 8h7v20h-7ZM19 5l6-1.5 5.8 22.3-6 1.5Z',
      detail:
        'M3 10h7M3 23h7M6.5 14v5M10 13h7M10 23h7M13.5 17v3m6.8-10 6-1.5m-2.1 14 6-1.5M23 13l1.7 6.4M2 30h28',
    },
  ];
  informationTab = 'context';
  workspaceMode: DetailWorkspaceMode = 'split';
  workspaceFocused = false;
  workspaceTransitioning = false;
  outgoingRelationLimit = EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
  incomingRelationLimit = EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
  private readonly desktopWorkspaceModes: Array<{ value: DetailWorkspaceMode; labelKey: string }> =
    [
      { value: 'split', labelKey: 'workspace.split' },
      { value: 'image', labelKey: 'workspace.image' },
      { value: 'graph', labelKey: 'workspace.graph' },
    ];
  private readonly mobileWorkspaceModes: Array<{ value: DetailWorkspaceMode; labelKey: string }> = [
    { value: 'image', labelKey: 'workspace.image' },
    { value: 'graph', labelKey: 'workspace.graph' },
    { value: 'info', labelKey: 'graph.info' },
  ];

  constructor() {
    this.syncViewportState();
    this.workspaceMode = 'split';
    this.navigation.register(
      'detail',
      () =>
        ({
          slug: this.entity?.slug ?? '',
          tab: this.informationTab,
          windowY: this.pendingScroll ?? (this.isBrowser ? window.scrollY : 0),
          workspaceMode: this.workspaceMode,
          workspaceFocused: this.workspaceFocused,
          outgoingLimit: this.outgoingRelationLimit,
          incomingLimit: this.incomingRelationLimit,
          focusHref: this.isBrowser
            ? (this.document.activeElement?.closest('a')?.getAttribute('href') ?? null)
            : null,
          focusId: this.document.activeElement?.id || null,
        }) satisfies DetailVisitState,
      inject(DestroyRef),
    );
  }

  get workspaceModes(): Array<{ value: DetailWorkspaceMode; labelKey: string }> {
    return this.isMobileViewport ? this.mobileWorkspaceModes : this.desktopWorkspaceModes;
  }

  get graphWorkspaceMode(): GraphWorkspaceMode {
    if (
      this.workspaceMode === 'split' ||
      this.workspaceMode === 'image' ||
      this.workspaceMode === 'graph'
    ) {
      return this.workspaceMode;
    }

    return 'image';
  }

  mobileGraphEntityInfo(entity: PublicEntity | null): GraphEntityInfo | null {
    if (!entity || this.isArticle(entity)) {
      return null;
    }

    const badges = [
      this.statusLabel(entity.status),
      entity.contentLevel ? this.contentLevelLabel(entity.contentLevel) : null,
      entityTypeLabel(entity.type, (key) => this.i18n.t(key)),
      entity.startYear || entity.endYear
        ? `${entity.startYear ?? ''}${entity.endYear ? `–${entity.endYear}` : ''}`
        : null,
    ].filter((value): value is string => !!value);

    return {
      title: entity.title,
      subtitle: this.detailHeroSubtitle(entity),
      summary: entity.summary ?? null,
      badges,
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['entity'] &&
        !changes['entity'].firstChange &&
        changes['entity'].previousValue?.slug !== changes['entity'].currentValue?.slug) ||
      (changes['preferredWorkspaceMode'] && !changes['preferredWorkspaceMode'].firstChange)
    ) {
      this.informationTab = 'context';
      this.workspaceMode = 'split';
      this.workspaceFocused = false;
      this.workspaceTransitioning = false;
      this.clearTransitionTimer();
      this.resetRelationLimits();
      this.syncImmersiveBodyState(false);
    }
    this.restoreNavigationState();
  }

  private restoreNavigationState(): void {
    if (!this.entity || !this.isBrowser || !this.navigation.visit().url.startsWith('/entity/'))
      return;
    const key = this.navigation.visit().key;
    if (key === this.restoredVisitKey) return;
    this.restoredVisitKey = key;
    const state = this.navigation.read<DetailVisitState>('detail');
    if (!state || state.slug !== this.entity.slug) return;
    this.informationTab = this.informationTabs.some((tab) => tab.id === state.tab)
      ? state.tab
      : 'context';
    this.workspaceMode = this.workspaceModes.some((mode) => mode.value === state.workspaceMode)
      ? state.workspaceMode
      : 'split';
    this.workspaceFocused = Boolean(state.workspaceFocused);
    this.outgoingRelationLimit = Math.max(
      EntityDetailViewComponent.INITIAL_RELATION_LIMIT,
      state.outgoingLimit,
    );
    this.incomingRelationLimit = Math.max(
      EntityDetailViewComponent.INITIAL_RELATION_LIMIT,
      state.incomingLimit,
    );
    this.syncImmersiveBodyState(this.workspaceFocused);
    this.pendingScroll = state.windowY;
    afterNextRender(
      () => {
        if (this.navigation.visit().key !== key) return;
        window.scrollTo({ top: state.windowY, behavior: 'instant' });
        this.pendingScroll = null;
        const focus = state.focusHref
          ? this.document.querySelector<HTMLAnchorElement>(
              `a[href="${CSS.escape(state.focusHref)}"]`,
            )
          : state.focusId
            ? this.document.getElementById(state.focusId)
            : null;
        focus?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  ngOnDestroy(): void {
    this.clearTransitionTimer();
    this.syncImmersiveBodyState(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
  }

  onInformationTabKeydown(event: KeyboardEvent): void {
    const index = this.informationTabs.findIndex((tab) => tab.id === this.informationTab);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % this.informationTabs.length;
        break;
      case 'ArrowLeft':
        next = (index + this.informationTabs.length - 1) % this.informationTabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = this.informationTabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.informationTab = this.informationTabs[next].id;
    (event.currentTarget as HTMLElement)
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }

  setWorkspaceMode(mode: DetailWorkspaceMode): void {
    if (this.workspaceMode === mode) {
      return;
    }

    this.beginWorkspaceTransition();
    this.workspaceMode = mode;
  }

  showMobileRelations(): void {
    this.informationTab = 'relations';
    this.document.getElementById('entity-tab-relations')?.focus();
  }

  openMobileWorkspace(mode: 'image' | 'graph'): void {
    this.setWorkspaceMode(mode);
    if (!this.workspaceFocused) this.toggleWorkspaceFocus();
  }

  toggleWorkspaceFocus(): void {
    if (this.isBrowser && this.isMobileViewport && !this.workspaceFocused) {
      this.mobileReadingScrollY = window.scrollY;
    }
    this.beginWorkspaceTransition();
    this.workspaceFocused = !this.workspaceFocused;
    this.syncImmersiveBodyState();
    if (this.isBrowser && this.isMobileViewport && !this.workspaceFocused) {
      afterNextRender(
        () => {
          window.scrollTo({ top: this.mobileReadingScrollY, behavior: 'instant' });
          this.document
            .querySelector<HTMLButtonElement>(
              this.workspaceMode === 'image'
                ? '.entity-mobile-media__open'
                : '.entity-mobile-map__open',
            )
            ?.focus({ preventScroll: true });
        },
        { injector: this.injector },
      );
    }
  }

  @HostListener('window:keydown.escape')
  exitWorkspaceFocus(): void {
    if (this.workspaceFocused) {
      this.toggleWorkspaceFocus();
    }
  }

  private beginWorkspaceTransition(): void {
    this.workspaceTransitioning = true;
    this.clearTransitionTimer();
    this.transitionTimer = setTimeout(() => {
      this.workspaceTransitioning = false;
      this.transitionTimer = null;
      this.cdr.markForCheck();
    }, EntityDetailViewComponent.WORKSPACE_TRANSITION_MS);
  }

  private clearTransitionTimer(): void {
    if (!this.transitionTimer) {
      return;
    }

    clearTimeout(this.transitionTimer);
    this.transitionTimer = null;
  }

  private syncImmersiveBodyState(forceValue?: boolean): void {
    if (!this.isBrowser || !this.document?.body) {
      return;
    }

    const active = forceValue ?? (this.isMobileViewport && this.workspaceFocused);
    if (active) {
      this.renderer.addClass(this.document.body, 'app-stage-immersive');
      return;
    }

    this.renderer.removeClass(this.document.body, 'app-stage-immersive');
  }

  artworkArrivalActive(entity: PublicEntity | null): boolean {
    return this.artworkTransition.isForSlug(entity?.slug ?? null);
  }

  showWorkspace(entity: PublicEntity | null): boolean {
    return !this.isArticle(entity) && (!this.isMobileViewport || this.workspaceMode !== 'info');
  }

  showEditorialFlow(entity: PublicEntity | null): boolean {
    return !!entity;
  }

  revealArrivalTitle(entity: PublicEntity | null): boolean {
    return this.artworkTransition.shouldRevealTitle(entity?.slug ?? null);
  }

  revealArrivalMeta(entity: PublicEntity | null): boolean {
    return this.artworkTransition.shouldRevealMeta(entity?.slug ?? null);
  }

  revealArrivalControls(entity: PublicEntity | null): boolean {
    return this.artworkTransition.shouldRevealControls(entity?.slug ?? null);
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

  statusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'DRAFT':
        return this.i18n.t('status.draft');
      case 'IN_REVIEW':
        return this.i18n.t('status.inReview');
      case 'PUBLISHED':
        return this.i18n.t('status.published');
      default:
        return status ?? '';
    }
  }

  contentLevelLabel(level: string | null | undefined): string {
    switch (level) {
      case 'BASIC':
        return this.i18n.t('level.basic');
      case 'INTERMEDIATE':
        return this.i18n.t('level.intermediate');
      case 'ADVANCED':
        return this.i18n.t('level.advanced');
      default:
        return level ?? '';
    }
  }

  sourceTypeLabel(type: string | null | undefined): string {
    switch (type) {
      case 'BOOK':
        return this.i18n.t('source.book');
      case 'ARTICLE':
        return this.i18n.t('source.article');
      case 'WEBSITE':
        return this.i18n.t('source.website');
      case 'CATALOG':
        return this.i18n.t('source.catalog');
      case 'PAPER':
        return this.i18n.t('source.paper');
      default:
        return type ?? '';
    }
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

  outgoingByType(entity: PublicEntity | null, type: string): PublicEntityRelation[] {
    return outgoingByType(entity, type);
  }

  incomingByType(entity: PublicEntity | null, type: string): PublicEntityRelation[] {
    return incomingByType(entity, type);
  }

  visibleOutgoingRelations(entity: PublicEntity | null): PublicEntityRelation[] {
    return (entity?.outgoing ?? []).slice(0, this.outgoingRelationLimit);
  }

  visibleIncomingRelations(entity: PublicEntity | null): PublicEntityRelation[] {
    return (entity?.incoming ?? []).slice(0, this.incomingRelationLimit);
  }

  hiddenOutgoingRelations(entity: PublicEntity | null): number {
    return Math.max(0, (entity?.outgoing?.length ?? 0) - this.outgoingRelationLimit);
  }

  hiddenIncomingRelations(entity: PublicEntity | null): number {
    return Math.max(0, (entity?.incoming?.length ?? 0) - this.incomingRelationLimit);
  }

  toggleOutgoingRelations(entity: PublicEntity | null): void {
    this.outgoingRelationLimit =
      this.hiddenOutgoingRelations(entity) > 0
        ? (entity?.outgoing?.length ?? 0)
        : EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
  }

  toggleIncomingRelations(entity: PublicEntity | null): void {
    this.incomingRelationLimit =
      this.hiddenIncomingRelations(entity) > 0
        ? (entity?.incoming?.length ?? 0)
        : EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
  }

  private resetRelationLimits(): void {
    this.outgoingRelationLimit = EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
    this.incomingRelationLimit = EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
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

  relationLabel(type: string): string {
    return relationLabel(type, (key) => this.i18n.t(key));
  }

  relationDirectionLabel(type: string, direction: 'outgoing' | 'incoming'): string {
    return relationDirectionLabel(type, direction, (key) => this.i18n.t(key));
  }

  entityTags(entity: PublicEntity | null): PublicEntityTagItem[] {
    return entityTags(entity);
  }

  onSave(entityId: string) {
    this.saveToggle.emit(entityId);
  }

  onCollections() {
    this.collectionsToggle.emit();
  }

  onShare() {
    this.shareToggle.emit();
  }

  entityTypeLabel(type: string): string {
    return entityTypeLabel(type, (key) => this.i18n.t(key));
  }

  private defaultWorkspaceMode(): DetailWorkspaceMode {
    if (this.preferredWorkspaceMode) {
      if (this.isMobileViewport && this.preferredWorkspaceMode === 'split') {
        return 'graph';
      }

      if (!this.isMobileViewport && this.preferredWorkspaceMode === 'info') {
        return 'split';
      }

      return this.preferredWorkspaceMode;
    }

    return 'split';
  }

  private syncViewportState(): void {
    const nextIsMobile = this.isBrowser
      ? window.innerWidth <= EntityDetailViewComponent.MOBILE_BREAKPOINT
      : false;

    if (nextIsMobile === this.isMobileViewport) {
      return;
    }

    this.isMobileViewport = nextIsMobile;

    if (this.isMobileViewport) {
      if (this.workspaceMode === 'split') {
        this.workspaceMode = 'split';
      }
    } else {
      if (this.workspaceFocused) {
        this.workspaceFocused = false;
      }
      this.syncImmersiveBodyState(false);
      if (this.workspaceMode === 'info') {
        this.workspaceMode = 'split';
      }
    }

    this.syncImmersiveBodyState();
    this.cdr.markForCheck();
  }
}
