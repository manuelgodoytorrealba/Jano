import { Router } from '@angular/router';

const DEFAULT_SEARCH_ROUTE = ['/entities', 'artwork'] as const;

export function navigateToAppSearch(router: Router, rawQuery: string): Promise<boolean> {
  const query = rawQuery.trim();

  return router.navigate([...DEFAULT_SEARCH_ROUTE], {
    queryParams: {
      q: query || null,
      page: 1,
      sort: query ? 'relevance' : null,
    },
  });
}
