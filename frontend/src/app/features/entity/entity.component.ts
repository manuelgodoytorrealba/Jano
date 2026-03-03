// frontend/src/app/features/entity/entity.component.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map, distinctUntilChanged, switchMap, shareReplay } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { GraphComponent } from './graph.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';

@Component({
  standalone: true,
  selector: 'app-entity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, GraphComponent, RichTextComponent],
  template: `
    @if (entity$ | async; as entity) {
      <div class="split">
        <!-- LEFT: image -->
        <div class="left">
          @if (primaryMedia(entity)?.url) {
            <div class="media">
              <img
                [src]="primaryMedia(entity)!.url"
                [alt]="primaryMedia(entity)!.alt || entity.title"
                loading="lazy"
              />

              <div class="media-meta">
                @if (primaryMedia(entity)!.source) { <div><strong>Fuente:</strong> {{ primaryMedia(entity)!.source }}</div> }
                @if (primaryMedia(entity)!.photoBy) { <div><strong>Foto:</strong> {{ primaryMedia(entity)!.photoBy }}</div> }
                @if (primaryMedia(entity)!.license) { <div><strong>Licencia:</strong> {{ primaryMedia(entity)!.license }}</div> }
              </div>
            </div>
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

              <div class="badges">
                <span class="badge">{{ entity.status }}</span>
                @if (entity.contentLevel) { <span class="badge">{{ entity.contentLevel }}</span> }
                <span class="badge">{{ entity.type }}</span>
              </div>

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
            <p class="summary">
              <app-rich-text [text]="entity.summary"></app-rich-text>
            </p>
          }

          @if (entity.content) {
            <h3 class="section">Ensayo</h3>
            <div class="content">
              <app-rich-text [text]="entity.content"></app-rich-text>
            </div>
          }

          @if (showGraph()) {
            <div class="graph-wrap">
              <app-graph [slug]="entity.slug" />
            </div>
          }

          <!-- FACT SHEET -->
          <h3 class="section">Ficha</h3>

          @if (entity.type === 'ARTWORK' && entity.artwork) {
            <ul class="facts">
              @if (entity.artwork.technique) { <li><strong>Técnica:</strong> {{ entity.artwork.technique }}</li> }
              @if (entity.artwork.materials) { <li><strong>Materiales:</strong> {{ entity.artwork.materials }}</li> }
              @if (entity.artwork.dimensions) { <li><strong>Dimensiones:</strong> {{ entity.artwork.dimensions }}</li> }
              @if (entity.artwork.location) { <li><strong>Ubicación:</strong> {{ entity.artwork.location }}</li> }
              @if (entity.artwork.collection) { <li><strong>Colección:</strong> {{ entity.artwork.collection }}</li> }
              @if (entity.artwork.state) { <li><strong>Estado:</strong> {{ entity.artwork.state }}</li> }
              @if (entity.artwork.authorNation) { <li><strong>Nacionalidad autor:</strong> {{ entity.artwork.authorNation }}</li> }
            </ul>
          } @else if (entity.type === 'ARTIST' && entity.artist) {
            <ul class="facts">
              @if (entity.artist.country) { <li><strong>País:</strong> {{ entity.artist.country }}</li> }
              @if (entity.artist.city) { <li><strong>Ciudad:</strong> {{ entity.artist.city }}</li> }
              @if (entity.artist.birthYear) { <li><strong>Nacimiento:</strong> {{ entity.artist.birthYear }}</li> }
              @if (entity.artist.deathYear) { <li><strong>Muerte:</strong> {{ entity.artist.deathYear }}</li> }
              @if (entity.artist.disciplines) { <li><strong>Disciplinas:</strong> {{ entity.artist.disciplines }}</li> }
              @if (entity.artist.links) { <li><strong>Links:</strong> {{ entity.artist.links }}</li> }
            </ul>
            @if (entity.artist.bioShort) {
              <div class="content">
                <app-rich-text [text]="entity.artist.bioShort"></app-rich-text>
              </div>
            }
          } @else if (entity.type === 'CONCEPT' && entity.concept?.definition) {
            <div class="content">
              <app-rich-text [text]="entity.concept.definition"></app-rich-text>
            </div>
          } @else if (entity.type === 'PERIOD' && entity.period?.definition) {
            <div class="content">
              <app-rich-text [text]="entity.period.definition"></app-rich-text>
            </div>
          } @else {
            <p class="muted">Sin ficha específica para este tipo.</p>
          }

          <!-- CONTRIBUTORS -->
          @if ((entity.contributors?.length ?? 0) > 0) {
            <h3 class="section">Colaboradores</h3>
            <ul class="relations">
              @for (c of entity.contributors; track c.id) {
                <li class="relation">
                  <span class="rel-type">{{ c.role }}</span>
                  <span class="arrow">—</span>
                  <span class="note">{{ c.name }}@if (c.note) { ({{ c.note }}) }</span>
                </li>
              }
            </ul>
          }

          <!-- SOURCES -->
          @if ((entity.sourceRefs?.length ?? 0) > 0) {
            <h3 class="section">Fuentes</h3>
            <ul class="relations">
              @for (r of entity.sourceRefs; track r.id) {
                <li class="relation">
                  <span class="rel-type">{{ r.source.type }}</span>
                  <span class="note">
                    <strong>{{ r.source.title }}</strong>
                    @if (r.source.author) { — {{ r.source.author }} }
                    @if (r.source.publisher || r.source.year) {
                      ({{ r.source.publisher ?? '' }}@if (r.source.year) {, {{ r.source.year }} })
                    }
                    @if (r.page) { — p. {{ r.page }} }
                  </span>
                </li>
                @if (r.quote) { <div class="quote">“{{ r.quote }}”</div> }
              }
            </ul>
          }

          <!-- RELATIONS -->
          <h3 class="section">Relaciones</h3>

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
                  @if (r.justification) { <span class="note">— <app-rich-text [text]="r.justification"></app-rich-text></span> }
                  @else if (r.weight !== null && r.weight !== undefined) { <span class="note">— peso: {{ r.weight }}</span> }
                </li>
              }
            </ul>
          }

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
                  @if (r.justification) { <span class="note">— <app-rich-text [text]="r.justification"></app-rich-text></span> }
                  @else if (r.weight !== null && r.weight !== undefined) { <span class="note">— peso: {{ r.weight }}</span> }
                </li>
              }
            </ul>
          }
        </div>
      </div>
    } @else {
      <div class="loading">Cargando…</div>
    }
  `,
  styles: [`
    .split { display: grid; grid-template-columns: 1fr 1fr; height: 100vh; }

    .left {
      display: grid;
      place-items: center;
      background: #f7f7f7;
      border-right: 1px solid #eaeaea;
      padding: 20px 0;
    }

    .media { width: 92%; display: grid; gap: 10px; }

    img {
      width: 100%;
      max-height: 82vh;
      object-fit: contain;
      border-radius: 12px;
      background: white;
      box-shadow: 0 10px 30px rgba(0,0,0,.08);
    }

    .media-meta { font-size: 12px; color: #666; line-height: 1.4; }
    .media-meta strong { color: #444; }

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

    .right { padding: 28px 34px; overflow-y: auto; }

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

    .title { margin: 0; font-size: 28px; line-height: 1.2; letter-spacing: -0.02em; }

    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .badge {
      font-size: 12px; padding: 4px 10px; border-radius: 999px;
      border: 1px solid #e6e6e6; background: #fff; color: #444;
      text-transform: uppercase; letter-spacing: .06em;
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

    .summary { margin: 0 0 18px; color: #222; line-height: 1.6; max-width: 70ch; }
    .content { margin: 0 0 18px; color: #222; line-height: 1.7; max-width: 76ch; white-space: pre-wrap; }

    .graph-wrap { margin: 14px 0 22px; }

    .section { margin: 22px 0 12px; font-size: 14px; letter-spacing: .06em; text-transform: uppercase; color: #444; }
    .sub { margin: 14px 0 10px; font-size: 13px; color: #555; text-transform: uppercase; letter-spacing: .06em; }
    .muted { color: #777; margin: 0; }

    .facts { list-style: none; padding: 0; margin: 0 0 18px; display: grid; gap: 6px; }
    .facts li { padding: 8px 10px; border: 1px solid #eee; border-radius: 12px; background: #fff; }
    .facts strong { color: #333; }

    .relations { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }

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
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .arrow { color: #888; }

    .rel-link {
      color: #111;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      font-weight: 700;
    }
    .rel-link:hover { border-bottom-color: #111; }

    .note { color: #666; font-size: 13px; }
    .note app-rich-text { display: inline; }

    .quote {
      margin: 6px 0 12px;
      padding: 10px 12px;
      border-left: 3px solid #ddd;
      color: #555;
      font-style: italic;
      background: #fafafa;
      border-radius: 10px;
    }

    .loading { height: 100vh; display: grid; place-items: center; color: #666; }

    @media (max-width: 980px) {
      .split { grid-template-columns: 1fr; height: auto; }
      .left { min-height: 55vh; border-right: 0; border-bottom: 1px solid #eaeaea; }
      img { max-height: 60vh; }
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

  primaryMedia(entity: any) {
    return entity?.mediaLinks?.[0]?.media ?? null;
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