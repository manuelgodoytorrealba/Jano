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

    private lastScroll = 0;

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
        this.cardClick.emit(item);
    }

    onExpandClick(event: Event, item: DeckItem): void {
        event.stopPropagation();
        this.expandClick.emit(item);
    }

    onAdminEditClick(event: Event, item: DeckItem): void {
        event.stopPropagation();
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
        const now = Date.now();
        if (now - this.lastScroll < 420) return;

        if (Math.abs(event.deltaY) < 10) return;

        this.lastScroll = now;

        if (event.deltaY > 0) {
            this.next();
        } else {
            this.prev();
        }
    }
}
