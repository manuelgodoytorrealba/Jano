import type { PilotEntry } from './foundational-v1-pilot';
const source = (title: string, publisher: string, url: string) => ({
  title,
  publisher,
  url,
  note: 'Institutional reference for work context.',
});

export const foundationalV1TierAWorkSummaries: PilotEntry[] = [
  {
    slug: 'venus-de-willendorf',
    summary: {
      es: 'La Venus de Willendorf es una pequeña figura paleolítica cuya escala contrasta con la intensidad de las preguntas que plantea sobre cuerpo, fertilidad, identidad y uso ritual. No conocemos con certeza su función original, por lo que JANO evita tratarla como un símbolo transparente. Es una entrada para explorar prehistoria, materialidad y los límites de interpretar objetos sin escritura.',
      en: 'The Venus of Willendorf is a small Palaeolithic figure whose scale contrasts with the intensity of the questions it raises about body, fertility, identity, and ritual use. Its original function is not known with certainty, so JANO does not treat it as a transparent symbol. It opens paths to prehistory, materiality, and the limits of interpreting objects without writing.',
    },
    source: source(
      'Venus of Willendorf',
      'Naturhistorisches Museum Wien',
      'https://www.nhm-wien.ac.at/en/research/prehistory/venus_of_willendorf',
    ),
  },
  {
    slug: 'cueva-de-lascaux',
    summary: {
      es: 'Las pinturas de Lascaux forman un conjunto paleolítico donde animales, signos y espacio subterráneo obligan a pensar la imagen fuera de los marcos posteriores de “obra” y “museo”. Su significado no está cerrado por una lectura única. En JANO permiten explorar arte rupestre, ritual, naturaleza y las condiciones materiales de conservación y reproducción del patrimonio.',
      en: 'The paintings of Lascaux form a Palaeolithic ensemble in which animals, signs, and underground space require thinking about images outside later frameworks of “work” and “museum.” Their meaning is not settled by a single reading. In JANO they open paths to rock art, ritual, nature, and the material conditions of preserving and reproducing heritage.',
    },
    source: source(
      'Lascaux',
      'Ministère de la Culture',
      'https://archeologie.culture.gouv.fr/lascaux/en',
    ),
  },
  {
    slug: 'busto-de-nefertiti',
    summary: {
      es: 'El busto de Nefertiti condensa problemas de retrato, poder dinástico, idealización y museo. Procede del contexto artístico de Amarna, donde la corte de Akenatón impulsó transformaciones religiosas y visuales. En JANO permite explorar arte egipcio, cuerpo, realeza y las historias de excavación y traslado que condicionan la vida moderna de los objetos antiguos.',
      en: 'The bust of Nefertiti condenses questions of portraiture, dynastic power, idealisation, and museum display. It comes from the artistic context of Amarna, where Akhenaten’s court fostered religious and visual transformations. In JANO it opens paths to Egyptian art, body, royalty, and the histories of excavation and transfer that shape ancient objects’ modern lives.',
    },
    source: source(
      'Bust of Nefertiti',
      'Staatliche Museen zu Berlin',
      'https://www.smb.museum/en/museums-institutions/neues-museum/collection-research/collection/egyptian-museum-and-papyrus-collection/',
    ),
  },
  {
    slug: 'partenon',
    summary: {
      es: 'El Partenón fue un templo de la Acrópolis ateniense y se ha convertido en un objeto central para pensar arquitectura, antigüedad, patrimonio y apropiación política. Su historia no termina en la Grecia clásica: transformaciones, expolios y debates sobre restitución forman parte de cómo se entiende hoy. En JANO conecta arte griego, ciudad, poder y museo.',
      en: 'The Parthenon was a temple on the Athenian Acropolis and has become central to thinking about architecture, antiquity, heritage, and political appropriation. Its history does not end in classical Greece: transformations, removals, and restitution debates shape how it is understood today. In JANO it connects Greek art, city, power, and museum.',
    },
    source: source(
      'The Parthenon',
      'Acropolis Museum',
      'https://www.theacropolismuseum.gr/en/parthenon',
    ),
  },
  {
    slug: 'doryphoros',
    summary: {
      es: 'El Doríforo de Policleto es conocido sobre todo por copias romanas de un original griego perdido. Más que una figura aislada, plantea una teoría de proporción, equilibrio y movimiento que influyó en la historia del cuerpo ideal. En JANO permite explorar escultura griega, canon, cuerpo y la diferencia entre un original desaparecido y sus supervivencias materiales.',
      en: 'Polykleitos’s Doryphoros is known chiefly through Roman copies of a lost Greek original. More than an isolated figure, it proposes a theory of proportion, balance, and movement that shaped the history of the ideal body. In JANO it explores Greek sculpture, canon, body, and the difference between a vanished original and its material survivals.',
    },
    source: source(
      'Polykleitos',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/toah/hd/polk/hd_polk.htm',
    ),
  },
  {
    slug: 'hagia-sophia',
    summary: {
      es: 'Santa Sofía fue construida en Constantinopla como iglesia imperial y ha tenido usos religiosos distintos a lo largo de su historia. Su cúpula, luz y escala hacen visible una ambición arquitectónica, pero su relevancia también depende de cambios políticos y devocionales. En JANO conecta arte bizantino, arquitectura, religión, Estambul y patrimonio.',
      en: 'Hagia Sophia was built in Constantinople as an imperial church and has had different religious uses across its history. Its dome, light, and scale make an architectural ambition visible, but its importance also depends on political and devotional change. In JANO it connects Byzantine art, architecture, religion, Istanbul, and heritage.',
    },
    source: source(
      'Hagia Sophia',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/356/',
    ),
  },
  {
    slug: 'gran-mezquita-de-cordoba',
    summary: {
      es: 'La Mezquita de Córdoba reúne ampliaciones, transformaciones y usos que impiden leerla como un monumento de identidad única. Su arquitectura organiza luz, ritmo, oración y memoria histórica a través de periodos islámicos y cristianos. En JANO permite explorar arte islámico, arquitectura, religión, al-Ándalus y las complejidades del patrimonio compartido.',
      en: 'The Great Mosque of Córdoba brings together expansions, transformations, and uses that prevent reading it as a monument of a single identity. Its architecture organises light, rhythm, prayer, and historical memory across Islamic and Christian periods. In JANO it explores Islamic art, architecture, religion, al-Andalus, and the complexities of shared heritage.',
    },
    source: source(
      'Mezquita-Catedral de Córdoba',
      'Mezquita-Catedral de Córdoba',
      'https://mezquita-catedraldecordoba.es/en/',
    ),
  },
  {
    slug: 'tapiz-de-bayeux',
    summary: {
      es: 'El Tapiz de Bayeux narra la conquista normanda de Inglaterra mediante imagen, texto y ritmo secuencial. No funciona como una crónica neutral: organiza legitimidad, violencia y memoria desde una perspectiva concreta. En JANO permite explorar Edad Media, narrativa visual, guerra y la relación entre bordado, historia y poder político.',
      en: 'The Bayeux Tapestry narrates the Norman conquest of England through image, text, and sequential rhythm. It is not a neutral chronicle: it organises legitimacy, violence, and memory from a particular perspective. In JANO it explores the Middle Ages, visual narrative, war, and the relation among embroidery, history, and political power.',
    },
    source: source(
      'The Bayeux Tapestry',
      'Musée de la Tapisserie de Bayeux',
      'https://www.bayeuxmuseum.com/en/the-bayeux-tapestry/',
    ),
  },
  {
    slug: 'catedral-de-chartres',
    summary: {
      es: 'La Catedral de Chartres articula arquitectura, escultura y vidrieras como una experiencia espacial y ritual. Su importancia no reside sólo en conservar un repertorio gótico excepcional, sino en mostrar cómo una comunidad, una liturgia y un edificio producen sentido conjuntamente. En JANO conecta gótico, religión, luz, ciudad y patrimonio.',
      en: 'Chartres Cathedral brings architecture, sculpture, and stained glass together as a spatial and ritual experience. Its importance lies not only in preserving an exceptional Gothic repertoire, but in showing how a community, liturgy, and building produce meaning together. In JANO it connects Gothic art, religion, light, city, and heritage.',
    },
    source: source(
      'Chartres Cathedral',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/81/',
    ),
  },
  {
    slug: 'el-nacimiento-de-venus',
    summary: {
      es: 'El nacimiento de Venus transforma un mito clásico en una imagen de belleza, deseo y prestigio cultural dentro de la Florencia medicea. No debe leerse sólo como una celebración abstracta de lo femenino: su cuerpo, sus referencias literarias y su circulación posterior abren preguntas sobre mirada y poder. En JANO conecta Botticelli, Renacimiento, mito, belleza y Uffizi.',
      en: 'The Birth of Venus turns a classical myth into an image of beauty, desire, and cultural prestige in Medici Florence. It should not be read simply as an abstract celebration of femininity: its body, literary references, and later circulation raise questions about looking and power. In JANO it connects Botticelli, Renaissance, myth, beauty, and the Uffizi.',
    },
    source: source(
      'The Birth of Venus',
      'Gallerie degli Uffizi',
      'https://www.uffizi.it/en/artworks/birth-of-venus',
    ),
  },
  {
    slug: 'ultima-cena',
    summary: {
      es: 'La última cena organiza un episodio religioso como una escena de tensión entre comunidad, revelación y traición. Leonardo dispone los gestos y las reacciones en torno a una mesa que convierte la perspectiva en instrumento dramático. En JANO conecta Renacimiento, religión, mirada y las condiciones materiales de una pintura mural especialmente vulnerable.',
      en: 'The Last Supper organises a religious episode as a scene of tension among community, revelation, and betrayal. Leonardo arranges gestures and reactions around a table that makes perspective a dramatic instrument. In JANO it connects Renaissance, religion, looking, and the material conditions of a particularly vulnerable mural painting.',
    },
    source: source(
      'The Last Supper',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/93/',
    ),
  },
  {
    slug: 'david-de-miguel-angel',
    summary: {
      es: 'El David de Miguel Ángel convierte la figura bíblica en una imagen de vigilancia, tensión y ambición cívica. Su escala y su historia de emplazamientos transformaron una escultura en símbolo de Florencia, pero la obra también exige atención a anatomía, piedra y punto de vista. En JANO conecta Renacimiento, cuerpo, poder y espacio público.',
      en: 'Michelangelo’s David turns the biblical figure into an image of vigilance, tension, and civic ambition. Its scale and history of placement transformed a sculpture into a symbol of Florence, but the work also asks for attention to anatomy, stone, and viewpoint. In JANO it connects Renaissance, body, power, and public space.',
    },
    source: source(
      'David by Michelangelo',
      'Galleria dell’Accademia di Firenze',
      'https://www.galleriaaccademiafirenze.it/en/artworks/david-michelangelo/',
    ),
  },
  {
    slug: 'escuela-de-atenas',
    summary: {
      es: 'La escuela de Atenas reúne filósofos antiguos en una arquitectura ideal que presenta el conocimiento como encuentro, debate y orden visual. Rafael no ilustra simplemente una lista de pensadores: construye una imagen del prestigio intelectual útil para la Roma papal. En JANO conecta Renacimiento, antigüedad, arquitectura, filosofía y poder institucional.',
      en: 'The School of Athens brings ancient philosophers together in an ideal architecture that presents knowledge as encounter, debate, and visual order. Raphael does not merely illustrate a list of thinkers: he constructs an image of intellectual prestige useful to papal Rome. In JANO it connects Renaissance, antiquity, architecture, philosophy, and institutional power.',
    },
    source: source(
      'Raphael Rooms',
      'Musei Vaticani',
      'https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/stanze-di-raffaello.html',
    ),
  },
  {
    slug: 'vocacion-de-san-mateo',
    summary: {
      es: 'La vocación de san Mateo sitúa una llamada religiosa dentro de una habitación poblada por cuerpos, dinero y luz lateral. Caravaggio desplaza el episodio bíblico hacia una escena de proximidad cotidiana, haciendo de la mirada y el gesto una cuestión moral. En JANO conecta Barroco, religión, luz, ciudad y representación.',
      en: 'The Calling of Saint Matthew places a religious summons inside a room filled with bodies, money, and side light. Caravaggio brings the biblical episode into an everyday proximity, making looking and gesture moral questions. In JANO it connects Baroque, religion, light, city, and representation.',
    },
    source: source(
      'The Calling of Saint Matthew',
      'San Luigi dei Francesi',
      'https://www.sanluigideifrancesi.it/',
    ),
  },
  {
    slug: 'ronda-de-noche',
    summary: {
      es: 'La ronda de noche transforma un retrato colectivo de milicia en una escena de acción, luz y organización urbana. Rembrandt no ordena las figuras como un inventario de rangos: crea una situación donde grupo, ciudad y espectáculo se cruzan. En JANO conecta Barroco neerlandés, Ámsterdam, retrato, poder cívico y vida colectiva.',
      en: 'The Night Watch turns a militia group portrait into a scene of action, light, and urban organisation. Rembrandt does not arrange its figures as an inventory of ranks: he creates a situation where group, city, and spectacle intersect. In JANO it connects Dutch Baroque, Amsterdam, portraiture, civic power, and collective life.',
    },
    source: source(
      'The Night Watch',
      'Rijksmuseum',
      'https://www.rijksmuseum.nl/en/collection/SK-C-5',
    ),
  },
  {
    slug: 'joven-de-la-perla',
    summary: {
      es: 'La joven de la perla no es un retrato en sentido estricto, sino una tronie: un estudio de cabeza, gesto, vestuario y luz. La proximidad de la figura y su giro hacia el espectador producen una presencia intensa sin dar una identidad biográfica cerrada. En JANO conecta Vermeer, retrato, mirada, cuerpo y pintura neerlandesa.',
      en: 'Girl with a Pearl Earring is not a portrait in the strict sense but a tronie: a study of head, gesture, costume, and light. The figure’s proximity and turn toward the spectator produce intense presence without offering a closed biographical identity. In JANO it connects Vermeer, portraiture, looking, body, and Dutch painting.',
    },
    source: source(
      'Girl with a Pearl Earring',
      'Mauritshuis',
      'https://www.mauritshuis.nl/en/our-collection/artworks/670-girl-with-a-pearl-earring/',
    ),
  },
  {
    slug: 'tres-de-mayo-1808',
    summary: {
      es: 'El 3 de mayo de 1808 representa una ejecución durante la ocupación napoleónica de Madrid sin convertir el sufrimiento en una victoria heroica. La luz separa al condenado y al pelotón, pero no resuelve la violencia. En JANO conecta Goya, guerra, poder, muerte y las dificultades de representar un acontecimiento histórico.',
      en: 'The Third of May 1808 depicts an execution during the Napoleonic occupation of Madrid without turning suffering into heroic victory. Light separates the condemned man from the firing squad, yet it does not resolve violence. In JANO it connects Goya, war, power, death, and the difficulties of representing a historical event.',
    },
    source: source(
      'The Third of May 1808 in Madrid',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/en/the-collection/art-work/the-3rd-of-may-1808-in-madrid-or-the-executions/5e177409-88a8-4a0a-8a1e-0e929f4e2f4f',
    ),
  },
  {
    slug: 'saturno-devorando-a-su-hijo',
    summary: {
      es: 'Saturno devorando a su hijo forma parte de las Pinturas negras de Goya, realizadas en un contexto íntimo y luego trasladadas de su emplazamiento mural. El mito sirve aquí para una imagen extrema de violencia, miedo y materia inestable. En JANO conecta muerte, poder, cuerpo y la vida material cambiante de una obra.',
      en: 'Saturn Devouring His Son belongs to Goya’s Black Paintings, made in an intimate setting and later transferred from their mural location. Myth here becomes an extreme image of violence, fear, and unstable matter. In JANO it connects death, power, body, and a work’s changing material life.',
    },
    source: source(
      'Saturn Devouring His Son',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/en/the-collection/art-work/saturn-devouring-his-son/18110a75-b0e7-4b8e-bc60-1a7c7b4a2f6a',
    ),
  },
  {
    slug: 'libertad-guiando-al-pueblo',
    summary: {
      es: 'La Libertad guiando al pueblo convierte la revolución de 1830 en una alegoría de fuerza colectiva, pero no elimina sus tensiones de clase, género y nacionalismo. La figura de Libertad organiza la escena sin estabilizarla: cuerpos y barricada siguen marcados por la violencia. En JANO conecta Delacroix, Romanticismo, revolución, poder y propaganda.',
      en: 'Liberty Leading the People turns the Revolution of 1830 into an allegory of collective force, yet does not erase its tensions of class, gender, and nationalism. Liberty organises the scene without stabilising it: bodies and barricade remain marked by violence. In JANO it connects Delacroix, Romanticism, revolution, power, and propaganda.',
    },
    source: source(
      'Liberty Leading the People',
      'Musée du Louvre',
      'https://collections.louvre.fr/en/ark:/53355/cl010065653',
    ),
  },
  {
    slug: 'impresion-sol-naciente',
    summary: {
      es: 'Impresión, sol naciente da nombre retrospectivamente al impresionismo, pero la obra no resume por sí sola un movimiento entero. Su puerto, niebla y pincelada visible convierten una escena industrial en una experiencia de luz y duración. En JANO conecta Monet, paisaje, modernidad, ciudad y las condiciones cambiantes de mirar.',
      en: 'Impression, Sunrise retrospectively gave Impressionism its name, but the work does not by itself summarise an entire movement. Its harbour, mist, and visible brushwork turn an industrial scene into an experience of light and duration. In JANO it connects Monet, landscape, modernity, city, and the changing conditions of looking.',
    },
    source: source(
      'Impression, Sunrise',
      'Musée Marmottan Monet',
      'https://www.marmottan.fr/en/monet-impression-sunrise/',
    ),
  },
  {
    slug: 'noche-estrellada',
    summary: {
      es: 'La noche estrellada convierte un paisaje nocturno en una estructura de movimiento, color y materia. No es una transcripción directa de una vista ni una ilustración de la biografía de Van Gogh: combina observación, memoria y transformación pictórica. En JANO conecta postimpresionismo, naturaleza, tiempo, cuerpo y las posibilidades expresivas del paisaje.',
      en: 'The Starry Night turns a nocturnal landscape into a structure of movement, colour, and material. It is neither a direct transcription of a view nor an illustration of Van Gogh’s biography: it combines observation, memory, and pictorial transformation. In JANO it connects Post-Impressionism, nature, time, body, and landscape’s expressive possibilities.',
    },
    source: source(
      'The Starry Night',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79802',
    ),
  },
  {
    slug: 'los-girasoles',
    summary: {
      es: 'Los girasoles convierten flores cortadas, recipiente y color en una investigación sobre presencia y duración. Van Gogh no utiliza el motivo como simple naturaleza muerta: la pincelada y las variaciones de amarillo hacen visible la energía material de la pintura. En JANO conecta postimpresionismo, naturaleza, color y las relaciones entre vida, tiempo y mirada.',
      en: 'Sunflowers turns cut flowers, vessel, and colour into an investigation of presence and duration. Van Gogh does not use the motif as simple still life: brushwork and variations of yellow make painting’s material energy visible. In JANO it connects Post-Impressionism, nature, colour, and relations among life, time, and looking.',
    },
    source: source(
      'Sunflowers',
      'National Gallery',
      'https://www.nationalgallery.org.uk/paintings/vincent-van-gogh-sunflowers',
    ),
  },
  {
    slug: 'las-senoritas-de-avignon',
    summary: {
      es: 'Las señoritas de Aviñón no inaugura el cubismo como una fórmula terminada; condensa tensiones sobre cuerpo, sexualidad, mirada y formas de apropiación de artes no europeas. Sus figuras rompen la continuidad del espacio y sitúan al espectador ante una escena incómoda. En JANO conecta Picasso, cubismo, representación, colonialismo y modernidad.',
      en: 'Les Demoiselles d’Avignon does not inaugurate Cubism as a finished formula; it condenses tensions around body, sexuality, looking, and the appropriation of non-European arts. Its figures break spatial continuity and place the spectator before an uncomfortable scene. In JANO it connects Picasso, Cubism, representation, colonialism, and modernity.',
    },
    source: source(
      'Les Demoiselles d’Avignon',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79766',
    ),
  },
  {
    slug: 'cuadrado-negro',
    summary: {
      es: 'Cuadrado negro no es una imagen vacía ni un emblema simple de “fin” de la pintura. Malevich presentó la forma como una ruptura con la representación tradicional y como una nueva relación entre superficie, signo y experiencia. En JANO conecta suprematismo, abstracción, modernidad y las disputas sobre qué puede hacer una pintura.',
      en: 'Black Square is neither an empty image nor a simple emblem of painting’s “end.” Malevich presented the form as a break with traditional representation and as a new relation among surface, sign, and experience. In JANO it connects Suprematism, abstraction, modernity, and disputes over what a painting can do.',
    },
    source: source(
      'Black Square',
      'The State Tretyakov Gallery',
      'https://www.tretyakovgallery.ru/en/collection/black-square/',
    ),
  },
  {
    slug: 'la-persistencia-de-la-memoria',
    summary: {
      es: 'La persistencia de la memoria sitúa relojes blandos en un paisaje escaso para hacer inestable la medida cotidiana del tiempo. La obra no traduce un sueño en un código único: combina precisión ilusionista, humor y extrañamiento. En JANO conecta Dalí, surrealismo, tiempo, memoria y la capacidad de una imagen para desplazar hábitos de percepción.',
      en: 'The Persistence of Memory places soft watches in a sparse landscape to unsettle everyday measures of time. The work does not translate a dream into one code: it combines illusionistic precision, humour, and estrangement. In JANO it connects Dalí, Surrealism, time, memory, and an image’s capacity to displace habits of perception.',
    },
    source: source(
      'The Persistence of Memory',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79018',
    ),
  },
  {
    slug: 'las-dos-fridas',
    summary: {
      es: 'Las dos Fridas presenta dos figuras de la artista unidas por vasos sanguíneos y vestidas de maneras distintas. La obra ha sido leída desde identidad, cuerpo, historia nacional y experiencia afectiva, sin que una sola interpretación la cierre. En JANO conecta Frida Kahlo, autorretrato, género, memoria y modernidad latinoamericana.',
      en: 'The Two Fridas presents two figures of the artist joined by blood vessels and dressed differently. The work has been read through identity, body, national history, and affective experience, without one interpretation closing it down. In JANO it connects Frida Kahlo, self-portraiture, gender, memory, and Latin American modernity.',
    },
    source: source('Las dos Fridas', 'Museo de Arte Moderno', 'https://mam.inba.gob.mx/'),
  },
  {
    slug: 'casa-sobre-la-cascada',
    summary: {
      es: 'Casa de la Cascada organiza vivienda, roca, agua y estructura en una relación deliberadamente intensa con el paisaje. No es una casa “natural” en sentido simple: depende de ingeniería, mantenimiento y una concepción específica de vida doméstica. En JANO conecta Frank Lloyd Wright, arquitectura moderna, naturaleza, diseño y espacio habitado.',
      en: 'Fallingwater brings dwelling, rock, water, and structure into a deliberately intense relation with landscape. It is not a “natural” house in any simple sense: it depends on engineering, maintenance, and a particular conception of domestic life. In JANO it connects Frank Lloyd Wright, modern architecture, nature, design, and inhabited space.',
    },
    source: source('Fallingwater', 'Western Pennsylvania Conservancy', 'https://fallingwater.org/'),
  },
  {
    slug: 'edificio-bauhaus-dessau',
    summary: {
      es: 'El edificio de la Bauhaus en Dessau hace visible una pedagogía que quiso relacionar talleres, arquitectura, diseño e industria. Sus volúmenes y transparencias no son sólo una estética moderna: organizan circulación, trabajo y formas de convivencia institucional. En JANO conecta Bauhaus, Gropius, tecnología, diseño y ciudad moderna.',
      en: 'The Bauhaus building in Dessau makes visible a pedagogy that sought to connect workshops, architecture, design, and industry. Its volumes and transparencies are not merely a modern aesthetic: they organise circulation, work, and forms of institutional life. In JANO it connects Bauhaus, Gropius, technology, design, and the modern city.',
    },
    source: source(
      'Bauhaus Building in Dessau',
      'Bauhaus Dessau Foundation',
      'https://www.bauhaus-dessau.de/en/architecture/bauhaus-building.html',
    ),
  },
  {
    slug: 'migrant-mother',
    summary: {
      es: 'Migrant Mother surgió de un encargo documental durante la Gran Depresión, pero su circulación la transformó en una imagen pública de pobreza y resiliencia. La fotografía no es un acceso transparente a la vida de Florence Owens Thompson: plantea problemas de agencia, archivo, prensa y representación. En JANO conecta fotografía, trabajo, clase, memoria y política social.',
      en: 'Migrant Mother emerged from a documentary commission during the Great Depression, but its circulation transformed it into a public image of poverty and resilience. The photograph is not transparent access to Florence Owens Thompson’s life: it raises questions of agency, archive, press, and representation. In JANO it connects photography, labour, class, memory, and social policy.',
    },
    source: source(
      'Migrant Mother',
      'Library of Congress',
      'https://www.loc.gov/pictures/item/2017762891/',
    ),
  },
  {
    slug: 'diptico-marilyn',
    summary: {
      es: 'Díptico de Marilyn repite el rostro de Marilyn Monroe en una estructura que convierte celebridad, reproducción y muerte en problemas inseparables. La repetición no preserva una presencia estable: la desgasta y la multiplica. En JANO conecta Warhol, Pop Art, fotografía, consumo y las formas industriales de producir memoria pública.',
      en: 'Marilyn Diptych repeats Marilyn Monroe’s face in a structure that makes celebrity, reproduction, and death inseparable problems. Repetition does not preserve stable presence: it wears it down and multiplies it. In JANO it connects Warhol, Pop Art, photography, consumption, and industrial forms of producing public memory.',
    },
    source: source(
      'Marilyn Diptych',
      'Tate',
      'https://www.tate.org.uk/art/artworks/warhol-marilyn-diptych-t03093',
    ),
  },
  {
    slug: 'maman',
    summary: {
      es: 'Maman presenta una araña de escala monumental cuyo cuerpo protector y amenazante desestabiliza las expectativas sobre maternidad y cuidado. Louise Bourgeois vinculó el motivo a la figura de su madre, pero la obra no se agota en una biografía privada. En JANO conecta escultura, cuerpo, memoria, género y la experiencia física del espacio museístico.',
      en: 'Maman presents a monumental spider whose protective and threatening body unsettles expectations of motherhood and care. Louise Bourgeois linked the motif to her mother, but the work is not exhausted by private biography. In JANO it connects sculpture, body, memory, gender, and the physical experience of museum space.',
    },
    source: source('Maman', 'Tate', 'https://www.tate.org.uk/art/artworks/bourgeois-maman-t12625'),
  },
  {
    slug: 'cut-piece',
    summary: {
      es: 'Cut Piece fue una performance en la que Yoko Ono invitó al público a cortar su ropa mientras permanecía sentada. La obra convierte vulnerabilidad, consentimiento y mirada en una situación compartida, no en una imagen fija. En JANO conecta cuerpo, género, performance y las responsabilidades de quien observa y participa.',
      en: 'Cut Piece was a performance in which Yoko Ono invited the audience to cut her clothing while she remained seated. The work turns vulnerability, consent, and looking into a shared situation rather than a fixed image. In JANO it connects body, gender, performance, and the responsibilities of those who observe and participate.',
    },
    source: source('Cut Piece', 'Guggenheim Museum', 'https://www.guggenheim.org/artwork/9534'),
  },
  {
    slug: 'bronces-de-benin',
    summary: {
      es: 'Los llamados bronces de Benín reúnen placas y esculturas vinculadas al Reino de Benín, muchas de las cuales fueron saqueadas durante la expedición británica de 1897 y dispersadas por museos y colecciones. El nombre no debe ocultar diversidad de materiales, funciones y contextos. En JANO conecta arte africano, patrimonio, colonialismo, poder y restitución.',
      en: 'The so-called Benin Bronzes gather plaques and sculptures linked to the Kingdom of Benin, many of which were looted during the British expedition of 1897 and dispersed among museums and collections. The name should not conceal diversity of materials, functions, and contexts. In JANO it connects African art, heritage, colonialism, power, and restitution.',
    },
    source: source(
      'Benin Bronzes',
      'British Museum',
      'https://www.britishmuseum.org/collection/galleries/africa',
    ),
  },
  {
    slug: 'piedra-del-sol',
    summary: {
      es: 'La Piedra del Sol es un monumento mexica cuyo relieve articula tiempo, orden cósmico y poder ritual. La interpretación popular como “calendario” capta sólo parte de sus usos y significados. En JANO permite explorar arte mexica, antigüedad mesoamericana, religión, memoria y los marcos museísticos que condicionan cómo se lee un objeto.',
      en: 'The Stone of the Sun is a Mexica monument whose relief brings together time, cosmic order, and ritual power. The popular interpretation of it as a “calendar” captures only part of its uses and meanings. In JANO it explores Mexica art, Mesoamerican antiquity, religion, memory, and museum frames that shape how an object is read.',
    },
    source: source(
      'Museo Nacional de Antropología',
      'Instituto Nacional de Antropología e Historia',
      'https://www.inah.gob.mx/',
    ),
  },
  {
    slug: 'templo-de-kukulcan',
    summary: {
      es: 'El Templo de Kukulkán, en Chichén Itzá, articula arquitectura, calendario, ceremonialidad y organización urbana en un centro maya de larga historia. No es una ruina aislada: forma parte de un paisaje arqueológico, turístico y comunitario vivo. En JANO conecta arte maya, arquitectura, religión, territorio y patrimonio.',
      en: 'The Temple of Kukulkán at Chichén Itzá brings architecture, calendrical knowledge, ceremony, and urban organisation together in a Maya centre with a long history. It is not an isolated ruin: it forms part of a living archaeological, tourist, and community landscape. In JANO it connects Maya art, architecture, religion, territory, and heritage.',
    },
    source: source(
      'Pre-Hispanic City of Chichen-Itza',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/483/',
    ),
  },
  {
    slug: 'lineas-de-nazca',
    summary: {
      es: 'Las Líneas de Nazca son geoglifos trazados en el desierto peruano que sólo se comprenden plenamente en relación con paisaje, recorrido y escala. Sus funciones exactas siguen siendo objeto de investigación, por lo que JANO evita una explicación única. Conectan arte andino, territorio, ritual, técnica y los retos de conservar una intervención frágil en el suelo.',
      en: 'The Nazca Lines are geoglyphs drawn in the Peruvian desert that can only be fully understood in relation to landscape, movement, and scale. Their exact functions remain under research, so JANO avoids a single explanation. They connect Andean art, territory, ritual, technique, and the challenges of preserving a fragile intervention in the ground.',
    },
    source: source(
      'Lines and Geoglyphs of Nasca and Palpa',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/700/',
    ),
  },
  {
    slug: 'extasis-de-santa-teresa',
    summary: {
      es: 'El Éxtasis de santa Teresa integra escultura, arquitectura, luz y espectadores esculpidos para construir una experiencia barroca de visión y afecto. Bernini no ilustra de forma simple un episodio místico: organiza materia, teatro y devoción. En JANO conecta Barroco, religión, cuerpo, Roma y la relación entre obra y espacio.',
      en: 'The Ecstasy of Saint Teresa integrates sculpture, architecture, light, and sculpted spectators to construct a Baroque experience of vision and affect. Bernini does not simply illustrate a mystical episode: he organises material, theatre, and devotion. In JANO it connects Baroque, religion, body, Rome, and the relation between work and space.',
    },
    source: source(
      'Santa Maria della Vittoria',
      'Soprintendenza Speciale Archeologia Belle Arti e Paesaggio di Roma',
      'https://soprintendenzaspecialeroma.it/',
    ),
  },
  {
    slug: 'nighthawks',
    summary: {
      es: 'Nighthawks sitúa a varias figuras en un restaurante nocturno visible desde la calle. Hopper construye una escena de ciudad mediante vidrio, luz y separación, pero no entrega una historia definitiva sobre sus personajes. En JANO conecta ciudad, modernidad, realismo, arquitectura y las ambigüedades de la vida pública.',
      en: 'Nighthawks places several figures in a nighttime restaurant visible from the street. Hopper constructs a city scene through glass, light, and separation, but offers no definitive story about its characters. In JANO it connects city, modernity, realism, architecture, and the ambiguities of public life.',
    },
    source: source(
      'Nighthawks',
      'Art Institute of Chicago',
      'https://www.artic.edu/artworks/111628/nighthawks',
    ),
  },
  {
    slug: 'campbells-soup-cans',
    summary: {
      es: 'Campbell’s Soup Cans presenta productos de consumo repetidos en doce lienzos y convierte la serialidad comercial en problema pictórico. La obra no es sólo una imagen de marca: plantea cómo publicidad, estantería, museo y reproducción reorganizan la atención. En JANO conecta Warhol, Pop Art, consumo, diseño y cultura visual estadounidense.',
      en: 'Campbell’s Soup Cans presents repeated consumer products across twelve canvases and makes commercial seriality a pictorial problem. The work is not simply a brand image: it asks how advertising, shelf, museum, and reproduction reorganise attention. In JANO it connects Warhol, Pop Art, consumption, design, and American visual culture.',
    },
    source: source(
      'Campbell’s Soup Cans',
      'Museum of Modern Art',
      'https://www.moma.org/collection/works/79809',
    ),
  },
  {
    slug: 'la-traicion-de-las-imagenes',
    summary: {
      es: 'La traición de las imágenes presenta una pipa acompañada por la frase “Esto no es una pipa”. Magritte no propone un acertijo que se resuelva de una vez: separa objeto, imagen y palabra para hacer visible cómo representan de maneras distintas. En JANO conecta surrealismo, lenguaje, representación y los límites de la evidencia visual.',
      en: 'The Treachery of Images presents a pipe accompanied by the phrase “This is not a pipe.” Magritte does not offer a riddle to solve once and for all: he separates object, image, and word to make visible how they represent differently. In JANO it connects Surrealism, language, representation, and the limits of visual evidence.',
    },
    essay: `## La pipa, la frase y la distancia entre ambas

La frase de Magritte no niega que veamos una pipa. Niega algo más preciso: que una imagen de una pipa sea la pipa misma. La distinción parece obvia cuando se formula así, pero el cuadro hace visible la facilidad con que olvidamos esa diferencia. Una imagen reconocible puede activar el nombre de una cosa y dar la impresión de ponerla ante nosotros, aunque no pueda fumarse, tocarse ni usarse.

El texto no resuelve el problema desde fuera de la pintura. También es una imagen: está escrito dentro del cuadro y depende de una convención de lectura. La relación entre palabra e imagen no es, por tanto, una oposición simple entre lenguaje y visión. Ambos sistemas representan; ambos pueden acercarse a una cosa y, al mismo tiempo, mantenerla a distancia.

Magritte convierte esa distancia en una experiencia visual deliberadamente tranquila. No necesita deformar la pipa ni producir una escena onírica. La precisión de la representación vuelve más fuerte la interrupción de la frase. La obra no pide adivinar una clave surrealista secreta; pide advertir que la familiaridad de las imágenes puede ocultar sus reglas.

Esta cuestión tiene una vida contemporánea evidente, pero no debe reducirse a un eslogan sobre imágenes falsas. La traición de las imágenes no afirma que toda representación engañe del mismo modo. Señala que una imagen nunca coincide por completo con aquello a lo que se refiere. Por eso puede informar, persuadir, recordar, vender, ridiculizar o producir deseo sin convertirse en su objeto.

En JANO, surrealismo, representación y lenguaje son entradas distintas al cuadro. Desde el surrealismo se puede situar la obra entre prácticas que alteraron hábitos de percepción; desde representación se puede preguntar qué hace una imagen presente; desde lenguaje se puede atender al conflicto entre nombrar y mostrar. La pipa no deja de ser reconocible. Precisamente por eso obliga a mirar de nuevo qué hacemos cuando reconocemos algo en una imagen.`,
    source: source(
      'The Treachery of Images',
      'Los Angeles County Museum of Art',
      'https://www.lacma.org/art/exhibition/magritte',
    ),
  },
];
