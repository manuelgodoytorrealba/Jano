import { entities } from '../prisma/foundational/catalog';

type Category = 'people' | 'works' | 'movements' | 'concepts' | 'places' | 'techniques';
type Query = { query: string; category: Category };

const build = (category: Category, values: string): Query[] =>
  values.split('|').map((query) => ({ query, category }));

// This is intentionally an editorially curated search corpus, not a projection
// of entity slugs. English and Spanish titles are included as user queries.
export const benchmark: Query[] = [
  ...build(
    'people',
    "Leonardo|Michelangelo|Raphael|Botticelli|Titian|El Greco|Velázquez|Goya|Caravaggio|Rembrandt|Vermeer|Rubens|Artemisia Gentileschi|David|Delacroix|Turner|Courbet|Manet|Monet|Degas|Renoir|Cézanne|Van Gogh|Gauguin|Rodin|Morisot|Cassatt|Klimt|Munch|Matisse|Picasso|Braque|Kandinsky|Malevich|Duchamp|Dalí|Miró|Magritte|Kahlo|Diego Rivera|Le Corbusier|Frank Lloyd Wright|Gropius|Hokusai|Hiroshige|Raja Ravi Varma|Hilma af Klint|O'Keeffe|Stieglitz|Man Ray|Cartier-Bresson|Pollock|Rothko|Warhol|Bourgeois|Yoko Ono|Marina Abramović|Judy Chicago|Cindy Sherman|Ai Weiwei|Yayoi Kusama|El Anatsui|William Kentridge|Theaster Gates|Tarsila do Amaral|Wifredo Lam|Remedios Varo|Siqueiros|Joseph Kosuth|Hélio Oiticica|Lygia Clark|Lygia Pape|Cildo Meireles|Doris Salcedo|Otobong Nkanga|Zanele Muholi|Shahzia Sikander|Subodh Gupta|Takashi Murakami|Shigeru Ban|Wang Shu|Winslow Homer|Bernini|Donatello|Giotto|Dürer|Bruegel|Canova|Friedrich|Géricault|Seurat|Mondrian|Calder|Brancusi|Donald Judd|Sol LeWitt|Robert Smithson|Louise Nevelson|Georgia O Keeffe|Giacometti",
  ),
  ...build(
    'works',
    "Mona Lisa|La Gioconda|The Birth of Venus|El nacimiento de Venus|The Last Supper|La última cena|David|School of Athens|Las Meninas|The Night Watch|Girl with a Pearl Earring|The Third of May 1808|Saturn Devouring His Son|Liberty Leading the People|The Raft of the Medusa|Olympia|Impression Sunrise|Luncheon of the Boating Party|Starry Night|Sunflowers|Mont Sainte-Victoire|The Thinker|Les Demoiselles d'Avignon|Guernica|Fountain|Black Square|Composition VIII|The Persistence of Memory|The Two Fridas|Man at the Crossroads|Fallingwater|Villa Savoye|Migrant Mother|Number 1A|Marilyn Diptych|Maman|Cut Piece|Rhythm 0|Sunflower Seeds|The Great Wave|La gran ola de Kanagawa|Ishtar Gate|Code of Hammurabi|Discobolus|Parthenon|Pantheon|Hagia Sophia|Bayeux Tapestry|Chartres Cathedral|The Arnolfini Portrait|Melencolia I|The Hay Wain|The Kiss|The Swing|The Scream|American Gothic|Nighthawks|Campbell's Soup Cans|The Dinner Party|Spiral Jetty|Shibboleth|Untitled Film Still #21|Abaporu|The Jungle|Double Plot|The Gulf Stream|The Elevation of the Cross|Judith and Her Maidservant|The Dance|Bird in Space|The Treachery of Images|The Son of Man|Object to Be Destroyed|The Body as Archive",
  ),
  ...build(
    'movements',
    'Prehistory|Paleolithic|Ancient art|Mesopotamian art|Egyptian art|Greek art|Roman art|Byzantine art|Islamic art|Romanesque|Gothic|Renaissance|Italian Renaissance|Northern Renaissance|Mannerism|Baroque|Rococo|Neoclassicism|Romanticism|Realism|Impressionism|Post-Impressionism|Symbolism|Arts and Crafts|Art Nouveau|Fauvism|Expressionism|Cubism|Futurism|Suprematism|Constructivism|Dada|De Stijl|Bauhaus|Surrealism|Abstract Expressionism|Informalism|Pop Art|Minimalism|Conceptual Art|Fluxus|Land Art|Mexican muralism|Modern architecture|Ukiyo-e|Chinese art|Indian art|Maya art|Mexica art|Andean art|African art',
  ),
  ...build(
    'concepts',
    'portrait|self-portrait|landscape|still life|history painting|nude|body|beauty|death|life|time|memory|identity|gender|sexuality|desire|gaze|representation|power|religion|ritual|myth|nature|city|work|class|war|revolution|propaganda|colonialism|empire|race|technology|perspective|abstraction',
  ),
  ...build(
    'places',
    'Paris|Florence|Rome|Venice|Madrid|London|Amsterdam|Vienna|Berlin|New York|Mexico City|Tokyo|Beijing|Kyoto|Cairo|Constantinople|Louvre|Prado|Uffizi|MoMA',
  ),
  ...build(
    'techniques',
    'oil painting|fresco|tempera|watercolour|drawing|woodcut|etching|lithography|screen printing|collage|assemblage|casting|carving|marble|bronze|wood|canvas|paper|pigment|glass',
  ),
];

if (benchmark.length !== 300) throw new Error(`Expected 300 queries, got ${benchmark.length}`);

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const localValues = entities
  .flatMap((entity) => [entity.title, entity.en, entity.slug, ...(entity.aliases ?? [])])
  .map(normalize);
const valuesBySlug = new Map(
  entities.map((entity) => [
    entity.slug,
    [entity.title, entity.en, entity.slug, ...(entity.aliases ?? [])].map(normalize),
  ]),
);

async function main() {
  const api = process.env.JANO_API_URL?.replace(/\/$/, '');
  const results = await Promise.all(
    benchmark.map(async (item) => {
      const q = normalize(item.query);
      if (!api)
        return { ...item, status: localValues.includes(q) ? ('PASS' as const) : ('MISS' as const) };
      {
        const response = await fetch(
          `${api}/search?q=${encodeURIComponent(item.query)}&locale=en&limit=10`,
        );
        const payload = (await response.json()) as {
          items?: Array<{ title: string; slug: string }>;
        };
        const pass =
          payload.items?.some((result) =>
            valuesBySlug
              .get(result.slug)
              ?.some((value) => value === q || value.includes(q) || q.includes(value)),
          ) ?? false;
        return { ...item, status: pass ? ('PASS' as const) : ('MISS' as const) };
      }
    }),
  );
  const byCategory = Object.fromEntries(
    [...new Set(benchmark.map((item) => item.category))].map((category) => {
      const rows = results.filter((result) => result.category === category);
      return [
        category,
        {
          total: rows.length,
          pass: rows.filter((result) => result.status === 'PASS').length,
          miss: rows.filter((result) => result.status === 'MISS').map((result) => result.query),
        },
      ];
    }),
  );
  console.log(
    JSON.stringify(
      {
        mode: api ? 'api' : 'catalog',
        total: results.length,
        pass: results.filter((result) => result.status === 'PASS').length,
        miss: results.filter((result) => result.status === 'MISS').map((result) => result.query),
        byCategory,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) main();
