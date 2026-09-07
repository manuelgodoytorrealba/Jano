import { createHash, randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';
import {
  AcquisitionCandidate,
  AccessState,
  contentRoute,
  lowValueSource,
  normalizeSourceUrl,
  retryAfterMs,
  sourceScore,
} from './source-acquisition-policy';

const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const MAX_BYTES = 20 * 1024 * 1024;
export type AccessResult = {
  url: string;
  finalUrl: string;
  state: AccessState;
  status: number;
  mime: string;
  size?: number;
  retrievedAt: string;
  expiresAt: number;
  responseMs: number;
  error?: string;
  retryAt?: number;
  documentHash?: string;
  bodyPath?: string;
  alternatives: AcquisitionCandidate['alternatives'];
};
export type AcquisitionOutcome = {
  candidate: AcquisitionCandidate;
  terminal:
    | 'PREPARED'
    | 'BLOCKED'
    | 'RATE_LIMITED_EXHAUSTED'
    | 'ALTERNATIVE_USED'
    | 'MANUAL_ONLY'
    | 'LOW_VALUE'
    | 'FAILED';
  access?: AccessResult;
  alternative?: AcquisitionCandidate;
  prepared?: unknown;
  effective?: boolean;
  cached?: boolean;
  error?: string;
};
type Dependencies = {
  fetch?: typeof fetch;
  lookup?: typeof lookup;
  now?: () => number;
  random?: () => number;
};

// Public-address allow policy applies to every redirect, not just the initial hostname.
export function publicAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 168].includes(b)) ||
      (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0)
    );
  }
  // Only ordinary global IPv6 unicast; reject mapped IPv4, local, multicast and documentation ranges.
  return (
    isIP(ip) === 6 &&
    /^[23]/.test(ip) &&
    !ip.startsWith('2001:db8') &&
    !ip.startsWith('2001:0:') &&
    !ip.startsWith('2002:')
  );
}

