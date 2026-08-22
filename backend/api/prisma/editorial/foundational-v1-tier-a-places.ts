import type { PilotEntry } from './foundational-v1-pilot';

const source = (title: string, publisher: string, url: string) => ({
  title,
  publisher,
  url,
  note: 'Official institutional reference for identity and context.',
});

export const foundationalV1TierAPlaces: PilotEntry[] = [
  {
    slug: 'florencia',
    summary: {
      es: 'Florencia fue un centro decisivo para las artes del Renacimiento, sostenido por redes de talleres, comercio, patronazgo religioso y poder cívico. Su relevancia no se reduce a una lista de maestros: permite entender cómo arquitectura, escultura, pintura y conocimiento urbano se desarrollaron en un mismo entorno. En JANO es una entrada a Botticelli, Leonardo, Miguel Ángel, Renacimiento italiano y Uffizi.',
      en: 'Florence was a decisive centre for Renaissance art, sustained by networks of workshops, trade, religious patronage, and civic power. Its importance is not a list of masters alone: it helps explain how architecture, sculpture, painting, and urban knowledge developed within one environment. In JANO it opens paths to Botticelli, Leonardo, Michelangelo, the Italian Renaissance, and the Uffizi.',
    },
    source: source('Florence', 'Comune di Firenze', 'https://www.feelflorence.it/en'),
  },
  {
    slug: 'roma',
    summary: {
      es: 'Roma concentra capas de antigüedad, cristianismo, poder papal y modernidad que han convertido la ciudad en un laboratorio histórico para el arte. Sus monumentos, colecciones e instituciones muestran cómo las imágenes pueden sobrevivir, ser reutilizadas y adquirir sentidos nuevos. En JANO conecta la antigüedad clásica, el barroco, Caravaggio, Bernini y la relación entre arquitectura, religión y autoridad.',
      en: 'Rome brings together layers of antiquity, Christianity, papal power, and modernity that make the city a historical laboratory for art. Its monuments, collections, and institutions show how images survive, are reused, and acquire new meanings. In JANO it connects classical antiquity, the Baroque, Caravaggio, Bernini, and the relation among architecture, religion, and authority.',
    },
    source: source('Roma Capitale', 'Roma Capitale', 'https://www.comune.roma.it/'),
  },
  {
    slug: 'madrid',
    summary: {
      es: 'Madrid se consolidó como centro artístico de la monarquía hispánica y conserva una red institucional decisiva para leer la pintura europea. La ciudad permite relacionar corte, colección real, museo y espacio urbano sin confundirlos. En JANO es una entrada a Velázquez, Goya, el Prado y las maneras en que el poder político ha dado forma a la circulación de las imágenes.',
      en: 'Madrid became an artistic centre of the Hispanic monarchy and retains an institutional network essential to reading European painting. The city relates court, royal collection, museum, and urban space without conflating them. In JANO it opens paths to Velázquez, Goya, the Prado, and the ways political power has shaped the circulation of images.',
    },
    source: source('Madrid Destino', 'Ayuntamiento de Madrid', 'https://www.esmadrid.com/en'),
  },
  {
    slug: 'nueva-york',
    summary: {
      es: 'Nueva York fue un nodo central para el arte moderno y contemporáneo, especialmente desde mediados del siglo XX, por la concentración de artistas, galerías, museos, mercados y medios. No funciona como explicación única de la modernidad: es una infraestructura cultural con tensiones económicas e institucionales. En JANO conecta abstracción, Pop Art, fotografía, museo y prácticas globales contemporáneas.',
      en: 'New York became a central node for modern and contemporary art, especially from the mid-twentieth century, through its concentration of artists, galleries, museums, markets, and media. It is not a single explanation for modernity but a cultural infrastructure with economic and institutional tensions. In JANO it connects abstraction, Pop Art, photography, museums, and global contemporary practices.',
    },
    source: source(
      'NYC Arts',
      'New York City Department of Cultural Affairs',
      'https://www.nyc.gov/site/dcla/index.page',
    ),
  },
  {
    slug: 'louvre',
    summary: {
      es: 'El Museo del Louvre reúne colecciones que atraviesan épocas, regiones y medios, y es también una institución fundamental para pensar la historia moderna del museo. Sus obras no forman un relato neutral: proceden de colecciones reales, adquisiciones, excavaciones y transformaciones políticas. En JANO el Louvre conecta La Gioconda, antigüedad, pintura europea y las condiciones institucionales de ver y conservar arte.',
      en: 'The Musée du Louvre brings together collections across periods, regions, and media, and is also fundamental for thinking about the modern history of museums. Its works do not form a neutral narrative: they come from royal collections, acquisitions, excavations, and political transformations. In JANO it connects the Mona Lisa, antiquity, European painting, and the institutional conditions of seeing and preserving art.',
    },
    source: source('Musée du Louvre', 'Musée du Louvre', 'https://www.louvre.fr/en'),
  },
  {
    slug: 'uffizi',
    summary: {
      es: 'La Galería Uffizi conserva una de las colecciones más importantes para estudiar el Renacimiento italiano y la historia del coleccionismo mediceo. Su papel en JANO no es sólo custodiar obras: permite explorar cómo Florencia, patronazgo, mitología, retrato y circulación de prestigio se entrelazan. Es una entrada especialmente útil a Botticelli y a la pintura florentina.',
      en: 'The Uffizi Galleries hold one of the most important collections for studying the Italian Renaissance and Medici collecting. Their role in JANO is not simply custodial: they help explore how Florence, patronage, mythology, portraiture, and the circulation of prestige intertwine. They are a particularly useful entry point to Botticelli and Florentine painting.',
    },
    source: source('Uffizi Galleries', 'Gallerie degli Uffizi', 'https://www.uffizi.it/en'),
  },
  {
    slug: 'moma',
    summary: {
      es: 'El Museum of Modern Art ha desempeñado un papel decisivo en la exposición, legitimación y canonización del arte moderno. Sus colecciones y narrativas han sido influyentes, pero también discutidas por las exclusiones que producen. En JANO es un nodo institucional para explorar modernismo, fotografía, diseño, abstracción, Pop Art y la forma en que un museo organiza la historia reciente.',
      en: 'The Museum of Modern Art has played a decisive role in exhibiting, legitimising, and canonising modern art. Its collections and narratives have been influential, but also contested for the exclusions they produce. In JANO it is an institutional node for exploring modernism, photography, design, abstraction, Pop Art, and the way a museum organises recent history.',
    },
    source: source('Museum of Modern Art', 'Museum of Modern Art', 'https://www.moma.org/'),
  },
];
