import { NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { PublicEntityListItem } from '../../core/api/entities.models';
import { EntityArtworkTransitionPayload } from '../../core/entity-route-artwork-transition.service';
import { mediaDisplayUrl, resolveEntityMediaItem } from '../../shared/media/media.utils';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type Entity = PublicEntityListItem & {
  birthYear?: string | number | null;
  deathYear?: string | number | null;
  authorName?: string | null;
  artistName?: string | null;
  sourceAuthor?: string | null;
  creator?: string | null;
};
type TotemWindowRole = -1 | 0 | 1;

type TotemCardStyle = Record<string, string>;

type RibbonCard = {
  item: Entity;
  index: number;
  role: TotemWindowRole;
  active: boolean;
};

@Component({
  standalone: true,
  selector: 'app-entities-explorer-totem',
  imports: [NgStyle, JanoMediaComponent],
  templateUrl: './entities-explorer-totem.component.html',
  styleUrl: './entities-explorer-totem.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitiesExplorerTotemComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: Entity[] = [];
  @Input() activeIndex = 0;
  @Input() infoOpen = false;

  @Output() activeIndexChange = new EventEmitter<number>();
  @Output() openEntity = new EventEmitter<string | EntityArtworkTransitionPayload>();
  @Output() requestInfoOpen = new EventEmitter<void>();
  @Output() requestInfoClose = new EventEmitter<void>();

  @ViewChild('stage', { static: true })
  stageRef!: ElementRef<HTMLDivElement>;

  readonly i18n = inject(I18nService);

  private readonly isBrowser: boolean;
  private resizeObserver?: ResizeObserver;
  private pointerId: number | null = null;
  private startY = 0;
  private pendingDragOffset = 0;
  private dragFrame: number | null = null;
  private clickSuppressedUntil = 0;
  private animationTimer: number | null = null;
  private settleResetTimer: number | null = null;
  private panelUpdateTimer: number | null = null;

  private readonly stageHeight = signal(0);
  private readonly dragOffset = signal(0);
  private readonly dragging = signal(false);
  private readonly settling = signal(false);
  private readonly panelIndex = signal(0);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get activeItem(): Entity | null {
    return this.items[this.activeIndex] ?? null;
  }

  get panelItem(): Entity | null {
    return this.items[this.panelIndex()] ?? this.activeItem;
  }

  get previousItem(): Entity | null {
    return this.resolveItem(-1);
  }

  get nextItem(): Entity | null {
    return this.resolveItem(1);
  }

  get isDragging(): boolean {
    return this.dragging();
  }

  get isSettling(): boolean {
    return this.settling();
  }

  ribbonCards(): RibbonCard[] {
    const total = this.items.length;
    if (!total) {
      return [];
    }

    return ([-1, 0, 1] as TotemWindowRole[])
      .map((role) => {
        const index = this.wrapIndex(this.activeIndex + role, total);
        const item = this.items[index];

        return item
          ? {
              item,
              index,
              role,
              active: role === 0,
            }
          : null;
      })
      .filter((card): card is RibbonCard => !!card);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.measureStage();
    this.resizeObserver = new ResizeObserver(() => this.measureStage());
    this.resizeObserver.observe(this.stageRef.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.dragOffset.set(0);
      this.settling.set(false);
      this.syncPanelIndex(false);
      return;
    }

    if (changes['activeIndex']) {
      this.dragOffset.set(0);
      this.syncPanelIndex(this.isBrowser && this.settling());
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.cancelDragFrame();
    this.resizeObserver?.disconnect();
  }

  openInfoPanel(): void {
    this.requestInfoOpen.emit();
  }

  closeInfoPanel(): void {
    this.requestInfoClose.emit();
  }

  openActive(): void {
    const item = this.activeItem;
    const payload = item ? this.buildPayload(item) : null;
    if (payload) this.openEntity.emit(payload);
    else if (item?.slug) this.openEntity.emit(item.slug);
  }

  openPanelItem(): void {
    const item = this.panelItem;
    const payload = item ? this.buildPayload(item) : null;
    if (payload) this.openEntity.emit(payload);
    else if (item?.slug) this.openEntity.emit(item.slug);
  }

  onPointerDown(event: PointerEvent): void {
    if (this.infoOpen) {
      this.cancelStageInteraction(event.pointerId);
      return;
    }

    if (!event.isPrimary || this.isInteractiveTarget(event.target)) {
      return;
    }

    this.clearTimers();
    this.cancelDragFrame();
    this.syncPanelIndex(false);
    this.pointerId = event.pointerId;
    this.startY = event.clientY;
    this.pendingDragOffset = 0;
    this.dragOffset.set(0);
    this.dragging.set(true);
    this.stageRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.infoOpen) {
      this.cancelStageInteraction(event.pointerId);
      return;
    }

    if (this.pointerId !== event.pointerId || !this.dragging()) {
      return;
    }

    const limit = this.stageHeight() * 0.32 || 180;
    const delta = Math.max(-limit, Math.min(limit, event.clientY - this.startY));
    this.scheduleDragOffset(delta);
    event.preventDefault();
  }

  onPointerUp(event: PointerEvent): void {
    if (this.infoOpen) {
      this.cancelStageInteraction(event.pointerId);
      return;
    }

    if (this.pointerId !== event.pointerId) {
      return;
    }

    this.releasePointer(event.pointerId);
    this.flushDragOffset();

    const delta = this.dragOffset();
    const tapThreshold = 12;
    const height = this.stageHeight() || 720;
    const threshold = Math.max(72, height * 0.12);
    const isTap = Math.abs(delta) < tapThreshold && performance.now() >= this.clickSuppressedUntil;

    if (isTap && !this.isInteractiveTarget(event.target)) {
      this.clearTimers();
      this.dragging.set(false);
      this.settling.set(false);
      this.dragOffset.set(0);
      this.openActive();
      return;
    }

    if (delta <= -threshold && this.items.length > 1) {
      this.animateToEditorialMove(1, Math.abs(delta), threshold);
      return;
    }

    if (delta >= threshold && this.items.length > 1) {
      this.animateToEditorialMove(-1, Math.abs(delta), threshold);
      return;
    }

    this.clearTimers();
    this.settling.set(true);
    this.dragging.set(false);
    this.dragOffset.set(0);
    this.settleResetTimer = window.setTimeout(() => {
      this.settling.set(false);
      this.settleResetTimer = null;
    }, 70);
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.infoOpen) {
      this.cancelStageInteraction(event.pointerId);
      return;
    }

    if (this.pointerId !== event.pointerId) {
      return;
    }

    this.releasePointer(event.pointerId);
    this.cancelDragFrame();
    this.dragOffset.set(0);
    this.dragging.set(false);
  }

  private cancelStageInteraction(pointerId?: number): void {
    if (typeof pointerId === 'number' && this.stageRef.nativeElement.hasPointerCapture(pointerId)) {
      this.stageRef.nativeElement.releasePointerCapture(pointerId);
    }

    this.pointerId = null;
    this.cancelDragFrame();
    this.dragOffset.set(0);
    this.dragging.set(false);
    this.settling.set(false);
  }

  cardStyle(role: TotemWindowRole): TotemCardStyle {
    const height = this.stageHeight() || 932;
    const drag = this.dragOffset();
    const dragLimit = height * 0.32 || 180;
    const normalizedDrag = Math.max(-dragLimit, Math.min(dragLimit, drag));
    const dragProgress = Math.abs(normalizedDrag) / Math.max(dragLimit, 1);
    const emphasisProgress = 1 - Math.pow(1 - dragProgress, 2.2);
    const direction = normalizedDrag < 0 ? 1 : -1;
    const tapeTravel = normalizedDrag;

    const basePositions = {
      [-1]: { top: -0.34, scale: 0.7, opacity: 0.34, blur: 1.1, x: -5, zIndex: 1 },
      [0]: { top: 0, scale: 1.19, opacity: 1, blur: 0, x: 0, zIndex: 4 },
      [1]: { top: 0.34, scale: 0.7, opacity: 0.36, blur: 1.0, x: 5, zIndex: 1 },
    } as const;

    const base = basePositions[role];
    const incoming = (role === -1 && direction === -1) || (role === 1 && direction === 1);
    const incomingFocus = incoming ? Math.min(1, emphasisProgress * 1.18) : 0;
    const neighborGain = incomingFocus * 0.28;
    const neighborFade = incomingFocus * 0.38;
    const neighborClarity = incomingFocus * 0.88;
    const activeScale = role === 0 ? emphasisProgress * 0.1 : 0;
    const activeFade = role === 0 ? emphasisProgress * 0.24 : 0;
    const activeSoftness = role === 0 ? emphasisProgress * 0.36 : 0;
    const roleOffset = base.top * height;
    const blur = this.dragging()
      ? base.blur
      : Math.max(0, base.blur - neighborClarity + activeSoftness);

    return {
      top: `calc(50% + ${roleOffset.toFixed(2)}px)`,
      transform: `translate3d(calc(-50% + ${base.x}px), calc(-50% + ${tapeTravel.toFixed(2)}px), 0) scale(${base.scale + neighborGain - activeScale})`,
      opacity: `${Math.max(0, Math.min(1, base.opacity + neighborFade - activeFade))}`,
      filter: `blur(${blur}px)`,
      zIndex: `${base.zIndex + (role === 0 ? 3 : incomingFocus > 0.62 ? 4 : 0)}`,
    };
  }

  cleanWiki(text: string): string {
    if (!text) return '';
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
  }

  formatPeriod(item: Entity | null): string {
    if (!item) return '';

    const start = item.startYear ?? item.birthYear ?? null;
    const end = item.endYear ?? item.deathYear ?? null;

    if (start && end) return `${start}–${end}`;
    if (start) return `${start}`;
    if (end) return `${end}`;

    return '';
  }

  formatPrimaryMeta(item: Entity | null): string {
    if (!item) return '';

    return (
      item.authorName ?? item.artistName ?? item.sourceAuthor ?? item.creator ?? item.type ?? ''
    );
  }

  private resolveItem(offset: -1 | 1): Entity | null {
    const total = this.items.length;
    if (!total || total === 1) {
      return null;
    }

    return this.items[this.wrapIndex(this.activeIndex + offset, total)] ?? null;
  }

  private wrapIndex(index: number, total: number): number {
    return ((index % total) + total) % total;
  }

  private animateToEditorialMove(
    direction: -1 | 1,
    gestureMagnitude: number,
    threshold: number,
  ): void {
    const height = this.stageHeight() || 932;
    const transitDistance = height * 0.11;
    const currentOffset = this.dragOffset();
    const currentMagnitude = Math.abs(currentOffset);
    const settleMagnitude = Math.max(currentMagnitude, transitDistance);
    const overThresholdRatio = gestureMagnitude / Math.max(threshold, 1);
    const commitDelay = overThresholdRatio < 1.16 ? 118 : 86;

    this.clearTimers();
    this.settling.set(true);
    this.dragging.set(false);
    this.clickSuppressedUntil = performance.now() + commitDelay + 34;

    this.dragOffset.set(direction === 1 ? -settleMagnitude : settleMagnitude);

    this.animationTimer = window.setTimeout(() => {
      this.activeIndexChange.emit(this.wrapIndex(this.activeIndex + direction, this.items.length));
      this.dragOffset.set(0);
      this.animationTimer = null;

      this.settleResetTimer = window.setTimeout(() => {
        this.settling.set(false);
        this.settleResetTimer = null;
      }, 56);
    }, commitDelay);
  }

  private syncPanelIndex(defer: boolean): void {
    if (!this.items.length) {
      this.panelIndex.set(0);
      return;
    }

    if (this.panelUpdateTimer !== null) {
      window.clearTimeout(this.panelUpdateTimer);
      this.panelUpdateTimer = null;
    }

    const nextIndex = this.wrapIndex(this.activeIndex, this.items.length);
    if (!defer || !this.isBrowser) {
      this.panelIndex.set(nextIndex);
      return;
    }

    this.panelUpdateTimer = window.setTimeout(() => {
      this.panelIndex.set(nextIndex);
      this.panelUpdateTimer = null;
    }, 60);
  }

  private clearTimers(): void {
    if (this.animationTimer !== null) {
      window.clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }

    if (this.settleResetTimer !== null) {
      window.clearTimeout(this.settleResetTimer);
      this.settleResetTimer = null;
    }

    if (this.panelUpdateTimer !== null) {
      window.clearTimeout(this.panelUpdateTimer);
      this.panelUpdateTimer = null;
    }
  }

  private scheduleDragOffset(offset: number): void {
    this.pendingDragOffset = offset;
    if (this.dragFrame !== null) {
      return;
    }

    this.dragFrame = window.requestAnimationFrame(() => {
      this.dragFrame = null;
      this.dragOffset.set(this.pendingDragOffset);
    });
  }

  private flushDragOffset(): void {
    if (this.dragFrame !== null) {
      window.cancelAnimationFrame(this.dragFrame);
      this.dragFrame = null;
    }

    this.dragOffset.set(this.pendingDragOffset);
  }

  private cancelDragFrame(): void {
    if (this.dragFrame !== null) {
      window.cancelAnimationFrame(this.dragFrame);
      this.dragFrame = null;
    }
  }

  private releasePointer(pointerId: number): void {
    this.pointerId = null;
    if (this.stageRef.nativeElement.hasPointerCapture(pointerId)) {
      this.stageRef.nativeElement.releasePointerCapture(pointerId);
    }
  }

  private isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return !!target.closest('button, a, input, textarea, select, option, [contenteditable=true]');
  }

  private measureStage(): void {
    const rectHeight = this.stageRef.nativeElement.getBoundingClientRect().height;
    const clientHeight = this.stageRef.nativeElement.clientHeight;
    const viewportHeight = window.visualViewport?.height || window.innerHeight || 932;
    const measuredHeight = Math.max(0, rectHeight || clientHeight || viewportHeight);
    const stableHeight = Math.min(measuredHeight || viewportHeight, viewportHeight);

    this.stageHeight.set(stableHeight || 932);
  }

  private buildPayload(item: Entity): EntityArtworkTransitionPayload | null {
    if (!item?.slug) {
      return null;
    }

    const host = this.stageRef.nativeElement.querySelector(
      '.explorer-totem__card--active .explorer-totem__card-shell',
    );
    const imageUrl = mediaDisplayUrl(resolveEntityMediaItem(item, 'explorer3d'));
    if (!(host instanceof HTMLElement) || !imageUrl) {
      return null;
    }

    const rect = host.getBoundingClientRect();
    return {
      slug: item.slug,
      title: item.title ?? '',
      imageUrl,
      sourceBounds: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      sourceSurface: 'explorer-totem',
    };
  }
}
