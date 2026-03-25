import { getEntityTypeConfig } from './graph.config';
import { GraphNode } from './graph.models';

export interface ImageSyncOverlay {
  label: string;
  color: string;
  shape: 'rect' | 'oval' | 'frame';
  x: number;
  y: number;
  width: number;
  height: number;
}

export function buildImageSyncOverlay(
  centerNode: GraphNode | null,
  selectedNode: GraphNode | null,
  suppress = false,
): ImageSyncOverlay | null {
  if (suppress || !selectedNode || !centerNode || selectedNode.id === centerNode.id) {
    return null;
  }

  const color = getEntityTypeConfig(selectedNode.type).color;

  switch (selectedNode.type) {
    case 'ARTIST':
      return { label: selectedNode.label, color, shape: 'rect', x: 8, y: 14, width: 24, height: 72 };
    case 'CONCEPT':
      return { label: selectedNode.label, color, shape: 'oval', x: 24, y: 24, width: 52, height: 42 };
    case 'PERIOD':
      return { label: selectedNode.label, color, shape: 'rect', x: 10, y: 8, width: 80, height: 20 };
    case 'PLACE':
      return { label: selectedNode.label, color, shape: 'rect', x: 14, y: 66, width: 72, height: 18 };
    case 'MOVEMENT':
      return { label: selectedNode.label, color, shape: 'frame', x: 18, y: 18, width: 64, height: 54 };
    case 'ARTWORK':
      return { label: selectedNode.label, color, shape: 'frame', x: 42, y: 16, width: 40, height: 60 };
    default:
      return { label: selectedNode.label, color, shape: 'oval', x: 18, y: 18, width: 64, height: 56 };
  }
}
