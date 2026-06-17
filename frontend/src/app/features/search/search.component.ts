import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
} from 'rxjs';
import { SearchApi, SearchDeck, SearchResult, SearchSection } from '../../core/api/search.api';
import { SeoService } from '../../core/seo/seo.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';

type SearchType = '' | 'ARTWORK' | 'ARTIST' | 'ARTICLE' | 'CONCEPT' | 'MOVEMENT' | 'PERIOD' | 'PLACE' | 'TEXT';

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [AsyncPipe, JanoMediaComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly api = inject(SearchApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  readonly i18n = inject(I18nService);
  readonly types: SearchType[] = ['', 'ARTIST', 'ARTWORK', 'MOVEMENT', 'CONCEPT', 'ARTICLE'];
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

  goDeck(deck: SearchDeck): void {
    this.router.navigate(['/entities'], { queryParams: { deck: deck.slug } });
  }

  displaySections(vm: { items: SearchResult[]; sections?: SearchSection[] }): SearchSection[] {
    return vm.sections?.length ? vm.sections : [{ key: 'main', title: this.sectionTitle('main'), items: vm.items }];
  }

  hasSectionContent(section: SearchSection): boolean {
    return !!section.items?.length || !!section.routes?.length || !!section.decks?.length;
  }

  typeLabel(type: SearchType | string): string {
    const labels: Record<string, string> = {
      '': this.i18n.t('search.type.all'),
      ARTIST: this.i18n.t('search.type.artists'),
      ARTWORK: this.i18n.t('search.type.artworks'),
      MOVEMENT: this.i18n.t('search.type.movements'),
      CONCEPT: this.i18n.t('search.type.concepts'),
      ARTICLE: this.i18n.t('search.type.articles'),
    };
    return labels[String(type)] ?? String(type).toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
  }


  sectionTitle(key: string, fallback = ''): string {
    return this.i18n.t('search.section.' + key) || fallback;
  }

  relationLine(item: SearchResult): string {
    return item.relationWithTitle
      ? this.i18n.t('search.relatedLine').replace('{from}', item.title).replace('{to}', item.relationWithTitle)
      : this.i18n.t('search.whyRelated');
  }

  cleanSummary(value: string | null | undefined): string {
    return (value ?? '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
  }
}
