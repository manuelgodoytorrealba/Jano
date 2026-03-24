import {
    ChangeDetectionStrategy,
    Component,
    HostListener,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { DeckItem, DeckRailAction } from './entity-deck.types';

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

    backgroundImage = input<string>('/assets/home/museum-room.jpg');
    showRail = input<boolean>(true);
    showDots = input<boolean>(true);
    showNav = input<boolean>(true);
    fullViewport = input<boolean>(false);

    activeIndex = signal(0);

    cardClick = output<DeckItem>();
    expandClick = output<DeckItem>();
    railClick = output<DeckRailAction>();
    activeIndexChange = output<number>();
    searchSubmit = output<string>();
    tabChange = output<'home' | 'picks' | 'my-space'>();

    private lastScroll = 0;

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

    cardTransform(index: number): string {
        const list = this.items();
        const d = this.relativeIndex(index, this.activeIndex(), list.length);
        const clamped = Math.max(-2, Math.min(2, d));
        const abs = Math.abs(clamped);
        const motionScale = this.deckMotionScale();

        const xBase = abs === 0 ? 0 : abs === 1 ? 104 : 182;
        const yBase = abs === 0 ? 0 : abs === 1 ? 10 : 22;
        const zBase = abs === 0 ? 0 : abs === 1 ? -94 : -178;
        const rotBase = abs === 0 ? 0 : abs === 1 ? -12 : -18;
        const scale = abs === 0 ? 1 : abs === 1 ? 0.9 : 0.8;

        const x = Math.sign(clamped) * xBase * motionScale;
        const y = yBase * motionScale;
        const z = zBase * motionScale;
        const rotY = Math.sign(clamped) * rotBase;

        return `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotY}deg) scale(${scale})`;
    }

    cardOpacity(index: number): string {
        const list = this.items();
        const abs = Math.abs(this.relativeIndex(index, this.activeIndex(), list.length));

        if (abs === 0) return '1';
        if (abs === 1) return '0.58';
        if (abs === 2) return '0.28';
        return '0';
    }

    cardFilter(index: number): string {
        const list = this.items();
        const abs = Math.abs(this.relativeIndex(index, this.activeIndex(), list.length));

        if (abs === 0) return 'blur(0px)';
        if (abs === 1) return 'blur(0.8px) saturate(0.9)';
        if (abs === 2) return 'blur(1.4px) saturate(0.82)';
        return 'blur(2px)';
    }

    cardZ(index: number): number {
        const list = this.items();
        const abs = Math.abs(this.relativeIndex(index, this.activeIndex(), list.length));

        if (abs > 2) return 0;
        if (abs === 0) return 30;
        if (abs === 1) return 20;
        return 10;
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
