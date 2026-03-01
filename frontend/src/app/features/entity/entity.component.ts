import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map, distinctUntilChanged, switchMap, shareReplay } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { GraphComponent } from './graph.component';

@Component({
  standalone: true,
  selector: 'app-entity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, GraphComponent],
  template: `
    @if (entity$ | async; as entity) {
      <div class="split">
        <!-- LEFT: artwork -->
        <div class="left">
          @if (entity.metadata?.imageUrl) {
            <img
              [src]="entity.metadata.imageUrl"
              [alt]="entity.title"
              loading="lazy"
            />
          } @else {
            <div class="placeholder">
              <span>Sin imagen</span>
            </div>
          }
        </div>

        <!-- RIGHT: info -->
        <div class="right">
          <header class="header">
            <div class="title-wrap">
              <a class="back" routerLink="/">← Volver</a>
              <h2 class="title">{{ entity.title }}</h2>

              @if (entity.startYear || entity.endYear) {
                <span class="years">
                  {{ entity.startYear ?? '' }}@if (entity.endYear) {–{{ entity.endYear }}}
                </span>
              }
            </div>

            <div class="actions">
              <button class="btn" type="button" (click)="toggleGraph()">
                @if (showGraph()) { Cerrar grafo } @else { Ver grafo }
              </button>
            </div>
          </header>

          @if (entity.summary) {
            <p class="summary">{{ entity.summary }}</p>
          }

          @if (showGraph()) {
            <div class="graph-wrap">
              <app-graph [slug]="entity.slug" />
            </div>
          }

          <h3 class="section">Relaciones</h3>

          @if ((entity.outgoing?.length ?? 0) === 0) {
            <p class="muted">Aún no hay relaciones salientes.</p>
          } @else {
            <ul class="relations">
              @for (r of entity.outgoing; track r.id) {
                <li class="relation">
                  <span class="rel-type">{{ r.type }}</span>
                  <span class="arrow">→</span>

                  <a class="rel-link" [routerLink]="['/entity', r.to.slug]">
                    {{ r.to.title }}
                  </a>

                  @if (r.note) {
                    <span class="note">— {{ r.note }}</span>
                  }
                </li>
              }
            </ul>

            <h3 class="section">Relaciones</h3>

<!-- Outgoing -->
<h4 class="sub">Salientes</h4>
@if ((entity.outgoing?.length ?? 0) === 0) {
  <p class="muted">No hay relaciones salientes.</p>
} @else {
  <ul class="relations">
    @for (r of entity.outgoing; track r.id) {
      <li class="relation">
        <span class="rel-type">{{ r.type }}</span>
        <span class="arrow">→</span>
        <a class="rel-link" [routerLink]="['/entity', r.to.slug]">
          {{ r.to.title }}
        </a>
        @if (r.note) { <span class="note">— {{ r.note }}</span> }
      </li>
    }
  </ul>
}

<!-- Incoming -->
<h4 class="sub">Entrantes</h4>
@if ((entity.incoming?.length ?? 0) === 0) {
  <p class="muted">No hay relaciones entrantes.</p>
} @else {
  <ul class="relations">
    @for (r of entity.incoming; track r.id) {
      <li class="relation">
        <span class="rel-type">{{ r.type }}</span>
        <span class="arrow">←</span>
        <a class="rel-link" [routerLink]="['/entity', r.from.slug]">
          {{ r.from.title }}
        </a>
        @if (r.note) { <span class="note">— {{ r.note }}</span> }
      </li>
    }
  </ul>
}
          }
        </div>
      </div>
    } @else {
      <div class="loading">Cargando…</div>
    }
  `,
  styles: [`
    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      height: 100vh;
    }

    .sub {
  margin: 14px 0 10px;
  font-size: 13px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: .06em;
}

    .left {
      display: grid;
      place-items: center;
      background: #f7f7f7;
      border-right: 1px solid #eaeaea;
    }

    img {
      max-width: 92%;
      max-height: 92%;
      object-fit: contain;
      border-radius: 12px;
      background: white;
      box-shadow: 0 10px 30px rgba(0,0,0,.08);
    }

    .placeholder {
      width: 92%;
      height: 92%;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #f2f2f2, #fafafa);
      border: 1px dashed #ddd;
      color: #777;
      font-size: 14px;
    }

    .right {
      padding: 28px 34px;
      overflow-y: auto;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }

    .back {
      display: inline-block;
      margin-bottom: 10px;
      color: #666;
      text-decoration: none;
      font-size: 14px;
    }
    .back:hover { text-decoration: underline; }

    .title-wrap {
      min-width: 0;
    }

    .title {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    .years {
      display: inline-block;
      margin-top: 10px;
      font-size: 13px;
      color: #666;
      border: 1px solid #e5e5e5;
      padding: 4px 10px;
      border-radius: 999px;
      background: #fff;
    }

    .actions { flex: 0 0 auto; }

    .btn {
      appearance: none;
      border: 1px solid #e6e6e6;
      background: #fff;
      border-radius: 12px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn:hover { background: #fafafa; }

    .summary {
      margin: 0 0 18px;
      color: #222;
      line-height: 1.6;
      max-width: 68ch;
    }

    .graph-wrap {
      margin: 14px 0 22px;
    }

    .section {
      margin: 24px 0 12px;
      font-size: 14px;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #444;
    }

    .muted { color: #777; margin: 0; }

    .relations {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 10px;
    }

    .relation {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid #eee;
      border-radius: 12px;
      background: #fff;
      flex-wrap: wrap;
    }

    .rel-type {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #f4f4f4;
      border: 1px solid #e8e8e8;
      color: #333;
    }

    .arrow { color: #888; }

    .rel-link {
      color: #111;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      font-weight: 600;
    }
    .rel-link:hover { border-bottom-color: #111; }

    .note {
      color: #666;
      font-size: 13px;
    }

    .loading {
      height: 100vh;
      display: grid;
      place-items: center;
      color: #666;
    }

    @media (max-width: 980px) {
      .split { grid-template-columns: 1fr; height: auto; }
      .left { min-height: 55vh; border-right: 0; border-bottom: 1px solid #eaeaea; }
      .right { padding: 22px; }
    }
  `],
})
export class EntityComponent {
  private api = inject(EntitiesApi);
  private route = inject(ActivatedRoute);

  showGraph = signal(false);
  toggleGraph() {
    this.showGraph.update((v) => !v);
  }

  private slug$ = this.route.paramMap.pipe(
    map((p) => p.get('slug') ?? ''),
    distinctUntilChanged()
  );

  entity$ = this.slug$.pipe(
    switchMap((slug) => this.api.get(slug)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}