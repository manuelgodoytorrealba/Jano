# Source Acquisition V2

## Root Cause
Wave 002 selected 134 Sources; only 36 were prepared (26.87%). The 98 access/preparation failures (73.13%) consisted of 80 HTTP 403, 16 HTTP 429 and 2 other downloads. Of the 36 prepared Sources, 24 were effective (66.67%). Total effectiveness was 17.91%. Six later extraction failures are a separate downstream issue, not acquisition failures.

## Existing Architecture
Before: discovery/manifest → Source → LibraryMaterial/Version → LibraryMaterialPreparationService.fetchUrl → HTML/text only, process-local cache, redirects rejected → preparation → frozen semantic/review pipeline.
After: acquisition-aware selection/probe → SourceAcquisition resolver and durable checkpoint → cached document or validated public download/alternative → original bytes by hash → existing LibraryMaterial/Version preparation → unchanged semantic/review pipeline. `source-batch-orchestrator.ts` now calls `acquireSource`; the acquisition-only benchmark stops the existing orchestrator before EXCERPT_ANALYSIS.

## Changes
- `backend/api/src/library/source-acquisition-policy.ts`
- `backend/api/src/library/source-acquisition.ts`
- `backend/api/src/library/source-acquisition.spec.ts`
- `backend/api/src/library/library-material-preparation.service.ts`
- `backend/api/scripts/source-acquisition-benchmark.ts`
- `backend/api/scripts/source-batch-orchestrator.ts`
- `docs/source-acquisition-v2.md`
- `docs/architecture/16-editorial-pipeline.md`: acquisition ownership clarification only.
- `artifacts/source-acquisition-v2-benchmark.json` and `artifacts/source-acquisition-v2-access-report.json`: measured results.

No schema changes, migrations, dependencies, model changes or deployment. No Wave 003 started.

## Source Access Profile
Atomic JSON records and immutable HTTP events live in `uploads/research/acquisition-v2`, inside the existing persistent uploads volume and behind the existing `/uploads/research` deny route. No duplicate database table and no use of semantic cache for acquisition data. Files preserve domain, attempts, successes, 403/429/other failures, selected/prepared/effective counts, last success/failure, response time, acquisition rate, knowledge yield and recommended strategy.
Per-domain leases coordinate workers sharing that filesystem. Requests have bounded timeouts; leases expire after 60 seconds following crashes. Multi-host deployment requires the same shared filesystem or a future coordinated store; this implementation does not claim distributed coordination across independent volumes. Profiles are derived by scanning the journal; archive/index only when measured size warrants it.
Unknown effectiveness is null, not zero or inferred from text length. `recordEffective` accepts the existing evidence assessment only after preparation. Historical Wave 002 effective flags were reused for the 36 cached documents. The four additional documents remain semantically unassessed.

## Acquisition Resolver
Order: existing READY Library version → cached acquired bytes → direct public representation → known official PDF → official API → official institutional alternative → manual Library path. Known alternatives come from an explicit source-selection manifest with provenance basis, or publisher-provided alternate PDF Link headers. No unrestricted automated search or guessed mirror is silently trusted.
An alternative keeps its own URL, title, publisher, Source and LibraryMaterial. Original research intent is retained in the acquisition checkpoint. Acquired bytes are stored by SHA-256; same bytes share storage. Existing versions with matching storage are reused under a PostgreSQL advisory transaction lock. PDF bytes are stored before the existing PDF/OCR preparator reads them.
Content routing uses MIME: HTML parser, PDF extraction, structured JSON, plain text; unsupported binaries require manual acquisition. JSON remains structured reference and is not converted to documentary paragraphs. PDF provenance includes retrieval time, requested/final URLs, publisher/title, MIME, byte hash and available page count.

## 403 Strategy
One observed 403 caches that endpoint for six hours and prevents HEAD/GET blind retries. After three blocked endpoints, a 15-minute domain budget pauses further direct requests. Alternatives are still eligible. Failure is operational, not a credibility judgment or permanent institutional blacklist.

## 429 Strategy
One concurrent HTTP transaction per domain across workers sharing the store. Honor numeric and HTTP-date Retry-After, exponential backoff and jitter. Persist domain cooldown. Resolver permits at most three acquisition attempts and at most five seconds per wait; a longer cooldown ends that source attempt as RATE_LIMITED_EXHAUSTED so the next source can proceed. It never truncates Retry-After into an early request. Transient failures have short cache/cooldown.

## Source Scoring
Quality ×4 + relevance ×3 + historical yield ×20 + access probability ×20 + document-density bonus + diversity − block/rate-limit/low-yield penalties. Unknown historical yield uses a neutral prior. Documentary/relevance minima and the existing selected research intent prevent low-quality accessibility from winning. Default domain selection budget is 20% of requested size, minimum two; diversity is recomputed as sources are selected.
Filters reject explicit low-value classes, shops, search/calendar paths, images, tax/irrelevant annual reports and low documentary/relevance inputs unless explicitly requested for provenance. Probes are HEAD-only, DNS-validated, bounded and cached; they do not invoke semantics. HTML application shells are rejected before documentary availability is counted.
URL normalization removes fragments/tracking and normalizes URL syntax. Locale, query multiplicity, HTTP/HTTPS and trailing slash are preserved unless observed publisher redirects or explicit verified equivalences establish identity. This deliberately avoids merging genuinely different documents. Redirect destinations are validated and actual public DNS answers are pinned for connection/TLS.

