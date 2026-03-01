import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { EntitiesApi } from '../../core/api/entities.api';

@Component({
  standalone: true,
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink],
  template: `
    <div class="page">
      <header class="top">
        <h1>JANO</h1>
        <p class="muted">Museo digital curado + estudio académico</p>
      </header>

      @if (entities$ | async; as entities) {
        <div class="grid">
          @for (e of entities; track e.id) {
            <a class="card" [routerLink]="['/entity', e.slug]">
              <div class="type">{{ e.type }}</div>
              <div class="title">{{ e.title }}</div>
              @if (e.summary) { <div class="summary">{{ e.summary }}</div> }
            </a>
          }
        </div>
      } @else {
        <div class="loading">Cargando…</div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; }
    .top { margin-bottom: 20px; }
    h1 { margin: 0; font-size: 32px; letter-spacing: -0.03em; }
    .muted { margin: 6px 0 0; color: #666; }
    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
    .card {
      display: block;
      padding: 14px;
      border: 1px solid #eee;
      border-radius: 16px;
      background: #fff;
      text-decoration: none;
      color: inherit;
      transition: transform .08s ease;
    }
    .card:hover { transform: translateY(-1px); }
    .type {
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #777;
      margin-bottom: 8px;
    }
    .title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .summary { color: #444; font-size: 14px; line-height: 1.45; }
    .loading { color: #666; padding: 40px 0; }
  `],
})
export class HomeComponent {
  private api = inject(EntitiesApi);
  entities$ = this.api.list();
}