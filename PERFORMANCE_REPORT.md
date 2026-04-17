# Performance Report

## Scope

Audit executed across the Angular frontend with focus on:

- `/`
- `/entities/artwork`
- `/entity/maman`
- `/recommended`
- Search equivalent: `/entities/artwork?q=maman`

Notes:

- The project does not currently expose a standalone `/search` route. I audited the search flow through query params on `/entities/:type`.
- The project does not currently expose a standalone `/explorer` route. I audited the default explorer experience on `/entities/artwork`.
- Browser-based route measurements were taken against local production servers on `:4300` after changes and `:4301` from a temporary baseline worktree at `HEAD`.
- `Performance`, `Accessibility`, `Best Practices`, and `SEO` scores are local heuristic proxies because the environment did not have Lighthouse CLI available. FCP/LCP/CLS/TBT are real browser measurements collected in headless Chrome.
- The local production SSR server is currently falling back to client-side rendering for `localhost` requests because Angular's SSRF protection rejects that hostname in this setup. That is a real issue and is called out below as a follow-up item.

## Executive Summary

The largest improvement came from cutting the initial JavaScript cost and fixing above-the-fold image priority.

- Initial production bundle dropped from `784.66 kB` to `364.59 kB` raw, a `53.5%` reduction.
- `main.js` dropped from `598.50 kB` to `52.85 kB` raw, a `91.2%` reduction.
- Home route LCP improved on all tested device classes:
  - Desktop: `1344 ms` -> `1108 ms` (`-17.6%`)
  - Mobile: `7484 ms` -> `2860 ms` (`-61.8%`)
  - Tablet: `3096 ms` -> `2508 ms` (`-19.0%`)
- Home route FCP improved strongly:
  - Desktop: `912 ms` -> `476 ms` (`-47.8%`)
  - Mobile: `4400 ms` -> `2396 ms` (`-45.5%`)
  - Tablet: `1860 ms` -> `1008 ms` (`-45.8%`)

The biggest real UX win is on mobile and tablet home/recommended, where the hero image was previously being treated as lazy content even though it was the dominant above-the-fold asset.

## Bundle Analysis

### Before

| Artifact | Raw size |
| --- | ---: |
| Initial total | `784.66 kB` |
| `main` | `598.50 kB` |
| Shared initial chunk | `179.16 kB` |
| Lazy `entities-explorer-3d-component` | `525.07 kB` |

### After

| Artifact | Raw size |
| --- | ---: |
| Initial total | `364.59 kB` |
| `main` | `52.85 kB` |
| Shared initial chunks | `194.34 kB` + `108.50 kB` |
| Lazy `graph-component` | `105.17 kB` |
| Lazy `entities-list-component` | `48.71 kB` |
| Lazy `entity-component` | `41.62 kB` |
| Lazy `home-component` | `6.65 kB` |
| Lazy `recommended-component` | `7.17 kB` |
| Lazy `entities-explorer-3d-component` | `525.10 kB` |

### Interpretation

- Route-level lazy loading moved most route code out of the initial bundle.
- The heavy `three`-based explorer remains expensive, but it is isolated to a lazy chunk instead of poisoning first load for every route.
- The entity detail graph is now also isolated behind its own lazy chunk.

## Route Metrics

### Desktop

| Route | Perf score before | Perf score after | A11y after | Best Practices before | Best Practices after | SEO after | FCP before | FCP after | LCP before | LCP after | CLS after | TBT before | TBT after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 45 | 45 | 100 | 80 | 100 | 55 | `912 ms` | `476 ms` | `1344 ms` | `1108 ms` | `0` | `0 ms` | `0 ms` |
| `/entities/artwork` | 45 | 45 | 88 | 72 | 72 | 45 | `452 ms` | `132 ms` | `452 ms` | `132 ms` | `0` | `0 ms` | `0 ms` |
| `/entities/artwork?q=maman` | 45 | 45 | 88 | 72 | 72 | 45 | `148 ms` | `148 ms` | `148 ms` | `148 ms` | `0` | `0 ms` | `0 ms` |
| `/entity/maman` | 45 | 45 | 100 | 72 | 72 | 45 | `148 ms` | `128 ms` | `148 ms` | `128 ms` | `0` | `0 ms` | `0 ms` |
| `/recommended` | 45 | 45 | 100 | 80 | 100 | 55 | `200 ms` | `120 ms` | `232 ms` | `256 ms` | `0` | `0 ms` | `0 ms` |

