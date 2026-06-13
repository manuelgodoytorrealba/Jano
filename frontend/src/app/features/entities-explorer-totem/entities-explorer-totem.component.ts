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
        if (this.infoOpen || this.isDragging || this.settling() || performance.now() < this.clickSuppressedUntil) {
            return;
        }

        this.openActive();
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
        this.pointerId = event.pointerId;
        this.startY = event.clientY;
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
        this.dragOffset.set(delta);
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

        const delta = this.dragOffset();
        const height = this.stageHeight() || 720;
        const threshold = Math.max(72, height * 0.12);
        if (delta <= -threshold && this.items.length > 1) {
            this.animateToEditorialMove(1);
            return;
        }

        if (delta >= threshold && this.items.length > 1) {
            this.animateToEditorialMove(-1);
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
        this.dragOffset.set(0);
        this.dragging.set(false);
    }

    private cancelStageInteraction(pointerId?: number): void {
        if (typeof pointerId === 'number' && this.stageRef.nativeElement.hasPointerCapture(pointerId)) {
            this.stageRef.nativeElement.releasePointerCapture(pointerId);
        }

        this.pointerId = null;
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
        const direction = normalizedDrag < 0 ? 1 : -1;
        const tapeTravel = normalizedDrag;

        const basePositions = {
            [-1]: { top: -0.34, scale: 0.70, opacity: 0.34, blur: 1.1, x: -5, zIndex: 1 },
            [0]: { top: 0, scale: 0.94, opacity: 1, blur: 0, x: 0, zIndex: 4 },
            [1]: { top: 0.34, scale: 0.70, opacity: 0.36, blur: 1.0, x: 5, zIndex: 1 },
        } as const;

        const base = basePositions[role];
        const incoming = (role === -1 && direction === -1) || (role === 1 && direction === 1);
        const neighborGain = incoming ? dragProgress * 0.16 : 0;
        const neighborFade = incoming ? dragProgress * 0.18 : 0;
        const activeFade = role === 0 ? dragProgress * 0.10 : 0;
        const roleOffset = base.top * height;

        return {
            top: `calc(50% + ${roleOffset.toFixed(2)}px)`,
            transform: `translate3d(calc(-50% + ${base.x}px), calc(-50% + ${tapeTravel.toFixed(2)}px), 0) scale(${base.scale + neighborGain})`,
            opacity: `${Math.max(0, Math.min(1, base.opacity + neighborFade - activeFade))}`,
            filter: `blur(${Math.max(0, base.blur - neighborFade * 0.35)}px)`,
            zIndex: `${base.zIndex + (role === 0 ? 3 : 0)}`,
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

        return item.authorName
            ?? item.artistName
            ?? item.sourceAuthor
            ?? item.creator
            ?? item.type
            ?? '';
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

    private animateToEditorialMove(direction: -1 | 1): void {
        const height = this.stageHeight() || 932;
        const transitDistance = height * 0.11;

        this.clearTimers();
        this.settling.set(true);
        this.dragging.set(false);
        this.clickSuppressedUntil = performance.now() + 120;

        this.dragOffset.set(direction === 1 ? -transitDistance : transitDistance);

        this.animationTimer = window.setTimeout(() => {
            this.activeIndexChange.emit(this.wrapIndex(this.activeIndex + direction, this.items.length));
            this.dragOffset.set(0);
            this.animationTimer = null;

            this.settleResetTimer = window.setTimeout(() => {
                this.settling.set(false);
                this.settleResetTimer = null;
            }, 70);
        }, 86);
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

}
