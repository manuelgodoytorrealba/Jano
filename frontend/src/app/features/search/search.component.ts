import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { SearchApi, SearchResult } from '../../core/api/search.api';
import { SeoService } from '../../core/seo/seo.service';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type SearchType = '' | 'ARTWORK' | 'ARTIST' | 'ARTICLE' | 'CONCEPT' | 'MOVEMENT' | 'PERIOD' | 'PLACE' | 'TEXT';

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [AsyncPipe, FormsModule, JanoMediaComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly api = inject(SearchApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly queryInput$ = new Subject<string>();

  readonly types: SearchType[] = ['', 'ARTWORK', 'ARTIST', 'ARTICLE', 'CONCEPT', 'MOVEMENT', 'PERIOD', 'PLACE', 'TEXT'];
  searchInput = this.route.snapshot.queryParamMap.get('q') ?? '';

  readonly q$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('q') ?? '').trim()),
    distinctUntilChanged(),
  );

  readonly type$ = this.route.queryParamMap.pipe(
    map((params) => ((params.get('type') ?? '').toUpperCase() as SearchType)),
    map((type) => this.types.includes(type) ? type : ''),
    distinctUntilChanged(),
  );

  readonly tag$ = this.route.queryParamMap.pipe(
    map((params) => (params.get('tag') ?? '').trim()),
    distinctUntilChanged(),
  );

  readonly vm$ = combineLatest([this.q$, this.type$, this.tag$]).pipe(
    switchMap(([q, type, tag]) => {
      this.searchInput = q;
      this.seo.setPageMeta({
        title: q ? `Search "${q}" | JANO` : 'Search | JANO',
        description: q ? `Search JANO across artworks, artists, articles, movements, periods and concepts for "${q}".` : 'Search JANO.',
        path: q ? `/search?q=${encodeURIComponent(q)}` : '/search',
      });

      return this.api.search({
        q,
        type: type || undefined,
        tag: tag || undefined,
        limit: 40,
      });
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    this.queryInput$.pipe(
      debounceTime(260),
      distinctUntilChanged(),
      startWith(this.searchInput),
      takeUntilDestroyed(),
    ).subscribe((value) => {
      this.router.navigate(['/search'], {
        queryParams: {
          q: value.trim() || null,
          type: this.route.snapshot.queryParamMap.get('type') || null,
          tag: this.route.snapshot.queryParamMap.get('tag') || null,
        },
      });
    });
  }

  onSearchInput(value: string): void {
    this.searchInput = value;
    this.queryInput$.next(value);
  }

  setType(type: SearchType): void {
    this.router.navigate(['/search'], {
      queryParams: {
        q: this.searchInput.trim() || null,
        type: type || null,
        tag: this.route.snapshot.queryParamMap.get('tag') || null,
      },
    });
  }

  clearTag(): void {
    this.router.navigate(['/search'], {
      queryParams: {
        q: this.searchInput.trim() || null,
        type: this.route.snapshot.queryParamMap.get('type') || null,
        tag: null,
      },
    });
  }

  go(result: SearchResult): void {
    this.router.navigate(['/entity', result.slug]);
  }

  typeLabel(type: SearchType | string): string {
    return type ? String(type).toLowerCase().replace(/^\w/, (char) => char.toUpperCase()) : 'All';
  }

  cleanSummary(value: string | null | undefined): string {
    return (value ?? '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
  }
}
