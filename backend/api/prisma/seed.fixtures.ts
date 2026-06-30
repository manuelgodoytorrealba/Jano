export const RELATION_TYPES = [
  ['CREATED_BY', 'Creado por', 'Creador de', true, 'authorship', 10],
  ['BELONGS_TO_MOVEMENT', 'Pertenece al movimiento', 'Incluye entity', true, 'taxonomy', 20],
  ['BELONGS_TO_PERIOD', 'Pertenece al periodo', 'Incluye entity', true, 'taxonomy', 30],
  ['ABOUT_CONCEPT', 'Explora el concepto', 'Concepto explorado por', true, 'semantic', 40],
  ['LOCATED_IN', 'Ubicado en', 'Ubicación de', true, 'context', 50],
  ['RELATED_TO', 'Relacionado con', 'Relacionado con', false, 'semantic', 60],
  ['ASSOCIATED_WITH', 'Asociado con', 'Asociado con', false, 'semantic', 70],
  ['MENTIONS', 'Menciona', 'Mencionado por', true, 'content', 80],
  ['INSPIRED_BY', 'Inspirado por', 'Inspira a', true, 'influence', 90],
  ['INFLUENCED_BY', 'Influenciado por', 'Influye en', true, 'influence', 100],
  ['PART_OF', 'Forma parte de', 'Incluye', true, 'structure', 110],
  ['DEPICTS', 'Representa', 'Representado en', true, 'semantic', 120],
  ['SIMILAR_TO', 'Similar a', 'Similar a', false, 'semantic', 130],
  ['USES_TECHNIQUE', 'Usa técnica', 'Técnica usada por', true, 'material', 140],
  ['USES_MATERIAL', 'Usa material', 'Material usado por', true, 'material', 150],
  ['HAS_SUBJECT', 'Tiene tema', 'Tema de', true, 'semantic', 160],
  ['CURATED_WITH', 'Curado junto a', 'Curado junto a', false, 'editorial', 170],
] as const;

type ExplicitDetailTranslation = {
  artwork?: {
    authorNation: string | null;
    technique: string | null;
    materials: string | null;
    dimensions: string | null;
    location: string | null;
    collection: string | null;
    state: string | null;
  };
  artist?: {
    country: string | null;
    city: string | null;
    disciplines: string | null;
    bioShort: string | null;
    links: string | null;
  };
  concept?: {
    definition: string | null;
  };
  period?: {
    definition: string | null;
  };
};

export type ExplicitEntityTranslation = {
  title: string;
  shortDescription: string | null;
  essay: string | null;
  excerpt?: string | null;
} & ExplicitDetailTranslation;

