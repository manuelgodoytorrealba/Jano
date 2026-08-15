import * as THREE from 'three';
import { PublicEntityListItem } from '../../core/api/entities.models';
import { ArtworkTransitionRect } from '../../core/entity-route-artwork-transition.service';
import { resolveEntityMediaItem, resolveMediaPresentation } from '../../shared/media/media.utils';
import {
  createFallbackImageTexture,
  createRoundedImageTexture,
  createRoundedRectTexture,
  createSpecularHighlightTexture,
} from './explorer-3d-textures';

type CardUserData = {
  index: number;
  slug?: string;
  targetPosition?: THREE.Vector3;
  targetRotation?: THREE.Euler;
  targetScale?: number;
  targetOpacity?: number;
  layoutOpacity?: number;
  imageRevealOpacity?: number;
  entryPosition?: THREE.Vector3;
  entryRotation?: THREE.Euler;
  entryScale?: number;
  entryDistance?: number;
};

type Card3D = {
  group: THREE.Group;
  frame: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  glass: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
};

export type EntryAnimationState = 'idle' | 'running' | 'complete';

const ENTRY_DURATION_MS = 560;
const ENTRY_STAGGER_MS = 22;

export function entryAnimationProgress(elapsedMs: number, distance: number): number {
  return THREE.MathUtils.clamp((elapsedMs - distance * ENTRY_STAGGER_MS) / ENTRY_DURATION_MS, 0, 1);
}

function easeOutQuart(progress: number): number {
  return 1 - Math.pow(1 - progress, 4);
}

