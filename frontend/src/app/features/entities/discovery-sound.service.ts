import { DestroyRef, Injectable, afterNextRender, inject, signal } from '@angular/core';

const PREFERENCE = 'jano.discovery.sound';

@Injectable()
export class DiscoverySoundService {
  readonly enabled = signal(false);
  readonly unavailable = signal(false);
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private timer?: ReturnType<typeof setTimeout>;
  private lastPlayedAt = -Infinity;

  constructor() {
    afterNextRender(() => {
      try {
        this.enabled.set(localStorage.getItem(PREFERENCE) === 'on');
      } catch {
        // Sound remains optional when browser storage is unavailable.
      }
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      void this.context?.close().catch(() => {});
    });
  }

  async toggle(): Promise<void> {
    this.enabled.set(!this.enabled());
    this.unavailable.set(false);
    this.remember();
    clearTimeout(this.timer);
    if (this.enabled()) {
      await this.unlock();
      this.play();
    } else {
      await this.context?.suspend().catch(() => {});
    }
  }

  async unlock(): Promise<void> {
    if (!this.enabled()) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      this.enabled.set(false);
      this.unavailable.set(true);
      this.remember();
    }
  }

  tick(): void {
    clearTimeout(this.timer);
    if (!this.enabled()) return;
    // Coalesce fast card changes into one quiet detent, without queuing sounds.
    this.timer = setTimeout(() => this.play(), 48);
  }

  private play(): void {
    const context = this.context;
    if (!this.enabled() || !context || context.state !== 'running' || document.hidden) return;
    if (context.currentTime - this.lastPlayedAt < 0.12) return;
    this.lastPlayedAt = context.currentTime;
    if (!this.buffer) {
      this.buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * 0.06),
        context.sampleRate,
      );
      const samples = this.buffer.getChannelData(0);
      let seed = 17;
      for (let i = 0; i < samples.length; i++) {
        const t = i / context.sampleRate;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = (seed / 0xffffffff) * 2 - 1;
        const attack = 1 - Math.exp(-t / 0.0005);
        samples[i] =
          attack *
          0.18 *
          (noise * Math.exp(-t / 0.006) +
            Math.sin(2 * Math.PI * 420 * t) * 0.55 * Math.exp(-t / 0.011));
      }
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    source.buffer = this.buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    filter.Q.value = 0.5;
    source.connect(filter);
    filter.connect(context.destination);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
    };
    source.start();
  }

  private remember(): void {
    try {
      localStorage.setItem(PREFERENCE, this.enabled() ? 'on' : 'off');
    } catch {
      // The control still works for this visit without persistent storage.
    }
  }
}
