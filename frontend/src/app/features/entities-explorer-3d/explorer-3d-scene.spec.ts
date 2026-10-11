import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Explorer3dScene, entryAnimationProgress, spatialEntryEase } from './explorer-3d-scene';

describe('explorer 3d entry animation', () => {
  it('spreads from the center with a bounded, distance-based stagger', () => {
    expect(entryAnimationProgress(0, 0)).toBe(0);
    expect(entryAnimationProgress(0, 2)).toBe(0);
    expect(entryAnimationProgress(720, 0)).toBe(1);
    expect(entryAnimationProgress(816, 2)).toBe(1);
  });

  it('uses a smooth bounded ease for the spatial unfold', () => {
    expect(spatialEntryEase(0)).toBe(0);
    expect(spatialEntryEase(0.25)).toBeGreaterThan(0.65);
    expect(spatialEntryEase(1)).toBe(1);
    expect(spatialEntryEase(2)).toBe(1);
  });
});

describe('explorer shared textures', () => {
  it('releases shared decoration textures once when cards are destroyed', () => {
    const scene = new Explorer3dScene();
    const frame = new THREE.Texture();
    const glass = new THREE.Texture();
    const frameDispose = vi.spyOn(frame, 'dispose');
    const glassDispose = vi.spyOn(glass, 'dispose');
    const images = [new THREE.Texture(), new THREE.Texture()];
    const imageDisposes = images.map((texture) => vi.spyOn(texture, 'dispose'));
    const mesh = (map: THREE.Texture) =>
      new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map }));
    const cards = images.map((image) => ({
      group: new THREE.Group(),
      frame: mesh(frame),
      glass: mesh(glass),
      image: mesh(image),
    }));
    (scene as unknown as { cards: typeof cards }).cards = cards;
    scene.destroy();
    expect(frameDispose).toHaveBeenCalledTimes(1);
    expect(glassDispose).toHaveBeenCalledTimes(1);
    imageDisposes.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
  });
});
