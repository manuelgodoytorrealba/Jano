import { Router } from '@angular/router';

export function navigateToAppSearch(
  router: Router,
  rawQuery: string,
  options?: { type?: string | null },
): Promise<boolean> {
  const query = rawQuery.trim();

  return router.navigate(['/search'], {
    queryParams: {
      q: query || null,
      type: options?.type || null,
    },
  });
}
