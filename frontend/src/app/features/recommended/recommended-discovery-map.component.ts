import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicEntity } from '../../core/api/entities.models';
import { CuratedMapEntity } from '../../core/api/curated.api';
import { GraphResponseDto } from '../graph/graph.models';
import { GraphComponent } from '../graph/graph.component';
import { recommendedTypeLabel } from './recommended-presenter';

@Component({
  standalone: true,
  selector: 'app-recommended-discovery-map',
  imports: [FormsModule, GraphComponent],
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
  graphData = input<GraphResponseDto | null>(null);

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
    if (selectedId) {
      allowed.add(selectedId);
    }

    const visible = this.entities().filter((entity) => allowed.has(entity.id));
    return visible.sort((a, b) => {
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;
      return a.title.localeCompare(b.title);
    });
  });
  readonly graphSlug = computed(() => 'curated-graph');

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
        this.api
          .list({
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
    return entityId !== this.selectedEntityId() && this.visibleEntities().length > 1;
  }
}
