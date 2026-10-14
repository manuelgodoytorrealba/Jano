import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicEntity } from '../../core/api/entities.models';
import { GraphResponseDto } from '../../core/api/graph.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { entitySymbol } from '../../shared/entity-symbols';
import { relationDirectionLabel } from './entity-detail.presenter';

export function previewConnections(graph: GraphResponseDto) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const seen = new Set([graph.centerId]);
  return graph.edges
    .flatMap((edge) => {
      const id =
        edge.source === graph.centerId
          ? edge.target
          : edge.target === graph.centerId
            ? edge.source
            : null;
      const node = id ? nodes.get(id) : null;
      if (!node || seen.has(node.id)) return [];
      seen.add(node.id);
      return [{ node, edge }];
    })
    .sort(
      (a, b) =>
        Number(['PERSON', 'ARTIST'].includes(b.node.type)) -
          Number(['PERSON', 'ARTIST'].includes(a.node.type)) ||
        Number(!!b.node.image) - Number(!!a.node.image) ||
        (b.edge.weight ?? 1) - (a.edge.weight ?? 1),
    )
    .slice(0, 3);
}

@Component({
  selector: 'app-entity-connections-preview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './entity-connections-preview.component.html',
  styleUrl: './entity-connections-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityConnectionsPreviewComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) entity!: PublicEntity;
  @Input() image: string | null = null;
  @Output() openMap = new EventEmitter<void>();
  @Output() readRelations = new EventEmitter<void>();
  readonly i18n = inject(I18nService);
  readonly symbol = entitySymbol;
  readonly connections = signal<ReturnType<typeof previewConnections>>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  private readonly api = inject(EntitiesApi);
  private request?: Subscription;

  get centerTitle(): string {
    return this.entity.title.split(' — ').at(-1) || this.entity.title;
  }

  relationText(item: ReturnType<typeof previewConnections>[number]): string {
    const relation = [...(this.entity.outgoing ?? []), ...(this.entity.incoming ?? [])].find(
      (edge) => edge.id === item.edge.id,
    );
    const outgoing = item.edge.source === this.entity.id;
    return (
      (outgoing ? relation?.relationTypeLabel : relation?.relationTypeInverseLabel) ||
      relationDirectionLabel(item.edge.relationType, outgoing ? 'outgoing' : 'incoming', (key) =>
        this.i18n.t(key),
      )
    );
  }

  ngOnChanges(): void {
    this.request?.unsubscribe();
    this.connections.set([]);
    this.loading.set(true);
    this.failed.set(false);
    this.request = this.api.graph(this.entity.slug).subscribe({
      next: (graph) => {
        this.connections.set(previewConnections(graph));
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
}
