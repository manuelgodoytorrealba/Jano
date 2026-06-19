import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicEntity } from '../../core/api/entities.models';
import { CuratedMapEntity } from '../../core/api/curated.api';
import { recommendedTypeLabel } from './recommended-presenter';

@Component({
  standalone: true,
  selector: 'app-recommended-discovery-map',
  imports: [FormsModule],
  templateUrl: './recommended-discovery-map.component.html',
  styleUrl: './recommended-discovery-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedDiscoveryMapComponent {
  private readonly api = inject(EntitiesApi);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  entities = input<CuratedMapEntity[]>([]);
  selectedEntityId = input<string | null>(null);
  visibleEntityIds = input<string[]>([]);

  selectEntity = output<string>();
  addEntity = output<string>();
  removeEntity = output<string>();

  readonly query = signal('');
  readonly searchResults = signal<PublicEntity[]>([]);
  readonly searchOpen = signal(false);
  readonly loading = signal(false);

  readonly visibleEntities = computed(() => {
    const allowed = new Set(this.visibleEntityIds());
    const selectedId = this.selectedEntityId();
    const visible = this.entities().filter((entity) => allowed.has(entity.id));
    return visible.sort((a, b) => {
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;
      return a.title.localeCompare(b.title);
    });
  });

  readonly mapNodes = computed(() => {
    const entities = this.visibleEntities();
    const selectedId = this.selectedEntityId();
    const selected = entities.find((entity) => entity.id === selectedId) ?? entities[0] ?? null;
    const orbit = entities.filter((entity) => entity.id !== selected?.id);
    const slots = [
      { x: 50, y: 16 },
      { x: 77, y: 24 },
      { x: 86, y: 53 },
      { x: 72, y: 79 },
      { x: 29, y: 79 },
      { x: 14, y: 50 },
      { x: 24, y: 23 },
      { x: 50, y: 86 },
      { x: 88, y: 17 },
      { x: 12, y: 20 },
    ];

    const nodes = orbit.map((entity, index) => ({
      entity,
      x: slots[index % slots.length].x,
      y: slots[index % slots.length].y,
      selected: false,
      connected: !!selected && entity.connectionIds.includes(selected.id),
    }));

    if (selected) {
      nodes.push({
        entity: selected,
        x: 50,
        y: 50,
        selected: true,
        connected: false,
      });
    }

    return nodes;
  });

  readonly mapLines = computed(() => {
    const nodes = this.mapNodes();
    const byId = new Map(nodes.map((node) => [node.entity.id, node]));
    const selected = nodes.find((node) => node.selected) ?? null;

    if (!selected) {
      return [];
    }

    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; strength: 'strong' | 'related' | 'weak' }> = [];

    for (const node of nodes) {
      if (node.entity.id === selected.entity.id) {
        continue;
      }

      lines.push({
        x1: selected.x,
        y1: selected.y,
        x2: node.x,
        y2: node.y,
        strength: node.connected ? 'strong' : 'weak',
      });
    }

    const seen = new Set<string>();
    for (const node of nodes) {
      for (const connectionId of node.entity.connectionIds) {
        const target = byId.get(connectionId);
        if (!target || target.entity.id === selected.entity.id || node.entity.id === selected.entity.id) {
          continue;
        }

        const key = [node.entity.id, target.entity.id].sort().join(':');
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        lines.push({
          x1: node.x,
          y1: node.y,
          x2: target.x,
          y2: target.y,
          strength: 'related',
        });
      }
    }

    return lines;
  });

  constructor() {
    effect(() => {
      const query = this.query().trim();
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }

      if (query.length < 2) {
        this.searchResults.set([]);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const currentRequest = ++this.requestId;
      this.searchTimer = setTimeout(() => {
        this.api.list({
          q: query,
          limit: 6,
          status: 'PUBLISHED',
        })
          .subscribe({
            next: (result) => {
              if (currentRequest !== this.requestId) {
                return;
              }

              this.searchResults.set(
                (result.items ?? []).filter((item) =>
                  ['CONCEPT', 'MOVEMENT', 'PERIOD', 'ARTIST', 'ARTWORK'].includes(item.type),
                ),
              );
              this.loading.set(false);
            },
            error: () => {
              if (currentRequest !== this.requestId) {
                return;
              }

              this.searchResults.set([]);
              this.loading.set(false);
            },
          });
      }, 180);
    });

    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }
    });
  }

  isSelected(entityId: string): boolean {
    return this.selectedEntityId() === entityId;
  }

  isConnected(entity: CuratedMapEntity): boolean {
    const selectedId = this.selectedEntityId();
    return !!selectedId && entity.connectionIds.includes(selectedId) && selectedId !== entity.id;
  }

  typeLabel(type: string): string {
    return recommendedTypeLabel(type);
  }

  toggleSearch(): void {
    this.searchOpen.update((value) => !value);
    if (this.searchOpen()) {
      return;
    }

    this.query.set('');
    this.searchResults.set([]);
  }

  chooseResult(entity: PublicEntity): void {
    this.addEntity.emit(entity.slug);
    this.searchOpen.set(false);
    this.query.set('');
    this.searchResults.set([]);
  }

  canRemove(entityId: string): boolean {
    return this.visibleEntities().length > 1;
  }
}
