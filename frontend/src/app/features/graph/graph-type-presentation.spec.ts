import { afterEach, describe, expect, it } from 'vitest';
import { getEntityTypeConfig } from './graph.config';
import { graphNodeTypeKey, GraphEdge } from './graph.models';
import { createEdgeHoverTooltip } from './graph-stage-interactions';

const originalLanguage = document.documentElement.lang;
afterEach(() => {
  document.documentElement.lang = originalLanguage;
});

describe('public graph labels', () => {
  it.each([
    ['es', ['Concepto', 'Movimiento', 'Periodo', 'Lugar']],
    ['en', ['Concept', 'Movement', 'Period', 'Place']],
  ])('uses meaningful entity labels in %s', (lang, labels) => {
    document.documentElement.lang = lang;
    ['CONCEPT', 'MOVEMENT', 'PERIOD', 'PLACE'].forEach((type, index) => {
      const key = graphNodeTypeKey({ type, kind: 'ABSTRACTION' });
      expect(getEntityTypeConfig(key).label).toBe(labels[index]);
    });
    expect(graphNodeTypeKey({ type: 'ARTIST', kind: 'PERSON' })).toBe('PERSON');
    expect(graphNodeTypeKey({ type: 'CUSTOM', kind: 'ABSTRACTION' })).toBe('ABSTRACTION');
  });
  it('keeps the relation explanation without exposing the technical enum', () => {
    const tooltip = createEdgeHoverTooltip(
      { clientX: 10, clientY: 20 } as PointerEvent,
      {
        label: 'Belongs to movement',
        relationType: 'BELONGS_TO_MOVEMENT',
        justification: 'Editorial explanation',
      } as GraphEdge,
    );
    expect(tooltip.title).toBe('Belongs to movement');
    expect(tooltip.subtitle).toBe('');
    expect(tooltip.body).toBe('Editorial explanation');
  });
});
