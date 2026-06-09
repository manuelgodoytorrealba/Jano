import {
    ChangeDetectionStrategy,
    Component,
    HostListener,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';

import { DEFAULT_BACKGROUND_IMAGE_URL } from '../../../core/app-appearance.service';
import { DeckItem, DeckRailAction } from './entity-deck.types';

type CardState = {
    transform: string;
    opacity: string;
    zIndex: number;
};

@Component({
    standalone: true,
    selector: 'app-entity-deck',
    templateUrl: './entity-deck.component.html',
    styleUrl: './entity-deck.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityDeckComponent {
    private router = inject(Router);
    readonly i18n = inject(I18nService);
    private viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1440);

    items = input.required<DeckItem[]>();

    backgroundImage = input<string>(DEFAULT_BACKGROUND_IMAGE_URL);
    showRail = input<boolean>(true);
    showDots = input<boolean>(true);
    showNav = input<boolean>(true);
    showBottomSearch = input<boolean>(true);
    fullViewport = input<boolean>(false);
    showAdminEdit = input<boolean>(false);

    activeIndex = signal(0);

    cardClick = output<DeckItem>();
    expandClick = output<DeckItem>();
    adminEditClick = output<DeckItem>();
    railClick = output<DeckRailAction>();
    activeIndexChange = output<number>();
    searchSubmit = output<string>();
    tabChange = output<'home' | 'picks' | 'my-space'>();

    private wheelIntent = 0;
    private lastWheelEventAt = 0;
    private lastWheelNavigationAt = 0;
    private wheelLockedDirection: 1 | -1 | 0 = 0;
    private wheelLockedAt = 0;
    private swipeState: { pointerId: number; startX: number; startY: number; dragging: boolean } | null = null;
    private swipeSuppressedUntil = 0;

    cardStates = computed<CardState[]>(() => {
        const list = this.items();
        const active = this.activeIndex();
        const motionScale = this.deckMotionScale();

        return list.map((_item, index) => {
            const d = this.relativeIndex(index, active, list.length);
            const clamped = Math.max(-2, Math.min(2, d));
            const abs = Math.abs(clamped);

            const xBase = abs === 0 ? 0 : abs === 1 ? 176 : 292;
            const yBase = abs === 0 ? 0 : abs === 1 ? 12 : 26;
            const zBase = abs === 0 ? 0 : abs === 1 ? -132 : -238;
            const rotBase = abs === 0 ? 0 : abs === 1 ? -10 : -16;
            const scale = abs === 0 ? 1 : abs === 1 ? 0.86 : 0.74;

            const x = Math.sign(clamped) * xBase * motionScale;
            const y = yBase * motionScale;
            const z = zBase * motionScale;
            const rotY = Math.sign(clamped) * rotBase;

            return {
                transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotY}deg) scale(${scale})`,
                opacity: abs === 0 ? '1' : abs === 1 ? '0.58' : abs === 2 ? '0.28' : '0',
                zIndex: abs > 2 ? 0 : abs === 0 ? 30 : abs === 1 ? 20 : 10,
            };
        });
    });

    setActive(index: number): void {
        const list = this.items();
        const len = list.length;
        if (!len) return;

        const nextIndex = ((index % len) + len) % len;
        this.activeIndex.set(nextIndex);
        this.activeIndexChange.emit(nextIndex);
    }

    prev(): void {
        const list = this.items();
        if (!list.length) return;
        this.setActive(this.activeIndex() - 1);
    }

    next(): void {
        const list = this.items();
        if (!list.length) return;
        this.setActive(this.activeIndex() + 1);
    }

    onCardClick(item: DeckItem): void {
        if (this.isSwipeSuppressed()) return;
        this.cardClick.emit(item);
    }

    onExpandClick(event: Event, item: DeckItem): void {
        event.stopPropagation();
        if (this.isSwipeSuppressed()) return;
        this.expandClick.emit(item);
    }

    onAdminEditClick(event: Event, item: DeckItem): void {
        event.stopPropagation();
        if (this.isSwipeSuppressed()) return;
        this.adminEditClick.emit(item);
    }

    onRailClick(action: DeckRailAction): void {
        this.railClick.emit(action);
    }

    onSearchSubmit(value: string): void {
        const query = value.trim();
        if (!query) return;
        this.searchSubmit.emit(query);
    }

    onTabChange(tab: 'home' | 'picks' | 'my-space'): void {
        this.tabChange.emit(tab);
    }

    imgLoading(index: number): 'eager' | 'lazy' {
        return index === this.activeIndex() ? 'eager' : 'lazy';
    }

    imgFetchPriority(index: number): 'high' | 'low' {
        return index === this.activeIndex() ? 'high' : 'low';
    }

    imgDecoding(index: number): 'sync' | 'async' {
        return index === this.activeIndex() ? 'sync' : 'async';
    }

    imgWidth(item: DeckItem): number | null {
        return item.imageWidth ?? null;
    }

    imgHeight(item: DeckItem): number | null {
        return item.imageHeight ?? null;
    }

    isRailActive(action: DeckRailAction): boolean {
        const url = this.router.url;

        if (action === 'home') {
            return url === '/';
        }

        if (action === 'picks') {
            return url.startsWith('/recommended');
        }

        if (action === 'profile') {
            return url.startsWith('/my-space') || url.startsWith('/admin');
        }

        return false;
    }

    private relativeIndex(index: number, active: number, length: number): number {
        let diff = index - active;
        const half = Math.floor(length / 2);

        if (diff > half) diff -= length;
        if (diff < -half) diff += length;

        return diff;
    }

    private isInteractiveTarget(target: EventTarget | null): boolean {
        return target instanceof HTMLElement
            ? !!target.closest('button, a, input, textarea, select, option, [role=button], [contenteditable=true]')
            : false;
    }

    private isSwipeSuppressed(): boolean {
        return performance.now() < this.swipeSuppressedUntil;
    }

    onPointerDown(event: PointerEvent): void {
        if (event.pointerType === 'mouse' || !event.isPrimary || this.isInteractiveTarget(event.target)) {
            return;
        }

        this.swipeState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            dragging: false,
        };
    }

    onPointerMove(event: PointerEvent): void {
        const state = this.swipeState;
        if (!state || state.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - state.startX;
        const deltaY = event.clientY - state.startY;

        if (!state.dragging) {
            if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                return;
            }

            if (Math.abs(deltaX) <= Math.abs(deltaY)) {
                this.swipeState = null;
                return;
            }

            state.dragging = true;
        }

        event.preventDefault();
    }

    onPointerUp(event: PointerEvent): void {
        const state = this.swipeState;
        if (!state || state.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - state.startX;
        const deltaY = event.clientY - state.startY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const swipeThreshold = 52;

        if (state.dragging && absX >= swipeThreshold && absX > absY * 1.15) {
            if (deltaX < 0) {
                this.next();
            } else {
                this.prev();
            }

            this.swipeSuppressedUntil = performance.now() + 260;
        }

        this.swipeState = null;
    }

    onPointerCancel(event: PointerEvent): void {
        const state = this.swipeState;
        if (state?.pointerId === event.pointerId) {
            this.swipeState = null;
        }
    }

    private deckMotionScale(): number {
        const width = this.viewportWidth();

        if (width >= 1800) return 1.06;
        if (width >= 1440) return 1;
        if (width >= 1180) return 0.93;
        return 0.88;
    }

    @HostListener('window:keydown', ['$event'])
    onKey(event: KeyboardEvent): void {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.prev();
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.next();
        }
    }

    @HostListener('window:resize')
    onResize(): void {
        this.viewportWidth.set(window.innerWidth);
    }

    @HostListener('wheel', ['$event'])
    onWheel(event: WheelEvent): void {
        event.preventDefault();

        if (!this.items().length) return;

        const direction = this.trackWheelIntent(event);
        if (!direction) return;

        if (direction > 0) {
            this.next();
        } else {
            this.prev();
        }
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
                    ? this.viewportPageDeltaHeight()
                    : 1;

        const scaledX = event.deltaX * multiplier * 0.65;
        const scaledY = event.deltaY * multiplier;

        return Math.abs(scaledX) > Math.abs(scaledY) ? scaledX : scaledY;
    }

    private viewportPageDeltaHeight(): number {
        if (typeof window === 'undefined') {
            return 720;
        }

        const root = document.documentElement;
        const styles = window.getComputedStyle(root);
        const fromContract = this.readCssPixelValue(styles.getPropertyValue('--app-visual-viewport-height'))
            ?? this.readCssPixelValue(styles.getPropertyValue('--app-viewport-height'))
            ?? this.readCssPixelValue(styles.getPropertyValue('--app-real-viewport-height'));

        return fromContract ?? window.visualViewport?.height ?? root.clientHeight ?? 720;
    }

    private readCssPixelValue(value: string): number | null {
        const numeric = Number.parseFloat(value);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    }

    private trackWheelIntent(event: WheelEvent): 1 | -1 | null {
        const now = performance.now();
        const delta = this.normalizeWheelDelta(event);
        const isTrackpad = this.isTrackpadWheel(event);
        const threshold = isTrackpad ? 38 : 48;
        const cooldown = isTrackpad ? 230 : 140;
        const resetWindow = isTrackpad ? 150 : 120;

        if (Math.abs(delta) < (isTrackpad ? 1.5 : 4)) {
            return null;
        }

        const deltaDirection = delta > 0 ? 1 : -1;

        if (now - this.lastWheelEventAt > resetWindow) {
            this.wheelIntent = 0;
            this.wheelLockedDirection = 0;
        }

        if (this.wheelIntent !== 0 && Math.sign(this.wheelIntent) !== Math.sign(delta)) {
            this.wheelIntent = 0;
        }

        this.lastWheelEventAt = now;

        if (isTrackpad && this.wheelLockedDirection === deltaDirection) {
            if (now - this.wheelLockedAt > 520 && Math.abs(delta) >= threshold) {
                this.wheelLockedDirection = 0;
            } else {
                this.lastWheelEventAt = now;
                return null;
            }
        }

        if (isTrackpad && this.wheelLockedDirection !== 0 && this.wheelLockedDirection !== deltaDirection) {
            this.wheelLockedDirection = 0;
            this.wheelIntent = 0;
        }

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
        if (isTrackpad) {
            this.wheelLockedDirection = direction;
            this.wheelLockedAt = now;
        }
        return direction;
    }
}
