import { resolveRequestId } from './request-logging';

describe('resolveRequestId', () => {
  it('preserves a valid correlation id', () => {
    expect(resolveRequestId(' edge:request-123 ')).toBe('edge:request-123');
  });

  it.each(['', 'contains spaces', 'line\nbreak', 'x'.repeat(129)])(
    'replaces an unsafe correlation id: %j',
    (value) => {
      expect(resolveRequestId(value)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    },
  );
});
