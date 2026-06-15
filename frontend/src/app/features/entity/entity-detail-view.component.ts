import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GraphComponent } from '../graph/graph.component';
import { PublicEntity, PublicEntityRelation, PublicEntityRelationEndpoint, PublicEntityTagItem } from '../../core/api/entities.models';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
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

type DetailWorkspaceMode = 'split' | 'image' | 'graph';

@Component({
  standalone: true,
  selector: 'app-entity-detail-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, GraphComponent, RichTextComponent, JanoMediaComponent],
  templateUrl: './entity-detail-view.component.html',
  styleUrls: ['./entity-detail-view.component.scss'],
})
export class EntityDetailViewComponent implements OnDestroy {
  private static readonly INITIAL_RELATION_LIMIT = 48;
  private static readonly RELATION_LIMIT_STEP = 48;
  private readonly cdr = inject(ChangeDetectorRef);
  readonly artworkTransition = inject(EntityRouteArtworkTransitionService);
  readonly i18n = inject(I18nService);
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  @Input() entity: PublicEntity | null = null;
  @Input() showActions = false;
  @Input() isSaved = false;
  @Input() saveLoading = false;
  @Input() collectionsLoading = false;
  @Input() renderGraph = true;

  @Output() saveToggle = new EventEmitter<string>();
  @Output() collectionsToggle = new EventEmitter<void>();
  @Output() shareToggle = new EventEmitter<void>();
  workspaceMode: DetailWorkspaceMode = 'split';
  workspaceFocused = false;
  workspaceTransitioning = false;
  outgoingRelationLimit = EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
  incomingRelationLimit = EntityDetailViewComponent.INITIAL_RELATION_LIMIT;
  readonly workspaceModes: Array<{ value: DetailWorkspaceMode; labelKey: string }> = [
    { value: 'split', labelKey: 'workspace.split' },
    { value: 'image', labelKey: 'workspace.image' },
    { value: 'graph', labelKey: 'workspace.graph' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entity'] && !changes['entity'].firstChange) {
      this.workspaceMode = 'split';
      this.workspaceFocused = false;
      this.workspaceTransitioning = false;
      this.clearTransitionTimer();
      this.resetRelationLimits();
    }
  }

  ngOnDestroy(): void {
    this.clearTransitionTimer();
  }

  setWorkspaceMode(mode: DetailWorkspaceMode): void {
    if (this.workspaceMode === mode) {
      return;
    }

    this.beginWorkspaceTransition();
    this.workspaceMode = mode;
  }

  toggleWorkspaceFocus(): void {
    this.beginWorkspaceTransition();
    this.workspaceFocused = !this.workspaceFocused;
  }

  @HostListener('window:keydown.escape')
  exitWorkspaceFocus(): void {
    if (this.workspaceFocused) {
      this.beginWorkspaceTransition();
      this.workspaceFocused = false;
    }
  }

  private beginWorkspaceTransition(): void {
    this.workspaceTransitioning = true;
    this.clearTransitionTimer();
    this.transitionTimer = setTimeout(() => {
      this.workspaceTransitioning = false;
      this.transitionTimer = null;
      this.cdr.markForCheck();
    }, 420);
  }

  private clearTransitionTimer(): void {
    if (!this.transitionTimer) {
      return;
    }

    clearTimeout(this.transitionTimer);
    this.transitionTimer = null;
  }

  artworkArrivalActive(entity: PublicEntity | null): boolean {
    return this.artworkTransition.isForSlug(entity?.slug ?? null);
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

  showMoreOutgoingRelations(): void {
    this.outgoingRelationLimit += EntityDetailViewComponent.RELATION_LIMIT_STEP;
  }

  showMoreIncomingRelations(): void {
    this.incomingRelationLimit += EntityDetailViewComponent.RELATION_LIMIT_STEP;
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
}
