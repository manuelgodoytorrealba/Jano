import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AfterViewInit,
  afterNextRender,
  Injector,
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
import { entityTypeLabel } from '../../core/i18n/domain-labels';
import { PublicEntityListItem } from '../../core/api/entities.models';
import { EntityArtworkTransitionPayload } from '../../core/entity-route-artwork-transition.service';
import { mediaDisplayUrl, resolveEntityMediaItem } from '../../shared/media/media.utils';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { advanceTotemMotion, TotemMotion } from './totem-motion';

type Entity = PublicEntityListItem & {
  birthYear?: string | number | null;
  deathYear?: string | number | null;
  authorName?: string | null;
  artistName?: string | null;
  sourceAuthor?: string | null;
  creator?: string | null;
};

type TotemCardStyle = Record<string, string>;

type RibbonCard = {
  item: Entity;
  index: number;
  role: number;
  active: boolean;
};

@Component({
  standalone: true,
  selector: 'app-entities-explorer-totem',
  imports: [NgStyle, JanoMediaComponent, RouterLink],
  templateUrl: './entities-explorer-totem.component.html',
  styleUrl: './entities-explorer-totem.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitiesExplorerTotemComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: Entity[] = [];
  @Input() activeIndex = 0;
  @Input() previousItems: Entity[] = [];
  @Input() nextItems: Entity[] = [];
  @Input() hasPreviousPage = false;
  @Input() hasNextPage = false;
  @Output() pageChange = new EventEmitter<-1 | 1>();
  @Input() infoOpen = false;
  @Input() pageError = false;

  @Output() activeIndexChange = new EventEmitter<number>();
  @Output() openEntity = new EventEmitter<string | EntityArtworkTransitionPayload>();
  @Output() requestInfoOpen = new EventEmitter<void>();
  @Output() requestInfoClose = new EventEmitter<void>();

  @ViewChild('stage', { static: true })
  stageRef!: ElementRef<HTMLDivElement>;

  readonly i18n = inject(I18nService);

  private readonly injector = inject(Injector);
  private focusAfterMotion = false;
  private readonly isBrowser: boolean;
  private resizeObserver?: ResizeObserver;
  private pointerId: number | null = null;
  private pointerStartIndex: number | null = null;
  private startY = 0;
  private lastY = 0;
  private lastMoveTime = 0;
  private travel = 0;
  private caughtMotion = false;
  private clickSuppressedUntil = 0;
  private motionFrame: number | null = null;
  private motionTime = 0;
  private motion: TotemMotion = { position: 0, velocity: 0, target: null };
  private emittedIndex = 0;
  private pendingPage: -1 | 1 | null = null;
  private retainedPrevious: Entity[] = [];
  private retainedNext: Entity[] = [];
  private readonly stageHeight = signal(0);
  private readonly position = signal(0);
  private readonly dragging = signal(false);
  private readonly settling = signal(false);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get activeItem(): Entity | null {
    return this.itemAt(Math.round(this.position()));
  }

  typeLabel(type: string | null | undefined): string {
    return entityTypeLabel(type, this.i18n);
  }

  get panelItem(): Entity | null {
    return this.activeItem;
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
    return this.settling() || this.pendingPage !== null;
  }

  ribbonCards(): RibbonCard[] {
    const total = this.items.length;
    if (!total) {
      return [];
    }

    const center = Math.round(this.position());
    return Array.from({ length: 5 }, (_, offset) => center + offset - 2)
      .map((index) => {
        const item = this.itemAt(index);
        return item
          ? { item, index, role: index - this.position(), active: index === center }
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
    if (changes['pageError']?.currentValue) {
      this.pendingPage = null;
      this.cancelStageInteraction();
    }
    if (changes['infoOpen']?.currentValue) {
      this.cancelStageInteraction();
    }
    if (changes['items']) {
      const oldItems: Entity[] = changes['items'].previousValue ?? [];
      if (this.pendingPage !== null && oldItems.length) {
        const shift = this.pendingPage === 1 ? oldItems.length : -this.items.length;
        this.retainedPrevious = this.pendingPage === 1 ? oldItems.slice(-2) : [];
        this.retainedNext = this.pendingPage === -1 ? oldItems.slice(0, 2) : [];
        this.motion.position -= shift;
        if (this.motion.target !== null) this.motion.target -= shift;
        this.pendingPage = null;
        this.position.set(this.motion.position);
        this.emittedIndex = this.activeIndex;
        this.publishPosition();
        if (!this.dragging()) this.startMotion();
      } else {
        this.cancelStageInteraction();
        this.retainedPrevious = [];
        this.retainedNext = [];
        this.setPosition(this.activeIndex);
      }
      return;
    }
    if (changes['activeIndex'] && this.activeIndex !== this.emittedIndex) {
      this.cancelStageInteraction();
      this.setPosition(this.activeIndex);
    }
  }

  ngOnDestroy(): void {
    this.stopMotion();
    this.releasePointer();
    this.resizeObserver?.disconnect();
  }

  openInfoPanel(): void {
    this.cancelStageInteraction();
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
    if (
      this.infoOpen ||
      this.pointerId !== null ||
      !event.isPrimary ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      this.isInteractiveTarget(event.target)
    )
      return;

    this.caughtMotion = this.isSettling || this.pendingPage !== null;
    this.stopMotion();
    this.motion.velocity = 0;
    this.motion.target = null;
    this.pointerId = event.pointerId;
    const cardIndex =
      event.target instanceof Element
        ? event.target.closest('[data-index]')?.getAttribute('data-index')
        : null;
    this.pointerStartIndex = cardIndex == null ? null : Number(cardIndex);
    this.startY = this.lastY = event.clientY;
    this.lastMoveTime = performance.now();
    this.travel = 0;
    this.dragging.set(true);
    this.stageRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId || !this.dragging()) return;
    if (this.infoOpen) {
      this.cancelStageInteraction();
      return;
    }
    const now = performance.now();
    const seconds = (now - this.lastMoveTime) / 1000;
    const distance = this.cardSpacing();
    const movement = event.clientY - this.lastY;
    if (seconds > 0) {
      const measured = -movement / distance / seconds;
      this.motion.velocity = Math.max(
        -3,
        Math.min(3, this.motion.velocity * 0.25 + measured * 0.75),
      );
    }
    this.lastY = event.clientY;
    this.lastMoveTime = now;
    this.travel = Math.max(this.travel, Math.abs(event.clientY - this.startY));
    const requested = this.motion.position - movement / distance;
    const min = this.hasPreviousPage ? -0.6 : 0;
    const max = this.items.length - 1 + (this.hasNextPage ? 0.6 : 0);
    this.motion.position =
      requested < min
        ? min + Math.tanh(requested - min) * 0.22
        : requested > max
          ? max + Math.tanh(requested - max) * 0.22
          : requested;
    this.publishPosition();
    event.preventDefault();
  }

  onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.releasePointer();
    this.dragging.set(false);
    this.clickSuppressedUntil = performance.now() + 350;
    if (this.infoOpen) return;
    if (this.travel < 12 && !this.caughtMotion) {
      if (
        this.pointerStartIndex !== null &&
        this.pointerStartIndex !== Math.round(this.position())
      ) {
        this.motion.target = this.pointerStartIndex;
        this.motion.velocity = 0;
        this.startMotion();
      } else {
        this.openActive();
      }
      return;
    }
    if (performance.now() - this.lastMoveTime > 80 || this.travel < 12) this.motion.velocity = 0;
    this.startMotion();
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.releasePointer();
    this.dragging.set(false);
    this.motion.velocity = 0;
    this.motion.target = null;
    this.clickSuppressedUntil = performance.now() + 350;
    this.startMotion();
  }

  onLinkClick(event: MouseEvent): void {
    if (event.detail > 0 && (this.isSettling || performance.now() < this.clickSuppressedUntil)) {
      event.preventDefault();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (
      this.infoOpen ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target instanceof Element && event.target.closest('button'))
    )
      return;
    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    this.stopMotion();
    this.motion.velocity = 0;
    this.focusAfterMotion = true;
    this.motion.target = Math.round(this.position()) + direction;
    this.startMotion();
  }

  private cancelStageInteraction(): void {
    this.stopMotion();
    this.releasePointer();
    this.dragging.set(false);
    this.setPosition(Math.max(0, Math.min(this.items.length - 1, Math.round(this.position()))));
  }

  cardStyle(role: number): TotemCardStyle {
    const distance = Math.min(Math.abs(role), 2);
    const focus = Math.max(0, 1 - distance);
    return {
      top: '50%',
      transform: `translate3d(calc(-50% + ${Math.max(-1, Math.min(1, role)) * 5}px), calc(-50% + ${(role * this.cardSpacing()).toFixed(2)}px), 0) scale(${0.7 + focus * 0.49})`,
      opacity: `${Math.max(0, 0.35 + focus * 0.65 - Math.max(0, distance - 1) * 0.35)}`,
      filter: `blur(${(1 - focus).toFixed(2)}px)`,
      zIndex: `${Math.round(10 - distance * 3)}`,
    };
  }

  private cardSpacing(): number {
    return (this.stageHeight() || 932) * 0.34;
  }

  private itemAt(index: number): Entity | null {
    if (index < 0) {
      const previous = this.previousItems.length ? this.previousItems : this.retainedPrevious;
      return previous[previous.length + index] ?? null;
    }
    if (index >= this.items.length) {
      return (
        (this.nextItems.length ? this.nextItems : this.retainedNext)[index - this.items.length] ??
        null
      );
    }
    return this.items[index] ?? null;
  }

  private setPosition(index: number): void {
    this.motion = { position: index, velocity: 0, target: null };
    this.position.set(index);
    this.emittedIndex = index;
  }

  private publishPosition(): void {
    this.position.set(this.motion.position);
    const index = Math.round(this.motion.position);
    if (index >= 0 && index < this.items.length && index !== this.emittedIndex) {
      this.emittedIndex = index;
      this.activeIndexChange.emit(index);
    }
    const direction = index < 0 ? -1 : index >= this.items.length ? 1 : null;
    if (
      direction &&
      this.pendingPage === null &&
      (direction === -1 ? this.hasPreviousPage : this.hasNextPage)
    ) {
      this.pendingPage = direction;
      this.pageChange.emit(direction);
    }
  }

  private startMotion(): void {
    this.stopMotion();
    if (this.pendingPage !== null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const target = this.motion.target ?? Math.round(this.motion.position);
      this.motion.position = Math.max(
        this.hasPreviousPage ? -1 : 0,
        Math.min(this.hasNextPage ? this.items.length : this.items.length - 1, target),
      );
      this.motion.velocity = 0;
      this.publishPosition();
      this.restoreKeyboardFocus();
      return;
    }
    this.settling.set(true);
    this.motionTime = performance.now();
    this.motionFrame = requestAnimationFrame((time) => this.animateMotion(time));
  }

  private animateMotion(time: number): void {
    this.motionFrame = null;
    this.motion = advanceTotemMotion(this.motion, (time - this.motionTime) / 1000);
    this.motionTime = time;
    const min = this.hasPreviousPage ? -0.6 : 0;
    const max = this.items.length - 1 + (this.hasNextPage ? 0.6 : 0);
    if (this.motion.position < min || this.motion.position > max) {
      const edge = this.motion.position < min ? min : max;
      if (!Number.isInteger(edge)) {
        this.motion.position = edge;
        this.publishPosition();
        this.settling.set(false);
        return;
      }
      this.motion.target = edge;
      if (
        (edge === min && this.motion.velocity < 0) ||
        (edge === max && this.motion.velocity > 0)
      ) {
        this.motion.velocity = 0;
        this.motion.position = edge + Math.max(-0.22, Math.min(0.22, this.motion.position - edge));
      }
    }
    this.publishPosition();
    if (
      this.pendingPage !== null ||
      (this.motion.velocity === 0 && this.motion.position === this.motion.target)
    ) {
      this.settling.set(false);
      if (this.pendingPage === null) this.restoreKeyboardFocus();
      return;
    }
    this.motionFrame = requestAnimationFrame((next) => this.animateMotion(next));
  }

  private restoreKeyboardFocus(): void {
    if (!this.focusAfterMotion) return;
    this.focusAfterMotion = false;
    afterNextRender(
      () => {
        this.stageRef.nativeElement
          .querySelector<HTMLAnchorElement>(
            '.explorer-totem__card--active .explorer-totem__card-link',
          )
          ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  private stopMotion(): void {
    if (this.motionFrame !== null) cancelAnimationFrame(this.motionFrame);
    this.motionFrame = null;
    this.settling.set(false);
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

    return this.items[this.activeIndex + offset] ?? null;
  }

  private releasePointer(): void {
    const pointerId = this.pointerId;
    this.pointerId = null;
    if (pointerId !== null && this.stageRef?.nativeElement.hasPointerCapture(pointerId)) {
      this.stageRef.nativeElement.releasePointerCapture(pointerId);
    }
  }

  private isInteractiveTarget(target: EventTarget | null): boolean {
    if (target instanceof Element && target.closest('.explorer-totem__card-link')) return false;
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
