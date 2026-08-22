import type { PilotEntry } from './foundational-v1-pilot';
const source = (title: string, publisher: string, url: string) => ({
  title,
  publisher,
  url,
  note: 'Institutional artist reference.',
});

export const foundationalV1TierAArtists: PilotEntry[] = [
  {
    slug: 'miguel-angel',
    summary: {
      es: 'Miguel Ángel desarrolló una práctica que atravesó escultura, pintura, arquitectura y poesía, y que transformó la ambición del artista en el Renacimiento. Sus obras no pertenecen a un único medio: el cuerpo, la materia y la escala son problemas comunes a toda su trayectoria. En JANO permite explorar Florencia, Roma, David y la relación entre figura humana, poder y espacio monumental.',
      en: 'Michelangelo developed a practice across sculpture, painting, architecture, and poetry that transformed the artist’s ambition in the Renaissance. His works do not belong to one medium: body, material, and scale are questions shared across his career. In JANO he opens paths to Florence, Rome, David, and the relation among the human figure, power, and monumental space.',
    },
    source: source(
      'Michelangelo',
      'Galleria dell’Accademia di Firenze',
      'https://www.galleriaaccademiafirenze.it/en/artists/michelangelo/',
    ),
  },
  {
    slug: 'rafael',
    summary: {
      es: 'Rafael articuló claridad compositiva, estudio de la antigüedad y atención a la figura humana en una carrera breve desarrollada entre Urbino, Florencia y Roma. Su trabajo para la corte papal muestra cómo pintura, arquitectura y patronazgo podían integrarse en un mismo programa visual. En JANO es una entrada a La escuela de Atenas, Renacimiento italiano y la Roma de Julio II.',
      en: 'Raphael joined compositional clarity, the study of antiquity, and attention to the human figure in a short career spanning Urbino, Florence, and Rome. His work for the papal court shows how painting, architecture, and patronage could be integrated within one visual programme. In JANO he opens paths to The School of Athens, the Italian Renaissance, and the Rome of Julius II.',
    },
    source: source(
      'Raphael Rooms',
      'Musei Vaticani',
      'https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/stanze-di-raffaello.html',
    ),
  },
  {
    slug: 'sandro-botticelli',
    summary: {
      es: 'Sandro Botticelli fue una figura central de la pintura florentina del Quattrocento. Sus composiciones combinan línea, ritmo y referencias literarias o religiosas, pero no responden a una sola fórmula decorativa. En JANO permite recorrer el patrocinio mediceo, Florencia, El nacimiento de Venus y los modos en que mito, belleza y devoción convivieron en el Renacimiento.',
      en: 'Sandro Botticelli was a central figure in Florentine Quattrocento painting. His compositions combine line, rhythm, and literary or religious reference, yet they do not follow a single decorative formula. In JANO he opens paths to Medici patronage, Florence, The Birth of Venus, and the ways myth, beauty, and devotion coexisted in the Renaissance.',
    },
    source: source(
      'Sandro Botticelli',
      'Gallerie degli Uffizi',
      'https://www.uffizi.it/en/artworks/birth-of-venus',
    ),
  },
  {
    slug: 'tiziano',
    summary: {
      es: 'Tiziano convirtió el color, la materia pictórica y la construcción de la presencia en elementos decisivos de la pintura veneciana del siglo XVI. Trabajó para cortes, iglesias y coleccionistas, adaptando sus soluciones a retrato, mito y pintura religiosa. En JANO conecta Venecia, Renacimiento italiano y el problema de cómo la pintura puede producir densidad corporal y atmósfera.',
      en: 'Titian made colour, pictorial material, and the construction of presence decisive elements of sixteenth-century Venetian painting. He worked for courts, churches, and collectors, adapting his solutions to portraiture, myth, and religious painting. In JANO he connects Venice, the Italian Renaissance, and the problem of how painting can produce bodily density and atmosphere.',
    },
    source: source(
      'Titian',
      'The National Gallery',
      'https://www.nationalgallery.org.uk/artists/titian',
    ),
  },
  {
    slug: 'el-greco',
    summary: {
      es: 'Doménikos Theotokópoulos, conocido como El Greco, desarrolló una pintura formada entre Creta, Venecia, Roma y Toledo. Sus figuras alargadas, colores intensos y espacios inestables no son un simple anticipo de la modernidad: responden a una trayectoria cultural compleja. En JANO permite explorar arte religioso, manierismo, Toledo y los cruces mediterráneos de su práctica.',
      en: 'Doménikos Theotokópoulos, known as El Greco, developed a painting shaped between Crete, Venice, Rome, and Toledo. His elongated figures, intense colour, and unstable spaces are not merely a prefiguration of modernity: they answer to a complex cultural trajectory. In JANO he opens paths to religious art, Mannerism, Toledo, and the Mediterranean crossings of his practice.',
    },
    source: source(
      'El Greco',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/en/the-collection/artist/el-greco/5e2e3b86-bc04-4686-bbec-3780d7f84e34',
    ),
  },
  {
    slug: 'caravaggio',
    summary: {
      es: 'Caravaggio alteró la pintura romana de comienzos del siglo XVII con figuras tomadas de la observación, contrastes radicales de luz y una proximidad física que intensifica la escena. Su obra religiosa no abandona lo cotidiano: hace de cuerpos, gestos y espacios ordinarios un lugar de conflicto espiritual. En JANO conecta Barroco, Roma, vocación y la construcción dramática de la mirada.',
      en: 'Caravaggio changed Roman painting in the early seventeenth century through figures drawn from observation, radical contrasts of light, and a physical proximity that intensifies the scene. His religious work does not abandon the everyday: it turns bodies, gestures, and ordinary spaces into sites of spiritual conflict. In JANO he connects Baroque, Rome, calling, and the dramatic construction of looking.',
    },
    source: source(
      'Caravaggio',
      'Gallerie Nazionali di Arte Antica',
      'https://barberinicorsini.org/en/',
    ),
  },
  {
    slug: 'rembrandt',
    summary: {
      es: 'Rembrandt exploró retrato, escena bíblica, grabado y autorrepresentación en la República neerlandesa del siglo XVII. Su pintura no se define sólo por una luz reconocible: organiza atención, intimidad y tiempo mediante materia y gesto. En JANO abre conexiones entre Barroco, Ámsterdam, La ronda de noche y los problemas de presencia individual y vida colectiva.',
      en: 'Rembrandt explored portraiture, biblical scenes, printmaking, and self-representation in the seventeenth-century Dutch Republic. His painting is not defined by recognisable light alone: it organises attention, intimacy, and time through material and gesture. In JANO he connects Baroque, Amsterdam, The Night Watch, and questions of individual presence and collective life.',
    },
    source: source(
      'Rembrandt van Rijn',
      'Rijksmuseum',
      'https://www.rijksmuseum.nl/en/collection/creators/rembrandt-van-rijn',
    ),
  },
  {
    slug: 'johannes-vermeer',
    summary: {
      es: 'Johannes Vermeer trabajó principalmente con escenas interiores de escala contenida, donde luz, color y disposición espacial producen una concentración inusual. Sus imágenes no son ventanas neutrales a la vida doméstica: organizan trabajo, género, intercambio y mirada. En JANO conecta pintura neerlandesa, retrato, interior y la atención moderna a lo cotidiano.',
      en: 'Johannes Vermeer worked mainly with small-scale interior scenes in which light, colour, and spatial arrangement produce unusual concentration. His images are not neutral windows onto domestic life: they organise labour, gender, exchange, and looking. In JANO he connects Dutch painting, portraiture, interior, and modern attention to the everyday.',
    },
    source: source(
      'Johannes Vermeer',
      'Mauritshuis',
      'https://www.mauritshuis.nl/en/discover/mauritshuis-in-depth/johannes-vermeer/',
    ),
  },
  {
    slug: 'francisco-de-goya',
    summary: {
      es: 'Francisco de Goya trabajó como pintor de corte, retratista y grabador en una España atravesada por guerra, reforma y restauración. Su obra puede ser incisiva, ambigua o violenta sin formar un comentario uniforme sobre la historia. En JANO conecta Madrid, Romanticismo, El 3 de mayo, las Pinturas negras y los problemas de poder, guerra y representación.',
      en: 'Francisco de Goya worked as court painter, portraitist, and printmaker in a Spain marked by war, reform, and restoration. His work can be incisive, ambiguous, or violent without forming a uniform commentary on history. In JANO he connects Madrid, Romanticism, The Third of May, the Black Paintings, and questions of power, war, and representation.',
    },
    source: source(
      'Goya',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/en/the-collection/artist/goya-y-lucientes-francisco-de/39568a2a-91e7-4b3a-92f2-3cd9e97bc462',
    ),
  },
  {
    slug: 'jacques-louis-david',
    summary: {
      es: 'Jacques-Louis David situó la pintura en el centro de los conflictos políticos de la Francia revolucionaria y napoleónica. Su recurso a la antigüedad no fue un decorado: organizó modelos de ciudadanía, sacrificio y autoridad. En JANO conecta neoclasicismo, historia, poder y la capacidad de una imagen para intervenir en la vida pública.',
      en: 'Jacques-Louis David placed painting at the centre of political conflicts in Revolutionary and Napoleonic France. His use of antiquity was not decoration: it organised models of citizenship, sacrifice, and authority. In JANO he connects Neoclassicism, history, power, and an image’s capacity to intervene in public life.',
    },
    source: source(
      'Jacques-Louis David',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/toah/hd/david/hd_david.htm',
    ),
  },
  {
    slug: 'eugene-delacroix',
    summary: {
      es: 'Eugène Delacroix desarrolló una pintura de color, movimiento y tensión que convirtió asuntos literarios, históricos y políticos en escenas de gran intensidad. Su trabajo no separa forma y actualidad: la composición puede ser también una manera de pensar revolución, orientalismo o violencia. En JANO conecta Romanticismo, La Libertad guiando al pueblo y la construcción visual de la historia.',
      en: 'Eugène Delacroix developed a painting of colour, movement, and tension that turned literary, historical, and political subjects into scenes of great intensity. His work does not separate form from actuality: composition can also think revolution, Orientalism, or violence. In JANO he connects Romanticism, Liberty Leading the People, and the visual construction of history.',
    },
    source: source('Eugène Delacroix', 'Musée du Louvre', 'https://www.louvre.fr/en'),
  },
  {
    slug: 'jmw-turner',
    summary: {
      es: 'J. M. W. Turner llevó el paisaje hacia problemas de luz, atmósfera, velocidad y transformación material. Sus pinturas y acuarelas no son sólo vistas naturales: registran mar, industria, viaje y violencia histórica mediante una percepción inestable. En JANO abre conexiones entre Romanticismo, paisaje, modernidad y la experiencia de un mundo en cambio.',
      en: 'J. M. W. Turner brought landscape toward questions of light, atmosphere, speed, and material transformation. His paintings and watercolours are not simply natural views: they register sea, industry, travel, and historical violence through unstable perception. In JANO he connects Romanticism, landscape, modernity, and the experience of a changing world.',
    },
    source: source('J. M. W. Turner', 'Tate', 'https://www.tate.org.uk/art/artists/jmw-turner-558'),
  },
  {
    slug: 'edouard-manet',
    summary: {
      es: 'Édouard Manet hizo de la pintura un espacio de fricción con las convenciones académicas y la vida moderna parisina. Sus figuras, superficies y citas a la tradición desplazan la seguridad con que el espectador esperaba mirar. En JANO conecta Olympia, modernidad, retrato, clase y los cambios que prepararon el impresionismo sin confundirse con él.',
      en: 'Édouard Manet made painting a space of friction with academic convention and modern Parisian life. His figures, surfaces, and citations of tradition unsettle the certainty with which spectators expected to look. In JANO he connects Olympia, modernity, portraiture, class, and changes that prepared Impressionism without being identical to it.',
    },
    source: source('Édouard Manet', 'Musée d’Orsay', 'https://www.musee-orsay.fr/en'),
  },
  {
    slug: 'claude-monet',
    summary: {
      es: 'Claude Monet investigó cómo luz, clima, estación y duración transforman la percepción de un motivo. Sus series no buscan fijar una impresión inmediata, sino mostrar que la visión cambia con condiciones materiales y temporales. En JANO conecta impresionismo, paisaje, París y la pintura moderna como práctica de atención.',
      en: 'Claude Monet investigated how light, weather, season, and duration transform perception of a motif. His series do not fix an instant impression so much as show that vision changes with material and temporal conditions. In JANO he connects Impressionism, landscape, Paris, and modern painting as a practice of attention.',
    },
    source: source('Claude Monet', 'Musée Marmottan Monet', 'https://www.marmottan.fr/en/'),
  },
  {
    slug: 'edgar-degas',
    summary: {
      es: 'Edgar Degas observó ensayo, trabajo, ocio y movimiento mediante encuadres que parecen tomar la escena a contratiempo. Su relación con el impresionismo fue cercana pero singular: dibujo, composición y medios como el pastel importan tanto como la luz. En JANO conecta cuerpo, ciudad, fotografía, danza y las condiciones sociales de la mirada moderna.',
      en: 'Edgar Degas observed rehearsal, labour, leisure, and movement through framings that seem to catch a scene off-beat. His relation to Impressionism was close but singular: drawing, composition, and media such as pastel matter as much as light. In JANO he connects body, city, photography, dance, and the social conditions of modern looking.',
    },
    source: source(
      'Edgar Degas',
      'National Gallery of Art',
      'https://www.nga.gov/artists/1158-edgar-degas',
    ),
  },
  {
    slug: 'paul-cezanne',
    summary: {
      es: 'Paul Cézanne insistió en que la pintura podía construir el mundo mediante color, volumen y relaciones espaciales sin limitarse a imitar su apariencia. Sus paisajes, naturalezas muertas y figuras hicieron del cuadro un problema de estructura. En JANO conecta postimpresionismo, cubismo, paisaje y la búsqueda moderna de nuevas formas de representación.',
      en: 'Paul Cézanne insisted that painting could construct the world through colour, volume, and spatial relations without merely imitating appearance. His landscapes, still lifes, and figures made the picture a problem of structure. In JANO he connects Post-Impressionism, Cubism, landscape, and the modern search for new forms of representation.',
    },
    source: source(
      'Paul Cézanne',
      'The Art Institute of Chicago',
      'https://www.artic.edu/artists/34798/paul-cezanne',
    ),
  },
  {
    slug: 'vincent-van-gogh',
    summary: {
      es: 'Vincent van Gogh utilizó color, pincelada y composición para intensificar la experiencia de paisaje, interior, retrato y trabajo. Su trayectoria breve no debe reducirse a un mito de genio aislado: estuvo vinculada a redes artísticas, lectura y circulación de imágenes. En JANO conecta postimpresionismo, La noche estrellada, naturaleza y subjetividad moderna.',
      en: 'Vincent van Gogh used colour, brushwork, and composition to intensify the experience of landscape, interior, portraiture, and labour. His short career should not be reduced to a myth of isolated genius: it was connected to artistic networks, reading, and image circulation. In JANO he connects Post-Impressionism, The Starry Night, nature, and modern subjectivity.',
    },
    source: source('Vincent van Gogh', 'Van Gogh Museum', 'https://www.vangoghmuseum.nl/en'),
  },
  {
    slug: 'auguste-rodin',
    summary: {
      es: 'Auguste Rodin renovó la escultura moderna al tratar superficie, fragmento, repetición y gesto como elementos activos de pensamiento. Su obra no se limita a monumentos aislados: dialoga con dibujo, fotografía, fundición y reproducción. En JANO conecta cuerpo, escultura, modernidad y las tensiones entre obra única, versión y proceso.',
      en: 'Auguste Rodin renewed modern sculpture by treating surface, fragment, repetition, and gesture as active elements of thought. His work is not limited to isolated monuments: it engages drawing, photography, casting, and reproduction. In JANO he connects body, sculpture, modernity, and tensions among unique work, version, and process.',
    },
    source: source('Auguste Rodin', 'Musée Rodin', 'https://www.musee-rodin.fr/en'),
  },
  {
    slug: 'henri-matisse',
    summary: {
      es: 'Henri Matisse exploró color, plano y decoración como modos de producir intensidad sin depender de la ilusión espacial tradicional. Su práctica atravesó pintura, dibujo, escultura y recorte, con un interés constante por el ritmo y la relación entre figura y entorno. En JANO conecta fauvismo, modernidad, cuerpo y la autonomía de la superficie pictórica.',
      en: 'Henri Matisse explored colour, plane, and decoration as ways to produce intensity without relying on traditional spatial illusion. His practice crossed painting, drawing, sculpture, and cut-outs, with sustained attention to rhythm and the relation between figure and setting. In JANO he connects Fauvism, modernity, body, and the autonomy of the pictorial surface.',
    },
    source: source(
      'Henri Matisse',
      'The Museum of Modern Art',
      'https://www.moma.org/artists/3823',
    ),
  },
  {
    slug: 'le-corbusier',
    summary: {
      es: 'Le Corbusier fue arquitecto, urbanista, pintor y polemista; su influencia excede sus edificios. Sus propuestas para vivienda, ciudad y estandarización buscaron responder a la vida moderna, pero también han recibido críticas por sus efectos sociales y su ambición de orden. En JANO permite explorar arquitectura moderna, diseño, ciudad y las tensiones entre programa y experiencia.',
      en: 'Le Corbusier was an architect, urbanist, painter, and polemicist whose influence exceeds his buildings. His proposals for housing, city, and standardisation sought to address modern life, but have also been criticised for their social effects and desire for order. In JANO he explores modern architecture, design, city, and tensions between programme and experience.',
    },
    source: source(
      'The Architectural Work of Le Corbusier',
      'UNESCO World Heritage Centre',
      'https://whc.unesco.org/en/list/1321/',
    ),
  },
  {
    slug: 'frank-lloyd-wright',
    summary: {
      es: 'Frank Lloyd Wright concibió arquitectura, paisaje, estructura y vida doméstica como un problema integrado. Sus casas y edificios públicos buscaron una relación intensa con el lugar, aunque su idea de organicidad no elimina las condiciones sociales y técnicas de su producción. En JANO conecta Casa de la Cascada, arquitectura moderna, naturaleza y materialidad.',
      en: 'Frank Lloyd Wright conceived architecture, landscape, structure, and domestic life as an integrated problem. His houses and public buildings sought an intense relation with place, though his idea of organicity does not erase the social and technical conditions of their production. In JANO he connects Fallingwater, modern architecture, nature, and materiality.',
    },
    source: source(
      'Frank Lloyd Wright',
      'Frank Lloyd Wright Foundation',
      'https://franklloydwright.org/',
    ),
  },
  {
    slug: 'georgia-okeeffe',
    summary: {
      es: 'Georgia O’Keeffe construyó una práctica de pintura que alternó flores ampliadas, paisajes, arquitectura urbana y formas del desierto del suroeste estadounidense. Sus obras resisten lecturas únicas: pueden abordar escala, abstracción, cuerpo y lugar sin quedar reducidas a una simbología fija. En JANO conecta modernidad estadounidense, paisaje, naturaleza y mirada.',
      en: 'Georgia O’Keeffe developed a painting practice moving among enlarged flowers, landscapes, urban architecture, and forms of the American Southwest desert. Her works resist single readings: they may address scale, abstraction, body, and place without being reduced to fixed symbolism. In JANO she connects American modernity, landscape, nature, and looking.',
    },
    source: source('Georgia O’Keeffe', 'Georgia O’Keeffe Museum', 'https://www.okeeffemuseum.org/'),
  },
  {
    slug: 'jackson-pollock',
    summary: {
      es: 'Jackson Pollock hizo de la pintura una actividad de escala corporal, desplazamiento y depósito de materia. Sus drip paintings no son sólo gestos espontáneos: dependen de decisiones de ritmo, soporte, gravedad y encuadre. En JANO conecta expresionismo abstracto, cuerpo, posguerra y la forma en que un museo convierte un proceso en obra.',
      en: 'Jackson Pollock made painting an activity of bodily scale, movement, and material deposit. His drip paintings are not simply spontaneous gestures: they depend on decisions of rhythm, support, gravity, and framing. In JANO he connects Abstract Expressionism, body, postwar art, and the way a museum turns a process into a work.',
    },
    source: source(
      'Jackson Pollock',
      'The Museum of Modern Art',
      'https://www.moma.org/artists/4675',
    ),
  },
  {
    slug: 'mark-rothko',
    summary: {
      es: 'Mark Rothko desarrolló campos de color que convierten escala, borde y luminosidad en una experiencia lenta de percepción. Sus pinturas no requieren una interpretación simbólica única, pero sí una atención a distancia, duración y ambiente. En JANO conecta abstracción de posguerra, color, espiritualidad secular y el papel del espectador ante la pintura.',
      en: 'Mark Rothko developed colour fields that turn scale, edge, and luminosity into a slow experience of perception. His paintings do not require one symbolic interpretation, but they do ask for attention to distance, duration, and atmosphere. In JANO he connects postwar abstraction, colour, secular spirituality, and the spectator’s role before painting.',
    },
    source: source(
      'Mark Rothko',
      'National Gallery of Art',
      'https://www.nga.gov/artists/1892-mark-rothko',
    ),
  },
  {
    slug: 'marina-abramovic',
    summary: {
      es: 'Marina Abramović ha situado duración, riesgo, presencia y relación con el público en el centro de su práctica performativa. Sus obras no se agotan en la documentación que las conserva: dependen de reglas, cuerpos, instituciones y memoria. En JANO conecta performance, cuerpo, ritual y las condiciones éticas de mirar a otra persona.',
      en: 'Marina Abramović has placed duration, risk, presence, and relation to the public at the centre of her performance practice. Her works are not exhausted by the documentation that preserves them: they depend on rules, bodies, institutions, and memory. In JANO she connects performance, body, ritual, and the ethical conditions of looking at another person.',
    },
    source: source('Marina Abramović', 'Museum of Modern Art', 'https://www.moma.org/artists/819'),
  },
  {
    slug: 'ai-weiwei',
    summary: {
      es: 'Ai Weiwei trabaja entre escultura, arquitectura, archivo, cine y acción pública para examinar autoridad, patrimonio, migración y libertad de expresión. Sus proyectos no separan objeto y circulación: importan tanto los materiales como la respuesta institucional y mediática. En JANO conecta arte conceptual, China contemporánea, activismo y los usos políticos de la memoria.',
      en: 'Ai Weiwei works across sculpture, architecture, archive, film, and public action to examine authority, heritage, migration, and freedom of expression. His projects do not separate object from circulation: materials matter alongside institutional and media response. In JANO he connects conceptual art, contemporary China, activism, and the political uses of memory.',
    },
    source: source(
      'Ai Weiwei',
      'Royal Academy of Arts',
      'https://www.royalacademy.org.uk/art-artists/name/ai-weiwei',
    ),
  },
  {
    slug: 'yayoi-kusama',
    summary: {
      es: 'Yayoi Kusama ha desarrollado una práctica que atraviesa pintura, escultura, instalación, moda y escritura. Sus redes, puntos e instalaciones inmersivas articulan repetición, escala, deseo y percepción sin reducirse a una experiencia fotogénica. En JANO conecta arte contemporáneo, cuerpo, instalación y los límites entre espacio íntimo, público y comercial.',
      en: 'Yayoi Kusama has developed a practice across painting, sculpture, installation, fashion, and writing. Her nets, dots, and immersive installations articulate repetition, scale, desire, and perception without being reduced to a photogenic experience. In JANO she connects contemporary art, body, installation, and the limits between intimate, public, and commercial space.',
    },
    source: source(
      'Yayoi Kusama',
      'Tate',
      'https://www.tate.org.uk/art/artists/yayoi-kusama-13807',
    ),
  },
  {
    slug: 'cindy-sherman',
    summary: {
      es: 'Cindy Sherman utiliza fotografía, maquillaje, vestuario y puesta en escena para fabricar personajes que parecen reconocibles pero no son retratos de personas estables. Su obra examina los repertorios visuales que organizan género, deseo, edad y consumo. En JANO conecta fotografía, identidad, mirada y los papeles que las imágenes ofrecen o imponen.',
      en: 'Cindy Sherman uses photography, makeup, costume, and staging to fabricate characters that seem recognisable but are not portraits of stable people. Her work examines visual repertoires that organise gender, desire, age, and consumption. In JANO she connects photography, identity, looking, and the roles images offer or impose.',
    },
    source: source('Cindy Sherman', 'Museum of Modern Art', 'https://www.moma.org/artists/5392'),
  },
  {
    slug: 'edvard-munch',
    summary: {
      es: 'Edvard Munch convirtió ansiedad, deseo, enfermedad y muerte en problemas visuales de una modernidad intensamente subjetiva. Sus variaciones sobre motivos como El grito muestran que una imagen puede ser una serie de intentos, no una forma definitiva. En JANO conecta expresionismo, cuerpo, memoria y la circulación contemporánea de una imagen de inquietud.',
      en: 'Edvard Munch turned anxiety, desire, illness, and death into visual problems of an intensely subjective modernity. His variations on motifs such as The Scream show that an image can be a series of attempts, not a definitive form. In JANO he connects Expressionism, body, memory, and the contemporary circulation of an image of unease.',
    },
    source: source('Edvard Munch', 'MUNCH', 'https://www.munchmuseet.no/en/'),
  },
  {
    slug: 'gian-lorenzo-bernini',
    summary: {
      es: 'Gian Lorenzo Bernini articuló escultura, arquitectura, urbanismo y espectáculo en la Roma papal del siglo XVII. Sus obras convierten mármol, luz y espacio en experiencias de movimiento y persuasión, vinculadas a encargos religiosos y políticos. En JANO conecta Barroco, Roma, Éxtasis de santa Teresa y la relación entre materia, fe y poder.',
      en: 'Gian Lorenzo Bernini brought sculpture, architecture, urbanism, and spectacle together in seventeenth-century papal Rome. His works turn marble, light, and space into experiences of movement and persuasion, tied to religious and political commissions. In JANO he connects Baroque, Rome, The Ecstasy of Saint Teresa, and the relation among material, faith, and power.',
    },
    source: source(
      'Gian Lorenzo Bernini',
      'Galleria Borghese',
      'https://galleriaborghese.beniculturali.it/en/',
    ),
  },
  {
    slug: 'alberto-giacometti',
    summary: {
      es: 'Alberto Giacometti desarrolló esculturas y pinturas donde figura, distancia y percepción permanecen inestables. Sus cuerpos alargados no son sólo emblemas existencialistas: nacen de una investigación persistente sobre cómo aparece una persona ante otra. En JANO conecta cuerpo, surrealismo, París y la escultura de posguerra.',
      en: 'Alberto Giacometti developed sculptures and paintings in which figure, distance, and perception remain unstable. His elongated bodies are not merely existentialist emblems: they arise from a sustained inquiry into how one person appears before another. In JANO he connects body, Surrealism, Paris, and postwar sculpture.',
    },
    source: source(
      'Alberto Giacometti',
      'Fondation Giacometti',
      'https://www.fondation-giacometti.fr/en',
    ),
  },
  {
    slug: 'edward-hopper',
    summary: {
      es: 'Edward Hopper pintó espacios urbanos, interiores y paisajes donde luz, arquitectura y distancia entre figuras producen una sensación de suspensión. Sus escenas no ofrecen una psicología cerrada: hacen visible la ambigüedad de mirar y habitar la modernidad estadounidense. En JANO conecta Nighthawks, ciudad, realismo y las construcciones visuales de soledad y vida pública.',
      en: 'Edward Hopper painted urban spaces, interiors, and landscapes where light, architecture, and distance among figures produce a sense of suspension. His scenes offer no closed psychology: they make visible the ambiguity of looking at and inhabiting American modernity. In JANO he connects Nighthawks, city, realism, and visual constructions of solitude and public life.',
    },
    source: source(
      'Edward Hopper',
      'Whitney Museum of American Art',
      'https://whitney.org/artists/611',
    ),
  },
  {
    slug: 'marcel-duchamp',
    summary: {
      es: 'Marcel Duchamp desplazó la práctica artística hacia elección, lenguaje, azar e institución sin abandonar por ello la materialidad de los objetos. Sus readymades y juegos conceptuales convierten la autoridad de exhibir y nombrar en parte de la obra. En JANO conecta Fountain, dadaísmo, arte conceptual, autoría y museo.',
      en: 'Marcel Duchamp shifted artistic practice toward choice, language, chance, and institution without abandoning objects’ materiality. His readymades and conceptual games make the authority to exhibit and name part of the work. In JANO he connects Fountain, Dada, conceptual art, authorship, and museum.',
    },
    source: source(
      'Marcel Duchamp',
      'Philadelphia Museum of Art',
      'https://www.philamuseum.org/collection/artist/marcel-duchamp',
    ),
  },
  {
    slug: 'salvador-dali',
    summary: {
      es: 'Salvador Dalí combinó técnica ilusionista, asociaciones oníricas y una construcción pública muy consciente de su propia figura. Su relación con el surrealismo fue decisiva pero conflictiva, y su obra posterior atravesó medios y registros diversos. En JANO conecta La persistencia de la memoria, surrealismo, tiempo, deseo y la circulación de imágenes modernas.',
      en: 'Salvador Dalí combined illusionistic technique, dream-like associations, and a highly self-conscious public construction of his own figure. His relation to Surrealism was decisive but conflicted, and his later work crossed diverse media and registers. In JANO he connects The Persistence of Memory, Surrealism, time, desire, and the circulation of modern images.',
    },
    source: source(
      'Salvador Dalí',
      'Fundació Gala-Salvador Dalí',
      'https://www.salvador-dali.org/en/',
    ),
  },
  {
    slug: 'andy-warhol',
    summary: {
      es: 'Andy Warhol trabajó con serigrafía, repetición, cine y prácticas de estudio para examinar consumo, celebridad, muerte y circulación mecánica de imágenes. Su aparente frialdad no elimina la ambivalencia: repite tanto para hacer visible como para desgastar una imagen. En JANO conecta Pop Art, Campbell’s Soup Cans, Marilyn, fotografía y mercado.',
      en: 'Andy Warhol worked with screenprint, repetition, film, and studio practice to examine consumption, celebrity, death, and the mechanical circulation of images. His apparent coolness does not remove ambivalence: he repeats both to make an image visible and to wear it down. In JANO he connects Pop Art, Campbell’s Soup Cans, Marilyn, photography, and market.',
    },
    source: source('Andy Warhol', 'The Andy Warhol Museum', 'https://www.warhol.org/'),
  },
];
