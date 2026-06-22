import { Injectable, computed, signal } from '@angular/core';

export type ArtworkTransitionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type EntityArtworkTransitionPayload = {
  slug: string;
  title: string;
  imageUrl: string;
  sourceBounds: ArtworkTransitionRect;
  sourceSurface: 'explorer3d' | 'explorer-totem';
};

type ArtworkArrivalStage =
  | 'idle'
  | 'navigating'
  | 'landing'
  | 'artwork'
  | 'title'
  | 'meta'
  | 'controls'
  | 'graph'
  | 'complete';

const LANDING_MS = 460;
const TITLE_REVEAL_DELAY_MS = 90;
const META_REVEAL_DELAY_MS = 160;
const CONTROLS_REVEAL_DELAY_MS = 240;
const GRAPH_REVEAL_DELAY_MS = 320;
const OVERLAY_FADE_DELAY_MS = 380;
const OVERLAY_CLEAR_DELAY_MS = 620;
const PERSISTED_STORAGE_KEY = 'jano.entity-artwork-transition';
const BODY_CLASS_ACTIVE = 'jano-artwork-route-active';
const BODY_CLASS_ARTWORK = 'jano-artwork-route-artwork';
const BODY_CLASS_TITLE = 'jano-artwork-route-title';
const BODY_CLASS_META = 'jano-artwork-route-meta';
const BODY_CLASS_CONTROLS = 'jano-artwork-route-controls';
const BODY_CLASS_GRAPH = 'jano-artwork-route-graph';

const sharedPayloadSignal = signal<EntityArtworkTransitionPayload | null>(null);
const sharedStageSignal = signal<ArtworkArrivalStage>('idle');
const sharedOverlayRectSignal = signal<ArtworkTransitionRect | null>(null);
const sharedOverlayVisibleSignal = signal(false);
const sharedOverlayFadingSignal = signal(false);
const sharedCurrentSlugSignal = signal<string | null>(null);

let landingTimer: ReturnType<typeof setTimeout> | null = null;
let titleTimer: ReturnType<typeof setTimeout> | null = null;
let metaTimer: ReturnType<typeof setTimeout> | null = null;
let controlsTimer: ReturnType<typeof setTimeout> | null = null;
let graphTimer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let overlayElement: HTMLDivElement | null = null;

function thresholdReached(stage: ArtworkArrivalStage, threshold: ArtworkArrivalStage): boolean {
  const order: ArtworkArrivalStage[] = [
    'idle',
    'navigating',
    'landing',
    'artwork',
    'title',
    'meta',
    'controls',
    'graph',
    'complete',
  ];

  return order.indexOf(stage) >= order.indexOf(threshold);
}

@Injectable({ providedIn: 'root' })
export class EntityRouteArtworkTransitionService {
  readonly payload = computed(() => sharedPayloadSignal());
  readonly stage = computed(() => sharedStageSignal());
  readonly overlayRect = computed(() => sharedOverlayRectSignal());
  readonly overlayVisible = computed(() => sharedOverlayVisibleSignal());
  readonly overlayFading = computed(() => sharedOverlayFadingSignal());
  readonly isActive = computed(() => sharedOverlayVisibleSignal() && !!sharedPayloadSignal());

  startNavigation(payload: EntityArtworkTransitionPayload): EntityArtworkTransitionPayload {
    this.clearTimers();
    sharedPayloadSignal.set(payload);
    sharedCurrentSlugSignal.set(payload.slug);
    sharedOverlayRectSignal.set(payload.sourceBounds);
    sharedStageSignal.set('navigating');
    sharedOverlayFadingSignal.set(false);
    sharedOverlayVisibleSignal.set(true);
    this.syncBodyStage('navigating');
    this.mountOverlay(payload, payload.sourceBounds, false);
    this.persistPayload(payload);
    return payload;
  }

  beginArrivalFromState(state: unknown, slug: string): void {
    const existingPayload = sharedPayloadSignal();
    const payload =
      this.normalizePayload(state, slug) ??
      (existingPayload?.slug === slug ? existingPayload : null) ??
      this.readPersistedPayload(slug);

    if (!payload) {
      return;
    }

    if (!existingPayload || existingPayload.slug !== slug) {
      this.startNavigation(payload);
      return;
    }

    sharedCurrentSlugSignal.set(slug);
    if (sharedStageSignal() === 'idle') {
      sharedStageSignal.set('navigating');
      sharedOverlayVisibleSignal.set(true);
      sharedOverlayFadingSignal.set(false);
    }
  }

