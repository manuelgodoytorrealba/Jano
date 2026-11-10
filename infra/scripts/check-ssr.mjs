import assert from 'node:assert/strict';

const base = new URL(process.argv[2] || 'http://127.0.0.1:14200');
const isSsr = (html) => html.includes('ng-server-context="ssr"');
const request = (headers) =>
  fetch(new URL('/home', base), { headers, signal: AbortSignal.timeout(20000) });

for (const headers of [
  {},
  { 'x-forwarded-for': '198.51.100.1' },
  {
    'x-forwarded-for': '198.51.100.1',
    'x-forwarded-host': base.hostname,
    'x-forwarded-proto': 'https',
  },
]) {
  const response = await request(headers);
  assert.equal(response.status, 200);
  assert.ok(isSsr(await response.text()), 'Proxy headers disabled server rendering');
}

const invalidHost = await request({ 'x-forwarded-host': 'attacker.invalid' });
assert.equal(invalidHost.status, 400, 'Invalid proxy host must be rejected');
const invalidProtocol = await request({ 'x-forwarded-proto': 'file' });
assert.ok(!invalidProtocol.ok, 'Invalid proxy protocol must be rejected');

const untrusted = await request({ 'x-forwarded-prefix': '/untrusted' });
assert.ok(!isSsr(await untrusted.text()), 'Unexpected proxy headers must remain untrusted');
console.log('SSR behind the proxy and origin validation: 6 checks passed');