## Alternative Resolution
Three official alternatives were examined; two yielded usable documentary text:
- Benin research need → [Met Bulletin, May 1969](https://resources.metmuseum.org/resources/metpublications/pdf/The_Metropolitan_Museum_of_Art_Bulletin_v_27_no_9_May_1969.pdf). Documentary PDF; narrower historical/artistic scope, not a substitute attribution for the original restitution discussion.
- Roman copies of Greek art → [Getty provenance essay](https://www.getty.edu/news/connecting-the-provenance-of-antiquities-collections/). Distinct institutional essay with directly relevant discussion.
- Ancient Greek introduction → Getty catalogue URL redirected to a JavaScript application shell. Rejected as documentary material despite HTTP success. No browser automation or bypass attempted.

## Benchmark
Same 134 selected URLs; completed semantic processing was not rerun. Existing READY content was read from the database. New bytes were extracted only in the private benchmark cache, without creating Sources, Materials, Versions, Evidence or proposals.

| Metric | Old | V2 |
|---|---:|---:|
| Accessible/available material | 36 | 40 |
| Prepared-capable | 36 | 40 |
| Acquisition success | 26.87% | 29.85% |
| Alternatives found | — | 3 |
| Alternatives usable | — | 2 |
| Blocked/manual remaining | 80 | 78 |
| Rate-limited remaining | 16 | 16 |
| Other download failures | 2 | 0 |

Improvement: four additional preparable documents, +2.99 percentage points (+11.11% relative). Of the new material, two documents are PDFs and two are HTML. The rejected shell is excluded. This is not evidence of increased semantic knowledge yield. The access comparison includes reusable material; it is not a fresh 134-URL availability census. Original HTTP request-attempt count was not recorded, so no invented request-reduction percentage is reported.

V2 performed 63 HTTP transactions including probes, redirects and finite retries. Checkpoint resume left that count at 63 and all database counts unchanged. The block budget avoided requesting many different endpoints after demonstrated domain failure.

### Domain report
Prepared counts below attribute alternatives to the original selected research-source domain; the JSON retains the actual publisher URL separately. Cached documents do not imply successful fresh requests.

| Domain | Selected | Prepared | Effective known | HTTP 403 | HTTP 429 |
|---|---:|---:|---:|---:|---:|
| americanart.si.edu | 1 | 1 | 1 | 0 | 0 |
| americanhistory.si.edu | 2 | 0 | 0 | 2 | 0 |
| asia.si.edu | 1 | 0 | 0 | 1 | 0 |
| blogs.getty.edu | 1 | 1 | 0 | 0 | 0 |
| collections.louvre.fr | 2 | 2 | 0 | 0 | 0 |
| folklife.si.edu | 1 | 0 | 0 | 1 | 0 |
| guernica.museoreinasofia.es | 1 | 1 | 1 | 0 | 0 |
| musee.louvre.fr | 3 | 3 | 3 | 0 | 0 |
| nmaahc.si.edu | 1 | 0 | 0 | 1 | 0 |
| plato.stanford.edu | 8 | 8 | 0 | 0 | 0 |
| resources.metmuseum.org | 0 | 0 | 0 | 0 | 0 |
| smarthistory.org | 68 | 2 | 0 | 3 | 0 |
| warburg.sas.ac.uk | 3 | 0 | 0 | 3 | 0 |
| whitney.org | 2 | 2 | 2 | 0 | 0 |
| www.aaa.si.edu | 2 | 0 | 0 | 2 | 0 |
| www.blackmountaincollege.org | 7 | 7 | 5 | 0 | 0 |
| www.getty.edu | 3 | 3 | 3 | 0 | 0 |
| www.louvre.fr | 1 | 1 | 1 | 0 | 0 |
| www.metmuseum.org | 16 | 0 | 0 | 0 | 33 |
| www.poetryfoundation.org | 1 | 0 | 0 | 1 | 0 |
| www.si.edu | 1 | 0 | 0 | 1 | 0 |
| www.tate.org.uk | 1 | 1 | 1 | 0 | 0 |
| www.walkerart.org | 8 | 8 | 7 | 0 | 0 |

Rankings, content types, quality classes, strategies and failure breakdowns are in `artifacts/source-acquisition-v2-access-report.json`. Access and yield rankings disclose cached/history effects and sample sizes.

## Safety
CANONICAL_ENTITIES_MUTATED: 0; CANONICAL_RELATIONS_MUTATED: 0; CANONICAL_ASSERTIONS_MUTATED: 0. Benchmark Evidence/proposals/materials/versions unchanged. No automatic editorial apply.
SEMANTIC_EVIDENCE_V3_CHANGED: NO; TARGET_ROUTER_CHANGED: NO; IDENTITY_RESOLUTION_CHANGED: NO; RELATION_MAPPING_V2_CHANGED: NO; assertion boundary, editorial rules and human gates unchanged.
All downloads use ordinary public HTTP requests. No cookies/authentication harvesting, browser spoofing, CAPTCHA bypass, proxies or anti-bot evasion. Redirects and DNS are validated; responses are bounded to 20 MiB; PDFs remain in private storage. Larger publications require the manual/library path.

## Tests
47 tests passed across 13 acquisition/preparation, Library, Source/Citation, batch orchestration, ownership, promotion and private-boundary suites. TypeScript typecheck passes. Fixtures cover 403, 429/date/seconds/cooldown/budget, HTML, PDF, JSON redirect, private redirects, URL duplicates, available/unavailable alternatives, timeout, 5xx, shared-domain concurrency, durable resume and JavaScript shell rejection.
Two additionally executed pre-existing assisted-proposal contract tests fail because they assert exact whitespace in Prisma schema text. Both schema and test are unchanged from HEAD; this is recorded as P2 and the frozen schema was not reformatted to satisfy unrelated assertions.

## Verdict
SOURCE_ACQUISITION_V2: READY
P0: 0
P1: 0

Implementation and non-canonical benchmark complete. No production deployment performed. Stop here; no next feed wave and no canonical apply.
