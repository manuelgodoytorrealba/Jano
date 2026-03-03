// frontend/src/app/features/home/home.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { EntitiesApi } from '../../core/api/entities.api';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';

@Component({
  standalone: true,
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, RichTextComponent],
  template: `
    <div class="page">
      <header class="top">
        <div>
          <h1>JANO</h1>
          <p class="muted">Museo digital curado + estudio académico</p>
        </div>
      </header>

      @if (entities$ | async; as entities) {
        <div class="grid">
          @for (e of entities; track e.id) {
            <a class="card" [routerLink]="['/entity', e.slug]">
              @if (primaryThumb(e)) {
                <img class="thumb" [src]="primaryThumb(e)!" [alt]="e.title" loading="lazy" />
              } @else {
                <div class="thumb placeholder"></div>
              }

              <div class="meta">
                <div class="badges">
                  <span class="badge">{{ e.type }}</span>
                  @if (e.status) { <span class="badge">{{ e.status }}</span> }
                  @if (e.contentLevel) { <span class="badge">{{ e.contentLevel }}</span> }
                </div>

                <div class="title">{{ e.title }}</div>

                @if (e.summary) {
                  <div class="summary">
                    <app-rich-text [text]="e.summary"></app-rich-text>
                  </div>
                }
              </div>
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
    .top { margin-bottom: 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
    h1 { margin: 0; font-size: 32px; letter-spacing: -0.03em; }
    .muted { margin: 6px 0 0; color: #666; }

    .grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }

    .card {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 14px;
      padding: 14px;
      border: 1px solid #eee;
      border-radius: 18px;
      background: #fff;
      text-decoration: none;
      color: inherit;
      transition: transform .08s ease, box-shadow .12s ease;
    }
    .card:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 26px rgba(0,0,0,.06);
    }

    .thumb {
      width: 110px;
      height: 110px;
      border-radius: 14px;
      object-fit: cover;
      background: #f3f3f3;
      border: 1px solid #eee;
    }
    .thumb.placeholder {
      background: linear-gradient(135deg, #f2f2f2, #fafafa);
      border: 1px dashed #ddd;
    }

    .meta { min-width: 0; }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }

    .badge {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid #e6e6e6;
      background: #fff;
      color: #444;
      text-transform: uppercase;
      letter-spacing: .06em;
      line-height: 1;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
      line-height: 1.2;
    }

    .summary {
      color: #444;
      font-size: 14px;
      line-height: 1.45;
      max-width: 60ch;
    }

    .loading { color: #666; padding: 40px 0; }

    @media (max-width: 640px) {
      .page { padding: 22px; }
      .card { grid-template-columns: 1fr; }
      .thumb { width: 100%; height: 180px; }
    }
  `],
})
export class HomeComponent {
  private api = inject(EntitiesApi);
  entities$ = this.api.list();

  primaryThumb(e: any): string | null {
    return e?.mediaLinks?.[0]?.media?.url ?? null;
  }
}