  resumeForSlug(slug: string): boolean {
    const payload = sharedPayloadSignal();
    if (payload?.slug === slug) {
      sharedCurrentSlugSignal.set(slug);
      if (sharedStageSignal() === 'idle') {
        sharedStageSignal.set('navigating');
        sharedOverlayVisibleSignal.set(true);
        sharedOverlayFadingSignal.set(false);
      }
      return true;
    }

    const persistedPayload = this.readPersistedPayload(slug);
    if (!persistedPayload) {
      return false;
    }

    this.startNavigation(persistedPayload);
    return true;
  }

  reportDestinationFrame(slug: string, rect: ArtworkTransitionRect): void {
    if (!this.isForSlug(slug) || sharedStageSignal() !== 'navigating') {
      return;
    }

    requestAnimationFrame(() => {
      sharedOverlayRectSignal.set(rect);
      sharedStageSignal.set('landing');
      this.mountOverlay(sharedPayloadSignal(), rect, true);
      this.runArrivalSequence();
    });
  }

  isForSlug(slug: string | null | undefined): boolean {
    return !!slug && sharedCurrentSlugSignal() === slug && sharedStageSignal() !== 'idle';
  }

  shouldMaskDestinationArtwork(slug: string | null | undefined): boolean {
    return this.isForSlug(slug) && !thresholdReached(sharedStageSignal(), 'artwork');
  }

  shouldRevealTitle(slug: string | null | undefined): boolean {
    return this.isForSlug(slug) ? thresholdReached(sharedStageSignal(), 'title') : true;
  }

  shouldRevealMeta(slug: string | null | undefined): boolean {
    return this.isForSlug(slug) ? thresholdReached(sharedStageSignal(), 'meta') : true;
  }

  shouldRevealControls(slug: string | null | undefined): boolean {
    return this.isForSlug(slug) ? thresholdReached(sharedStageSignal(), 'controls') : true;
  }

  shouldRevealGraph(slug: string | null | undefined): boolean {
    return this.isForSlug(slug) ? thresholdReached(sharedStageSignal(), 'graph') : true;
  }

  cancel(): void {
    this.reset();
  }

  private normalizePayload(state: unknown, slug: string): EntityArtworkTransitionPayload | null {
    if (!state || typeof state !== 'object') {
      return null;
    }

    const candidate = (state as { artworkTransition?: unknown }).artworkTransition;
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const payload = candidate as Partial<EntityArtworkTransitionPayload>;
    if (
      payload.slug !== slug ||
      typeof payload.title !== 'string' ||
      typeof payload.imageUrl !== 'string' ||
      !payload.imageUrl ||
      !payload.sourceBounds
    ) {
      return null;
    }

    const rect = payload.sourceBounds as Partial<ArtworkTransitionRect>;
    if (
      typeof rect.left !== 'number' ||
      typeof rect.top !== 'number' ||
      typeof rect.width !== 'number' ||
      typeof rect.height !== 'number'
    ) {
      return null;
    }

    return {
      slug,
      title: payload.title,
      imageUrl: payload.imageUrl,
      sourceBounds: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      sourceSurface: payload.sourceSurface === 'explorer-totem' ? 'explorer-totem' : 'explorer3d',
    };
  }

  private runArrivalSequence(): void {
    this.clearTimers();

    landingTimer = setTimeout(() => {
      sharedStageSignal.set('artwork');
      this.syncBodyStage('artwork');
      titleTimer = setTimeout(() => {
        sharedStageSignal.set('title');
        this.syncBodyStage('title');
      }, TITLE_REVEAL_DELAY_MS);
      metaTimer = setTimeout(() => {
        sharedStageSignal.set('meta');
        this.syncBodyStage('meta');
      }, META_REVEAL_DELAY_MS);
      controlsTimer = setTimeout(() => {
        sharedStageSignal.set('controls');
        this.syncBodyStage('controls');
      }, CONTROLS_REVEAL_DELAY_MS);
      graphTimer = setTimeout(() => {
        sharedStageSignal.set('graph');
        this.syncBodyStage('graph');
      }, GRAPH_REVEAL_DELAY_MS);
      fadeTimer = setTimeout(() => {
        sharedOverlayFadingSignal.set(true);
        overlayElement?.classList.add('app-route-artwork-overlay--fading');
      }, OVERLAY_FADE_DELAY_MS);
      clearTimer = setTimeout(() => {
        sharedStageSignal.set('complete');
        this.reset();
      }, OVERLAY_CLEAR_DELAY_MS);
    }, LANDING_MS);
  }

