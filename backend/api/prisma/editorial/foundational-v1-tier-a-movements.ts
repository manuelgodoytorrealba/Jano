import type { PilotEntry } from './foundational-v1-pilot';

const source = (title: string, publisher: string, url: string) => ({
  title,
  publisher,
  url,
  note: 'Institutional or curatorial reference for movement context.',
});

export const foundationalV1TierAMovements: PilotEntry[] = [
  {
    slug: 'renacimiento-italiano',
    summary: {
      es: 'El Renacimiento italiano reúne transformaciones desarrolladas en ciudades como Florencia, Roma y Venecia entre los siglos XV y XVI. No fue un lenguaje uniforme: articuló estudio de la antigüedad, nuevas construcciones del espacio, patronazgo y cambios en la posición social del artista. En JANO permite explorar obras y trayectorias sin reducir el periodo a una lista de genios aislados.',
      en: 'The Italian Renaissance gathers transformations developed in cities such as Florence, Rome, and Venice between the fifteenth and sixteenth centuries. It was not a uniform language: it joined the study of antiquity, new constructions of space, patronage, and changes in the artist’s social position. In JANO it explores works and careers without reducing the period to isolated geniuses.',
    },
    source: source(
      'The Art of Renaissance Europe',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/-/media/files/learn/for-educators/publications-for-educators/renaissance.pdf',
    ),
  },
  {
    slug: 'barroco',
    summary: {
      es: 'Barroco designa prácticas desarrolladas en Europa y sus territorios coloniales durante los siglos XVII y XVIII, marcadas por intensidad sensorial, teatralidad y complejas relaciones entre imagen, fe y poder. No es sólo un estilo exuberante. En JANO permite leer cómo pintura, escultura y arquitectura producen experiencia, persuasión y presencia en contextos religiosos, cortesanos y urbanos.',
      en: 'Baroque names practices developed in Europe and its colonial territories during the seventeenth and eighteenth centuries, marked by sensory intensity, theatricality, and complex relations among image, faith, and power. It is not simply an exuberant style. In JANO it examines how painting, sculpture, and architecture produce experience, persuasion, and presence in religious, courtly, and urban contexts.',
    },
    source: source(
      'Baroque Art',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/toah/hd/baro/hd_baro.htm',
    ),
  },
  {
    slug: 'neoclasicismo',
    summary: {
      es: 'El neoclasicismo recurrió a la antigüedad grecorromana para pensar virtud cívica, razón, disciplina y forma pública en un periodo de revoluciones. Sus referencias clásicas no fueron neutrales: sirvieron para imaginar nuevos órdenes políticos y morales. En JANO conecta pintura, escultura y arquitectura con debates sobre historia, ciudadanía, imperio y autoridad.',
      en: 'Neoclassicism drew on Greco-Roman antiquity to think about civic virtue, reason, discipline, and public form in an age of revolutions. Its classical references were not neutral: they helped imagine new political and moral orders. In JANO it connects painting, sculpture, and architecture with debates about history, citizenship, empire, and authority.',
    },
    source: source(
      'Neoclassicism',
      'Tate',
      'https://www.tate.org.uk/art/art-terms/n/neoclassicism',
    ),
  },
  {
    slug: 'romanticismo',
    summary: {
      es: 'El romanticismo reúne prácticas del siglo XIX que cuestionaron la confianza exclusiva en razón, norma y progreso. Paisaje, ruina, revolución, miedo y experiencia subjetiva adquirieron una intensidad nueva, aunque con posiciones políticas muy distintas. En JANO abre relaciones entre Goya, Delacroix, Turner y las maneras de imaginar naturaleza, libertad, violencia e historia.',
      en: 'Romanticism gathers nineteenth-century practices that questioned exclusive confidence in reason, norm, and progress. Landscape, ruin, revolution, fear, and subjective experience took on new intensity, though from very different political positions. In JANO it relates Goya, Delacroix, Turner, and ways of imagining nature, freedom, violence, and history.',
    },
    source: source('Romanticism', 'Tate', 'https://www.tate.org.uk/art/art-terms/r/romanticism'),
  },
  {
    slug: 'postimpresionismo',
    summary: {
      es: 'Postimpresionismo es una etiqueta útil, aunque retrospectiva, para prácticas que ampliaron los problemas abiertos por el impresionismo desde finales del siglo XIX. Cézanne, Van Gogh y otros artistas intensificaron estructura, color, símbolo y expresión sin formar un grupo único. En JANO permite seguir la transición entre modernidad pictórica, paisaje, subjetividad y las vanguardias del siglo XX.',
      en: 'Post-Impressionism is a useful, though retrospective, label for practices that expanded problems opened by Impressionism from the late nineteenth century. Cézanne, Van Gogh, and others intensified structure, colour, symbol, and expression without forming a single group. In JANO it traces the transition among pictorial modernity, landscape, subjectivity, and twentieth-century avant-gardes.',
    },
    source: source(
      'Post-Impressionism',
      'Tate',
      'https://www.tate.org.uk/art/art-terms/p/post-impressionism',
    ),
  },
  {
    slug: 'expresionismo',
    summary: {
      es: 'El expresionismo designa prácticas que privilegiaron intensidad, distorsión, color y gesto para abordar experiencias subjetivas y sociales de la modernidad. No describe una emoción universal ni un único grupo: sus variantes respondieron a contextos alemanes, nórdicos y centroeuropeos distintos. En JANO conecta Munch, cuerpo, ansiedad, ciudad y los límites de la representación naturalista.',
      en: 'Expressionism names practices that privileged intensity, distortion, colour, and gesture to address subjective and social experiences of modernity. It describes neither a universal emotion nor a single group: its variants responded to different German, Nordic, and Central European contexts. In JANO it connects Munch, the body, anxiety, the city, and the limits of naturalistic representation.',
    },
    source: source(
      'Expressionism',
      'Tate',
      'https://www.tate.org.uk/art/art-terms/e/expressionism',
    ),
  },
  {
    slug: 'dadaismo',
    summary: {
      es: 'Dadaísmo reunió respuestas radicales a la guerra, la cultura burguesa y las convenciones artísticas durante y después de la Primera Guerra Mundial. Sus operaciones incluyeron azar, collage, performance, poesía y readymade; no una estética homogénea. En JANO abre una lectura de Duchamp y Fountain como problemas sobre institución, lenguaje, autoría y objeto.',
      en: 'Dada gathered radical responses to war, bourgeois culture, and artistic conventions during and after the First World War. Its operations included chance, collage, performance, poetry, and the readymade, rather than a homogeneous aesthetic. In JANO it reads Duchamp and Fountain through questions of institution, language, authorship, and objecthood.',
    },
    source: source('Dada', 'Museum of Modern Art', 'https://www.moma.org/collection/terms/dada'),
  },
  {
    slug: 'bauhaus-movement',
    summary: {
      es: 'Bauhaus fue una escuela y un entorno de experimentación que relacionó arte, arquitectura, diseño, artesanía e industria entre 1919 y 1933. Su historia no se reduce a una estética de líneas limpias: incluye pedagogía, trabajo colectivo, tecnología, género y exilio. En JANO permite explorar el edificio de Dessau, Gropius y la relación entre forma moderna e infraestructura social.',
      en: 'Bauhaus was a school and experimental environment that connected art, architecture, design, craft, and industry between 1919 and 1933. Its history is not reducible to a clean-lined aesthetic: it includes pedagogy, collective work, technology, gender, and exile. In JANO it explores the Dessau building, Gropius, and the relation between modern form and social infrastructure.',
    },
    source: source('Bauhaus', 'Bauhaus Dessau Foundation', 'https://www.bauhaus-dessau.de/en/'),
  },
  {
    slug: 'surrealismo',
    summary: {
      es: 'El surrealismo buscó alterar las convenciones de la razón y de la imagen mediante sueño, deseo, azar y asociaciones inesperadas. Sus artistas y escritores no compartieron una sola política ni una sola técnica, y sus vínculos con colonialismo y género requieren lectura crítica. En JANO conecta Dalí, Magritte, memoria, cuerpo y representación como problemas abiertos, no como una iconografía automática.',
      en: 'Surrealism sought to unsettle conventions of reason and image through dream, desire, chance, and unexpected association. Its artists and writers shared neither one politics nor one technique, and its relations to colonialism and gender require critical reading. In JANO it connects Dalí, Magritte, memory, body, and representation as open problems rather than automatic iconography.',
    },
    source: source('Surrealism', 'Tate', 'https://www.tate.org.uk/art/art-terms/s/surrealism'),
  },
  {
    slug: 'expresionismo-abstracto',
    summary: {
      es: 'El expresionismo abstracto reúne prácticas desarrolladas en Estados Unidos tras la Segunda Guerra Mundial que hicieron del gesto, el campo cromático y la escala maneras de pensar la pintura. La etiqueta no borra diferencias entre artistas ni el contexto institucional que convirtió Nueva York en un centro influyente. En JANO enlaza Pollock, Rothko, abstracción, cuerpo y la política cultural de posguerra.',
      en: 'Abstract Expressionism gathers practices developed in the United States after the Second World War that made gesture, colour field, and scale ways of thinking painting. The label does not erase differences among artists or the institutional context that made New York influential. In JANO it links Pollock, Rothko, abstraction, body, and postwar cultural politics.',
    },
    source: source(
      'Abstract Expressionism',
      'Museum of Modern Art',
      'https://www.moma.org/collection/terms/abstract-expressionism',
    ),
  },
  {
    slug: 'pop-art',
    summary: {
      es: 'Pop Art trabajó con imágenes de publicidad, prensa, consumo y celebridad para cuestionar las fronteras entre cultura popular, arte y mercado. No es una simple celebración de lo comercial: puede repetir, desplazar o enfriar imágenes para hacer visible su circulación. En JANO conecta Warhol, Nueva York, reproducción, consumo y museo.',
      en: 'Pop Art worked with images from advertising, press, consumption, and celebrity to question the boundaries between popular culture, art, and market. It is not merely a celebration of commerce: it may repeat, displace, or cool images in order to make their circulation visible. In JANO it connects Warhol, New York, reproduction, consumption, and museums.',
    },
    source: source('Pop Art', 'Tate', 'https://www.tate.org.uk/art/art-terms/p/pop-art'),
  },
  {
    slug: 'minimalismo',
    summary: {
      es: 'El minimalismo redujo deliberadamente forma, material y composición para desplazar la atención hacia escala, repetición, espacio y experiencia del espectador. No equivale a una ausencia de significado: sus objetos dependen de galerías, arquitectura y cuerpos que los recorren. En JANO abre caminos entre escultura, arquitectura, museo y las condiciones físicas de mirar.',
      en: 'Minimalism deliberately reduced form, material, and composition in order to shift attention to scale, repetition, space, and the spectator’s experience. It does not mean an absence of meaning: its objects depend on galleries, architecture, and bodies moving around them. In JANO it opens paths among sculpture, architecture, museums, and the physical conditions of looking.',
    },
    source: source('Minimalism', 'Tate', 'https://www.tate.org.uk/art/art-terms/m/minimalism'),
  },
  {
    slug: 'arte-conceptual',
    summary: {
      es: 'Arte conceptual designa prácticas en las que idea, instrucción, lenguaje, documento o sistema pueden importar más que un objeto único. No elimina la materialidad: la desplaza hacia soportes, instituciones y modos de circulación. En JANO permite explorar autoría, archivo, museo y las herencias de Duchamp sin reducirlas a una sola genealogía.',
      en: 'Conceptual art names practices in which idea, instruction, language, document, or system may matter more than a unique object. It does not eliminate materiality: it shifts it toward supports, institutions, and modes of circulation. In JANO it explores authorship, archive, museums, and Duchamp’s legacies without reducing them to one genealogy.',
    },
    source: source(
      'Conceptual Art',
      'Tate',
      'https://www.tate.org.uk/art/art-terms/c/conceptual-art',
    ),
  },
  {
    slug: 'ukiyo-e',
    summary: {
      es: 'Ukiyo-e fue una cultura de imágenes impresas y pintadas activa en el Japón del periodo Edo. Sus retratos de actores, escenas urbanas y paisajes dependieron de redes de dibujantes, grabadores, impresores y editores; no de una autoría aislada. En JANO conecta Hokusai, La gran ola, paisaje, técnica de impresión y circulación popular.',
      en: 'Ukiyo-e was a culture of printed and painted images active in Edo-period Japan. Its actor portraits, urban scenes, and landscapes depended on networks of designers, block cutters, printers, and publishers rather than isolated authorship. In JANO it connects Hokusai, The Great Wave, landscape, print technique, and popular circulation.',
    },
    source: source(
      'Ukiyo-e',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/toah/hd/ukiy/hd_ukiy.htm',
    ),
  },
  {
    slug: 'arte-islamico',
    summary: {
      es: 'Arte islámico es una categoría amplia para objetos, arquitecturas e imágenes producidos en contextos históricos vinculados al islam. No designa una tradición uniforme ni se define sólo por la ausencia de figuras. En JANO permite explorar caligrafía, geometría, arquitectura, circulación de materiales y relaciones entre práctica religiosa, corte y vida cotidiana.',
      en: 'Islamic art is a broad category for objects, architectures, and images made in historical contexts linked to Islam. It names neither a uniform tradition nor one defined solely by the absence of figures. In JANO it explores calligraphy, geometry, architecture, material circulation, and relations among religious practice, courts, and everyday life.',
    },
    source: source(
      'Islamic Art',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/toah/hd/islm/hd_islm.htm',
    ),
  },
  {
    slug: 'arte-africano',
    summary: {
      es: 'Arte africano no nombra un estilo único, sino múltiples tradiciones, periodos y prácticas del continente y su diáspora. En JANO se usa como entrada inicial que debe conducir pronto a contextos más específicos, no como sustituto de ellos. Permite abordar objetos, patrimonio, colonialismo, ritual y las historias de extracción y exhibición museística.',
      en: 'African art does not name a single style but multiple traditions, periods, and practices across the continent and its diaspora. In JANO it is an initial entry that should quickly lead to more specific contexts, not replace them. It addresses objects, heritage, colonialism, ritual, and histories of extraction and museum display.',
    },
    source: source(
      'Arts of Africa',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/art/collection/search#!?department=10',
    ),
  },
  {
    slug: 'arte-maya',
    summary: {
      es: 'Arte maya reúne prácticas desarrolladas por comunidades mayas en Mesoamérica a lo largo de muchos siglos. Arquitectura, escultura, cerámica, escritura e imagen ritual formaron sistemas complejos que no deben reducirse a un pasado arqueológico cerrado. En JANO permite explorar Chichén Itzá, territorio, religión, patrimonio y las continuidades culturales mayas.',
      en: 'Maya art gathers practices developed by Maya communities in Mesoamerica over many centuries. Architecture, sculpture, ceramics, writing, and ritual image formed complex systems that should not be reduced to a closed archaeological past. In JANO it explores Chichén Itzá, territory, religion, heritage, and Maya cultural continuities.',
    },
    source: source(
      'Maya Art',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/toah/hd/maya/hd_maya.htm',
    ),
  },
];