export class SourceAcquisition {
  readonly root: string;
  private readonly fetcher?: typeof fetch;
  private readonly dns: typeof lookup;
  private readonly now: () => number;
  private readonly random: () => number;
  constructor(
    root = join(process.cwd(), 'uploads/research/acquisition-v2'),
    deps: Dependencies = {},
  ) {
    this.root = root;
    this.fetcher = deps.fetch;
    this.dns = deps.lookup ?? lookup;
    this.now = deps.now ?? Date.now;
    this.random = deps.random ?? Math.random;
    mkdirSync(root, { recursive: true, mode: 0o700 });
  }
  private path(key: string) {
    return join(this.root, hash(key) + '.json');
  }
  read<T>(key: string): T | undefined {
    try {
      return JSON.parse(readFileSync(this.path(key), 'utf8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw e;
    }
  }
  write(key: string, value: unknown) {
    const path = this.path(key),
      temp = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
    renameSync(temp, path);
  }
  private event(value: object) {
    this.write(`event:${randomUUID()}`, { event: true, ...value });
  }
  private lock(domain: string) {
    const path = join(this.root, hash(`lock:${domain}`) + '.lock');
    try {
      mkdirSync(path);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      // Each HTTP transaction has a 15s total timeout; expired leases survive process crashes.
      if (Date.now() - statSync(path).mtimeMs < 60_000) return null;
      try {
        rmSync(path, { recursive: true });
        mkdirSync(path);
      } catch {
        return null;
      }
    }
    return () => rmSync(path, { recursive: true, force: true });
  }
  private async validate(raw: string) {
    const u = new URL(normalizeSourceUrl(raw));
    const host = u.hostname.replace(/^\[|\]$/g, '');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const addresses = isIP(host)
      ? [{ address: host }]
      : await Promise.race([
          this.dns(host, { all: true }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('DNS timeout')), 15000);
          }),
        ]).finally(() => clearTimeout(timer));
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new Error('Private or reserved destination blocked');
    return { u, address: (addresses.find((a) => isIP(a.address) === 4) ?? addresses[0]).address };
  }
  async probe(raw: string) {
    return this.request(raw, false);
  }
  async download(raw: string) {
    return this.request(raw, true);
  }
  async request(raw: string, body: boolean): Promise<AccessResult> {
    const normalized = normalizeSourceUrl(raw);
    const alias = this.read<{ url: string }>(`equivalent:${normalized}`);
    const url = alias?.url ?? normalized,
      cacheKey = `${body ? 'download' : 'probe'}:${url}`;
    const cached = this.read<AccessResult>(cacheKey);
    if (
      cached &&
      cached.expiresAt > this.now() &&
      (!body || !cached.bodyPath || existsSync(cached.bodyPath))
    )
      return cached;
    // A cached block/cooldown from HEAD must also stop GET, and vice versa.
    const other = this.read<AccessResult>(`${body ? 'probe' : 'download'}:${url}`);
    if (
      other &&
      other.expiresAt > this.now() &&
      ([403, 429].includes(other.status) || other.status >= 500 || !!other.error)
    )
      return other;
    const started = this.now();
    let current = url;
    const permanentAliases: string[] = [];
    let out: AccessResult = {
      url,
      finalUrl: url,
      state: 'UNKNOWN',
      status: 0,
      mime: '',
      retrievedAt: new Date(started).toISOString(),
      expiresAt: started + 60_000,
      responseMs: 0,
      alternatives: [],
    };
    const signal = AbortSignal.timeout(15_000);
    try {
      for (let redirect = 0; redirect <= 5; redirect++) {
        const { u, address } = await this.validate(current),
          domain = u.hostname;
        const unavailable = this.read<{ until: number }>(`unavailable:${domain}`);
        if (unavailable && unavailable.until > this.now())
          return {
            ...out,
            state: 'TEMPORARILY_UNAVAILABLE',
            error: 'DOMAIN_TRANSIENT_COOLDOWN',
            expiresAt: unavailable.until,
          };
        const blocked = this.read<{ count: number; until: number }>(`block:${domain}`);
        if (blocked && blocked.count >= 3 && blocked.until > this.now())
          return {
            ...out,
            state: 'BLOCKED_HTML',
            error: 'DOMAIN_BLOCK_BUDGET',
            expiresAt: blocked.until,
          };
        const cooldown = this.read<{ until: number }>(`cooldown:${domain}`);
        if (cooldown && cooldown.until > this.now()) {
          return {
            ...out,
            state: 'RATE_LIMITED',
            retryAt: cooldown.until,
            error: 'DOMAIN_COOLDOWN',
            expiresAt: cooldown.until,
          };
        }
        const release = this.lock(domain);
        if (!release)
          return {
            ...out,
            state: 'TEMPORARILY_UNAVAILABLE',
            error: 'DOMAIN_BUSY',
            retryAt: this.now() + 1000,
          };
        try {
          // Check again after acquiring the shared domain lease.
          const afterLock = this.read<{ until: number }>(`cooldown:${domain}`);
          if (afterLock && afterLock.until > this.now())
            return {
              ...out,
              state: 'RATE_LIMITED',
              retryAt: afterLock.until,
              expiresAt: afterLock.until,
            };
          const init = {
            method: body ? 'GET' : 'HEAD',
            redirect: 'manual' as const,
            signal,
            headers: { Accept: 'text/html,application/pdf,application/json,text/plain;q=0.9' },
          };
          const requestStarted = this.now();
          const response = this.fetcher
            ? await this.fetcher(current, init)
            : await pinnedRequest(u, address, init);
          out = {
            ...out,
            finalUrl: current,
            status: response.status,
            mime: response.headers.get('content-type') ?? '',
            size: response.headers.has('content-length')
              ? Number(response.headers.get('content-length'))
              : undefined,
            responseMs: this.now() - requestStarted,
          };
          this.event({
            domain,
            status: response.status,
            responseMs: out.responseMs,
            at: out.retrievedAt,
          });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('location');
            await response.body?.cancel();
            if (!location || redirect === 5) throw new Error('Invalid or excessive redirects');
            if ([301, 308].includes(response.status)) permanentAliases.push(current);
            current = new URL(location, current).toString();
            continue;
          }
          if (response.status === 403) {
            out.state = 'BLOCKED_HTML';
            out.expiresAt = this.now() + 6 * 3600_000;
            this.write(`block:${domain}`, {
              count: (blocked && blocked.until > this.now() ? blocked.count : 0) + 1,
              until: this.now() + 15 * 60_000,
            });
          } else if (response.status === 429) {
            const tries = this.read<{ count: number }>(`rate:${url}`)?.count ?? 0;
            const until =
              this.now() +
              retryAfterMs(response.headers.get('retry-after'), this.now(), tries, this.random());
            this.write(`rate:${url}`, { count: tries + 1 });
            this.write(`cooldown:${domain}`, { until });
            out.state = 'RATE_LIMITED';
            out.retryAt = until;
            out.expiresAt = until;
          } else if (!response.ok) {
            out.state = 'TEMPORARILY_UNAVAILABLE';
            out.expiresAt = this.now() + 60_000;
          } else {
            const route = contentRoute(out.mime);
            out.state =
              route === 'PDF'
                ? 'ACCESSIBLE_PDF'
                : route === 'JSON'
                  ? 'ACCESSIBLE_API'
                  : ['HTML', 'TEXT'].includes(route)
                    ? 'ACCESSIBLE_HTML'
                    : 'MANUAL_ONLY';
            out.expiresAt = this.now() + 24 * 3600_000;
            if (body && route !== 'UNSUPPORTED') {
              if ((out.size ?? 0) > MAX_BYTES) throw new Error('Document exceeds 20 MB');
              const chunks: Buffer[] = [];
              let length = 0;
              const reader = response.body?.getReader();
              if (reader)
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  length += value.length;
                  if (length > MAX_BYTES) {
                    await reader.cancel();
                    throw new Error('Document exceeds 20 MB');
                  }
                  chunks.push(Buffer.from(value));
                }
              const bytes = Buffer.concat(chunks);
              validateDownloadedDocument(bytes, out.mime);
              if (route === 'PDF' && !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')))
                throw new Error('Invalid PDF signature');
              if (
                route === 'HTML' &&
                /<title[^>]*>\s*(Just a moment|Access denied|Attention Required)|cf-chl-|captcha-container/i.test(
                  bytes.toString('utf8'),
                )
              )
                throw new Error('Access challenge: manual acquisition required');
              out.size = bytes.length;
              out.documentHash = hash(bytes);
              out.bodyPath = join(this.root, `${out.documentHash}.body`);
              if (!existsSync(out.bodyPath)) {
                try {
                  writeFileSync(out.bodyPath, bytes, { mode: 0o600, flag: 'wx' });
                } catch (error) {
                  if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                }
              }
            } else await response.body?.cancel();
            this.write(`rate:${url}`, { count: 0 });
            this.write(`block:${domain}`, { count: 0, until: 0 });
          }
          await response.body?.cancel().catch(() => undefined);
          // HEAD Link headers are explicit publisher-provided alternatives; no speculative URL rewriting.
          const link = response.headers.get('link') ?? '';
          out.alternatives = [
            ...link.matchAll(/<([^>]+)>;\s*rel="?alternate"?;\s*type="application\/pdf"/gi),
          ]
            .map((m) => ({
              url: new URL(m[1], current).toString(),
              title: 'Official alternate PDF',
              publisher: domain,
              strategy: 'OFFICIAL_PDF' as const,
              basis: `HTTP Link header at ${current}`,
              documentaryQuality: 80,
              targetRelevance: 80,
            }))
            .filter((a) => new URL(a.url).hostname === domain);
          break;
        } finally {
          release();
        }
      }
    } catch (e) {
      out = {
        ...out,
        state: 'TEMPORARILY_UNAVAILABLE',
        error: (e as Error).message,
        expiresAt: this.now() + 60_000,
      };
      this.write(`unavailable:${new URL(current).hostname}`, { until: this.now() + 60_000 });
      this.event({
        domain: new URL(current).hostname,
        status: 0,
        responseMs: this.now() - started,
        at: out.retrievedAt,
      });
    }
    this.write(cacheKey, out);
    if (out.state.startsWith('ACCESSIBLE')) {
      this.write(`${body ? 'download' : 'probe'}:${normalizeSourceUrl(out.finalUrl)}`, out);
      for (const old of permanentAliases)
        this.write(`equivalent:${normalizeSourceUrl(old)}`, {
          url: normalizeSourceUrl(out.finalUrl),
          basis: 'Observed permanent public HTTP redirect',
          at: out.retrievedAt,
        });
    }
    return out;
  }
  body(result: AccessResult) {
    if (!result.bodyPath || !result.documentHash) throw new Error('No downloaded document');
    const bytes = readFileSync(result.bodyPath);
    if (hash(bytes) !== result.documentHash) throw new Error('Document cache hash mismatch');
    return bytes;
  }
  async resolve(
    candidate: AcquisitionCandidate,
    wave: string,
    prepare: (access: AccessResult, source: AcquisitionCandidate) => Promise<unknown>,
    cached?: () => Promise<unknown>,
  ) {
    const key = `outcome:${wave}:${normalizeSourceUrl(candidate.url)}`;
    const done = this.read<AcquisitionOutcome>(key);
    if (done) return done;
    let outcome: AcquisitionOutcome = { candidate, terminal: 'FAILED' };
    const ready = await cached?.();
    if (ready) outcome = { candidate, terminal: 'PREPARED', prepared: ready, cached: true };
    else if (lowValueSource(candidate)) outcome.terminal = 'LOW_VALUE';
    else {
      const probe = await this.probe(candidate.url);
      let original = await this.download(candidate.url);
      // Retry only after cooldown. A long Retry-After exhausts this worker's 5s wait budget; other domains continue.
      for (
        let attempt = 1;
        attempt < 3 && (original.state === 'RATE_LIMITED' || original.status >= 500);
        attempt++
      ) {
        const wait = (original.retryAt ?? original.expiresAt) - this.now();
        if (wait > 5000 || wait < 0) break;
        await new Promise((r) => setTimeout(r, wait + 1));
        original = await this.download(candidate.url);
      }
      const alternatives = [...(candidate.alternatives ?? []), ...(probe.alternatives ?? [])]
        .filter(
          (a) =>
            a.basis.trim() &&
            a.documentaryQuality >= Math.max(60, candidate.documentaryQuality - 10) &&
            a.targetRelevance >= 50,
        )
        .sort(
          (a, b) =>
            ['OFFICIAL_PDF', 'OFFICIAL_API', 'OFFICIAL_ALTERNATE'].indexOf(a.strategy) -
            ['OFFICIAL_PDF', 'OFFICIAL_API', 'OFFICIAL_ALTERNATE'].indexOf(b.strategy),
        );
      outcome.access = original;
      const paths = [
        { source: candidate, access: original },
        ...alternatives.map((a) => ({
          source: { ...candidate, ...a, alternatives: [] },
          access: undefined as AccessResult | undefined,
        })),
      ];
      for (const path of paths) {
        const access = path.access ?? (await this.download(path.source.url));
        if (!access.bodyPath || !access.state.startsWith('ACCESSIBLE')) continue;
        try {
          const prepared = await prepare(access, path.source);
          outcome = {
            candidate,
            terminal: path.source === candidate ? 'PREPARED' : 'ALTERNATIVE_USED',
            access,
            prepared,
            alternative: path.source === candidate ? undefined : path.source,
          };
          break;
        } catch (e) {
          outcome.error = (e as Error).message;
        }
      }
      if (!outcome.prepared)
        outcome.terminal =
          original.state === 'BLOCKED_HTML'
            ? 'MANUAL_ONLY'
            : original.state === 'RATE_LIMITED'
              ? 'RATE_LIMITED_EXHAUSTED'
              : 'FAILED';
    }
    this.write(key, outcome);
    return outcome;
  }
  recordEffective(wave: string, url: string, effective: boolean) {
    const key = `outcome:${wave}:${normalizeSourceUrl(url)}`,
      row = this.read<AcquisitionOutcome>(key);
    if (!row?.prepared)
      throw new Error(
        'Effectiveness requires prepared material and an external evidence assessment',
      );
    this.write(key, { ...row, effective });
  }
  profiles() {
    // ponytail: scan the small durable acquisition journal; index when measured volume warrants it.
    const records = readdirSync(this.root)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(this.root, f), 'utf8')));
    const domains: Record<string, any> = {};
    for (const row of records) {
      const domain = row.domain ?? (row.candidate ? new URL(row.candidate.url).hostname : null);
      if (!domain) continue;
      const d = (domains[domain] ??= {
        domain,
        attempts: 0,
        successes: 0,
        '403_count': 0,
        '429_count': 0,
        other_failures: 0,
        selected_count: 0,
        prepared_count: 0,
        effective_count: 0,
        assessed_count: 0,
        response_time_total: 0,
        last_success_at: null,
        last_failure_at: null,
      });
      if (row.event) {
        d.attempts++;
        d.response_time_total += row.responseMs;
        if (row.status >= 200 && row.status < 400) {
          d.successes++;
          d.last_success_at = [d.last_success_at, row.at].filter(Boolean).sort().at(-1);
        } else {
          d[
            row.status === 403 ? '403_count' : row.status === 429 ? '429_count' : 'other_failures'
          ]++;
          d.last_failure_at = [d.last_failure_at, row.at].filter(Boolean).sort().at(-1);
        }
      } else if (row.candidate) {
        d.selected_count++;
        if (row.prepared) d.prepared_count++;
        if (row.effective !== undefined) d.assessed_count++;
        if (row.effective) d.effective_count++;
      }
    }
    return Object.values(domains).map((d) => ({
      ...d,
      average_response_time: d.attempts ? d.response_time_total / d.attempts : null,
      acquisition_success_rate: d.selected_count ? d.prepared_count / d.selected_count : null,
      knowledge_yield_rate:
        d.assessed_count === d.prepared_count && d.prepared_count
          ? d.effective_count / d.prepared_count
          : null,
      assessed_knowledge_yield_rate: d.assessed_count ? d.effective_count / d.assessed_count : null,
      recommended_acquisition_strategy:
        d['403_count'] / d.attempts > 0.5
          ? 'OFFICIAL_ALTERNATIVE_OR_MANUAL'
          : d['429_count'] / d.attempts > 0.25
            ? 'COOLDOWN_AND_DIVERSIFY'
            : 'DIRECT_PUBLIC',
    }));
  }
  async select(
    candidates: AcquisitionCandidate[],
    count: number,
    domainBudget = Math.max(2, Math.ceil(count * 0.2)),
  ) {
    let duplicates = 0;
    const profiles = this.profiles(),
      selected: AcquisitionCandidate[] = [],
      seen = new Set<string>(),
      counts: Record<string, number> = {};
    const scored = [] as Array<{
      candidate: AcquisitionCandidate;
      score: number;
      probe: AccessResult;
    }>;
    for (const candidate of candidates) {
      const url = normalizeSourceUrl(candidate.url);
      if (seen.has(url)) {
        duplicates++;
        continue;
      }
      seen.add(url);
      if (lowValueSource(candidate)) continue;
      const access = await this.probe(url);
      const finalKey = normalizeSourceUrl(access.finalUrl);
      if (finalKey !== url && seen.has(finalKey)) {
        duplicates++;
        continue;
      }
      seen.add(finalKey);
      const probe = access,
        p = profiles.find((p) => p.domain === new URL(url).hostname);
      scored.push({
        candidate,
        probe,
        score: sourceScore(candidate, probe.state.startsWith('ACCESSIBLE') ? 1 : 0, {
          yield: p?.knowledge_yield_rate ?? 0.5,
          block: p?.['403_count'] / (p?.attempts || 1) || 0,
          rateLimit: p?.['429_count'] / (p?.attempts || 1) || 0,
        }),
      });
    }
    const remaining = [...scored];
    while (remaining.length && selected.length < count) {
      const diversity = (r: (typeof scored)[number]) =>
        15 / (1 + (counts[new URL(r.candidate.url).hostname] ?? 0));
      remaining.sort((a, b) => b.score + diversity(b) - a.score - diversity(a));
      const row = remaining.shift()!,
        domain = new URL(row.candidate.url).hostname;
      if ((counts[domain] ?? 0) >= domainBudget) continue;
      selected.push(row.candidate);
      counts[domain] = (counts[domain] ?? 0) + 1;
    }
    return { selected, scored, discovered: candidates.length, duplicates };
  }
}

