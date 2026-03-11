import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EntitiesApi } from '../../core/api/entities.api';

type Entity = any;

@Component({
  standalone: true,
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private api = inject(EntitiesApi);
  private router = inject(Router);

  private readonly TYPE_COPY: Record<string, { label: string; title: string; desc: string; cta: string }> = {
    ARTWORK: {
      label: 'Artwork',
      title: 'Obras',
      desc: 'Piezas y obras clave. Analiza técnicas, contexto y conexiones.',
      cta: 'Explorar obras →',
    },
    ARTIST: {
      label: 'Artist',
      title: 'Artistas',
      desc: 'Autores, biografías y estilos. Descubre su red de influencias.',
      cta: 'Explorar artistas →',
    },
    PERIOD: {
      label: 'Period',
      title: 'Períodos',
      desc: 'Etapas históricas y cambios culturales que moldean el arte.',
      cta: 'Explorar períodos →',
    },
    MOVEMENT: {
      label: 'Movement',
      title: 'Movimientos',
      desc: 'Corrientes y manifiestos. Qué defendían y cómo se conectan.',
      cta: 'Explorar movimientos →',
    },
    CONCEPT: {
      label: 'Concept',
      title: 'Conceptos',
      desc: 'Ideas y términos para leer el arte con claridad.',
      cta: 'Explorar conceptos →',
    },
  };

  copy(type: string) {
    return this.TYPE_COPY[type] ?? { label: type, title: type, desc: '', cta: 'Explorar →' };
  }

  home$ = this.api.home();
  activeIndex = signal(0);

  fallbackBg = 'https://picsum.photos/id/1060/1400/900';

  thumb(e: Entity): string | null {
    return e?.mediaLinks?.[0]?.media?.url ?? null;
  }

  setActive(i: number, entities: Entity[]) {
    const len = entities?.length ?? 0;
    if (!len) return;
    this.activeIndex.set(((i % len) + len) % len);
  }

  prev(entities: Entity[]) {
    if (!entities?.length) return;
    const i = this.activeIndex();
    this.activeIndex.set((i - 1 + entities.length) % entities.length);
  }

  next(entities: Entity[]) {
    if (!entities?.length) return;
    const i = this.activeIndex();
    this.activeIndex.set((i + 1) % entities.length);
  }

  go(slug: string) {
    this.router.navigate(['/entity', slug]);
  }

  cardTransform(index: number, active: number): string {
    const d = index - active;
    const clamped = Math.max(-2, Math.min(2, d));
    const abs = Math.abs(clamped);

    const x = clamped * 140;
    const rotY = clamped * -18;
    const scale = abs === 0 ? 1 : abs === 1 ? 0.92 : 0.86;
    const y = abs === 0 ? 0 : 6;

    return `translate3d(${x}px, ${y}px, 0) rotateY(${rotY}deg) scale(${scale})`;
  }

  cardOpacity(index: number, active: number): string {
    const abs = Math.abs(index - active);
    if (abs === 0) return '1';
    if (abs === 1) return '1';
    if (abs === 2) return '1';
    return '0';
  }

  cardFilter(index: number, active: number): string {
    const abs = Math.abs(index - active);
    if (abs === 0) return 'none';
    if (abs === 1) return 'blur(0.6px)';
    if (abs === 2) return 'blur(1.4px)';
    return 'blur(2px)';
  }

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    if (ev.key === 'ArrowLeft') ev.preventDefault();
    if (ev.key === 'ArrowRight') ev.preventDefault();
  }

  cardZ(index: number, active: number): number {
    const d = index - active;
    const abs = Math.abs(d);

    if (abs > 2) return 0;
    if (abs === 0) return 30;

    const base = abs === 1 ? 20 : 10;
    const tieBreaker = d < 0 ? 1 : 0;

    return base + tieBreaker;
  }

  goType(type: string) {
    this.router.navigate(['/entities', type.toLowerCase()]);
  }
}