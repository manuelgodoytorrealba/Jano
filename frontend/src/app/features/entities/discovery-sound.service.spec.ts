import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscoverySoundService } from './discovery-sound.service';

@Component({ template: '', providers: [DiscoverySoundService] })
class Host {
  readonly sound = inject(DiscoverySoundService);
}

describe('DiscoverySoundService', () => {
  let starts: number;
  let context: {
    state: string;
    currentTime: number;
    sampleRate: number;
    destination: object;
    resume: ReturnType<typeof vi.fn>;
    suspend: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    createBuffer: ReturnType<typeof vi.fn>;
    createBufferSource: ReturnType<typeof vi.fn>;
    createBiquadFilter: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    starts = 0;
    context = {
      state: 'running',
      currentTime: 1,
      sampleRate: 48000,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createBuffer: vi.fn((_channels, length: number) => ({
        getChannelData: () => new Float32Array(length),
      })),
      createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: () => starts++,
      })),
      createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        frequency: { value: 0 },
        Q: { value: 0 },
      })),
    };
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          return context;
        }
      },
    );
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { fixture, sound: fixture.componentInstance.sound };
  }

  it('starts silent without constructing an audio context', () => {
    const { sound } = setup();
    sound.tick();
    vi.advanceTimersByTime(100);
    expect(sound.enabled()).toBe(false);
    expect(starts).toBe(0);
    expect(context.createBuffer).not.toHaveBeenCalled();
  });

  it('previews on explicit activation and coalesces rapid card changes', async () => {
    const { sound } = setup();
    await sound.toggle();
    expect(starts).toBe(1);
    expect(localStorage.getItem('jano.discovery.sound')).toBe('on');
    context.currentTime = 2;
    sound.tick();
    vi.advanceTimersByTime(20);
    sound.tick();
    vi.advanceTimersByTime(20);
    sound.tick();
    vi.advanceTimersByTime(48);
    expect(starts).toBe(2);
    expect(context.createBuffer).toHaveBeenCalledTimes(1);
  });

  it('produces two short mechanical impacts without clipping', async () => {
    const samples = new Float32Array(2880);
    context.createBuffer.mockReturnValue({ getChannelData: () => samples });
    const { sound } = setup();
    await sound.toggle();
    const energy = (from: number, to: number) => {
      const window = samples.slice(from * 48, to * 48);
      return window.reduce((sum, value) => sum + value * value, 0) / window.length;
    };
    expect(energy(0, 3)).toBeGreaterThan(energy(11, 14) * 5);
    expect(energy(14, 17)).toBeGreaterThan(energy(11, 14) * 5);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThan(0.5);
    expect(samples.every(Number.isFinite)).toBe(true);
  });

  it('cancels pending audio when muted and closes the context on leaving', async () => {
    const { fixture, sound } = setup();
    await sound.toggle();
    context.currentTime = 2;
    sound.tick();
    await sound.toggle();
    vi.advanceTimersByTime(100);
    expect(starts).toBe(1);
    expect(localStorage.getItem('jano.discovery.sound')).toBe('off');
    expect(context.suspend).toHaveBeenCalled();
    fixture.destroy();
    expect(context.close).toHaveBeenCalled();
  });

  it('restores the preference without playing on page load', () => {
    localStorage.setItem('jano.discovery.sound', 'on');
    const { sound } = setup();
    expect(sound.enabled()).toBe(true);
    sound.tick();
    vi.advanceTimersByTime(100);
    expect(starts).toBe(0);
  });

  it('falls back to silence if the browser rejects audio activation', async () => {
    context.state = 'suspended';
    context.resume.mockRejectedValue(new Error('NotAllowedError'));
    const { sound } = setup();
    await sound.toggle();
    expect(sound.enabled()).toBe(false);
    expect(sound.unavailable()).toBe(true);
    expect(starts).toBe(0);
  });
});
