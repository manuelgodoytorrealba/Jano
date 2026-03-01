import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { EntitiesApi } from '../../core/api/entities.api';
import { map, of, shareReplay } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: `
    @if (vm$ | async; as vm) {
      <svg class="svg" viewBox="0 0 1000 700">
        <!-- edges -->
        @for (e of vm.edges; track e.id) {
          <line
            [attr.x1]="vm.pos[e.from].x"
            [attr.y1]="vm.pos[e.from].y"
            [attr.x2]="vm.pos[e.to].x"
            [attr.y2]="vm.pos[e.to].y"
            class="edge"
          />
        }

        <!-- nodes -->
        @for (n of vm.nodes; track n.id) {
          <g
            class="node-group"
            [attr.transform]="'translate(' + vm.pos[n.id].x + ',' + vm.pos[n.id].y + ')'"
            (click)="go(n.slug)"
          >
            <circle class="node" r="22"></circle>
            <circle class="node-ring" r="28"></circle>

            <text class="label" x="40" y="6">
              {{ n.title }}
            </text>

            <text class="sub" x="40" y="26">
              {{ n.type }}
            </text>
          </g>
        }
      </svg>
    } @else {
      <div class="loading">Cargando grafo…</div>
    }
  `,
  styles: [`
    .svg {
      width: 100%;
      height: 520px;
      background: radial-gradient(circle at 30% 20%, #151515, #0b0b0b 60%, #070707);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.08);
    }

    .edge {
      stroke: rgba(255,255,255,.22);
      stroke-width: 1.4;
    }

    .node-group {
      cursor: pointer;
    }

    .node {
      fill: rgba(255,255,255,.92);
    }

    .node-ring {
      fill: transparent;
      stroke: rgba(255,255,255,.18);
      stroke-width: 2;
    }

    .label {
      fill: rgba(255,255,255,.92);
      font-size: 16px;
      font-weight: 600;
    }

    .sub {
      fill: rgba(255,255,255,.55);
      font-size: 12px;
      letter-spacing: .06em;
      text-transform: uppercase;
    }

    .loading { color: #666; padding: 12px 0; }
  `],
})
export class GraphComponent {
  private api = inject(EntitiesApi);
  private router = inject(Router);

  @Input({ required: true }) slug!: string;

  vm$ = of<any>(null);

  ngOnChanges() {
    if (!this.slug) return;

    this.vm$ = this.api.graph(this.slug).pipe(
      map((g: any) => {
        const nodes = g.nodes ?? [];
        const edges = g.edges ?? [];

        // Layout: centro + círculo
        const cx = 500, cy = 350, r = 260;
        const pos: Record<string, { x: number; y: number }> = {};

        const centerId = g.centerId;
        pos[centerId] = { x: cx, y: cy };

        const others = nodes.filter((n: any) => n.id !== centerId);
        const step = (Math.PI * 2) / Math.max(others.length, 1);

        others.forEach((n: any, i: number) => {
          pos[n.id] = {
            x: cx + Math.cos(i * step) * r,
            y: cy + Math.sin(i * step) * r,
          };
        });

        // Blindaje: por si falta alguno
        nodes.forEach((n: any) => {
          if (!pos[n.id]) pos[n.id] = { x: cx, y: cy };
        });

        return { nodes, edges, pos };
      }),
      shareReplay(1)
    );
  }

  go(slug: string) {
    this.router.navigate(['/entity', slug]);
  }
}