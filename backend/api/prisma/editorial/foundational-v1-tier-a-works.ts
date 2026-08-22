import type { PilotEntry } from './foundational-v1-pilot';

const source = (title: string, publisher: string, url: string) => ({
  title,
  publisher,
  url,
  note: 'Institutional collection or heritage reference for factual ficha fields.',
});

// These entries deliberately contain no summary: this batch only records
// verified, type-specific facts and leaves editorial writing for its own pass.
export const foundationalV1TierAWorks: PilotEntry[] = [
  {
    slug: 'cueva-de-lascaux',
    details: { location: 'Lascaux IV, Montignac-Lascaux, Francia' },
    source: source(
      'Lascaux',
      'Ministère de la Culture',
      'https://archeologie.culture.gouv.fr/lascaux/en',
    ),
  },
  {
    slug: 'busto-de-nefertiti',
    details: {
      materials: 'Piedra caliza y estuco',
      dimensions: '47 cm de altura',
      location: 'Neues Museum, Berlín',
      collection: 'Ägyptisches Museum und Papyrussammlung',
    },
    source: source(
      'Bust of Nefertiti',
      'Staatliche Museen zu Berlin',
      'https://www.smb.museum/en/museums-institutions/neues-museum/collection-research/collection/egyptian-museum-and-papyrus-collection/',
    ),
  },
  {
    slug: 'partenon',
    details: { materials: 'Mármol pentélico', location: 'Acrópolis de Atenas, Grecia' },
    source: source(
      'The Parthenon',
      'Acropolis Museum',
      'https://www.theacropolismuseum.gr/en/parthenon',
    ),
  },
  {
    slug: 'hagia-sophia',
    details: { materials: 'Ladrillo, piedra y mármol', location: 'Estambul, Turquía' },
    source: source(
      'Hagia Sophia',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/356/',
    ),
  },
  {
    slug: 'gran-mezquita-de-cordoba',
    details: { materials: 'Piedra, ladrillo y mármol', location: 'Córdoba, España' },
    source: source(
      'Mezquita-Catedral de Córdoba',
      'Mezquita-Catedral de Córdoba',
      'https://mezquita-catedraldecordoba.es/en/',
    ),
  },
  {
    slug: 'tapiz-de-bayeux',
    details: {
      technique: 'Bordado',
      materials: 'Lino con lana teñida',
      dimensions: '50 cm × 68,38 m',
      location: 'Bayeux, Francia',
      collection: 'Musée de la Tapisserie de Bayeux',
    },
    source: source(
      'The Bayeux Tapestry',
      'Musée de la Tapisserie de Bayeux',
      'https://www.bayeuxmuseum.com/en/the-bayeux-tapestry/',
    ),
  },
  {
    slug: 'catedral-de-chartres',
    details: { materials: 'Piedra y vidrieras', location: 'Chartres, Francia' },
    source: source(
      'Chartres Cathedral',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/81/',
    ),
  },
  {
    slug: 'el-nacimiento-de-venus',
    details: {
      technique: 'Temple',
      materials: 'Temple sobre lienzo',
      dimensions: '172,5 × 278,5 cm',
      location: 'Galería Uffizi, Florencia',
    },
    source: source(
      'The Birth of Venus',
      'Gallerie degli Uffizi',
      'https://www.uffizi.it/en/artworks/birth-of-venus',
    ),
  },
  {
    slug: 'ultima-cena',
    details: {
      technique: 'Técnica mixta mural',
      materials: 'Témpera y óleo sobre yeso',
      dimensions: '460 × 880 cm',
      location: 'Santa Maria delle Grazie, Milán',
    },
    source: source(
      'The Last Supper',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/93/',
    ),
  },
  {
    slug: 'david-de-miguel-angel',
    details: {
      technique: 'Escultura',
      materials: 'Mármol',
      dimensions: '517 cm de altura',
      location: 'Galleria dell’Accademia, Florencia',
    },
    source: source(
      'David by Michelangelo',
      'Galleria dell’Accademia di Firenze',
      'https://www.galleriaaccademiafirenze.it/en/artworks/david-michelangelo/',
    ),
  },
  {
    slug: 'escuela-de-atenas',
    details: { technique: 'Fresco', location: 'Museos Vaticanos, Ciudad del Vaticano' },
    source: source(
      'Raphael Rooms',
      'Musei Vaticani',
      'https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/stanze-di-raffaello.html',
    ),
  },
  {
    slug: 'vocacion-de-san-mateo',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '322 × 340 cm',
      location: 'San Luigi dei Francesi, Roma',
    },
    source: source(
      'The Calling of Saint Matthew',
      'San Luigi dei Francesi',
      'https://www.sanluigideifrancesi.it/',
    ),
  },
  {
    slug: 'ronda-de-noche',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '379,5 × 453,5 cm',
      location: 'Rijksmuseum, Ámsterdam',
    },
    source: source(
      'The Night Watch',
      'Rijksmuseum',
      'https://www.rijksmuseum.nl/en/collection/SK-C-5',
    ),
  },
  {
    slug: 'joven-de-la-perla',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '44,5 × 39 cm',
      location: 'Mauritshuis, La Haya',
    },
    source: source(
      'Girl with a Pearl Earring',
      'Mauritshuis',
      'https://www.mauritshuis.nl/en/our-collection/artworks/670-girl-with-a-pearl-earring/',
    ),
  },
  {
    slug: 'tres-de-mayo-1808',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '268 × 347 cm',
      location: 'Museo Nacional del Prado, Madrid',
    },
    source: source(
      'The Third of May 1808 in Madrid',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/en/the-collection/art-work/the-3rd-of-may-1808-in-madrid-or-the-executions/5e177409-88a8-4a0a-8a1e-0e929f4e2f4f',
    ),
  },
  {
    slug: 'libertad-guiando-al-pueblo',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '260 × 325 cm',
      location: 'Museo del Louvre, París',
    },
    source: source(
      'Liberty Leading the People',
      'Musée du Louvre',
      'https://collections.louvre.fr/en/ark:/53355/cl010065653',
    ),
  },
  {
    slug: 'noche-estrellada',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '73,7 × 92,1 cm',
      location: 'Museum of Modern Art, Nueva York',
    },
    source: source(
      'The Starry Night',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79802',
    ),
  },
  {
    slug: 'los-girasoles',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '92,1 × 73 cm',
      location: 'National Gallery, Londres',
    },
    source: source(
      'Sunflowers',
      'National Gallery',
      'https://www.nationalgallery.org.uk/paintings/vincent-van-gogh-sunflowers',
    ),
  },
  {
    slug: 'las-senoritas-de-avignon',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '243,9 × 233,7 cm',
      location: 'Museum of Modern Art, Nueva York',
    },
    source: source(
      'Les Demoiselles d’Avignon',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79766',
    ),
  },
  {
    slug: 'cuadrado-negro',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '79,5 × 79,5 cm',
      location: 'Galería Tretiakov, Moscú',
    },
    source: source(
      'Black Square',
      'The State Tretyakov Gallery',
      'https://www.tretyakovgallery.ru/en/collection/black-square/',
    ),
  },
  {
    slug: 'la-persistencia-de-la-memoria',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '24,1 × 33 cm',
      location: 'Museum of Modern Art, Nueva York',
    },
    source: source(
      'The Persistence of Memory',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79018',
    ),
  },
  {
    slug: 'las-dos-fridas',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '173,5 × 173 cm',
      location: 'Museo de Arte Moderno, Ciudad de México',
    },
    source: source('Las dos Fridas', 'Museo de Arte Moderno', 'https://mam.inba.gob.mx/'),
  },
  {
    slug: 'casa-sobre-la-cascada',
    details: {
      materials: 'Hormigón armado, piedra, acero y vidrio',
      location: 'Mill Run, Pensilvania, Estados Unidos',
    },
    source: source('Fallingwater', 'Western Pennsylvania Conservancy', 'https://fallingwater.org/'),
  },
  {
    slug: 'edificio-bauhaus-dessau',
    details: { materials: 'Hormigón armado, acero y vidrio', location: 'Dessau, Alemania' },
    source: source(
      'Bauhaus Building in Dessau',
      'Bauhaus Dessau Foundation',
      'https://www.bauhaus-dessau.de/en/architecture/bauhaus-building.html',
    ),
  },
  {
    slug: 'migrant-mother',
    details: {
      technique: 'Fotografía',
      materials: 'Gelatina de plata sobre papel',
      dimensions: '32,4 × 26 cm',
      location: 'Library of Congress, Washington, D.C.',
    },
    source: source(
      'Migrant Mother',
      'Library of Congress',
      'https://www.loc.gov/pictures/item/2017762891/',
    ),
  },
  {
    slug: 'maman',
    details: {
      technique: 'Escultura',
      materials: 'Bronce, acero inoxidable y mármol',
      location: 'Tate Modern, Londres',
    },
    source: source('Maman', 'Tate', 'https://www.tate.org.uk/art/artworks/bourgeois-maman-t12625'),
  },
  {
    slug: 'cut-piece',
    details: { technique: 'Performance' },
    source: source('Cut Piece', 'Guggenheim Museum', 'https://www.guggenheim.org/artwork/9534'),
  },
  {
    slug: 'nighthawks',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '84,1 × 152,4 cm',
      location: 'Art Institute of Chicago, Chicago',
    },
    source: source(
      'Nighthawks',
      'Art Institute of Chicago',
      'https://www.artic.edu/artworks/111628/nighthawks',
    ),
  },
  {
    slug: 'campbells-soup-cans',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Polímero sintético sobre lienzo',
      dimensions: 'Cada lienzo: 50,8 × 40,6 cm',
      location: 'Museum of Modern Art, Nueva York',
    },
    source: source(
      'Campbell’s Soup Cans',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79809',
    ),
  },
  {
    slug: 'la-traicion-de-las-imagenes',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '63,5 × 93,98 cm',
      location: 'Los Angeles County Museum of Art, Los Ángeles',
    },
    source: source(
      'The Treachery of Images',
      'Los Angeles County Museum of Art',
      'https://www.lacma.org/art/exhibition/magritte',
    ),
  },
  {
    slug: 'venus-de-willendorf',
    details: {
      technique: 'Escultura',
      materials: 'Caliza oolítica',
      dimensions: '11,1 cm de altura',
      location: 'Naturhistorisches Museum Wien, Viena',
    },
    source: source(
      'Venus of Willendorf',
      'Naturhistorisches Museum Wien',
      'https://www.nhm-wien.ac.at/en/research/prehistory/venus_of_willendorf',
    ),
  },
  {
    slug: 'saturno-devorando-a-su-hijo',
    details: {
      technique: 'Pintura mural trasladada',
      materials: 'Óleo sobre yeso trasladado a lienzo',
      dimensions: '143,5 × 81,4 cm',
      location: 'Museo Nacional del Prado, Madrid',
    },
    source: source(
      'Saturn Devouring His Son',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/en/the-collection/art-work/saturn-devouring-his-son/18110a75-b0e7-4b8e-bc60-1a7c7b4a2f6a',
    ),
  },
  {
    slug: 'impresion-sol-naciente',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '48 × 63 cm',
      location: 'Musée Marmottan Monet, París',
    },
    source: source(
      'Impression, Sunrise',
      'Musée Marmottan Monet',
      'https://www.marmottan.fr/en/monet-impression-sunrise/',
    ),
  },
  {
    slug: 'piedra-del-sol',
    details: {
      technique: 'Escultura',
      materials: 'Basalto',
      dimensions: '358 cm de diámetro',
      location: 'Museo Nacional de Antropología, Ciudad de México',
    },
    source: source('Piedra del Sol', 'Museo Nacional de Antropología', 'https://www.inah.gob.mx/'),
  },
  {
    slug: 'templo-de-kukulcan',
    details: { materials: 'Piedra caliza', location: 'Chichén Itzá, Yucatán, México' },
    source: source(
      'Pre-Hispanic City of Chichen-Itza',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/483/',
    ),
  },
  {
    slug: 'lineas-de-nazca',
    details: { technique: 'Geoglifos', location: 'Nazca y Palpa, Perú' },
    source: source(
      'Lines and Geoglyphs of Nasca and Palpa',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/700/',
    ),
  },
  {
    slug: 'extasis-de-santa-teresa',
    details: {
      technique: 'Escultura',
      materials: 'Mármol',
      location: 'Santa Maria della Vittoria, Roma',
    },
    source: source(
      'Santa Maria della Vittoria',
      'Soprintendenza Speciale Archeologia Belle Arti e Paesaggio di Roma',
      'https://soprintendenzaspecialeroma.it/',
    ),
  },
];