export const ENTITY_EN_BY_SLUG: Record<string, ExplicitEntityTranslation> = {
  'siglo-xix': {
    title: '19th Century',
    shortDescription: 'Historical and artistic period between 1801 and 1900.',
    essay:
      'A period shaped by political change, industrialization, Romanticism, Realism, and the rise of new modern sensibilities.',
    period: { definition: 'Historical and cultural period spanning 1801 to 1900.' },
  },
  'siglo-xx': {
    title: '20th Century',
    shortDescription: 'A defining period for the avant-garde and modern art.',
    essay:
      'The 20th century brought together the historical avant-garde, world wars, technological transformation, and radical new forms of representation.',
    period: { definition: 'Historical and cultural period spanning 1901 to 2000.' },
  },
  'siglo-xxi': {
    title: '21st Century',
    shortDescription: 'A global and digital contemporary period.',
    essay:
      'A period marked by networks, digitization, the global circulation of images, and new models of cultural production.',
    period: { definition: 'Contemporary period from 2001 to the present.' },
  },
  romanticismo: {
    title: 'Romanticism',
    shortDescription:
      'A movement that emphasizes emotion, subjectivity, intensity, and historical experience.',
    essay:
      'Romanticism privileges emotion, imagination, the sublime, drama, and an intense relationship between art, history, and human experience.',
  },
  cubismo: {
    title: 'Cubism',
    shortDescription: 'An avant-garde movement that fragments and reorganizes representation.',
    essay:
      'Cubism reformulates representation through the fragmentation of the picture plane and the coexistence of multiple viewpoints.',
  },
  surrealismo: {
    title: 'Surrealism',
    shortDescription:
      'A movement that explores dreams, the unconscious, desire, and irrationality.',
    essay:
      'Surrealism explores free association, dream imagery, and unexpected relationships between objects, time, and memory.',
  },
  'arte-moderno': {
    title: 'Modern Art',
    shortDescription: 'A broad field of artistic practices that redefined visual modernity.',
    essay:
      'Modern art gathers processes of formal rupture, material experimentation, and new ways of seeing the world.',
  },
  'arte-contemporaneo': {
    title: 'Contemporary Art',
    shortDescription: 'Contemporary, hybrid, and conceptual artistic practices.',
    essay:
      'Contemporary art incorporates installation, performance, expanded sculpture, institutional critique, and a strong conceptual dimension.',
  },
  tiempo: {
    title: 'Time',
    shortDescription: 'Duration, change, memory, and finitude.',
    essay:
      'In art, time can appear as duration, ruin, repetition, waiting, simultaneity, or materialized memory.',
    concept: {
      definition:
        'A concept tied to duration, change, past, present, future, and historical experience.',
    },
  },
  memoria: {
    title: 'Memory',
    shortDescription: 'Individual and collective remembrance, archive, and trace.',
    essay:
      'Memory articulates identity, history, trauma, archives, and the persistence of images or experiences.',
    concept: {
      definition:
        'A concept linked to remembrance, identity, archives, and the construction of the past.',
    },
  },
  guerra: {
    title: 'War',
    shortDescription: 'Organized violence, historical conflict, and devastation.',
    essay:
      'In art, war appears as trauma, denunciation, destruction, heroism, suffering, and political memory.',
    concept: {
      definition:
        'A concept associated with armed conflict, violence, trauma, and historical memory.',
    },
  },
  identidad: {
    title: 'Identity',
    shortDescription: 'The symbolic construction of the self, the body, and belonging.',
    essay:
      'Identity runs through self-representation, gender, nation, personal memory, and the representation of the body.',
    concept: {
      definition:
        'A concept associated with subjectivity, self-representation, belonging, and difference.',
    },
  },
  cuerpo: {
    title: 'Body',
    shortDescription: 'Material presence, gesture, vulnerability, and representation.',
    essay:
      'The body is support, matter, symbol, political territory, and a form of presence in space.',
    concept: {
      definition:
        'A concept tied to living matter, representation, physical presence, and political dimension.',
    },
  },
  dolor: {
    title: 'Pain',
    shortDescription: 'Physical, emotional, and symbolic suffering.',
    essay: 'In art, pain is linked to trauma, loss, vulnerability, illness, and resistance.',
    concept: {
      definition: 'A concept that points to suffering, wounds, loss, and vulnerable experience.',
    },
  },
  maternidad: {
    title: 'Motherhood',
    shortDescription: 'Bond, care, origin, ambivalence, and affective memory.',
    essay:
      'Motherhood can appear as origin, protection, affective tension, a shared body, or emotional ambivalence.',
    concept: {
      definition:
        'A concept associated with care, origin, affective bonds, and the symbolic dimension of the maternal.',
    },
  },
  violencia: {
    title: 'Violence',
    shortDescription: 'Physical, symbolic, social, or historical harm.',
    essay:
      'In art, violence can manifest as aggression, trauma, imposition, rupture, or visual denunciation.',
    concept: {
      definition: 'A concept associated with harm, imposition, trauma, rupture, and conflict.',
    },
  },
  muerte: {
    title: 'Death',
    shortDescription: 'Finitude, mourning, loss, ritual, and symbolic passage.',
    essay:
      'Death in art can appear as mourning, memory, ritual, vanitas, historical catastrophe, or spiritual transition.',
    concept: {
      definition:
        'A concept tied to finitude, mourning, loss, ritual, and the representation of disappearance.',
    },
  },
  poder: {
    title: 'Power',
    shortDescription: 'Authority, domination, prestige, and political representation.',
    essay:
      'Power is represented through portraiture, institutions, architecture, the disciplined body, spectacle, and symbolic authority.',
    concept: {
      definition:
        'A concept associated with authority, domination, legitimacy, prestige, and political representation.',
    },
  },
  religion: {
    title: 'Religion',
    shortDescription: 'Belief, ritual, iconography, and spiritual experience.',
    essay:
      'Religion organizes images of devotion, sacrifice, community, transcendence, mystery, and symbolic order.',
    concept: {
      definition:
        'A concept linked to belief, ritual, devotion, transcendence, and sacred representation.',
    },
  },
  naturaleza: {
    title: 'Nature',
    shortDescription: 'Landscape, living matter, climate, and the more-than-human world.',
    essay:
      'Nature may appear as landscape, refuge, threat, matter, symbol, environment, or a field of transformation.',
    concept: {
      definition:
        'A concept associated with landscape, living matter, environment, climate, and the natural world.',
    },
  },
  ciudad: {
    title: 'City',
    shortDescription: 'Urban modernity, architecture, crowds, and solitude.',
    essay:
      'The city condenses modern experience through architecture, labor, crowds, spectacle, anonymity, and new ways of seeing.',
    concept: {
      definition:
        'A concept tied to urban life, architecture, crowds, infrastructure, and modern experience.',
    },
  },
  deporte: {
    title: 'Sport',
    shortDescription: 'Competition, movement, spectacle, and the social body.',
    essay:
      'Sport connects movement, discipline, competition, media, mass culture, collective identity, and the aesthetics of performance.',
    concept: {
      definition:
        'A concept linked to competition, movement, spectacle, discipline, and collective identity.',
    },
  },
  futbol: {
    title: 'Football',
    shortDescription: 'A collective game shaped by ritual, spectacle, and identity.',
    essay:
      'Football can be read through the body, movement, ritual, city, mass media, collective identity, and popular culture.',
    concept: {
      definition:
        'A concept connected to football as ritual, spectacle, movement, collective identity, and popular culture.',
    },
  },
  genero: {
    title: 'Gender',
    shortDescription: 'Identity, social roles, the body, and representation.',
    essay:
      'Gender helps interpret how images construct femininity, masculinity, desire, norm, difference, and embodied identity.',
    concept: {
      definition:
        'A concept associated with gender identity, social roles, representation, norm, and difference.',
    },
  },
  vejez: {
    title: 'Old Age',
    shortDescription: 'Aging, fragility, memory, and the time-marked body.',
    essay:
      'Old age appears in art as trace, dignity, vulnerability, wisdom, decline, and an acute awareness of mortality.',
    concept: {
      definition:
        'A concept tied to aging, fragility, experience, memory, and the time-marked body.',
    },
  },
  juventud: {
    title: 'Youth',
    shortDescription: 'Vitality, promise, beauty, rebellion, and formation.',
    essay:
      'Youth can appear as idealization, physical energy, desire, rebellion, apprenticeship, style, and social projection.',
    concept: {
      definition:
        'A concept associated with vitality, formation, beauty, desire, rebellion, and becoming.',
    },
  },
  himitsubako: {
    title: 'Himitsubako',
    shortDescription:
      'A Japanese wooden puzzle box associated with yosegi marquetry, secrecy, and manual ingenuity.',
    essay:
      'Himitsubako names a Japanese wooden puzzle box opened through a hidden sequence of movements. It can be read through craft, wood, object memory, dexterity, and Japanese visual culture.',
    concept: {
      definition:
        'A concept associated with Japanese wooden puzzle boxes, hidden mechanisms, craft tradition, and yosegi marquetry.',
    },
  },
  'museo-del-prado': {
    title: 'Museo del Prado',
    shortDescription: 'A national art museum located in Madrid.',
    essay:
      'A central institution for the history of European and Spanish art, with one of the most important collections in the world.',
  },
  'museo-reina-sofia': {
    title: 'Museo Reina Sofia',
    shortDescription: 'A national museum of modern and contemporary art in Madrid.',
    essay: 'A key institution for the study of modern and contemporary art in Spain.',
  },
  moma: {
    title: 'MoMA',
    shortDescription: 'The Museum of Modern Art in New York.',
    essay: 'A central museum for the study of international modern and contemporary art.',
  },
  'guggenheim-bilbao': {
    title: 'Guggenheim Bilbao',
    shortDescription: 'A contemporary art museum located in Bilbao.',
    essay:
      'An internationally recognized museum known for its architecture and contemporary art collection.',
  },
  'francisco-de-goya': {
    title: 'Francisco de Goya',
    shortDescription:
      'A Spanish painter and printmaker who was crucial to the transition from the Ancien Regime to modernity.',
    essay:
      'Francisco de Goya was one of the most influential artists in the history of Spanish art. His work spans portraiture, history painting, social critique, violence, and dark visions of the human condition.',
    artist: {
      country: 'Spain',
      city: 'Fuendetodos',
      disciplines: 'Painting, Printmaking',
      bioShort:
        'A key figure in Spanish painting, celebrated for his critical, expressive, and visionary power.',
      links: 'https://www.museodelprado.es',
    },
  },
  'pablo-picasso': {
    title: 'Pablo Picasso',
    shortDescription:
      'A Spanish painter, sculptor, and maker who became a central figure of 20th-century art.',
    essay:
      'Pablo Picasso was a decisive figure in modern art. His work spans painting, sculpture, printmaking, and formal experimentation, with an essential role in Cubism.',
    artist: {
      country: 'Spain',
      city: 'Malaga',
      disciplines: 'Painting, Sculpture, Printmaking',
      bioShort: 'A central figure of the 20th-century avant-garde and co-founder of Cubism.',
      links: 'https://www.museoreinasofia.es',
    },
  },
  'salvador-dali': {
    title: 'Salvador Dali',
    shortDescription:
      'A Spanish artist associated with Surrealism and the exploration of dream imagery.',
    essay:
      'Salvador Dali developed a highly recognizable body of work shaped by dream images, unexpected associations, and visual reflections on time and desire.',
    artist: {
      country: 'Spain',
      city: 'Figueres',
      disciplines: 'Painting, Drawing, Sculpture, Design',
      bioShort:
        'One of the most recognizable Surrealist artists, celebrated for his dreamlike and symbolic imagery.',
      links: 'https://www.moma.org',
    },
  },
  'frida-kahlo': {
    title: 'Frida Kahlo',
    shortDescription:
      'A Mexican painter known for her self-representations and her exploration of identity, pain, and the body.',
    essay:
      'Frida Kahlo turned personal, bodily, and emotional experience into a powerful form of artistic representation. Her work is tied to identity, pain, memory, and self-representation.',
    artist: {
      country: 'Mexico',
      city: 'Coyoacan',
      disciplines: 'Painting',
      bioShort:
        'A key 20th-century artist whose work turns personal and bodily experience into visual language.',
      links: 'https://www.moma.org/artists/2963',
    },
  },
  'louise-bourgeois': {
    title: 'Louise Bourgeois',
    shortDescription: 'A French-American artist essential to sculpture and contemporary art.',
    essay:
      'Louise Bourgeois developed a body of work of great psychological intensity, tied to memory, the body, motherhood, pain, and sculptural space.',
    artist: {
      country: 'France / United States',
      city: 'Paris',
      disciplines: 'Sculpture, Installation, Drawing',
      bioShort:
        'A foundational sculptor of contemporary art, associated with memory, the body, and motherhood.',
      links: 'https://www.tate.org.uk/art/artists/louise-bourgeois-2351',
    },
  },
  'joan-miro': {
    title: 'Joan Miro',
    shortDescription:
      'A Catalan artist associated with Surrealism, signs, play, and poetic abstraction.',
    essay:
      'Joan Miro developed a visual language of signs, stars, bodies, and open space between Surrealism, play, and modern abstraction.',
    artist: {
      country: 'Spain',
      city: 'Barcelona',
      disciplines: 'Painting, Drawing, Sculpture, Ceramics',
      bioShort:
        'A major 20th-century artist known for his poetic signs, playful forms, and dreamlike visual language.',
      links: 'https://www.fmirobcn.org/en/',
    },
  },
  'diego-velazquez': {
    title: 'Diego Velazquez',
    shortDescription:
      'A Spanish Baroque painter essential for thinking about power, looking, and representation.',
    essay:
      'Diego Velazquez transformed court portraiture into a subtle investigation of power, presence, vision, and pictorial artifice.',
    artist: {
      country: 'Spain',
      city: 'Seville',
      disciplines: 'Painting',
      bioShort:
        'A central Baroque painter whose work reshaped portraiture, space, and the politics of looking.',
      links: 'https://www.museodelprado.es',
    },
  },
  'edward-hopper': {
    title: 'Edward Hopper',
    shortDescription: 'An American painter of urban solitude, waiting, light, and modern life.',
    essay:
      'Edward Hopper turned architecture, artificial light, and everyday scenes into images of isolation and urban modernity.',
    artist: {
      country: 'United States',
      city: 'Nyack',
      disciplines: 'Painting, Printmaking',
      bioShort:
        'A defining painter of urban solitude and quiet psychological tension in 20th-century America.',
      links: 'https://www.moma.org',
    },
  },
  'francis-bacon': {
    title: 'Francis Bacon',
    shortDescription: 'A painter of the body, violence, flesh, enclosure, and modern anguish.',
    essay:
      'Francis Bacon treated the human figure as vulnerable matter under pressure, producing intense images of bodily and psychological violence.',
    artist: {
      country: 'Ireland / United Kingdom',
      city: 'Dublin',
      disciplines: 'Painting',
      bioShort:
        'A major 20th-century painter known for distorted figures, existential intensity, and violent psychological space.',
      links: 'https://www.tate.org.uk',
    },
  },
  'marcel-duchamp': {
    title: 'Marcel Duchamp',
    shortDescription:
      'An artist who transformed authorship, the object, play, and the definition of art.',
    essay:
      'Marcel Duchamp shifted art toward choice, irony, language, and conceptual play, radically challenging the museum object.',
    artist: {
      country: 'France / United States',
      city: 'Blainville-Crevon',
      disciplines: 'Conceptual art, Sculpture, Painting',
      bioShort:
        'A foundational modern artist whose readymades redefined authorship, objecthood, and artistic intention.',
      links: 'https://www.moma.org',
    },
  },
  'andy-warhol': {
    title: 'Andy Warhol',
    shortDescription:
      'A Pop artist associated with consumption, celebrity, repetition, and media imagery.',
    essay:
      'Andy Warhol read modern visual culture through advertising, fame, mechanical repetition, surface, and mass media circulation.',
    artist: {
      country: 'United States',
      city: 'Pittsburgh',
      disciplines: 'Painting, Printmaking, Film',
      bioShort:
        'A central Pop artist who transformed celebrity, repetition, and media culture into artistic material.',
      links: 'https://www.moma.org',
    },
  },
  'saturno-devorando-a-su-hijo': {
    title: 'Saturn Devouring His Son',
    shortDescription:
      "One of Goya's Black Paintings, marked by violence, darkness, and expressive force.",
    essay:
      'This work by Francisco de Goya condenses violence, time, destruction, and an extreme vision of the human condition. It can be connected to [[violence]], [[time]], and [[pain]].',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil transferred to canvas',
      materials: 'Oil paint',
      dimensions: '143.5 x 81.4 cm',
      location: 'Museo del Prado, Madrid',
      collection: 'Black Paintings',
      state: 'Preserved',
    },
  },
  'el-tres-de-mayo-de-1808': {
    title: 'The Third of May 1808',
    shortDescription: 'A history painting by Goya about the violence of war and execution.',
    essay:
      'A central work for thinking about [[war]], [[violence]], and historical memory. Its visual drama and political dimension make it a decisive image of modernity.',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '268 x 347 cm',
      location: 'Museo del Prado, Madrid',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  guernica: {
    title: 'Guernica',
    shortDescription: "Picasso's monumental work on the horror of bombing and the violence of war.",
    essay:
      '[[Guernica]] articulates a visual reflection on [[war]], [[violence]], and historical memory. It also connects with the formal fragmentation of [[cubism]].',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '349.3 x 776.6 cm',
      location: 'Museo Reina Sofia, Madrid',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'la-persistencia-de-la-memoria': {
    title: 'The Persistence of Memory',
    shortDescription: "Dali's iconic work on time, dreams, instability, and perception.",
    essay:
      'This work connects directly with [[time]] and [[memory]], and also with the imagery of [[surrealism]].',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '24 x 33 cm',
      location: 'MoMA, New York',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'las-dos-fridas': {
    title: 'The Two Fridas',
    shortDescription:
      'A double self-representation by Frida Kahlo tied to identity, the body, and pain.',
    essay:
      'A key work for thinking about [[identity]], [[body]], and [[pain]] through self-representation. It can also be read through affective memory and inner division.',
    artwork: {
      authorNation: 'Mexican',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '173 x 173 cm',
      location: 'Museo de Arte Moderno, Mexico City',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  maman: {
    title: 'Maman',
    shortDescription:
      "Louise Bourgeois's monumental sculpture associated with motherhood, memory, and affective ambivalence.",
    essay:
      '[[Maman]] connects with [[motherhood]], [[memory]], and [[body]]. Its monumental scale intensifies its emotional and spatial reading.',
    artwork: {
      authorNation: 'French-American',
      technique: 'Monumental sculpture',
      materials: 'Bronze, stainless steel, and marble',
      dimensions: 'approx. 927 x 891 x 1024 cm',
      location: 'Guggenheim Bilbao',
      collection: 'Installation / associated collection',
      state: 'Preserved',
    },
  },
  'las-meninas': {
    title: 'Las Meninas',
    shortDescription:
      "Velazquez's landmark work on power, looking, representation, and courtly space.",
    essay:
      '[[Las Meninas]] opens a rich reading of [[power]], vision, childhood, spatial construction, and the politics of representation in the Baroque.',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '318 x 276 cm',
      location: 'Museo del Prado, Madrid',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'el-viejo-guitarrista': {
    title: 'The Old Guitarist',
    shortDescription:
      'A Blue Period work by Picasso on old age, poverty, the body, and melancholy.',
    essay:
      'This work can be read through [[old age]], vulnerability, poverty, the body, and music as a visual image of modern suffering.',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on panel',
      materials: 'Oil paint',
      dimensions: '122.9 x 82.6 cm',
      location: 'Art Institute of Chicago',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'las-senoritas-de-avignon': {
    title: "Les Demoiselles d'Avignon",
    shortDescription: 'A key Picasso work for Cubism, the body, gender, and modern rupture.',
    essay:
      "[[Les Demoiselles d'Avignon]] opens readings around [[body]], [[gender]], visual violence, masking, and the emergence of [[cubism]].",
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '243.9 x 233.7 cm',
      location: 'MoMA, New York',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'el-carnaval-de-arlequin': {
    title: "Harlequin's Carnival",
    shortDescription: 'A Miro work about play, signs, bodies, and surrealist space.',
    essay:
      'This work connects [[surrealism]], youthful play, bodily fragmentation, fantasy, and poetic visual freedom.',
    artwork: {
      authorNation: 'Spanish',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '66 x 93 cm',
      location: 'Albright-Knox Art Gallery, Buffalo',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  nighthawks: {
    title: 'Nighthawks',
    shortDescription: 'A Hopper city scene about night, isolation, and modern urban life.',
    essay:
      '[[Nighthawks]] condenses [[city]], solitude, artificial light, waiting, and the emotional atmosphere of modernity.',
    artwork: {
      authorNation: 'American',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '84.1 x 152.4 cm',
      location: 'Art Institute of Chicago',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'estudio-papa-inocencio-x': {
    title: "Study after Velazquez's Portrait of Pope Innocent X",
    shortDescription: 'Bacon reinterprets power, the body, the scream, and psychological violence.',
    essay:
      'This work crosses [[power]], [[religion]], the body, fear, enclosure, and the violence of modern representation.',
    artwork: {
      authorNation: 'Irish-British',
      technique: 'Oil on canvas',
      materials: 'Oil paint',
      dimensions: '153 x 118 cm',
      location: 'Des Moines Art Center',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  fountain: {
    title: 'Fountain',
    shortDescription: "Duchamp's readymade that questions authorship, the object, and the museum.",
    essay:
      '[[Fountain]] transforms an everyday object into a question about art, institutional power, conceptual play, and modern culture.',
    artwork: {
      authorNation: 'French-American',
      technique: 'Readymade',
      materials: 'Porcelain urinal',
      dimensions: 'Variable / edition-based',
      location: 'Multiple collections',
      collection: 'Readymade / replica editions',
      state: 'Preserved',
    },
  },
  'marilyn-diptych': {
    title: 'Marilyn Diptych',
    shortDescription: 'A Warhol work about celebrity, repetition, death, and media image culture.',
    essay:
      '[[Marilyn Diptych]] connects [[death]], fame, repetition, mechanical image circulation, and the visual logic of Pop Art.',
    artwork: {
      authorNation: 'American',
      technique: 'Acrylic and silkscreen ink on canvas',
      materials: 'Synthetic polymer paint and silkscreen ink',
      dimensions: '205.44 x 289.56 cm',
      location: 'Tate Modern, London',
      collection: 'Permanent collection',
      state: 'Preserved',
    },
  },
  'bottle-rack': {
    title: 'Bottle Rack',
    shortDescription: 'A Duchamp readymade about the found object, choice, and conceptual gesture.',
    essay:
      '[[Bottle Rack]] helps frame the found object, urban modernity, anti-art, irony, and conceptual displacement.',
    artwork: {
      authorNation: 'French-American',
      technique: 'Readymade',
      materials: 'Galvanized iron bottle rack',
      dimensions: 'Variable / edition-based',
      location: 'Multiple collections',
      collection: 'Readymade / replica editions',
      state: 'Preserved',
    },
  },
  futbolistas: {
    title: 'Footballers',
    shortDescription: 'A demo editorial work connecting art, sport, the body, and the crowd.',
    essay:
      '[[Footballers]] works as a discovery node for reading football through the body, movement, competition, city, youth, and collective identity.',
    artwork: {
      authorNation: 'Unknown / editorial demo',
      technique: 'Editorial demo artwork',
      materials: 'Mixed media / placeholder',
      dimensions: 'Variable',
      location: 'JANO demo dataset',
      collection: 'Demo editorial collection',
      state: 'Preserved',
    },
  },
};

export const SOURCE_EN_BY_KEY: Record<
  string,
  { title: string; author: string | null; publisher: string | null }
> = {
  'https://www.museodelprado.es': {
    title: 'Museo del Prado Collection',
    author: 'Museo Nacional del Prado',
    publisher: 'Museo del Prado',
  },
  'https://www.museoreinasofia.es': {
    title: 'Museo Reina Sofia Collection',
    author: 'Museo Nacional Centro de Arte Reina Sofia',
    publisher: 'Museo Reina Sofia',
  },
  'https://www.moma.org': {
    title: 'MoMA Collection',
    author: 'The Museum of Modern Art',
    publisher: 'MoMA',
  },
  'https://www.moma.org/artists/2963': {
    title: 'Frida Kahlo References',
    author: 'Museum of Modern Art / museum references',
    publisher: 'Museum references',
  },
  'https://www.tate.org.uk': {
    title: 'Louise Bourgeois Overview',
    author: 'Tate',
    publisher: 'Tate',
  },
};

export const SOURCE_REF_EN_BY_KEY: Record<string, { quote: string | null; note: string | null }> = {
  'francisco-de-goya::https://www.museodelprado.es': {
    quote: null,
    note: 'Primary institutional reference.',
  },
  'saturno-devorando-a-su-hijo::https://www.museodelprado.es': {
    quote: null,
    note: 'Institutional work record.',
  },
  'el-tres-de-mayo-de-1808::https://www.museodelprado.es': {
    quote: null,
    note: 'Institutional work record.',
  },
  'pablo-picasso::https://www.museoreinasofia.es': {
    quote: null,
    note: 'Primary institutional reference.',
  },
  'guernica::https://www.museoreinasofia.es': { quote: null, note: 'Institutional work record.' },
  'salvador-dali::https://www.moma.org': { quote: null, note: 'Primary institutional reference.' },
  'la-persistencia-de-la-memoria::https://www.moma.org': {
    quote: null,
    note: 'Institutional work record.',
  },
  'frida-kahlo::https://www.moma.org/artists/2963': { quote: null, note: 'Museum reference.' },
  'las-dos-fridas::https://www.moma.org/artists/2963': {
    quote: null,
    note: 'Contextual reference for the artist and the work.',
  },
  'louise-bourgeois::https://www.tate.org.uk': {
    quote: null,
    note: 'Institutional and contextual reference.',
  },
  'maman::https://www.tate.org.uk': {
    quote: null,
    note: 'Contextual reference on the artist and her work.',
  },
};

export const ENTITY_ALIASES_BY_SLUG: Record<
  string,
  Array<{
    locale: 'es' | 'en' | 'und';
    kind:
      | 'ALTERNATE_TITLE'
      | 'COMMON_NAME'
      | 'MISSPELLING'
      | 'TRANSLITERATION'
      | 'NICKNAME'
      | 'SEARCH_HINT';
    value: string;
    weight?: number;
    source?: string;
  }>
> = {
  himitsubako: [
    { locale: 'und', kind: 'COMMON_NAME', value: 'himitsubako', weight: 1, source: 'SEED' },
    { locale: 'und', kind: 'MISSPELLING', value: 'jimikubako', weight: 0.85, source: 'SEED' },
    {
      locale: 'es',
      kind: 'SEARCH_HINT',
      value: 'caja japonesa secreta',
      weight: 1,
      source: 'SEED',
    },
    {
      locale: 'es',
      kind: 'SEARCH_HINT',
      value: 'caja japonesa de madera',
      weight: 0.95,
      source: 'SEED',
    },
    {
      locale: 'es',
      kind: 'SEARCH_HINT',
      value: 'caja japonesa rompecabezas',
      weight: 0.95,
      source: 'SEED',
    },
    { locale: 'en', kind: 'COMMON_NAME', value: 'japanese puzzle box', weight: 1, source: 'SEED' },
    {
      locale: 'en',
      kind: 'SEARCH_HINT',
      value: 'japanese secret box',
      weight: 0.95,
      source: 'SEED',
    },
    {
      locale: 'en',
      kind: 'TRANSLITERATION',
      value: 'secret japanese wooden box',
      weight: 0.8,
      source: 'SEED',
    },
  ],
  fountain: [
    {
      locale: 'en',
      kind: 'SEARCH_HINT',
      value: 'porcelain urinal artwork',
      weight: 0.95,
      source: 'SEED',
    },
    {
      locale: 'en',
      kind: 'SEARCH_HINT',
      value: 'museum object duchamp urinal',
      weight: 0.95,
      source: 'SEED',
    },
    {
      locale: 'es',
      kind: 'SEARCH_HINT',
      value: 'urinario de porcelana de duchamp',
      weight: 0.95,
      source: 'SEED',
    },
  ],
};

export const RELATION_EN_BY_KEY: Record<string, string> = {
  'memoria::RELATED_TO::identidad': 'Memory plays a role in the construction of identity.',
  'tiempo::RELATED_TO::memoria': 'The experience of memory is tied to temporality.',
  'cuerpo::RELATED_TO::identidad': 'The body is a key dimension of identity.',
  'dolor::RELATED_TO::cuerpo': 'Pain is experienced through the body.',
  'maternidad::RELATED_TO::memoria': 'Motherhood can articulate affective and symbolic memory.',
  'guerra::RELATED_TO::violencia': 'War is a historical form of violence.',
  'francisco-de-goya::ASSOCIATED_WITH::romanticismo':
    'Goya is a foundational figure in the origins of modern and Romantic sensibility.',
  'pablo-picasso::BELONGS_TO_MOVEMENT::cubismo': 'Picasso is a co-founder of Cubism.',
  'salvador-dali::BELONGS_TO_MOVEMENT::surrealismo': 'Dali is a key figure of Surrealism.',
  'frida-kahlo::ASSOCIATED_WITH::arte-moderno':
    'Frida Kahlo is studied within the field of 20th-century modern art.',
  'louise-bourgeois::ASSOCIATED_WITH::arte-contemporaneo':
    'Louise Bourgeois is central to contemporary art.',
  'francisco-de-goya::BELONGS_TO_PERIOD::siglo-xix':
    'Goya belongs historically to the late 18th and early 19th centuries.',
  'pablo-picasso::BELONGS_TO_PERIOD::siglo-xx': 'Picasso is central to 20th-century art.',
  'salvador-dali::BELONGS_TO_PERIOD::siglo-xx': 'Dali belongs to the 20th century.',
  'frida-kahlo::BELONGS_TO_PERIOD::siglo-xx': 'Frida Kahlo belongs to the 20th century.',
  'louise-bourgeois::BELONGS_TO_PERIOD::siglo-xx':
    "Bourgeois's career unfolds primarily in the 20th century.",
  'frida-kahlo::ASSOCIATED_WITH::identidad': "Identity is central to Frida Kahlo's work.",
  'frida-kahlo::ASSOCIATED_WITH::cuerpo': "The body is central to Frida Kahlo's work.",
  'frida-kahlo::ASSOCIATED_WITH::dolor': "Pain is a key axis in Frida Kahlo's work.",
  'louise-bourgeois::ASSOCIATED_WITH::memoria':
    "Memory is a fundamental dimension of Bourgeois's work.",
  'louise-bourgeois::ASSOCIATED_WITH::maternidad':
    'Motherhood is an important conceptual axis in Bourgeois.',
  'louise-bourgeois::ASSOCIATED_WITH::cuerpo': "The body runs through Bourgeois's sculptural work.",
  'salvador-dali::ASSOCIATED_WITH::tiempo': "Temporality is a central theme in Dali's work.",
  'salvador-dali::ASSOCIATED_WITH::memoria':
    "Memory and psychic imagery carry weight in Dali's work.",
  'francisco-de-goya::ASSOCIATED_WITH::violencia': 'Goya addresses historical and human violence.',
  'francisco-de-goya::ASSOCIATED_WITH::guerra': 'Goya represents war with critical intensity.',
  'pablo-picasso::ASSOCIATED_WITH::guerra': 'War is a central axis in Guernica.',
  'pablo-picasso::ASSOCIATED_WITH::violencia':
    'Picasso thematizes political violence in key works.',
  'saturno-devorando-a-su-hijo::CREATED_BY::francisco-de-goya': 'Direct authorship.',
  'el-tres-de-mayo-de-1808::CREATED_BY::francisco-de-goya': 'Direct authorship.',
  'guernica::CREATED_BY::pablo-picasso': 'Direct authorship.',
  'la-persistencia-de-la-memoria::CREATED_BY::salvador-dali': 'Direct authorship.',
  'las-dos-fridas::CREATED_BY::frida-kahlo': 'Direct authorship.',
  'maman::CREATED_BY::louise-bourgeois': 'Direct authorship.',
  'saturno-devorando-a-su-hijo::BELONGS_TO_MOVEMENT::romanticismo':
    'A work associated with Romantic and premodern sensibility.',
  'el-tres-de-mayo-de-1808::BELONGS_TO_MOVEMENT::romanticismo':
    'A key work of Romantic historical drama.',
  'guernica::BELONGS_TO_MOVEMENT::cubismo':
    'Its formal fragmentation is linked to Cubist language.',
  'la-persistencia-de-la-memoria::BELONGS_TO_MOVEMENT::surrealismo':
    'An emblematic work of Surrealism.',
  'las-dos-fridas::BELONGS_TO_MOVEMENT::arte-moderno':
    'It is studied within the languages of 20th-century modern art.',
  'maman::BELONGS_TO_MOVEMENT::arte-contemporaneo': 'A central sculpture of contemporary art.',
  'saturno-devorando-a-su-hijo::BELONGS_TO_PERIOD::siglo-xix':
    'A work from the early 19th century.',
  'el-tres-de-mayo-de-1808::BELONGS_TO_PERIOD::siglo-xix': 'A work from 1814.',
  'guernica::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1937.',
  'la-persistencia-de-la-memoria::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1931.',
  'las-dos-fridas::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1939.',
  'maman::BELONGS_TO_PERIOD::siglo-xx': 'A work from 1999.',
  'saturno-devorando-a-su-hijo::ABOUT_CONCEPT::violencia': 'The work expresses radical violence.',
  'saturno-devorando-a-su-hijo::ABOUT_CONCEPT::tiempo':
    'It can be read through destruction and devouring time.',
  'saturno-devorando-a-su-hijo::ABOUT_CONCEPT::dolor': 'Its emotional intensity points to pain.',
  'el-tres-de-mayo-de-1808::ABOUT_CONCEPT::guerra': 'The work depicts war and execution.',
  'el-tres-de-mayo-de-1808::ABOUT_CONCEPT::violencia': 'Violence is explicit and central.',
  'el-tres-de-mayo-de-1808::ABOUT_CONCEPT::memoria': 'It can also be read as historical memory.',
  'guernica::ABOUT_CONCEPT::guerra': 'War is the central axis of the work.',
  'guernica::ABOUT_CONCEPT::violencia': 'Violence runs through the composition.',
  'guernica::ABOUT_CONCEPT::memoria': 'The work operates as historical memory of the bombing.',
  'la-persistencia-de-la-memoria::ABOUT_CONCEPT::tiempo':
    'The work is emblematic for thinking about time.',
  'la-persistencia-de-la-memoria::ABOUT_CONCEPT::memoria':
    'Its title and imagery point to memory and persistence.',
  'las-dos-fridas::ABOUT_CONCEPT::identidad': 'Identity is one of its most evident axes.',
  'las-dos-fridas::ABOUT_CONCEPT::cuerpo': 'Bodily representation is central.',
  'las-dos-fridas::ABOUT_CONCEPT::dolor': 'Wound and suffering are visible.',
  'maman::ABOUT_CONCEPT::maternidad': 'The work is deeply tied to the maternal.',
  'maman::ABOUT_CONCEPT::memoria': 'Affective memory is central to the reading of the work.',
  'maman::ABOUT_CONCEPT::cuerpo': "The sculpture's bodily monumentality suggests it.",
  'saturno-devorando-a-su-hijo::LOCATED_IN::museo-del-prado':
    'The work is housed at Museo del Prado.',
  'el-tres-de-mayo-de-1808::LOCATED_IN::museo-del-prado': 'The work is housed at Museo del Prado.',
  'guernica::LOCATED_IN::museo-reina-sofia': 'The work is housed at Museo Reina Sofia.',
  'la-persistencia-de-la-memoria::LOCATED_IN::moma': 'The work is housed at MoMA.',
  'maman::LOCATED_IN::guggenheim-bilbao':
    'An emblematic version or installation is associated with Guggenheim Bilbao.',
  'guernica::RELATED_TO::el-tres-de-mayo-de-1808':
    'Both works invite reflection on historical violence and war.',
  'la-persistencia-de-la-memoria::RELATED_TO::saturno-devorando-a-su-hijo':
    'Both can be read through time and an unsettling dimension.',
  'las-dos-fridas::RELATED_TO::maman':
    'Both works engage with the body, affect, and personal experience.',
  'saturno-devorando-a-su-hijo::RELATED_TO::guernica':
    'Both articulate intense images of destruction and violence.',
  'la-persistencia-de-la-memoria::MENTIONS::tiempo': 'Explicit mention in the content.',
  'la-persistencia-de-la-memoria::MENTIONS::memoria': 'Explicit mention in the content.',
  'las-dos-fridas::MENTIONS::identidad': 'Explicit mention in the content.',
  'las-dos-fridas::MENTIONS::cuerpo': 'Explicit mention in the content.',
  'las-dos-fridas::MENTIONS::dolor': 'Explicit mention in the content.',
  'maman::MENTIONS::maternidad': 'Explicit mention in the content.',
  'maman::MENTIONS::memoria': 'Explicit mention in the content.',
};
