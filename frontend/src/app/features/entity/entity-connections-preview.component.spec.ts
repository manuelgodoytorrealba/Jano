import { describe, expect, it } from 'vitest';
import { previewConnections } from './entity-connections-preview.component';
import { GraphResponseDto } from '../../core/api/graph.models';

const node = (id: string, type = 'WORK') => ({ id, slug: id, label: id, type });
const edge = (id: string, source: string, target: string) => ({
  id,
  source,
  target,
  relationType: 'RELATED_TO',
});

describe('connection preview', () => {
  it('shows distinct direct connections in both directions, prioritizing people without inventing missing endpoints', () => {
    const graph: GraphResponseDto = {
      centerId: 'root',
      nodes: [
        node('root'),
        node('work'),
        node('person', 'PERSON'),
        node('concept', 'CONCEPT'),
        node('outside'),
        node('extra'),
      ],
      edges: [
        edge('a', 'root', 'work'),
        edge('b', 'person', 'root'),
        edge('duplicate', 'root', 'person'),
        edge('c', 'root', 'concept'),
        edge('unrelated', 'outside', 'extra'),
        edge('missing', 'root', 'missing'),
        edge('d', 'root', 'extra'),
      ],
    };
    expect(previewConnections(graph).map((item) => item.node.id)).toEqual([
      'person',
      'work',
      'concept',
    ]);
  });
  it('leaves an empty graph empty', () => {
    expect(previewConnections({ centerId: 'root', nodes: [node('root')], edges: [] })).toEqual([]);
  });
});