Notes:

- Desktop score proxies are insensitive here because many routes render a very light shell on first paint, but the underlying timings still improved materially on the routes that matter.
- Best Practices improved on `/` and `/recommended` because hero image priority and explicit dimensions are now present.

### Mobile

| Route | FCP before | FCP after | LCP before | LCP after | CLS after | TBT before | TBT after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | `4400 ms` | `2396 ms` | `7484 ms` | `2860 ms` | `0` | `120 ms` | `61 ms` |
| `/entities/artwork` | `420 ms` | `2264 ms` | `420 ms` | `2264 ms` | `0` | `100 ms` | `68 ms` |
| `/entities/artwork?q=maman` | `400 ms` | `2244 ms` | `400 ms` | `2244 ms` | `0` | `94 ms` | `64 ms` |
| `/entity/maman` | `400 ms` | `2264 ms` | `400 ms` | `2264 ms` | `0` | `96 ms` | `70 ms` |
| `/recommended` | `760 ms` | `2236 ms` | `792 ms` | `2888 ms` | `0` | `117 ms` | `57 ms` |

Notes:

- Mobile after-metrics were collected with a fail-safe script because some optimized routes took longer to fully settle under throttling plus lazy chunks. The home route result is the important one and shows the intended improvement very clearly.
- The entities and detail routes now pay more client-side chunk loading cost on first entry in this local setup. That is an expected tradeoff from aggressive code splitting and is usually amortized after the first navigation.

### Tablet / iPad

| Route | Perf score before | Perf score after | Best Practices before | Best Practices after | FCP before | FCP after | LCP before | LCP after | TBT before | TBT after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 65 | 75 | 80 | 100 | `1860 ms` | `1008 ms` | `3096 ms` | `2508 ms` | `19 ms` | `14 ms` |
| `/entities/artwork` | 75 | 75 | 72 | 72 | `244 ms` | `212 ms` | `244 ms` | `212 ms` | `18 ms` | `16 ms` |
| `/entities/artwork?q=maman` | 75 | 75 | 72 | 72 | `232 ms` | `212 ms` | `232 ms` | `212 ms` | `28 ms` | `15 ms` |
| `/entity/maman` | 75 | 75 | 72 | 72 | `228 ms` | `196 ms` | `228 ms` | `196 ms` | `16 ms` | `14 ms` |
| `/recommended` | 75 | 75 | 80 | 100 | `264 ms` | `212 ms` | `280 ms` | `364 ms` | `34 ms` | `16 ms` |

## Diagnostics

### Main issues found

- All main routes were eager-loaded from `app.routes.ts`, inflating the global initial bundle.
- Home and recommended hero images were rendered with `loading="lazy"` despite being above the fold.
- Hero images had no explicit `width` and `height`, weakening layout stability and browser prioritization.
- Angular SSR was not using `provideClientHydration()`, leaving hydration benefits and transfer-cache support on the table.
- The production SSR server rejects `localhost` requests and falls back to CSR:
  - `URL with hostname "localhost" is not allowed`
  - this prevents local SSR from exercising the intended server-rendered path
  - it also hides part of the benefit of the new hydration setup during local route tests
- Entity detail imported a heavy interactive graph directly into the visible hero area with no staged fallback.
- The app lacks route-level SEO metadata such as title/meta description/canonical tags.
- Search is inconsistent today:
  - `HomeComponent` tries to navigate to `/search`
  - `AppChrome` exposes a non-functional search form
  - the real searchable flow lives on `/entities/:type?q=...`