/** Native request pins the validated DNS answer while preserving TLS hostname verification. */
function pinnedRequest(
  url: URL,
  address: string,
  init: { method: string; signal: AbortSignal; headers: Record<string, string> },
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        method: init.method,
        signal: init.signal,
        headers: init.headers,
        lookup: (_hostname, options, callback) => {
          const family = isIP(address);
          if (options.all) callback(null, [{ address, family }]);
          else callback(null, address, family);
        },
      },
      (response) => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers))
          if (value !== undefined)
            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        const encoding = response.headers['content-encoding'];
        const decoded =
          encoding === 'gzip'
            ? response.pipe(createGunzip())
            : encoding === 'deflate'
              ? response.pipe(createInflate())
              : encoding === 'br'
                ? response.pipe(createBrotliDecompress())
                : response;
        if (decoded !== response) {
          headers.delete('content-encoding');
          headers.delete('content-length');
        }
        const empty = init.method === 'HEAD' || [204, 205, 304].includes(response.statusCode ?? 0);
        if (empty) response.resume();
        resolve(
          new Response(empty ? null : (Readable.toWeb(decoded) as ReadableStream<Uint8Array>), {
            status: response.statusCode,
            headers,
          }),
        );
      },
    );
    request.on('error', reject);
    request.end();
  });
}