  private reset(): void {
    this.clearTimers();
    sharedPayloadSignal.set(null);
    sharedStageSignal.set('idle');
    sharedOverlayRectSignal.set(null);
    sharedOverlayVisibleSignal.set(false);
    sharedOverlayFadingSignal.set(false);
    sharedCurrentSlugSignal.set(null);
    this.unmountOverlay();
    this.syncBodyStage('idle');
    this.persistPayload(null);
  }

  private readPersistedPayload(slug: string): EntityArtworkTransitionPayload | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.sessionStorage.getItem(PERSISTED_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const payload = JSON.parse(raw) as Partial<EntityArtworkTransitionPayload>;
      if (payload.slug !== slug) {
        return null;
      }

      const rect = payload.sourceBounds as Partial<ArtworkTransitionRect> | undefined;
      if (
        typeof payload.title !== 'string' ||
        typeof payload.imageUrl !== 'string' ||
        !payload.imageUrl ||
        !rect ||
        typeof rect.left !== 'number' ||
        typeof rect.top !== 'number' ||
        typeof rect.width !== 'number' ||
        typeof rect.height !== 'number'
      ) {
        return null;
      }

      return {
        slug,
        title: payload.title,
        imageUrl: payload.imageUrl,
        sourceBounds: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        sourceSurface: payload.sourceSurface === 'explorer-totem' ? 'explorer-totem' : 'explorer3d',
      };
    } catch {
      return null;
    }
  }

  private persistPayload(payload: EntityArtworkTransitionPayload | null): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!payload) {
      window.sessionStorage.removeItem(PERSISTED_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(PERSISTED_STORAGE_KEY, JSON.stringify(payload));
  }

  private mountOverlay(
    payload: EntityArtworkTransitionPayload | null,
    rect: ArtworkTransitionRect,
    animated: boolean,
  ): void {
    if (typeof document === 'undefined' || !payload) {
      return;
    }

    if (!overlayElement) {
      overlayElement = document.createElement('div');
      overlayElement.className = 'app-route-artwork-overlay';
      const image = document.createElement('img');
      image.className = 'app-route-artwork-overlay__image';
      overlayElement.appendChild(image);
    }

    const image = overlayElement.querySelector('img');
    if (image) {
      image.setAttribute('src', payload.imageUrl);
      image.setAttribute('alt', payload.title);
      image.setAttribute('decoding', 'async');
    }

    overlayElement.classList.toggle(
      'app-route-artwork-overlay--fading',
      sharedOverlayFadingSignal(),
    );
    overlayElement.style.transition = animated
      ? 'left 460ms cubic-bezier(0.2, 0.8, 0.2, 1), top 460ms cubic-bezier(0.2, 0.8, 0.2, 1), width 460ms cubic-bezier(0.2, 0.8, 0.2, 1), height 460ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 280ms ease'
      : 'none';
    overlayElement.style.left = `${rect.left}px`;
    overlayElement.style.top = `${rect.top}px`;
    overlayElement.style.width = `${rect.width}px`;
    overlayElement.style.height = `${rect.height}px`;

    if (!overlayElement.isConnected) {
      document.body.appendChild(overlayElement);
    }
  }

  private unmountOverlay(): void {
    overlayElement?.remove();
    overlayElement = null;
  }

  private syncBodyStage(stage: ArtworkArrivalStage): void {
    if (typeof document === 'undefined') {
      return;
    }

    const target = document.body;
    target.classList.toggle(BODY_CLASS_ACTIVE, stage !== 'idle');
    target.classList.toggle(BODY_CLASS_ARTWORK, thresholdReached(stage, 'artwork'));
    target.classList.toggle(BODY_CLASS_TITLE, thresholdReached(stage, 'title'));
    target.classList.toggle(BODY_CLASS_META, thresholdReached(stage, 'meta'));
    target.classList.toggle(BODY_CLASS_CONTROLS, thresholdReached(stage, 'controls'));
    target.classList.toggle(BODY_CLASS_GRAPH, thresholdReached(stage, 'graph'));
  }

  private clearTimers(): void {
    for (const timer of [
      landingTimer,
      titleTimer,
      metaTimer,
      controlsTimer,
      graphTimer,
      fadeTimer,
      clearTimer,
    ]) {
      if (timer) {
        clearTimeout(timer);
      }
    }

    landingTimer = null;
    titleTimer = null;
    metaTimer = null;
    controlsTimer = null;
    graphTimer = null;
    fadeTimer = null;
    clearTimer = null;
  }
}
