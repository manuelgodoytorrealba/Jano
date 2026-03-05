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
  template: `
    <div class="page">
      <header class="top">
        <div>
          <h1>JANO</h1>
          <p class="muted">Museo digital curado + estudio académico</p>
        </div>
      </header>

      @if (home$ | async; as home) {
        <!-- HERO GALLERY / FIRST FILTER -->
        <section class="gallery">
          <div class="gallery-shell">
            <!-- ambient bg from active card -->
            <div
              class="bg"
              [style.backgroundImage]="'url(' + (thumb(home[activeIndex()]) || fallbackBg) + ')'"
            ></div>
            <div class="bg-overlay"></div>

            <div class="gallery-ui">
              <button class="nav left" type="button" (click)="prev(home)" aria-label="Anterior">
                ‹
              </button>

              <div class="stack" role="list">
                @for (e of home; track e.type) {
                  <article
                    role="listitem"
                    class="card"
                    [class.is-active]="$index === activeIndex()"
                    [style.zIndex]="cardZ($index, activeIndex())"
                    [style.transform]="cardTransform($index, activeIndex())"
                    [style.opacity]="cardOpacity($index, activeIndex())"
                    [style.filter]="cardFilter($index, activeIndex())"
                    (click)="goType(e.type)"
                  >
                    <div class="card-media">
                      @if (thumb(e)) {
                        <img [src]="thumb(e)!" [alt]="e.title" loading="lazy" />
                      } @else {
                        <div class="ph">Sin imagen</div>
                      }
                    </div>

                    <div class="card-body">
                      <div class="kicker">{{ copy(e.type).label }}</div>
                      <div class="title">{{ copy(e.type).title }}</div>
                      <div class="summary">{{ copy(e.type).desc }}</div>
                      <div class="cta">{{ copy(e.type).cta }}</div>

                      <div class="title">{{ e.title }}</div>

                      @if (e.summary) {
                        <div class="summary">{{ e.summary }}</div>
                      }
                    </div>
                  </article>
                }
              </div>

              <button class="nav right" type="button" (click)="next(home)" aria-label="Siguiente">
                ›
              </button>
            </div>

            <div class="dots" aria-label="Paginación">
              @for (e of home; track e.type) {
                <button
                  type="button"
                  class="dot"
                  [class.on]="$index === activeIndex()"
                  (click)="setActive($index, home)"
                  [attr.aria-label]="'Ir a ' + e.type"
                ></button>
              }
            </div>
          </div>
        </section>

        <!-- BELOW: classic grid -->
        <section class="below">
          <h2 class="h2">Explorar</h2>
          <div class="grid">
            @for (e of home; track e.type) {
              <button class="mini" type="button" (click)="go(e.slug)">
                <div class="mini-thumb">
                  @if (thumb(e)) {
                    <img [src]="thumb(e)!" [alt]="e.title" loading="lazy" />
                  } @else {
                    <div class="mini-ph"></div>
                  }
                </div>
                <div class="mini-meta">
                  <div class="mini-title">{{ e.title }}</div>
                  <div class="mini-sub">{{ e.type }}</div>
                </div>
              </button>
            }
          </div>
        </section>
      } @else {
        <div class="loading">Cargando…</div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 28px; }
    .top { margin-bottom: 18px; }
    h1 { margin: 0; font-size: 34px; letter-spacing: -0.03em; }
    .muted { margin: 6px 0 0; color: #666; }

    /* Gallery shell */
    .gallery { margin-top: 14px; }
    .gallery-shell {
      position: relative;
      border-radius: 22px;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,.06);
      min-height: 460px;
      background: #0b0b0b;
    }
    .bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: blur(26px) saturate(1.1);
      transform: scale(1.08);
      opacity: .55;
    }
    .bg-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(900px 400px at 50% 55%, rgba(0,0,0,.10), rgba(0,0,0,.78));
    }

    .gallery-ui {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 56px 1fr 56px;
      align-items: center;
      padding: 26px 14px;
      height: 100%;
    }

    .nav {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.08);
      color: rgba(255,255,255,.92);
      cursor: pointer;
      font-size: 28px;
      line-height: 1;
      display: grid;
      place-items: center;
      transition: transform .12s ease, background .12s ease;
      justify-self: center;
    }
    .nav:hover { background: rgba(255,255,255,.12); transform: scale(1.04); }

    .stack {
      position: relative;
      height: 400px;
      display: grid;
      place-items: center;
      perspective: 1400px;
      user-select: none;
    }

    .card {
      position: absolute;
      width: min(520px, 88vw);
      max-width: 520px;
      height: 360px;
      border-radius: 22px;
      overflow: hidden;
      background: white;
      border: 1px solid rgba(255,255,255,.18);
      box-shadow: 0 30px 70px rgba(0,0,0,.35);
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      cursor: pointer;
      transition: transform .22s ease, opacity .22s ease, filter .22s ease;
      will-change: transform;
      backdrop-filter: none;
    }
    .card.is-active {
      background: white;
      border-color: rgba(255,255,255,.26);
    }

    .card-media {
      background: rgba(0,0,0,.05);
      display: grid;
      place-items: center;
    }
    .card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .ph {
      color: rgba(0,0,0,.55);
      font-size: 14px;
    }

    .card-body {
      padding: 18px 18px;
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge {
      font-size: 11px;
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.75);
      color: rgba(0,0,0,.72);
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .kicker{
  font-size: 12px;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: rgba(0,0,0,.55);
}

.cta{
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(0,0,0,.78);
}

    .title {
      font-size: 22px;
      font-weight: 780;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: #0b0b0b;
    }
    .summary {
      font-size: 14px;
      line-height: 1.5;
      color: rgba(0,0,0,.72);
      max-width: 42ch;
    }

    .dots {
      position: absolute;
      z-index: 3;
      bottom: 14px;
      left: 0;
      right: 0;
      display: flex;
      gap: 8px;
      justify-content: center;
      align-items: center;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.28);
      background: rgba(255,255,255,.12);
      cursor: pointer;
    }
    .dot.on { background: rgba(255,255,255,.72); }

    /* Below section */
    .below { margin-top: 22px; }
    .h2 { margin: 0 0 12px; font-size: 14px; letter-spacing: .08em; text-transform: uppercase; color: #444; }

    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }

    .mini {
      text-align: left;
      display: grid;
      grid-template-columns: 54px 1fr;
      gap: 12px;
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 16px;
      background: #fff;
      cursor: pointer;
      transition: box-shadow .15s ease, transform .15s ease;
    }
    .mini:hover { box-shadow: 0 10px 24px rgba(0,0,0,.06); transform: translateY(-1px); }
    .mini-thumb { width: 54px; height: 54px; border-radius: 12px; overflow: hidden; background: #f3f3f3; border: 1px solid #eee; }
    .mini-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .mini-ph { width: 100%; height: 100%; background: linear-gradient(135deg, #f2f2f2, #fafafa); }
    .mini-title { font-weight: 700; line-height: 1.15; }
    .mini-sub { font-size: 12px; color: #666; letter-spacing: .06em; text-transform: uppercase; margin-top: 4px; }

    .loading { color: #666; padding: 40px 0; }

    @media (max-width: 780px) {
      .gallery-ui { grid-template-columns: 44px 1fr 44px; }
      .card { grid-template-columns: 1fr; height: 410px; }
      .card-media { height: 220px; }
      .stack { height: 430px; }
    }
  `],
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