import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGraphImagesPreference, saveGraphImagesPreference } from './graph-persistence';

describe('graph image preference', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.removeItem('jano:graph-images');
  });
  it('starts enabled and remembers either state across graph visits', () => {
    expect(loadGraphImagesPreference()).toBe(true);
    saveGraphImagesPreference(false);
    expect(loadGraphImagesPreference()).toBe(false);
    saveGraphImagesPreference(true);
    expect(loadGraphImagesPreference()).toBe(true);
  });
  it('continues working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadGraphImagesPreference()).toBe(true);
    expect(() => saveGraphImagesPreference(false)).not.toThrow();
  });
});