/** Unknown semantic yield remains null: readable material is not effective Evidence. */
export function acquisitionMetrics(
  rows: AcquisitionOutcome[],
  discovered = rows.length,
  duplicates = 0,
) {
  const n = (f: (r: AcquisitionOutcome) => boolean) => rows.filter(f).length;
  const prepared = n((r) => !!r.prepared),
    assessed = n((r) => r.effective !== undefined),
    effective = n((r) => r.effective === true);
  const selected = rows.length;
  const by = (key: (r: AcquisitionOutcome) => string) => {
    const groups: Record<string, { selected: number; prepared: number; effectiveKnown: number }> =
      {};
    for (const row of rows) {
      const g = (groups[key(row)] ??= { selected: 0, prepared: 0, effectiveKnown: 0 });
      g.selected++;
      if (row.prepared) g.prepared++;
      if (row.effective) g.effectiveKnown++;
    }
    return groups;
  };
  return {
    SOURCE_DISCOVERED: discovered,
    SOURCE_SELECTED: selected,
    SOURCE_ACCESSIBLE: n((r) => !!r.cached || !!r.access?.state.startsWith('ACCESSIBLE')),
    SOURCE_DOWNLOADED: n((r) => !!r.access?.bodyPath),
    SOURCE_PREPARED: prepared,
    SOURCE_EFFECTIVE: assessed === prepared ? effective : null,
    SOURCE_EFFECTIVE_KNOWN: effective,
    SOURCE_ACCESS_FAILED: n((r) =>
      ['FAILED', 'MANUAL_ONLY', 'BLOCKED', 'RATE_LIMITED_EXHAUSTED'].includes(r.terminal),
    ),
    SOURCE_RATE_LIMITED: n((r) => r.terminal === 'RATE_LIMITED_EXHAUSTED'),
    SOURCE_BLOCKED: n((r) => ['BLOCKED', 'MANUAL_ONLY'].includes(r.terminal)),
    SOURCE_LOW_YIELD: n((r) => r.effective === false || !!r.error?.includes('LOW_YIELD')),
    SOURCE_DUPLICATE: duplicates,
    SOURCE_ALTERNATIVE_FOUND: n(
      (r) => !!r.candidate.alternatives?.length || !!r.access?.alternatives?.length,
    ),
    SOURCE_ALTERNATIVE_USED: n((r) => r.terminal === 'ALTERNATIVE_USED'),
    ACQUISITION_SUCCESS_RATE: selected ? prepared / selected : null,
    KNOWLEDGE_YIELD_RATE: prepared && assessed === prepared ? effective / prepared : null,
    TOTAL_EFFECTIVENESS_RATE: selected && assessed === prepared ? effective / selected : null,
    byDomain: by((r) => new URL(r.candidate.url).hostname),
    byContentType: by((r) => r.access?.mime || (r.cached ? 'CACHED_DOCUMENT' : 'UNKNOWN')),
    byStrategy: by((r) =>
      r.cached ? 'CACHED_DOCUMENT' : r.alternative ? 'OFFICIAL_ALTERNATIVE' : 'DIRECT_PUBLIC',
    ),
    byFailureClass: by((r) => r.terminal),
    byQualityClass: by((r) => r.candidate.qualityClass),
  };
}

/** Reject transport-success application shells before counting documentary availability. */
export function validateDownloadedDocument(bytes: Buffer, mime: string) {
  if (contentRoute(mime) !== 'HTML') return;
  const html = bytes.toString('utf8');
  const visible = html
    .replace(/<(head|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    visible.length < 500 &&
    /app__preload|without JavaScript enabled|enable JavaScript/i.test(html)
  )
    throw new Error('LOW_YIELD: JavaScript application shell, not documentary text');
}
