import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';

type ExplorationOrigin = { key: string; url: string; position: number };
type Visit = ExplorationOrigin & { origin: ExplorationOrigin | null };
type StoredVisit = Visit & { data: Record<string, unknown> };
const STORAGE_KEY = 'jano-navigation-v1';
const MAX_VISITS = 32;
const internalUrl = (url: unknown): url is string =>
  typeof url === 'string' && /^\/(?!\/)/.test(url);
const catalogUrl = (url: string) => /^\/entities(?:\/|\?|$)/.test(url);
const entityUrl = (url: string) => /^\/entity\//.test(url);

@Injectable({ providedIn: 'root' })
export class NavigationMemoryService {
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly visit = signal<Visit>({ key: '', url: '', position: 0, origin: null });
  private readonly visits = new Map<string, StoredVisit>();
  private readonly transientData = new Map<string, Record<string, unknown>>();
  private readonly captures = new Set<() => void>();
  private previous: Visit | null = null;
  private firstNavigation = true;

  constructor() {
    if (!this.browser || !this.router.events) return;
    try {
      const stored: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '[]');
      if (Array.isArray(stored)) {
        for (const item of stored.slice(-MAX_VISITS)) {
          if (this.validVisit(item) && item.data && typeof item.data === 'object') {
            this.visits.set(item.key, item);
          }
        }
      }
    } catch {
      /* Storage is optional; navigation must still work. */
    }
    const initial = window.history.state?.janoVisit;
    if (this.validVisit(initial)) this.visit.set(initial);
    const save = () => this.capture();
    window.addEventListener('pagehide', save);
    const scrollRestoration = window.history.scrollRestoration;
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('pagehide', save);
      window.history.scrollRestoration = scrollRestoration;
    });
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.capture();
        // These surfaces restore scroll after their asynchronous content is rendered.
        window.history.scrollRestoration =
          catalogUrl(event.url) || entityUrl(event.url) ? 'manual' : scrollRestoration;
        this.previous = this.visit();
        const navigation = this.router.getCurrentNavigation();
        const restored =
          event.restoredState?.['janoVisit'] ?? navigation?.extras.state?.['janoVisit'];
        const current = this.visit();
        const initialState =
          this.firstNavigation && window.history.state?.janoVisit?.url === event.url
            ? window.history.state.janoVisit
            : null;
        this.firstNavigation = false;
        const existing = this.validVisit(restored)
          ? restored
          : this.validVisit(initialState)
            ? initialState
            : null;
        const origin = entityUrl(event.url)
          ? existing
            ? existing.origin
            : catalogUrl(current.url)
              ? { key: current.key, url: current.url, position: current.position }
              : entityUrl(current.url)
                ? current.origin
                : null
          : null;
        const next: Visit = existing
          ? { ...existing, url: event.url, origin }
          : {
              key: crypto.randomUUID(),
              url: event.url,
              position: current.position + (navigation?.extras.replaceUrl ? 0 : 1),
              origin,
            };
        this.visit.set(next);
        if (!this.visits.has(next.key)) this.visits.set(next.key, { ...next, data: {} });
      } else if (event instanceof NavigationEnd) {
        const next = { ...this.visit(), url: event.urlAfterRedirects };
        this.visit.set(next);
        const stored = this.visits.get(next.key);
        if (stored) Object.assign(stored, next);
        window.history.replaceState({ ...window.history.state, janoVisit: next }, '');
        this.persist();
        this.previous = null;
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        if (this.previous) this.visit.set(this.previous);
        this.previous = null;
      }
    });
  }

  read<T>(slot: string): T | null {
    const key = this.visit().key;
    return (
      ((this.transientData.get(key)?.[slot] ?? this.visits.get(key)?.data[slot]) as
        | T
        | undefined) ?? null
    );
  }

  writeTransient(slot: string, value: unknown, key = this.visit().key): void {
    if (!this.visits.has(key)) return;
    const data = this.transientData.get(key) ?? {};
    data[slot] = value;
    this.transientData.set(key, data);
  }

  write(slot: string, value: unknown, key = this.visit().key): void {
    const stored = this.visits.get(key);
    if (!stored) return;
    stored.data[slot] = value;
  }

  register(slot: string, capture: () => unknown, destroyRef: DestroyRef): void {
    const save = () => this.write(slot, capture());
    this.captures.add(save);
    destroyRef.onDestroy(() => this.captures.delete(save));
  }

  get origin(): ExplorationOrigin | null {
    const { origin, position } = this.visit();
    return origin &&
      catalogUrl(origin.url) &&
      origin.position < position &&
      this.visits.has(origin.key)
      ? origin
      : null;
  }

  returnToOrigin(): void {
    const origin = this.origin;
    if (this.browser && origin) window.history.go(origin.position - this.visit().position);
  }

  private capture(): void {
    for (const save of this.captures) save();
    this.persist();
  }

  private persist(): void {
    const pinned = this.visit().origin?.key;
    while (this.visits.size > MAX_VISITS) {
      const key = [...this.visits.keys()].find((key) => key !== pinned && key !== this.visit().key);
      if (!key) break;
      this.visits.delete(key);
      this.transientData.delete(key);
    }
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...this.visits.values()]));
    } catch {
      /* Keep the bounded in-memory fallback when storage is unavailable. */
    }
  }

  private validVisit(value: unknown): value is StoredVisit {
    if (!value || typeof value !== 'object') return false;
    const item = value as StoredVisit;
    return (
      typeof item.key === 'string' &&
      !!item.key &&
      internalUrl(item.url) &&
      Number.isInteger(item.position) &&
      item.position >= 0 &&
      (item.origin == null ||
        (typeof item.origin.key === 'string' &&
          catalogUrl(item.origin.url) &&
          Number.isInteger(item.origin.position)))
    );
  }
}
