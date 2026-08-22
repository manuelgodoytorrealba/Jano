import { entities, relations } from '../prisma/foundational/catalog';
import { editorialInventory } from '../prisma/foundational/editorial-priority';

const inventory = editorialInventory(entities, relations);
console.log(
  JSON.stringify(
    {
      counts: Object.fromEntries(
        ['A', 'B', 'C'].map((tier) => [
          tier,
          inventory.filter((item) => item.editorialTier === tier).length,
        ]),
      ),
      entities: inventory.map(({ slug, title, type, block, degree, editorialTier }) => ({
        slug,
        title,
        type,
        block,
        degree,
        editorialTier,
      })),
    },
    null,
    2,
  ),
);
