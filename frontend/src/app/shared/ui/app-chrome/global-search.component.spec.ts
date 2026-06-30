import { describe, expect, it } from 'vitest';
import { nextSuggestionIndex } from './global-search.component';

describe('global search navigation', () => {
  it('wraps keyboard selection and handles an empty result list', () => {
    expect(nextSuggestionIndex(0, -1, 3)).toBe(2);
    expect(nextSuggestionIndex(2, 1, 3)).toBe(0);
    expect(nextSuggestionIndex(0, 1, 0)).toBe(-1);
  });
});
