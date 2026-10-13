import { readSampleRate, sentryOptions } from './sentry-config';

describe('Sentry configuration', () => {
  it('is disabled without a DSN and does not collect PII', () => {
    expect(sentryOptions({ NODE_ENV: 'production' })).toMatchObject({
      enabled: false,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
  });

  it('accepts only sample rates from zero to one', () => {
    expect(readSampleRate('0.15')).toBe(0.15);
    expect(readSampleRate('2')).toBe(0);
    expect(readSampleRate('invalid')).toBe(0);
  });
});