export class Explorer3dScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private renderer?: THREE.WebGLRenderer;
  private resizeObserver?: ResizeObserver;
  private animationFrameId = 0;
  private cardsVersion = 0;
  private cards: Card3D[] = [];
  private raycastTargets: THREE.Mesh[] = [];
  private items: PublicEntityListItem[] = [];
  private activeIndex = 0;
  private hoveredIndex: number | null = null;
  private viewportWidth = 1200;
  private viewportHeight = 700;
  private cardProfileKey = '';
  private lastWidth = 0;
  private lastHeight = 0;
  private entryStartedAt: number | null = null;
  private resizePending = false;
  private _entryAnimationState: EntryAnimationState = 'idle';

  constructor(
    private readonly onEntryAnimationComplete?: () => void,
    private readonly typeLabel: (type: string | null | undefined) => string = (type) =>
      type ?? 'Entity',
  ) {}

  get domElement(): HTMLCanvasElement | undefined {
    return this.renderer?.domElement;
  }

  get entryAnimationState(): EntryAnimationState {
    return this._entryAnimationState;
  }

  get isEntryAnimationRunning(): boolean {
    return this._entryAnimationState === 'running';
  }

  initialize(host: HTMLElement, items: PublicEntityListItem[], activeIndex: number): void {
    const width = host.clientWidth || 1200;
    const height = host.clientHeight || 700;
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.lastWidth = width;
    this.lastHeight = height;
    this.items = items;
    this.activeIndex = activeIndex;
    this.scene.background = null;
    this.applyCamera(width, height);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    host.replaceChildren(this.renderer.domElement);
    this.buildCards();
    this.updateTargets();
    this.prepareInitialDeckState();
    this.startEntryAnimation();
    this.startLoop();
    this.observeResize(host);
  }

  setItems(items: PublicEntityListItem[]): void {
    this.items = items;
    if (!this.renderer) return;
    this.buildCards();
    this.updateTargets(true);
    if (this.isEntryAnimationRunning) this.completeEntryAnimation();
  }

  setActiveIndex(index: number): void {
    this.activeIndex = index;
    this.updateTargets();
  }

  setHoveredIndex(index: number | null): void {
    this.hoveredIndex = index;
    this.updateTargets();
  }

  setDragging(active: boolean): void {
    this.renderer?.domElement.classList.toggle('is-dragging', active);
  }

  setInteractive(active: boolean): void {
    if (this.renderer) this.renderer.domElement.style.pointerEvents = active ? 'auto' : 'none';
  }

  pickIndex(clientX: number, clientY: number): number | null {
    if (!this.renderer) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.raycastTargets, false)[0];
    return hit ? ((hit.object.userData as CardUserData).index ?? null) : null;
  }

  activeCardBounds(index: number): ArtworkTransitionRect | null {
    const card = this.cards[index];
    if (!card || !this.renderer) return null;
    card.image.updateWorldMatrix(true, false);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const projected = [
      new THREE.Vector3(-1.32, 1.45, 0),
      new THREE.Vector3(1.32, 1.45, 0),
      new THREE.Vector3(1.32, -1.45, 0),
      new THREE.Vector3(-1.32, -1.45, 0),
    ].map((corner) => {
      const point = corner.applyMatrix4(card.image.matrixWorld).project(this.camera);
      return {
        x: ((point.x + 1) / 2) * rect.width + rect.left,
        y: ((1 - point.y) / 2) * rect.height + rect.top,
      };
    });
    const left = Math.min(...projected.map((point) => point.x));
    const right = Math.max(...projected.map((point) => point.x));
    const top = Math.min(...projected.map((point) => point.y));
    const bottom = Math.max(...projected.map((point) => point.y));
    if (!Number.isFinite(left) || !Number.isFinite(top) || right <= left || bottom <= top) {
      return null;
    }
    return { left, top, width: right - left, height: bottom - top };
  }

  fallbackCanvasBounds(): ArtworkTransitionRect | null {
    if (!this.renderer) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const width = Math.min(rect.width * 0.28, 320);
    const height = width * 1.08;
    return {
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width,
      height,
    };
  }

  destroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver?.disconnect();
    this.disposeCards();
    this.renderer?.dispose();
    this.renderer = undefined;
  }

  private buildCards(): void {
    this.disposeCards();
    const cardsVersion = this.cardsVersion;
    const profile = this.viewportProfile();
    this.cardProfileKey = profile.key;
    const imageWidth = profile.cardWidth - profile.imageInset * 2;
    const imageHeight = profile.cardHeight - profile.imageInset * 2.35;
    const glassWidth = profile.cardWidth - profile.imageInset;
    const glassHeight = profile.cardHeight - profile.imageInset * 1.55;

    this.items.forEach((item, index) => {
      const frameMaterial = new THREE.MeshBasicMaterial({
        map: createRoundedRectTexture(
          1100,
          1200,
          58,
          'rgba(255,255,255,0.08)',
          'rgba(255,255,255,0.52)',
          6,
          1,
        ),
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const imageMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#1c1b1a'),
        transparent: true,
        opacity: 1,
      });
      const glassMaterial = new THREE.MeshBasicMaterial({
        map: createSpecularHighlightTexture(1100, 1200, 54),
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      });
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(profile.cardWidth, profile.cardHeight, 1, 1),
        frameMaterial,
      );
      const image = new THREE.Mesh(
        new THREE.PlaneGeometry(imageWidth, imageHeight, 1, 1),
        imageMaterial,
      );
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(glassWidth, glassHeight, 1, 1),
        glassMaterial,
      );
      const group = new THREE.Group();
      frame.position.z = -0.022;
      image.position.z = 0.02;
      glass.position.z = 0.036;
      const data: CardUserData = { index, slug: item.slug, imageRevealOpacity: 1 };
      group.userData = data;
      image.userData = data;
      imageMaterial.map = createFallbackImageTexture(
        { ...item, type: this.typeLabel(item.type) },
        1100,
        1200,
        48,
      );
      imageMaterial.color.set('#ffffff');
      imageMaterial.needsUpdate = true;
      const media = resolveMediaPresentation(
        resolveEntityMediaItem(item, 'explorer3d'),
        'explorer3d',
      );
      if (media.src) {
        const source = new Image();
        source.crossOrigin = 'anonymous';
        source.onload = async () => {
          try {
            await source.decode?.();
          } catch {
            // `load` remains a safe readiness fallback when decode is unavailable or rejects.
          }

          if (cardsVersion !== this.cardsVersion) return;
          imageMaterial.map?.dispose();
          imageMaterial.map = createRoundedImageTexture(source, 1100, 1200, 48, media);
          imageMaterial.color.set('#ffffff');
          imageMaterial.needsUpdate = true;
        };
        source.src = media.src;
      }
      group.add(frame, image, glass);
      this.scene.add(group);
      this.cards.push({ group, frame, image, glass });
      this.raycastTargets.push(image);
    });
  }

  private updateTargets(immediate = false): void {
    if (!this.items.length) return;
    const profile = this.viewportProfile();
    this.cards.forEach((card, index) => {
      const offset = circularOffset(index, this.activeIndex, this.items.length);
      const distance = Math.abs(offset);
      card.group.visible = distance <= Math.min(5, Math.floor(this.items.length / 2));
      if (!card.group.visible) return;
      const hovered = this.hoveredIndex === index;
      const active = offset === 0;
      const baseScale = active
        ? profile.activeScale
        : Math.max(
            profile.sideScaleFloor,
            profile.sideScaleStart - distance * profile.sideScaleDecay,
          );
      const baseOpacity = active
        ? 1
        : Math.max(
            profile.sideOpacityFloor,
            profile.sideOpacityStart - distance * profile.sideOpacityDecay,
          );
      const data = card.group.userData as CardUserData;
      data.targetPosition = new THREE.Vector3(
        offset * profile.spacing,
        profile.baseY + (active ? 0 : profile.sideYOffset),
        -distance * profile.depthSpacing + (active ? 1.55 : 0) + (hovered ? 0.42 : 0),
      );
      data.targetRotation = new THREE.Euler(
        0,
        active ? 0 : offset * -0.082,
        active ? 0 : offset * -0.018,
      );
      data.targetScale = hovered ? baseScale + 0.04 : baseScale;
      data.targetOpacity = hovered ? Math.min(1, baseOpacity + 0.1) : baseOpacity;

      if (immediate) {
        card.group.position.copy(data.targetPosition);
        card.group.rotation.copy(data.targetRotation);
        card.group.scale.setScalar(data.targetScale);
        data.layoutOpacity = data.targetOpacity;
        this.applyCardOpacity(card, data.layoutOpacity);
      }
    });
  }

  private prepareInitialDeckState(): void {
    const activeTarget = (this.cards[this.activeIndex]?.group.userData as CardUserData | undefined)
      ?.targetPosition;
    if (!activeTarget) return;

    const profile = this.viewportProfile();
    for (const [index, card] of this.cards.entries()) {
      if (!card.group.visible) continue;
      const data = card.group.userData as CardUserData;
      if (
        !data.targetPosition ||
        !data.targetRotation ||
        data.targetScale === undefined ||
        data.targetOpacity === undefined
      ) {
        continue;
      }

      const offset = circularOffset(index, this.activeIndex, this.items.length);
      const distance = Math.abs(offset);
      data.entryPosition = new THREE.Vector3(
        activeTarget.x + offset * profile.cardWidth * 0.035,
        activeTarget.y - distance * profile.cardHeight * 0.012,
        activeTarget.z - distance * profile.depthSpacing * 0.11,
      );
      data.entryRotation = new THREE.Euler(0, offset * -0.006, offset * -0.004);
      data.entryScale = data.targetScale * 0.94;
      data.entryDistance = distance;
      data.layoutOpacity = data.targetOpacity;

      card.group.position.copy(data.entryPosition);
      card.group.rotation.copy(data.entryRotation);
      card.group.scale.setScalar(data.entryScale);
      this.applyCardOpacity(card, data.layoutOpacity);
    }
  }

  private startEntryAnimation(): void {
    this.entryStartedAt = null;
    this._entryAnimationState = 'running';
  }

  private startLoop(): void {
    const tick = (now: number) => {
      this.animationFrameId = requestAnimationFrame(tick);
      if (this.isEntryAnimationRunning) {
        this.advanceEntryAnimation(now);
      }
      for (const card of this.cards) {
        if (!card.group.visible) continue;
        const data = card.group.userData as CardUserData;
        if (this.isEntryAnimationRunning) {
          this.advanceImageReveal(card);
          this.applyCardOpacity(card, data.layoutOpacity ?? data.targetOpacity ?? 1);
          continue;
        }
        if (data.targetPosition) card.group.position.lerp(data.targetPosition, 0.082);
        if (data.targetRotation) {
          card.group.rotation.x = THREE.MathUtils.lerp(
            card.group.rotation.x,
            data.targetRotation.x,
            0.082,
          );
          card.group.rotation.y = THREE.MathUtils.lerp(
            card.group.rotation.y,
            data.targetRotation.y,
            0.082,
          );
          card.group.rotation.z = THREE.MathUtils.lerp(
            card.group.rotation.z,
            data.targetRotation.z,
            0.082,
          );
        }
        if (typeof data.targetScale === 'number') {
          card.group.scale.setScalar(
            THREE.MathUtils.lerp(card.group.scale.x, data.targetScale, 0.082),
          );
        }
        if (typeof data.targetOpacity === 'number') {
          data.layoutOpacity = THREE.MathUtils.lerp(
            data.layoutOpacity ?? data.targetOpacity,
            data.targetOpacity,
            0.082,
          );
          this.advanceImageReveal(card);
          this.applyCardOpacity(card, data.layoutOpacity);
        }
      }
      if (this.renderer) this.renderer.render(this.scene, this.camera);
    };
    tick(performance.now());
  }

  private advanceEntryAnimation(now: number): void {
    this.entryStartedAt ??= now;
    const elapsed = now - this.entryStartedAt;
    let complete = true;

    for (const card of this.cards) {
      if (!card.group.visible) continue;
      const data = card.group.userData as CardUserData;
      if (
        !data.entryPosition ||
        !data.entryRotation ||
        data.entryScale === undefined ||
        !data.targetPosition ||
        !data.targetRotation ||
        data.targetScale === undefined
      ) {
        continue;
      }

      const progress = entryAnimationProgress(elapsed, data.entryDistance ?? 0);
      const eased = easeOutQuart(progress);
      card.group.position.lerpVectors(data.entryPosition, data.targetPosition, eased);
      card.group.rotation.set(
        THREE.MathUtils.lerp(data.entryRotation.x, data.targetRotation.x, eased),
        THREE.MathUtils.lerp(data.entryRotation.y, data.targetRotation.y, eased),
        THREE.MathUtils.lerp(data.entryRotation.z, data.targetRotation.z, eased),
      );
      card.group.scale.setScalar(THREE.MathUtils.lerp(data.entryScale, data.targetScale, eased));
      data.layoutOpacity = data.targetOpacity;
      if (progress < 1) complete = false;
    }

    if (complete) this.completeEntryAnimation();
  }

  private completeEntryAnimation(): void {
    if (!this.isEntryAnimationRunning) return;

    for (const card of this.cards) {
      if (!card.group.visible) continue;
      const data = card.group.userData as CardUserData;
      if (data.targetPosition) card.group.position.copy(data.targetPosition);
      if (data.targetRotation) card.group.rotation.copy(data.targetRotation);
      if (data.targetScale !== undefined) card.group.scale.setScalar(data.targetScale);
      data.layoutOpacity = data.targetOpacity;
      data.entryPosition = undefined;
      data.entryRotation = undefined;
      data.entryScale = undefined;
      data.entryDistance = undefined;
    }

    this.entryStartedAt = null;
    this._entryAnimationState = 'complete';
    if (this.resizePending) {
      this.resizePending = false;
      this.buildCards();
      this.updateTargets(true);
    }
    this.onEntryAnimationComplete?.();
  }

  private advanceImageReveal(card: Card3D): void {
    const data = card.group.userData as CardUserData;
    data.imageRevealOpacity = THREE.MathUtils.lerp(data.imageRevealOpacity ?? 1, 1, 0.082);
  }

  private applyCardOpacity(card: Card3D, layoutOpacity: number): void {
    const data = card.group.userData as CardUserData;
    card.image.material.opacity = layoutOpacity * (data.imageRevealOpacity ?? 1);
    card.frame.material.opacity = layoutOpacity === 1 ? 0.5 : Math.max(0.12, layoutOpacity * 0.2);
    card.glass.material.opacity = layoutOpacity === 1 ? 0.16 : Math.max(0.05, layoutOpacity * 0.08);
  }

  private observeResize(host: HTMLElement): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer) return;
      const width = host.clientWidth || 1200;
      const height = host.clientHeight || 700;
      if (width === this.lastWidth && height === this.lastHeight) return;

      this.lastWidth = width;
      this.lastHeight = height;
      this.viewportWidth = width;
      this.viewportHeight = height;
      const profileChanged = this.cardProfileKey !== this.viewportProfile().key;
      this.applyCamera(width, height);
      this.renderer?.setSize(width, height);
      this.renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (!profileChanged) return;
      if (this.isEntryAnimationRunning) {
        this.resizePending = true;
        return;
      }
      this.buildCards();
      this.updateTargets(true);
    });
    this.resizeObserver.observe(host);
  }

  private applyCamera(width: number, height: number): void {
    const compact = width >= 1100 && width <= 1500;
    const short = compact && height <= 940;
    this.camera.fov = compact ? 31.6 : 33;
    this.camera.position.set(0, compact ? (short ? 0.34 : 0.26) : 0.1, compact ? 11.3 : 11.9);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private viewportProfile() {
    const compact = this.viewportWidth >= 1100 && this.viewportWidth <= 1500;
    const short = compact && this.viewportHeight <= 940;
    return compact
      ? {
          key: short ? 'compact-short' : 'compact',
          cardWidth: short ? 2.68 : 2.82,
          cardHeight: short ? 3.04 : 3.18,
          imageInset: short ? 0.12 : 0.13,
          spacing: short ? 1.14 : 1.2,
          depthSpacing: short ? 0.95 : 1.01,
          baseY: short ? -0.06 : -0.02,
          sideYOffset: 0,
          activeScale: short ? 1.14 : 1.18,
          sideScaleStart: 0.89,
          sideScaleFloor: 0.7,
          sideScaleDecay: 0.058,
          sideOpacityStart: 0.58,
          sideOpacityFloor: 0.16,
          sideOpacityDecay: 0.108,
        }
      : {
          key: 'standard',
          cardWidth: 2.84,
          cardHeight: 3.08,
          imageInset: 0.1,
          spacing: 1.4,
          depthSpacing: 1.2,
          baseY: 0.2,
          sideYOffset: 0,
          activeScale: 1.16,
          sideScaleStart: 0.94,
          sideScaleFloor: 0.76,
          sideScaleDecay: 0.05,
          sideOpacityStart: 0.66,
          sideOpacityFloor: 0.2,
          sideOpacityDecay: 0.095,
        };
  }

  private disposeCards(): void {
    this.cardsVersion += 1;
    for (const card of this.cards) {
      for (const mesh of [card.frame, card.image, card.glass]) {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.dispose();
      }
      this.scene.remove(card.group);
    }
    this.cards = [];
    this.raycastTargets = [];
  }
}

export function circularOffset(index: number, active: number, total: number): number {
  let offset = index - active;
  const half = Math.floor(total / 2);
  if (offset > half) offset -= total;
  if (offset < -half) offset += total;
  return offset;
}
