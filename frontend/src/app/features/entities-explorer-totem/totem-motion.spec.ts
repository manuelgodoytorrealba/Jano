import { describe, expect, it } from 'vitest';
import { advanceTotemMotion, TotemMotion } from './totem-motion';

function settle(initial: TotemMotion, hz = 60): TotemMotion {
  let state = initial;
  for (let frame = 0; frame < hz * 4; frame++) state = advanceTotemMotion(state, 1 / hz);
  return state;
}

describe('totem momentum', () => {
  it('settles an ordinary fast flick on the next card without skipping it', () => {
    const state = settle({ position: 0.45, velocity: 3, target: null });
    expect(state.position).toBe(1);
    expect(Number.isInteger(state.position)).toBe(true);
    expect(state.velocity).toBe(0);
  });

  it('settles a slow release without overshooting its selected card', () => {
    let state: TotemMotion = { position: 0.7, velocity: 0, target: null };
    for (let frame = 0; frame < 120; frame++) {
      const next = advanceTotemMotion(state, 1 / 60);
      expect(next.position).toBeGreaterThanOrEqual(state.position);
      expect(next.position).toBeLessThanOrEqual(1);
      state = next;
    }
    expect(state.position).toBe(1);
    expect(state.velocity).toBe(0);
  });

  it('has the same destination on 60 Hz and 120 Hz screens, in both directions', () => {
    for (const velocity of [-8, 8]) {
      const initial = { position: 4.2, velocity, target: null };
      expect(settle(initial, 60)).toEqual(settle(initial, 120));
    }
  });

  it('does not jump across the catalog after a suspended animation frame', () => {
    const next = advanceTotemMotion({ position: 1, velocity: 8, target: null }, 30);
    expect(next.position).toBeLessThan(1.5);
  });
});