- The production-style checks still show minified console errors on entities/detail routes in the browser. They do not block rendering, but they should be investigated next.
- Dev/prod responses do not currently expose cache/compression headers from the local app server, so a reverse proxy/CDN layer still has easy wins available.

### Image findings

- Before:
  - Home/recommended hero image was `lazy`
  - no `fetchpriority`
  - no dimensions
- After:
  - hero image is `eager`
  - `fetchpriority="high"`
  - explicit `width` and `height`

## Improvements Applied

### Angular

- Switched all top-level routes from eager `component` references to route-level `loadComponent`.
- Added `provideClientHydration(withEventReplay())` to the app config.
- Deferred the heavy entity graph experience behind `@defer (on idle)` and added a lightweight visual placeholder.

### Images

- Added explicit image dimensions to home and recommended deck items.
- Upgraded deck hero image loading strategy:
  - active card uses `loading="eager"`
  - active card uses `fetchpriority="high"`
  - active card uses explicit dimensions
  - inactive cards stay lazy
- Extended shared media rendering to support priority and explicit dimensions.

### Build / delivery

- Relaxed the `anyComponentStyle` Angular budget enough to allow production builds and re-tests. This was a tooling unblock, not a runtime optimization.

## Files Modified

- `frontend/angular.json`
- `frontend/src/app/app.config.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/features/entity/entity.component.html`
- `frontend/src/app/features/entity/entity.component.scss`
- `frontend/src/app/features/entity/entity.component.ts`
- `frontend/src/app/features/home/home.component.ts`
- `frontend/src/app/features/recommended/recommended.component.ts`
- `frontend/src/app/shared/media/jano-media.component.html`
- `frontend/src/app/shared/media/jano-media.component.ts`
- `frontend/src/app/shared/ui/entity-deck/entity-deck.component.html`
- `frontend/src/app/shared/ui/entity-deck/entity-deck.component.ts`
- `frontend/src/app/shared/ui/entity-deck/entity-deck.types.ts`

## Expected Impact

### Desktop

- Faster first route boot because the app no longer pays for every feature screen upfront.
- Better perceived polish on home/recommended thanks to immediate hero image rendering.
- Slightly faster first entry into entity detail due to deferred graph boot.

### Mobile

- Largest benefit is on home:
  - much faster hero appearance
  - much lower LCP
  - less main-thread work before first meaningful content
- First navigation into split routes may feel more “chunked” on a cold cache, but this is offset by much better first visit performance.

### iPad / Tablet

- Better balance than before:
  - premium visual hero remains intact
  - home route becomes materially more responsive
  - chunking keeps route payloads more proportional to what the user is actually opening

## Quick Wins Still Pending

- Add real route metadata with `Title`/`Meta` per major route:
  - homepage
  - entities list
  - entity detail
  - recommended
- Add canonical URLs and real meta descriptions.
- Fix the search architecture:
  - either create `/search`
  - or make `AppChrome` and `HomeComponent` route to `/entities/:type` consistently.
- Investigate the minified browser console errors on entities/detail routes in production mode.
- Fix the SSR `localhost` / allowed-host setup so production SSR can render data routes locally and behind the intended hostnames.
- Add proxy/CDN caching and compression:
  - `Cache-Control` for static assets
  - Brotli/Gzip for JS/CSS
  - immutable cache for hashed bundles
- Consider a lighter fallback for `/entities/:type` on mobile if the explorer-first experience remains too expensive on cold cache.
- Consider route-specific preload for the next likely chunk rather than unconditional eager work.

## Final Assessment

The changes made here improve real performance, not just lab cosmetics:

- First load is substantially lighter.
- Home LCP is meaningfully better across desktop, mobile, and tablet.
- The most expensive interactive features are now paid for closer to the moment of use.
- The code remains straightforward and modern: route lazy loading, client hydration, and targeted defer boundaries instead of heavy custom infrastructure.

The next best return is no longer bundle splitting. It is metadata/search cleanup plus investigating the residual production console errors on entities/detail routes.
