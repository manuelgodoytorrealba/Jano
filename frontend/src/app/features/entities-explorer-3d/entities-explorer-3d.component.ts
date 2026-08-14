import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { contentLevelLabel, entityTypeLabel, statusLabel } from '../../core/i18n/domain-labels';
import { PublicEntityListItem } from '../../core/api/entities.models';
import { EntityArtworkTransitionPayload } from '../../core/entity-route-artwork-transition.service';
import { resolveEntityMediaItem, resolveMediaPresentation } from '../../shared/media/media.utils';
import { Explorer3dScene } from './explorer-3d-scene';

type Entity = PublicEntityListItem;
type NavDirection = -1 | 1;

@Component({
  standalone: true,
  selector: 'app-entities-explorer-3d',
  templateUrl: './entities-explorer-3d.component.html',
  styleUrls: ['./entities-explorer-3d.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitiesExplorer3dComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: Entity[] = [];
  @Input() activeIndex = 0;
  @Input() infoOpen = false;
  @Input() infoClosable = false;
  @Input() infoModal = false;
  @Input() showOpenAction = true;

  @Output() activeIndexChange = new EventEmitter<number>();
  @Output() openEntity = new EventEmitter<string | EntityArtworkTransitionPayload>();
  @Output() requestInfoOpen = new EventEmitter<void>();
  @Output() requestInfoClose = new EventEmitter<void>();

  @ViewChild('canvasHost', { static: true })
  canvasHostRef!: ElementRef<HTMLDivElement>;

  @ViewChild('root', { static: true })
  rootRef!: ElementRef<HTMLDivElement>;

  @ViewChild('infoToggle')
  infoToggleRef?: ElementRef<HTMLButtonElement>;

  private readonly isBrowser: boolean;
  readonly i18n = inject(I18nService);

  private readonly scene = new Explorer3dScene(() => this.syncCanvasInteractionState());
  private canvasInteractionsAttached = false;

  private isDragging = false;
  private dragStartX = 0;
  private dragAccumulatedX = 0;
  private dragMoved = false;
  private wheelIntent = 0;
  private lastWheelEventAt = 0;
  private lastWheelNavigationAt = 0;
  private keyboardNavigationActive = false;
  private infoToggleFrame = 0;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get activeItem(): Entity | null {
    return this.items[this.activeIndex] ?? null;
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.scene.initialize(this.canvasHostRef.nativeElement, this.items, this.activeIndex);
    this.syncCanvasInteractionState();
    this.queueInfoTogglePosition();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isBrowser) return;

    if (changes['items']) {
      this.scene.setItems(this.items);
    }

    if (changes['activeIndex']) {
      this.scene.setActiveIndex(this.activeIndex);
      this.queueInfoTogglePosition();
    }

    if (changes['infoOpen'] && this.scene.domElement) {
      if (changes['infoOpen'].currentValue) {
        this.cancelCanvasInteraction();
      }

      this.syncCanvasInteractionState();
      this.queueInfoTogglePosition();
    }
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    this.detachCanvasInteractions();
    cancelAnimationFrame(this.infoToggleFrame);
    this.scene.destroy();
  }

  openActive(): void {
    if (this.isEntryInteractionLocked()) return;
    this.openIndex(this.activeIndex);
  }

  openInfoPanel(): void {
    this.requestInfoOpen.emit();
  }

  onInfoToggleEnter(): void {
    if (this.isEntryInteractionLocked()) return;
    this.scene.setHoveredIndex(this.activeIndex);
  }

  onInfoToggleLeave(): void {
    if (this.isEntryInteractionLocked()) return;
    if (!this.isDragging) this.scene.setHoveredIndex(null);
  }

  closeInfoPanel(): void {
    this.requestInfoClose.emit();
  }

  onInfoBackdropWheel(event: WheelEvent): void {
    if (!this.infoOpen) {
      return;
    }

    this.onWheel(event);
    event.stopPropagation();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.queueInfoTogglePosition();
  }

  private cancelCanvasInteraction(): void {
    this.isDragging = false;
    this.dragMoved = false;
    this.dragAccumulatedX = 0;
    this.wheelIntent = 0;
    this.scene.setDragging(false);
    this.scene.setHoveredIndex(null);
  }

  cleanWiki(text: string): string {
    if (!text) return '';
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
  }

  tags(item: Entity): string[] {
    return (item.tags ?? [])
      .map((entry) => ('tag' in entry && entry.tag ? entry.tag : entry))
      .map((entry) => entry.label?.trim())
      .filter((label): label is string => !!label)
      .slice(0, 3);
  }

  collection(item: Entity): string | null {
    return item.artwork?.collection?.trim() || null;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(this.i18n.locale() === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  typeLabel(type: string | null | undefined): string {
    return entityTypeLabel(type, this.i18n);
  }

  statusLabel(status: string | null | undefined): string {
    return statusLabel(status, this.i18n);
  }

  contentLevelLabel(level: string | null | undefined): string {
    return contentLevelLabel(level, this.i18n);
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.infoOpen) {
      event.preventDefault();
      this.closeInfoPanel();
      return;
    }

    if (!this.keyboardNavigationActive) return;
    if (this.isEntryInteractionLocked()) return;
    if (this.shouldIgnoreKeyboardEvent(event)) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.goToIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.goToIndex(this.items.length - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.openActive();
    }
  }

  onMouseEnter(): void {
    if (this.isEntryInteractionLocked()) return;
    this.activateExplorerFocus('hover');
  }

  onMouseLeave(): void {
    this.deactivateExplorerFocus();
  }

  private syncCanvasInteractionState(): void {
    if (!this.scene.domElement) return;

    const interactive = !this.infoOpen && !this.isEntryInteractionLocked();
    this.scene.setInteractive(interactive);

    if (!interactive) {
      this.cancelCanvasInteraction();
      this.detachCanvasInteractions();
      return;
    }

    this.attachCanvasInteractions();
  }

  private queueInfoTogglePosition(): void {
    if (!this.isBrowser) return;

    cancelAnimationFrame(this.infoToggleFrame);
    const syncPosition = () => {
      if (this.infoOpen) return;

      const bounds = this.scene.activeCardBounds(this.activeIndex);
      const rootBounds = this.rootRef.nativeElement.getBoundingClientRect();
      const button = this.infoToggleRef?.nativeElement;
      if (bounds && rootBounds.width && rootBounds.height && button) {
        button.style.left = `${bounds.left - rootBounds.left + bounds.width - 70}px`;
        button.style.top = `${bounds.top - rootBounds.top + 28}px`;
      }

      this.infoToggleFrame = requestAnimationFrame(syncPosition);
    };

    this.infoToggleFrame = requestAnimationFrame(syncPosition);
  }

  private attachCanvasInteractions(): void {
    const canvas = this.scene.domElement;
    if (!canvas || this.canvasInteractionsAttached) return;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel as EventListener, {
      passive: false,
    });
    this.canvasInteractionsAttached = true;
  }

  private detachCanvasInteractions(): void {
    const canvas = this.scene.domElement;
    if (!canvas || !this.canvasInteractionsAttached) return;

    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('wheel', this.onWheel as EventListener);
    this.canvasInteractionsAttached = false;
  }

  private thumb(e: Entity): string | null {
    return resolveMediaPresentation(resolveEntityMediaItem(e, 'explorer3d'), 'explorer3d').src;
  }

  private goToIndex(next: number): void {
    const total = this.items.length;
    if (!total) return;

    let circular = next;

    if (circular < 0) circular = total - 1;
    if (circular >= total) circular = 0;

    if (circular === this.activeIndex) return;

    this.activeIndexChange.emit(circular);
  }

  private next(): void {
    this.moveByDirection(1);
  }

  private prev(): void {
    this.moveByDirection(-1);
  }

  private moveByDirection(direction: NavDirection): void {
    if (!this.items.length) return;
    this.goToIndex(this.activeIndex + direction);
  }

  private openIndex(index: number): void {
    const item = this.items[index];
    const sourceBounds = this.scene.activeCardBounds(this.activeIndex);
    const imageUrl = item ? this.thumb(item) : null;

    if (item?.slug && sourceBounds && imageUrl) {
      this.openEntity.emit({
        slug: item.slug,
        title: item.title ?? '',
        imageUrl,
        sourceBounds,
        sourceSurface: 'explorer3d',
      });
      return;
    }

    const fallbackBounds = this.scene.fallbackCanvasBounds();
    if (item?.slug && imageUrl && fallbackBounds) {
      this.openEntity.emit({
        slug: item.slug,
        title: item.title ?? '',
        imageUrl,
        sourceBounds: fallbackBounds,
        sourceSurface: 'explorer3d',
      });
      return;
    }

    if (item?.slug) this.openEntity.emit(item.slug);
  }

  private activateExplorerFocus(source: 'hover' | 'pointer' | 'wheel'): void {
    if (!this.isBrowser) return;

    const activeElement = document.activeElement as HTMLElement | null;

    if (source === 'hover' && this.shouldPreserveExternalFocus(activeElement)) {
      return;
    }

    this.keyboardNavigationActive = true;
  }

  private deactivateExplorerFocus(): void {
    if (!this.isBrowser) return;
    this.keyboardNavigationActive = false;
  }

  private shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) return false;

    return !!target.closest(
      'input, textarea, select, button, a, [contenteditable=""], [contenteditable="true"]',
    );
  }

  private shouldPreserveExternalFocus(activeElement: HTMLElement | null): boolean {
    if (!activeElement || activeElement === document.body) {
      return false;
    }

    if (this.rootRef.nativeElement.contains(activeElement)) {
      return false;
    }

    return !!activeElement.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
    );
  }

  private isTrackpadWheel(event: WheelEvent): boolean {
    if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
      return false;
    }

    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    const hasFractionalDelta = !Number.isInteger(event.deltaX) || !Number.isInteger(event.deltaY);

    return hasFractionalDelta || (absX > 0 && absX < 24) || (absY > 0 && absY < 24);
  }

  private normalizeWheelDelta(event: WheelEvent): number {
    const multiplier =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;

    const scaledX = event.deltaX * multiplier * 0.65;
    const scaledY = event.deltaY * multiplier;

    return Math.abs(scaledX) > Math.abs(scaledY) ? scaledX : scaledY;
  }

  private trackWheelIntent(event: WheelEvent): NavDirection | null {
    const now = performance.now();
    const delta = this.normalizeWheelDelta(event);
    const isTrackpad = this.isTrackpadWheel(event);
    const threshold = isTrackpad ? 90 : 48;
    const cooldown = isTrackpad ? 260 : 140;
    const resetWindow = isTrackpad ? 180 : 120;

    if (Math.abs(delta) < 4) {
      return null;
    }

    if (now - this.lastWheelEventAt > resetWindow) {
      this.wheelIntent = 0;
    }

    if (this.wheelIntent !== 0 && Math.sign(this.wheelIntent) !== Math.sign(delta)) {
      this.wheelIntent = 0;
    }

    this.lastWheelEventAt = now;
    this.wheelIntent += delta;

    if (Math.abs(this.wheelIntent) < threshold) {
      return null;
    }

    if (now - this.lastWheelNavigationAt < cooldown) {
      this.wheelIntent = Math.sign(this.wheelIntent) * threshold;
      return null;
    }

    this.lastWheelNavigationAt = now;

    const direction = this.wheelIntent > 0 ? 1 : -1;
    this.wheelIntent = 0;
    return direction;
  }

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();

    if (this.isEntryInteractionLocked()) return;

    if (!this.items.length) return;
    this.activateExplorerFocus('wheel');

    const direction = this.trackWheelIntent(event);
    if (!direction) return;

    this.moveByDirection(direction);
  };

  private onPointerDown = (event: PointerEvent) => {
    if (this.infoOpen || this.isEntryInteractionLocked()) {
      event.preventDefault();
      this.cancelCanvasInteraction();
      return;
    }

    this.activateExplorerFocus('pointer');
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = event.clientX;
    this.dragAccumulatedX = 0;
    this.scene.setDragging(true);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.infoOpen || this.isEntryInteractionLocked()) {
      this.cancelCanvasInteraction();
      return;
    }

    this.scene.setHoveredIndex(this.scene.pickIndex(event.clientX, event.clientY));

    if (!this.isDragging) return;

    const delta = event.clientX - this.dragStartX;
    this.dragAccumulatedX += delta * 0.85;
    this.dragStartX = event.clientX;

    if (Math.abs(this.dragAccumulatedX) >= 52) {
      this.dragMoved = true;

      const direction = this.dragAccumulatedX < 0 ? 1 : -1;
      this.moveByDirection(direction);

      this.dragAccumulatedX = 0;
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.infoOpen || this.isEntryInteractionLocked()) {
      this.cancelCanvasInteraction();
      return;
    }

    if (!this.isDragging) return;
    this.isDragging = false;
    this.scene.setDragging(false);

    if (this.dragMoved) {
      this.dragMoved = false;
      return;
    }

    const index = this.scene.pickIndex(event.clientX, event.clientY);
    if (index === null) return;

    if (index === this.activeIndex) {
      this.openIndex(index);
      return;
    }

    this.goToIndex(index);
  };

  private onPointerLeave = (event: PointerEvent) => {
    if (this.infoOpen || this.isEntryInteractionLocked()) {
      this.cancelCanvasInteraction();
      return;
    }

    if (event.relatedTarget === this.infoToggleRef?.nativeElement) return;

    this.isDragging = false;
    this.dragMoved = false;
    this.scene.setDragging(false);
    this.scene.setHoveredIndex(null);
  };

  private isEntryInteractionLocked(): boolean {
    return this.scene.isEntryAnimationRunning;
  }
}
