import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { PublicEntityListItem } from '../../core/api/entities.models';
import { ResearchApi, ResearchProjectSummary } from '../../core/api/research.api';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { EntitiesExplorer3dComponent } from '../entities-explorer-3d/entities-explorer-3d.component';
import { EntitiesListFilterRailVm, Sort } from '../entities/entities-list.facade';
import { EntitiesListFilterRailComponent } from '../entities/entities-list-filter-rail.component';

type ViewMode = 'explore' | 'list';

@Component({
  standalone: true,
  imports: [
    AsyncPipe,
    EntitiesExplorer3dComponent,
    EntitiesListFilterRailComponent,
    JanoMediaComponent,
  ],
  templateUrl: './research-publications.component.html',
  styleUrl: './research-publications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchPublicationsComponent {
  readonly publications$ = inject(ResearchApi)
    .listPublished()
    .pipe(
      map((publications) => publications.map((publication) => this.toExplorerItem(publication))),
    );
  readonly activeIndex = signal(0);
  readonly filtersOpen = signal(false);
  readonly infoOpen = signal(true);
  readonly query = signal('');
  readonly sort = signal<Sort>('recent');
  viewMode: ViewMode = 'explore';

  filtered(items: PublicEntityListItem[]): PublicEntityListItem[] {
    const query = this.query().trim().toLocaleLowerCase();
    const filtered = query
      ? items.filter((item) =>
          `${item.title} ${item.summary ?? ''}`.toLocaleLowerCase().includes(query),
        )
      : items;
    return [...filtered].sort((a, b) =>
      this.sort() === 'title'
        ? a.title.localeCompare(b.title)
        : (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
    );
  }

  filter(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  setSort(sort: Sort): void {
    if (sort === 'relevance') return;
    this.sort.set(sort);
    this.activeIndex.set(0);
  }

  setView(viewMode: ViewMode): void {
    this.viewMode = viewMode;
    if (viewMode === 'explore') this.infoOpen.set(true);
  }

  select(index: number): void {
    this.activeIndex.set(index);
    this.infoOpen.set(true);
    this.viewMode = 'explore';
  }

  filterRailVm(resultsTotal: number): EntitiesListFilterRailVm {
    return {
      searchQuery: this.query(),
      hasActiveFilters: !!this.query(),
      hasVisibleFilterChips: false,
      hasAdvancedFilters: false,
      activeFilterChips: [],
      selects: [],
      sort: this.sort(),
      canSortByRelevance: false,
      status: '',
      contentLevel: '',
      resultsTotal,
      page: 1,
      totalPages: 1,
    };
  }

  private toExplorerItem(publication: ResearchProjectSummary): PublicEntityListItem {
    const media = publication.coverImageUrl
      ? { url: publication.coverImageUrl, alt: publication.title, isPrimary: true }
      : null;
    return {
      id: publication.id,
      slug: publication.id,
      title: publication.title,
      type: 'RESEARCH',
      kind: 'WORK',
      summary: publication.objective,
      status: 'PUBLISHED',
      contentLevel: 'PUBLICATION',
      createdAt: publication.publishedAt ?? publication.updatedAt,
      resolvedMedia: media
        ? { explorer3d: media, card: media, primary: media, thumbnail: media }
        : null,
    };
  }
}
