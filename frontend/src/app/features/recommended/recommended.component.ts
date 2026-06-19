import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CuratedApi, CuratedPageResponse } from '../../core/api/curated.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { RecommendedDiscoveryMapComponent } from './recommended-discovery-map.component';
import { RecommendedEntityPanelComponent } from './recommended-entity-panel.component';
import { RecommendedKeyEntitiesComponent } from './recommended-key-entities.component';
import { RecommendedRecentlyAddedComponent } from './recommended-recently-added.component';
import { RecommendedRelatedEntitiesComponent } from './recommended-related-entities.component';
import { RecommendedStaffPicksComponent } from './recommended-staff-picks.component';
import { RecommendedTab } from './recommended-presenter';

@Component({
    standalone: true,
    selector: 'app-recommended',
    imports: [
      RecommendedStaffPicksComponent,
      RecommendedDiscoveryMapComponent,
      RecommendedEntityPanelComponent,
      RecommendedKeyEntitiesComponent,
      RecommendedRelatedEntitiesComponent,
      RecommendedRecentlyAddedComponent,
    ],
    templateUrl: './recommended.component.html',
    styleUrl: './recommended.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedComponent {
  private readonly api = inject(CuratedApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly page = signal<CuratedPageResponse | null>(null);
  readonly selectedEntitySlug = signal<string | null>(null);
  readonly selectedTab = signal<RecommendedTab>('curations');
  readonly visibleDiscoveryIds = signal<string[]>([]);
  readonly loading = signal(true);

  private buildInitialVisibleDiscoveryIds(page: CuratedPageResponse): string[] {
    const selectedId = page.selectedEntity.id;
    const selectedNode = page.discoveryEntities.find((item) => item.id === selectedId) ?? null;
    const connected = page.discoveryEntities
      .filter((item) => item.id !== selectedId && !!selectedNode?.connectionIds.includes(item.id))
      .sort((a, b) => {
        if (b.curationCount !== a.curationCount) {
          return b.curationCount - a.curationCount;
        }
        if (b.relatedCount !== a.relatedCount) {
          return b.relatedCount - a.relatedCount;
        }
        return a.title.localeCompare(b.title);
      })
      .slice(0, 4)
      .map((item) => item.id);

    const fallback = page.discoveryEntities
      .filter((item) => item.id !== selectedId && !connected.includes(item.id))
      .sort((a, b) => {
        if (b.curationCount !== a.curationCount) {
          return b.curationCount - a.curationCount;
        }
        if (b.relatedCount !== a.relatedCount) {
          return b.relatedCount - a.relatedCount;
        }
        return a.title.localeCompare(b.title);
      })
      .slice(0, Math.max(0, 4 - connected.length))
      .map((item) => item.id);

    return [selectedId, ...connected, ...fallback].slice(0, 5);
  }

  constructor() {
    this.seo.setPageMeta({
      title: 'Curated Discovery | JANO',
      description: 'A lightweight editorial view of the JANO graph built around one selected entity and its strongest relationships.',
      path: '/recommended',
      image: '/assets/home/concept.jpg',
    });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug = (params.get('entity') ?? '').trim() || null;
        if (slug !== this.selectedEntitySlug()) {
          this.selectedEntitySlug.set(slug);
        }
      });

    effect(() => {
      this.i18n.locale();
      this.loadPage(this.selectedEntitySlug());
    });
  }

  selectEntity(slug: string): void {
    if (!slug || slug === this.selectedEntitySlug()) {
      return;
    }

    this.selectedEntitySlug.set(slug);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { entity: slug },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onAddEntity(slug: string): void {
    this.visibleDiscoveryIds.update((current) => {
      const page = this.page();
      if (!page) {
        return current;
      }

      const match = page.discoveryEntities.find((item) => item.slug === slug);
      if (!match) {
        return current;
      }

      return current.includes(match.id) ? current : [...current, match.id];
    });
    this.selectEntity(slug);
  }

  onRemoveEntity(entityId: string): void {
    const page = this.page();
    if (!page) {
      return;
    }

    const nextIds = this.visibleDiscoveryIds().filter((id) => id !== entityId);
    if (!nextIds.length) {
      return;
    }

    if (page.selectedEntity.id === entityId) {
      const nextEntity = page.discoveryEntities.find((item) => item.id === nextIds[0]);
      if (nextEntity) {
        this.selectEntity(nextEntity.slug);
      }
    }

    this.visibleDiscoveryIds.set(nextIds);
  }

  private loadPage(entity: string | null): void {
    this.loading.set(true);
    this.api.page(entity ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.page.set(page);
          this.visibleDiscoveryIds.update((current) => {
            const incomingIds = new Set(page.discoveryEntities.map((item) => item.id));
            const preserved = current.filter((id) => incomingIds.has(id));

            if (preserved.length > 1) {
              if (!preserved.includes(page.selectedEntity.id)) {
                return [page.selectedEntity.id, ...preserved.filter((id) => id !== page.selectedEntity.id)].slice(0, 5);
              }
              return preserved.slice(0, 5);
            }

            return this.buildInitialVisibleDiscoveryIds(page);
          });
          this.loading.set(false);
        },
        error: () => {
          this.page.set(null);
          this.visibleDiscoveryIds.set([]);
          this.loading.set(false);
        },
      });
  }
}
