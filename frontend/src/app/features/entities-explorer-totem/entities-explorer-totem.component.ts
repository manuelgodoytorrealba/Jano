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
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type Entity = any;
type TotemRole = 'previous' | 'active' | 'next';

type TotemCardStyle = Record<string, string>;

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
    @Output() openEntity = new EventEmitter<string>();
    @Output() requestInfoOpen = new EventEmitter<void>();
    @Output() requestInfoClose = new EventEmitter<void>();

    @ViewChild('stage', { static: true })
    stageRef!: ElementRef<HTMLDivElement>;

    readonly i18n = inject(I18nService);

    private readonly isBrowser: boolean;
    private resizeObserver?: ResizeObserver;
    private pointerId: number | null = null;
    private startY = 0;
    private clickSuppressedUntil = 0;
    private animationTimer: number | null = null;
    private settleResetTimer: number | null = null;

    private readonly stageHeight = signal(0);
    private readonly dragOffset = signal(0);
    private readonly dragging = signal(false);
    private readonly settling = signal(false);

    constructor(@Inject(PLATFORM_ID) platformId: object) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    get activeItem(): Entity | null {
        return this.items[this.activeIndex] ?? null;
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

    ngAfterViewInit(): void {
        if (!this.isBrowser) return;
        this.measureStage();
        this.resizeObserver = new ResizeObserver(() => this.measureStage());
        this.resizeObserver.observe(this.stageRef.nativeElement);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.isBrowser) return;
        if (changes['items'] || changes['activeIndex']) {
            this.dragOffset.set(0);
            this.settling.set(false);
        }
    }

    ngOnDestroy(): void {
        this.clearTimers();
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
        if (item?.slug) {
            this.openEntity.emit(item.slug);
        }
    }

    onActiveClick(): void {
        if (this.isDragging || this.settling() || performance.now() < this.clickSuppressedUntil) {
            return;
        }

        this.openActive();
    }

    onPointerDown(event: PointerEvent): void {
        if (!event.isPrimary || this.isInteractiveTarget(event.target)) {
            return;
        }

        this.pointerId = event.pointerId;
        this.startY = event.clientY;
        this.dragOffset.set(0);
        this.dragging.set(true);
        this.stageRef.nativeElement.setPointerCapture(event.pointerId);
    }

    onPointerMove(event: PointerEvent): void {
        if (this.pointerId !== event.pointerId || !this.dragging()) {
            return;
        }

        const limit = this.stageHeight() * 0.32 || 180;
        const delta = Math.max(-limit, Math.min(limit, event.clientY - this.startY));
        this.dragOffset.set(delta);
        event.preventDefault();
    }

    onPointerUp(event: PointerEvent): void {
        if (this.pointerId !== event.pointerId) {
            return;
        }

        this.releasePointer(event.pointerId);

        const delta = this.dragOffset();
        const height = this.stageHeight() || 720;
        const threshold = Math.max(72, height * 0.12);

        if (delta <= -threshold && this.items.length > 1) {
            this.animateToDirection(1);
            return;
        }

        if (delta >= threshold && this.items.length > 1) {
            this.animateToDirection(-1);
            return;
        }

        this.dragOffset.set(0);
        this.dragging.set(false);
    }

    onPointerCancel(event: PointerEvent): void {
        if (this.pointerId !== event.pointerId) {
            return;
        }

        this.releasePointer(event.pointerId);
        this.dragOffset.set(0);
        this.dragging.set(false);
    }

    cardStyle(role: TotemRole): TotemCardStyle {
        const height = this.stageHeight() || 932;
        const drag = this.dragOffset();
        const progress = Math.min(Math.abs(drag) / Math.max(height * 0.34, 1), 1);
        const movingUp = drag < 0;
        const movingDown = drag > 0;

        let centerY = height * 0.52;
        let scale = 1;
        let opacity = 1;
        let blur = 0;
        let zIndex = 3;

        if (role === 'previous') {
            centerY = height * 0.105 + drag * 0.52;
            scale = 0.68 + (movingDown ? progress * 0.2 : 0);
            opacity = 0.3 + (movingDown ? progress * 0.34 : 0);
            blur = movingDown ? 0.4 : 1.6;
            zIndex = 1;
        }

        if (role === 'active') {
            centerY = height * 0.515 + drag * 0.94;
            scale = 1 - progress * 0.045;
            opacity = 0.98 + (1 - progress) * 0.02;
            blur = progress * 0.12;
            zIndex = 3;
        }

        if (role === 'next') {
            centerY = height * 0.918 + drag * 0.7;
            scale = 0.72 + (movingUp ? progress * 0.18 : 0);
            opacity = 0.4 + (movingUp ? progress * 0.34 : 0);
            blur = movingUp ? 0.4 : 1.3;
            zIndex = 2;
        }

        return {
            top: `${centerY}px`,
            transform: `translate3d(-50%, -50%, 0) scale(${scale})`,
            opacity: `${opacity}`,
            filter: `blur(${blur}px)`,
            zIndex: `${zIndex}`,
        };
    }

    cleanWiki(text: string): string {
        if (!text) return '';
        return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
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

    private animateToDirection(direction: -1 | 1): void {
        const height = this.stageHeight() || 932;
        this.clearTimers();
        this.settling.set(true);
        this.dragging.set(false);
        this.clickSuppressedUntil = performance.now() + 520;
        this.dragOffset.set(direction === 1 ? -height * 0.48 : height * 0.48);

        this.animationTimer = window.setTimeout(() => {
            this.activeIndexChange.emit(this.wrapIndex(this.activeIndex + direction, this.items.length));
            this.dragOffset.set(direction === 1 ? height * 0.12 : -height * 0.12);
            window.requestAnimationFrame(() => {
                this.dragOffset.set(0);
            });
            this.animationTimer = null;
        }, 180);

        this.settleResetTimer = window.setTimeout(() => {
            this.settling.set(false);
            this.settleResetTimer = null;
        }, 440);
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

        if (target.closest('.explorer-totem__card--active')) {
            return false;
        }

        return !!target.closest('button, a, input, textarea, select, option, [role=button], [contenteditable=true]');
    }

    private measureStage(): void {
        const rectHeight = this.stageRef.nativeElement.getBoundingClientRect().height;
        const clientHeight = this.stageRef.nativeElement.clientHeight;
        const viewportHeight = window.visualViewport?.height || window.innerHeight || 932;
        const measuredHeight = Math.max(0, rectHeight || clientHeight || viewportHeight);
        const stableHeight = Math.min(measuredHeight || viewportHeight, viewportHeight);

        this.stageHeight.set(stableHeight || 932);
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
    }
}
