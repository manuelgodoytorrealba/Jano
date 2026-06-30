import type { PrismaService } from '../prisma/prisma.service';
import { CollectionsService } from './collections.service';

describe('CollectionsService relation graph', () => {
  it('uses RelationType as the graph identity instead of the legacy type column', async () => {
    const prisma = {
      collection: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'collection-1',
          userId: 'user-1',
          items: [
            { sortOrder: 0, entity: entity('entity-1') },
            { sortOrder: 1, entity: entity('entity-2') },
          ],
        }),
      },
      relation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'relation-1',
            fromId: 'entity-1',
            toId: 'entity-2',
            relationType: { key: 'RELATED_TO', directed: false },
            weight: 0.8,
            justification: null,
          },
        ]),
      },
    };
    const service = new CollectionsService(prisma as unknown as PrismaService);

    const result = await service.getById('user-1', 'collection-1');

    expect(result.graph).toEqual(
      expect.objectContaining({
        edges: [
          expect.objectContaining({
            relationType: 'RELATED_TO',
            directed: false,
          }),
        ],
        summary: expect.objectContaining({
          relationTypes: { RELATED_TO: 1 },
        }),
      }),
    );
  });
});

function entity(id: string) {
  return {
    id,
    title: id,
    type: 'ARTWORK',
    slug: id,
    summary: null,
    startYear: null,
    endYear: null,
    mediaLinks: [],
  };
}
