import { Router } from '@angular/router';

export function navigateToAppSearch(router: Router, rawQuery: string): Promise<boolean> {
  const query = rawQuery.trim();

  return router.navigate(['/search'], {
    queryParams: {
      q: query || null,
    },
  });
}
