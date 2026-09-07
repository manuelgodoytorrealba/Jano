import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SourceAcquisition,
  publicAddress,
  acquisitionMetrics,
  validateDownloadedDocument,
} from './source-acquisition';
import {
  AcquisitionCandidate,
  contentRoute,
  normalizeSourceUrl,
  retryAfterMs,
  sourceScore,
} from './source-acquisition-policy';

const candidate: AcquisitionCandidate = {
  url: 'https://museum.example/essay',
  title: 'Research essay',
  documentaryQuality: 90,
  targetRelevance: 90,
  qualityClass: 'DOCUMENTARY',
};
describe('Source Acquisition V2 boundaries', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'jano-acquisition-test-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  const dns = jest.fn(async () => [{ address: '93.184.216.34', family: 4 }]);
  function setup(responses: Response[], now = () => Date.now()) {
    const fetch = jest.fn(async () => {
      const r = responses.shift();
      if (!r) throw new Error('Unexpected extra request');
      return r;
    });
    return {
      a: new SourceAcquisition(root, {
        fetch: fetch as never,
        lookup: dns as never,
        now,
        random: () => 0,
      }),
      fetch,
    };
  }
  it('403 is durable across HEAD, GET and process recreation, with no blind retry', async () => {
    const { a, fetch } = setup([new Response(null, { status: 403 })]);
    expect((await a.probe(candidate.url)).state).toBe('BLOCKED_HTML');
    expect((await a.download(candidate.url)).status).toBe(403);
    const resumed = new SourceAcquisition(root, { fetch: fetch as never, lookup: dns as never });
    expect((await resumed.probe(candidate.url)).status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('honors Retry-After date/seconds without blocking another domain', async () => {
    const now = Date.now();
    const { a, fetch } = setup(
      [
        new Response(null, { status: 429, headers: { 'retry-after': '120' } }),
        new Response(null, { status: 200, headers: { 'content-type': 'text/html' } }),
      ],
      () => now,
    );
    const first = await a.probe(candidate.url);
    expect(first.retryAt).toBe(now + 120000);
    expect((await a.probe('https://museum.example/other')).state).toBe('RATE_LIMITED');
    expect((await a.probe('https://university.example/paper')).state).toBe('ACCESSIBLE_HTML');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(retryAfterMs(new Date(now + 120000).toUTCString(), now, 0, 0)).toBeGreaterThan(118000);
  });
  it('downloads HTML once and resumes a successful acquisition without callbacks', async () => {
    const { a, fetch } = setup([
      new Response(null, { headers: { 'content-type': 'text/html' } }),
      new Response('<article>Documentary essay</article>', {
        headers: { 'content-type': 'text/html' },
      }),
    ]);
    const prepare = jest.fn(async () => ({ versionId: 'private-v1' }));
    expect((await a.resolve(candidate, 'wave', prepare)).terminal).toBe('PREPARED');
    expect((await a.resolve(candidate, 'wave', prepare)).terminal).toBe('PREPARED');
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('uses a distinct official alternative with independent source provenance', async () => {
    const { a } = setup([
      new Response(null, { status: 403 }),
      new Response('%PDF-1.4\nfixture', { headers: { 'content-type': 'application/pdf' } }),
    ]);
    const prepare = jest.fn(async (r, c) => ({ url: c.url, hash: r.documentHash }));
    const c = {
      ...candidate,
      alternatives: [
        {
          url: 'https://university.example/catalogue.pdf',
          title: 'Catalogue',
          publisher: 'University',
          strategy: 'OFFICIAL_PDF' as const,
          basis: 'Institutional publication catalogue',
          documentaryQuality: 95,
          targetRelevance: 95,
        },
      ],
    };
    const out = await a.resolve(c, 'wave', prepare);
    expect(out.terminal).toBe('ALTERNATIVE_USED');
    expect(out.alternative?.url).not.toBe(candidate.url);
    expect(prepare.mock.calls[0][1].url).toBe(c.alternatives[0].url);
  });
  it('keeps unavailable alternatives manual and never calls preparation', async () => {
    const { a } = setup([new Response(null, { status: 403 })]);
    const prepare = jest.fn();
    expect((await a.resolve(candidate, 'wave', prepare)).terminal).toBe('MANUAL_ONLY');
    expect(prepare).not.toHaveBeenCalled();
  });
  it('validates redirects and rejects a private destination before requesting it', async () => {
    const { a, fetch } = setup([
      new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } }),
    ]);
    expect((await a.probe(candidate.url)).error).toMatch(/Private/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('follows a public redirect and records its actual destination', async () => {
    const { a } = setup([
      new Response(null, { status: 301, headers: { location: '/new' } }),
      new Response(null, { headers: { 'content-type': 'application/json' } }),
    ]);
    const r = await a.probe(candidate.url);
    expect(r.finalUrl).toBe('https://museum.example/new');
    expect(r.state).toBe('ACCESSIBLE_API');
  });
  it('caches timeout and transient 5xx without hammering the endpoint', async () => {
    const { a, fetch } = setup([new Response(null, { status: 503 })]);
    expect((await a.probe(candidate.url)).state).toBe('TEMPORARILY_UNAVAILABLE');
    await a.probe(candidate.url);
    expect(fetch).toHaveBeenCalledTimes(1);
    const b = new SourceAcquisition(root, {
      fetch: jest.fn(async () => {
        throw new Error('timeout');
      }) as never,
      lookup: dns as never,
    });
    expect((await b.probe('https://other.example/slow')).error).toBe('timeout');
  });
  it('enforces a shared domain concurrency limit', async () => {
    let unblock!: () => void;
    const pending = new Promise<void>((r) => (unblock = r));
    const fetch = jest.fn(async () => {
      await pending;
      return new Response(null, { headers: { 'content-type': 'text/html' } });
    });
    const a = new SourceAcquisition(root, { fetch: fetch as never, lookup: dns as never });
    const first = a.probe(candidate.url);
    await new Promise((r) => setImmediate(r));
    const b = new SourceAcquisition(root, { fetch: fetch as never, lookup: dns as never });
    expect((await b.probe('https://museum.example/second')).error).toBe('DOMAIN_BUSY');
    unblock();
    await first;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('normalizes tracking without merging languages, schemes or meaningful query values', () => {
    expect(normalizeSourceUrl('https://museum.example/a?utm_source=x&id=2#part')).toBe(
      'https://museum.example/a?id=2',
    );
    expect(normalizeSourceUrl('https://museum.example/a?lang=fr')).not.toBe(
      normalizeSourceUrl('https://museum.example/a?lang=en'),
    );
    expect(contentRoute('application/pdf')).toBe('PDF');
    expect(contentRoute('application/octet-stream')).toBe('UNSUPPORTED');
    expect(publicAddress('::ffff:127.0.0.1')).toBe(false);
    expect(publicAddress('fe80::1')).toBe(false);
  });
  it('does not trade strong documentary quality for easy access', () => {
    expect(sourceScore(candidate, 0)).toBeGreaterThan(
      sourceScore({ ...candidate, documentaryQuality: 60, targetRelevance: 60 }, 1),
    );
  });
  it('bounds long Retry-After without preparation', async () => {
    const { a, fetch } = setup([
      new Response(null, { status: 429, headers: { 'retry-after': '3600' } }),
    ]);
    const prepare = jest.fn();
    expect((await a.resolve(candidate, 'budget', prepare)).terminal).toBe('RATE_LIMITED_EXHAUSTED');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(prepare).not.toHaveBeenCalled();
  });
  it('limits repeated blocks across different endpoints of a domain', async () => {
    const { a, fetch } = setup(
      Array.from({ length: 3 }, () => new Response(null, { status: 403 })),
    );
    for (let i = 0; i < 3; i++) await a.probe(`https://museum.example/${i}`);
    expect((await a.probe('https://museum.example/fourth')).error).toBe('DOMAIN_BLOCK_BUDGET');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('separates unassessed preparation from effective knowledge', () => {
    const m = acquisitionMetrics([
      { candidate, terminal: 'PREPARED', prepared: { versionId: 'v1' }, cached: true },
    ]);
    expect(m.SOURCE_PREPARED).toBe(1);
    expect(m.KNOWLEDGE_YIELD_RATE).toBeNull();
    expect(m.SOURCE_EFFECTIVE).toBeNull();
  });
  it('deduplicates tracking variants and applies domain selection budgets', async () => {
    const { a } = setup(
      Array.from(
        { length: 3 },
        () => new Response(null, { headers: { 'content-type': 'text/html' } }),
      ),
    );
    const c = [
      candidate,
      { ...candidate, url: candidate.url + '?utm_source=x' },
      { ...candidate, url: 'https://museum.example/second' },
      { ...candidate, url: 'https://university.example/paper' },
    ];
    const selection = await a.select(c, 3, 1);
    expect(selection.duplicates).toBe(1);
    expect(selection.selected).toHaveLength(2);
  });
  it('folds slash/scheme variants only with verified publisher equivalence', () => {
    const equivalents = { 'http://museum.example/essay/': 'https://museum.example/essay' };
    expect(normalizeSourceUrl('http://museum.example/essay/', equivalents)).toBe(candidate.url);
    expect(normalizeSourceUrl('https://museum.example/fr/essay')).not.toBe(candidate.url);
  });
  it('rejects JavaScript publication shells instead of counting them as PDF or documentary HTML', () => {
    expect(() =>
      validateDownloadedDocument(
        Buffer.from(
          '<html><body><noscript>Please enable JavaScript</noscript><div id="app__preload"></div></body></html>',
        ),
        'text/html',
      ),
    ).toThrow('LOW_YIELD');
  });
});
