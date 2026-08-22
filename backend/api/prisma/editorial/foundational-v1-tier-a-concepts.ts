import type { PilotEntry } from './foundational-v1-pilot';

const source = (title: string, url: string) => ({
  title,
  publisher: 'Getty Research Institute',
  url,
  note: 'Controlled vocabulary and reference context for JANO’s operational definition.',
});

export const foundationalV1TierAConcepts: PilotEntry[] = [
  {
    slug: 'muerte',
    definition:
      'Concepto para explorar cómo el arte representa la mortalidad, el duelo, la ausencia y las formas culturales de recordar a los muertos.',
    summary: {
      es: 'Muerte permite leer cómo las imágenes hacen visible la mortalidad y organizan el duelo. En JANO no designa sólo iconografías funerarias: también abarca violencia, pérdida, ritual, memoria y los modos en que una obra enfrenta la desaparición. Sirve para comparar una pintura religiosa, una escena de guerra o una práctica contemporánea sin reducirlas a un mismo significado.',
      en: 'Death helps readers examine how images make mortality visible and organise mourning. In JANO it does not name funerary imagery alone: it also includes violence, loss, ritual, memory, and the ways a work confronts disappearance. It makes it possible to compare religious painting, war scenes, and contemporary practice without reducing them to one meaning.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'memoria',
    definition:
      'Concepto para explorar cómo las obras conservan, disputan o transforman recuerdos individuales y colectivos.',
    summary: {
      es: 'Memoria reúne obras que no sólo evocan el pasado, sino que intervienen en cómo se conserva, se narra o se discute. Una imagen puede funcionar como testimonio, monumento, archivo, duelo o crítica de una historia oficial. En JANO el término ayuda a seguir relaciones entre guerra, identidad, patrimonio y los usos públicos de las imágenes.',
      en: 'Memory gathers works that do more than evoke the past: they intervene in how it is preserved, narrated, or contested. An image may act as testimony, monument, archive, mourning, or critique of official history. In JANO, the term traces relations among war, identity, heritage, and the public uses of images.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'poder',
    definition:
      'Concepto para explorar cómo las imágenes producen, negocian o cuestionan autoridad, jerarquía y legitimidad.',
    summary: {
      es: 'Poder permite estudiar cómo una obra organiza autoridad: quién es visible, quién mira, quién encarga una imagen y qué instituciones la sostienen. No se limita a retratos de gobernantes. Puede aparecer en la arquitectura, el museo, la propaganda, el cuerpo o una escena doméstica. En JANO orienta la exploración de las formas culturales de legitimidad y resistencia.',
      en: 'Power examines how a work produces, negotiates, or questions authority: who is visible, who looks, who commissions an image, and which institutions sustain it. It is not limited to portraits of rulers. It may appear in architecture, museums, propaganda, bodies, or domestic scenes. In JANO it guides exploration of cultural forms of legitimacy and resistance.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'religion',
    definition:
      'Concepto para explorar imágenes, objetos, espacios y prácticas vinculados con creencias, rituales, instituciones y experiencias religiosas.',
    summary: {
      es: 'Religión permite explorar el arte como imagen devocional, instrumento ritual, espacio de culto o campo de conflicto. No presupone una tradición única ni trata las obras como ilustraciones transparentes de una fe. En JANO ayuda a leer cómo las formas visuales median entre creencias, instituciones, cuerpos, comunidades y poder.',
      en: 'Religion explores art as devotional image, ritual instrument, worship space, or field of conflict. It assumes neither a single tradition nor that works transparently illustrate a faith. In JANO it helps readers see how visual forms mediate among belief, institutions, bodies, communities, and power.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'paisaje',
    definition:
      'Concepto para explorar la construcción visual de naturaleza, territorio, ambiente y relación humana con el entorno.',
    summary: {
      es: 'Paisaje no es sólo la representación de una vista exterior. En JANO nombra una forma de construir naturaleza, territorio y escala humana mediante encuadre, recorrido, trabajo, memoria o extracción. Permite vincular pinturas, estampas, fotografía, arquitectura y prácticas ambientales atendiendo a cómo cada una imagina la relación entre personas y entorno.',
      en: 'Landscape is not simply the depiction of an outdoor view. In JANO it names a way of constructing nature, territory, and human scale through framing, movement, labour, memory, or extraction. It links painting, printmaking, photography, architecture, and environmental practice through their different accounts of people and surroundings.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'colonialismo',
    definition:
      'Concepto para explorar cómo la dominación colonial afecta producción, circulación, clasificación, exhibición y lectura de imágenes y objetos.',
    summary: {
      es: 'Colonialismo permite leer el arte dentro de relaciones históricas de conquista, extracción, clasificación y resistencia. No equivale a una estética concreta: señala condiciones que afectan quién produce, colecciona, nombra y expone. En JANO abre recorridos entre patrimonio, raza, imperio, museos y prácticas que cuestionan relatos coloniales.',
      en: 'Colonialism reads art within historical relations of conquest, extraction, classification, and resistance. It is not a single aesthetic: it identifies conditions affecting who produces, collects, names, and exhibits. In JANO it opens paths among heritage, race, empire, museums, and practices that question colonial narratives.',
    },
    essay: `## Mirar también las condiciones de circulación

Colonialismo no nombra un estilo ni una iconografía reconocible a primera vista. Es una condición histórica que afecta quién puede producir imágenes, qué objetos se desplazan, quién los clasifica y bajo qué instituciones se vuelven visibles. Por eso no basta con usar el término para señalar obras realizadas durante un imperio. La pregunta es cómo relaciones de conquista, extracción y jerarquía continúan organizando la vida cultural de una imagen u objeto.

Un museo puede presentar una pieza como patrimonio universal y, al mismo tiempo, dejar en segundo plano las condiciones de excavación, compra, expolio o traslado que hicieron posible su presencia. Una clasificación aparentemente neutral puede conservar nombres y categorías heredadas de administraciones coloniales. Una imagen puede registrar un territorio, pero también contribuir a convertirlo en paisaje disponible, recurso o escenario para otros. Estas situaciones no son idénticas; deben investigarse con fuentes y contextos concretos.

El concepto tampoco debe transformar toda lectura en una acusación automática. Su utilidad depende de devolver preguntas específicas: ¿quién nombra el objeto?, ¿qué historias quedan fuera de una colección?, ¿qué comunidades sostienen interpretaciones distintas?, ¿qué se entiende por conservación, restitución o acceso? En muchos casos existen desacuerdos legítimos y voces situadas que no pueden comprimirse en una explicación única.

Los Bronces de Benín son una posible entrada porque conectan producción cortesana, violencia colonial, dispersión museística y debates de restitución. Pero no deben convertirse en un ejemplo que sustituya la diversidad de historias africanas. Del mismo modo, obras de América, Asia o Europa pueden implicar colonialismo de maneras diferentes: por la extracción de materiales, las rutas de comercio, las misiones, la representación de cuerpos o la formación de colecciones.

En JANO, colonialismo es una herramienta de lectura, no un atajo semántico. Debe llevar a relaciones documentadas y a preguntas que puedan sostenerse, no a un supernodo que conecte por analogía. Su valor editorial consiste en hacer visibles las condiciones de poder que una ficha factual por sí sola no alcanza a explicar, manteniendo abierta la necesidad de investigación y atribución.`,
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'retrato',
    definition:
      'Concepto para explorar la representación de una persona, su identidad, posición social, presencia y relación con quien mira.',
    summary: {
      es: 'Retrato permite explorar cómo una imagen construye la presencia de una persona y no sólo su parecido físico. Puede afirmar estatus, memoria, intimidad, deseo o distancia; también puede poner en cuestión quién merece ser representado. En JANO conecta pinturas, fotografías, esculturas y autorretratos mediante preguntas sobre identidad, mirada y poder.',
      en: 'Portraiture explores how an image constructs a person’s presence rather than merely physical likeness. It may assert status, memory, intimacy, desire, or distance; it can also question who deserves representation. In JANO it links painting, photography, sculpture, and self-portraiture through identity, looking, and power.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'arquitectura',
    definition:
      'Concepto para explorar edificios, espacios construidos y las ideas sociales, técnicas y políticas que los organizan.',
    summary: {
      es: 'Arquitectura permite explorar edificios y espacios construidos como formas materiales de organizar vida colectiva, poder, memoria y acceso. En JANO no se limita a estilos ni a autores: conecta técnicas, instituciones, ciudades y usos. Ayuda a leer una catedral, un museo o una casa moderna como experiencias espaciales y como construcciones históricas.',
      en: 'Architecture explores buildings and constructed spaces as material ways of organising collective life, power, memory, and access. In JANO it is not limited to styles or authors: it connects techniques, institutions, cities, and uses. It helps read a cathedral, museum, or modern house as spatial experiences and historical constructions.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
  {
    slug: 'fotografia',
    definition:
      'Concepto para explorar prácticas fotográficas y las relaciones entre cámara, registro, reproducción, archivo y mirada.',
    summary: {
      es: 'Fotografía reúne prácticas basadas en la cámara, pero no supone una relación automática con la verdad. En JANO permite explorar registro, documento, retrato, prensa, archivo, manipulación y reproducción. El concepto orienta una lectura de las imágenes fotográficas atendiendo tanto a su materialidad y circulación como a las decisiones de quien mira y produce.',
      en: 'Photography gathers camera-based practices without assuming an automatic relation to truth. In JANO it opens questions of record, document, portraiture, press, archive, manipulation, and reproduction. It guides a reading of photographs through their materiality and circulation as well as the decisions of those who make and view them.',
    },
    source: source(
      'Art & Architecture Thesaurus',
      'https://www.getty.edu/research/tools/vocabularies/aat/',
    ),
  },
];
