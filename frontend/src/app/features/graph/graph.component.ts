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
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
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