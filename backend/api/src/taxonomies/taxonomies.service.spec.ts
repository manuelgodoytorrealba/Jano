import { NotFoundException } from '@nestjs/common';
import { TaxonomiesService } from './taxonomies.service';

describe('TaxonomiesService', () => {
  it('rejects a parent term outside the taxonomy', async () => {
    const prisma = {
      taxonomy: { findUnique: jest.fn().mockResolvedValue({ id: 'taxonomy-1' }) },
      taxonomyTerm: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const service = new TaxonomiesService(prisma as never);

    await expect(
      service.createTerm('person-role', {
        key: 'artist',
        label: 'Artist',
        parentId: 'term-in-another-taxonomy',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.taxonomyTerm.create).not.toHaveBeenCalled();
  });
});
