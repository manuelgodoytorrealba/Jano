/**
 * The first, deliberately small, editorial import. It is separate from the
 * foundational catalogue and only fills empty editorial fields.
 */
export type PilotEntry = {
  slug: string;
  summary?: { es: string; en: string };
  essay?: string;
  source: { title: string; publisher: string; url: string; note: string };
  definition?: string;
  details?: {
    technique?: string;
    materials?: string;
    dimensions?: string;
    location?: string;
    collection?: string;
  };
};

const source = (title: string, publisher: string, url: string, note: string) => ({
  title,
  publisher,
  url,
  note,
});

export const foundationalV1Pilot: PilotEntry[] = [
  {
    slug: 'pablo-picasso',
    summary: {
      es: 'Pablo Picasso fue una figura decisiva en la reinvención de la pintura y la escultura del siglo XX. Su obra atravesó registros muy distintos, desde el cubismo hasta grandes composiciones políticas, y convirtió la experimentación formal en una manera de pensar el mundo moderno. En JANO es una entrada hacia el cubismo, la guerra, París y algunas de las obras que transformaron la idea misma de representación.',
      en: 'Pablo Picasso was decisive in the reinvention of twentieth-century painting and sculpture. His work moved across markedly different registers, from Cubism to large political compositions, making formal experiment a way of thinking about the modern world. In JANO, he opens paths to Cubism, war, Paris, and works that transformed the very idea of representation.',
    },
    source: source(
      'Pablo Picasso',
      'Museo Reina Sofía',
      'https://guernica.museoreinasofia.es/agente/pablo-picasso-5322',
      'Institutional context for Picasso and Guernica.',
    ),
  },
  {
    slug: 'leonardo-da-vinci',
    summary: {
      es: 'Leonardo da Vinci encarna una de las ambiciones centrales del Renacimiento: relacionar la pintura con la observación, la ciencia y el estudio de la naturaleza. Sus obras conservadas son pocas, pero su influencia desborda su producción. La Mona Lisa ofrece en JANO un punto de entrada a su investigación sobre el retrato, la mirada y la construcción de una presencia pictórica.',
      en: 'Leonardo da Vinci embodies a central Renaissance ambition: bringing painting into dialogue with observation, science, and the study of nature. Few works survive, yet his influence far exceeds his output. The Mona Lisa offers a JANO entry point to his investigation of portraiture, looking, and pictorial presence.',
    },
    source: source(
      'Leonardo da Vinci',
      'Musée du Louvre',
      'https://www.louvre.fr/en/explore/the-palace/leonardo-da-vinci',
      'Institutional overview of Leonardo at the Louvre.',
    ),
  },
  {
    slug: 'diego-velazquez',
    summary: {
      es: 'Diego Velázquez fue el gran pintor de la corte de Felipe IV y una figura clave del barroco europeo. Su pintura combina una atención excepcional a la luz, la materia y la presencia de las personas con una reflexión sostenida sobre el poder y la imagen. Las Meninas concentra esas cuestiones y permite explorar en JANO la corte madrileña, el retrato y el papel del artista.',
      en: 'Diego Velázquez was the leading painter at Philip IV’s court and a key figure of the European Baroque. His painting joins an exceptional attention to light, material, and human presence with a sustained reflection on power and images. Las Meninas concentrates these questions, opening paths in JANO to the Madrid court, portraiture, and the artist’s role.',
    },
    source: source(
      'Velázquez',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/coleccion/artista/velazquez-diego-rodriguez-de-silva-y/20f7b0e0-84a0-45c0-87a0-0a6ca1761f16',
      'Institutional artist record.',
    ),
  },
  {
    slug: 'frida-kahlo',
    summary: {
      es: 'Frida Kahlo desarrolló una pintura de escala íntima que hace del cuerpo, el dolor, la identidad y la historia de México asuntos inseparables. Sus autorretratos no son simples diarios visuales: construyen imágenes cuidadosamente compuestas donde la experiencia personal se cruza con símbolos políticos y culturales. En JANO conecta la modernidad latinoamericana con preguntas sobre género, memoria y representación.',
      en: 'Frida Kahlo developed an intimate-scale painting in which body, pain, identity, and Mexican history are inseparable. Her self-portraits are not simple visual diaries: they are carefully composed images where personal experience meets political and cultural symbols. In JANO, she connects Latin American modernity with questions of gender, memory, and representation.',
    },
    source: source(
      'Frida Kahlo',
      'Museo Frida Kahlo',
      'https://www.museofridakahlo.org.mx/en/the-blue-house/frida-kahlo/',
      'Institutional biographical context.',
    ),
  },
  {
    slug: 'katsushika-hokusai',
    summary: {
      es: 'Katsushika Hokusai fue un maestro del ukiyo-e cuya obra amplió las posibilidades del grabado japonés. Sus paisajes, libros ilustrados y series de estampas combinan observación, ritmo gráfico y una atención radical a los fenómenos naturales. La gran ola de Kanagawa permite entrar desde JANO en el Japón del periodo Edo, el paisaje y la circulación global de las imágenes.',
      en: 'Katsushika Hokusai was a master of ukiyo-e whose work expanded the possibilities of Japanese printmaking. His landscapes, illustrated books, and print series combine observation, graphic rhythm, and a radical attention to natural phenomena. The Great Wave opens JANO paths to Edo-period Japan, landscape, and the global circulation of images.',
    },
    source: source(
      'Katsushika Hokusai: Under the Wave off Kanagawa',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/art/collection/search/39799',
      'Institutional object record and artist context.',
    ),
  },
  {
    slug: 'guernica',
    summary: {
      es: 'Pintado por Pablo Picasso en 1937 para el Pabellón Español de la Exposición Internacional de París, Guernica responde al bombardeo de la ciudad vasca de Gernika durante la Guerra Civil española. Su escala, su paleta reducida y sus figuras fragmentadas convierten un hecho histórico preciso en una imagen de dolor civil. Es una puerta fundamental hacia Picasso, la guerra, la violencia y la memoria política.',
      en: 'Painted by Pablo Picasso in 1937 for the Spanish Pavilion at the Paris International Exposition, Guernica responds to the bombing of the Basque town of Gernika during the Spanish Civil War. Its scale, reduced palette, and fractured figures turn a precise event into an image of civilian suffering. It is a fundamental path to Picasso, war, violence, and political memory.',
    },
    essay:
      '## Una imagen para una violencia sin centro\n\nGuernica no organiza el dolor como una escena histórica legible. No hay un horizonte que ordene la acción, ni una figura heroica que permita cerrar el relato. Picasso distribuye cuerpos, animales, gritos y fragmentos de arquitectura en una superficie que parece a la vez interior, calle y escenario. La pintura obliga a mirar sin ofrecer una posición cómoda desde la que dominar lo que ocurre.\n\nEl punto de partida fue concreto: el bombardeo de Gernika el 26 de abril de 1937 y el encargo republicano para el pabellón español de París. Pero la obra evita representar el ataque como una crónica. Su blanco y negro remite tanto a la prensa como al duelo; sus figuras no funcionan como personajes identificables, sino como intensidades de pérdida. Madre e hijo, caballo, toro, lámpara y cuerpos quebrados forman un vocabulario abierto que no se reduce a una única alegoría.\n\nEsa apertura explica parte de su trayectoria posterior. Guernica ha sido leída como denuncia de la guerra, símbolo antifascista, imagen del sufrimiento civil y problema sobre la capacidad de la pintura para dar forma a una catástrofe. Ninguna de esas lecturas agota el cuadro. La tensión importante está entre su origen situado —la guerra española— y su disponibilidad para otros duelos políticos.\n\nAl explorar Guernica en JANO conviene no tomar sus conexiones como una lista de etiquetas. Picasso, guerra, violencia y memoria describen modos distintos de acercarse a la obra. Desde Picasso aparece la transformación de un lenguaje cubista; desde la guerra, el problema de representar a quienes padecen la violencia; desde la memoria, la vida pública posterior de una imagen que sigue siendo discutida.\n\nLa obra no sustituye a la historia que la produjo. La conserva de una manera particular: no como documento transparente, sino como una composición que mantiene abierto el conflicto entre mirar, comprender y recordar.',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '349,3 × 776,6 cm',
      location: 'Museo Nacional Centro de Arte Reina Sofía, Madrid',
    },
    source: source(
      'Repensar Guernica',
      'Museo Reina Sofía',
      'https://guernica.museoreinasofia.es/',
      'Institutional research project on the work, its commission and history.',
    ),
  },
  {
    slug: 'las-meninas',
    summary: {
      es: 'Las Meninas, pintada por Diego Velázquez hacia 1656, representa a la infanta Margarita rodeada por su séquito en una estancia del Alcázar de Madrid. Pero la obra también pone en juego al rey y la reina reflejados, al pintor que trabaja dentro de la escena y al espectador situado ante ella. Es una pieza central para explorar retrato, corte, poder y representación.',
      en: 'Las Meninas, painted by Diego Velázquez around 1656, depicts the Infanta Margarita and her attendants in a room of Madrid’s Alcázar. Yet it also brings into play the king and queen in a mirror, the painter at work within the scene, and the viewer standing before it. It is a central work for exploring portraiture, court, power, and representation.',
    },
    essay:
      '## ¿Quién ocupa el lugar de la mirada?\n\nLas Meninas parece, en un primer momento, una escena de palacio. La infanta Margarita ocupa el centro y está rodeada por sus meninas, servidores y una presencia canina casi doméstica. Sin embargo, el cuadro desplaza enseguida esa lectura. Velázquez se pinta trabajando ante un lienzo cuyo reverso vemos; al fondo, un espejo devuelve las figuras de Felipe IV y Mariana de Austria. La pintura convierte la sala en una máquina de posiciones.\n\nNo sabemos con total seguridad qué miran los personajes ni qué está pintando Velázquez. Esa incertidumbre no es un defecto que haya que resolver: es el mecanismo de la obra. El espectador puede ocupar el lugar de los monarcas, el de un modelo, el de alguien que entra en la escena o el de quien contempla una imagen ya construida. La representación no queda encerrada dentro del marco; nos convierte en parte de su situación.\n\nTambién importa el contexto cortesano. El cuadro no trata sólo de una familia real, sino de un sistema de jerarquías, accesos y apariencias. Cada figura tiene una función, pero Velázquez no las reduce a símbolos. La luz, la distancia y la atención a los gestos producen una convivencia inquieta entre ceremonia y vida cotidiana.\n\nLa presencia del pintor es decisiva. Al incluirse dentro de la escena, Velázquez afirma el oficio de la pintura sin presentarlo como una simple artesanía al servicio del poder. La obra pregunta qué puede hacer un artista dentro de la corte: registrar sus formas, participar de ellas y, al mismo tiempo, revelar que toda autoridad necesita ser vista para operar.\n\nPor eso Las Meninas sigue siendo una entrada fértil a la historia de la imagen. No ofrece una solución sobre quién mira a quién; mantiene activa esa pregunta.',
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '318 × 276 cm',
      location: 'Museo Nacional del Prado, Madrid',
    },
    source: source(
      'Las Meninas',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/coleccion/obra-de-arte/las-meninas/9fdc7800-9ade-48b0-ab8b-edee94ea877f',
      'Institutional object record.',
    ),
  },
  {
    slug: 'mona-lisa',
    summary: {
      es: 'La Mona Lisa, o retrato de Lisa Gherardini, fue realizada por Leonardo da Vinci a comienzos del siglo XVI. Su paisaje imaginario, la transición delicada entre luces y sombras y la relación ambigua de la figura con quien la mira han hecho de ella una obra central para la historia del retrato. En JANO permite explorar a Leonardo, el Renacimiento y la construcción de la presencia individual.',
      en: 'The Mona Lisa, or portrait of Lisa Gherardini, was made by Leonardo da Vinci in the early sixteenth century. Its imagined landscape, delicate shifts between light and shadow, and the figure’s ambiguous relation to the viewer make it central to the history of portraiture. In JANO, it opens paths to Leonardo, the Renaissance, and the construction of individual presence.',
    },
    essay: `## Un retrato que no se deja fijar

La fama de La Gioconda puede hacer difícil ver el cuadro. Las reproducciones han convertido su rostro en una señal reconocible antes de que podamos atender a su escala, a la posición de las manos, a la gradación de la luz o al paisaje que se abre tras la figura. Una lectura útil empieza por recuperar esa distancia: no estamos ante una imagen hecha para ser un icono global, sino ante un retrato que organiza con enorme precisión una relación entre presencia, tiempo y mirada.

La figura no se ofrece como un emblema inmóvil. Su postura forma una pirámide estable, pero sus brazos, el velo, la transición de los tonos y el paisaje introducen un movimiento lento. Leonardo no delimita las formas con una línea dura; deja que los contornos pasen de una zona a otra. Esa técnica no es sólo un efecto de virtuosismo. Hace que el cuerpo parezca ocupar aire y que la expresión no pueda reducirse a una emoción única.

La sonrisa concentra ese problema. A menudo se habla de ella como si escondiera un secreto que el espectador debe descifrar. Sin embargo, su fuerza consiste precisamente en no fijarse. Cambia según el ángulo de la mirada y según la atención que prestamos a la boca, a los ojos o al conjunto del rostro. El cuadro no promete una psicología transparente. Construye una presencia que parece responder a quien la observa sin quedar disponible del todo.

El paisaje también importa. No funciona como un fondo descriptivo ni como un lugar identificable que explique a la retratada. Sus caminos, aguas y formaciones rocosas prolongan la inestabilidad de la figura. Entre el cuerpo y el mundo no hay una separación absoluta: ambos están unidos por una misma atmósfera y por una escala que no se resuelve de inmediato.

Por eso La Gioconda permite pensar qué hace un retrato. No se limita a conservar el aspecto de una persona. Selecciona una forma de aparición, decide cómo se reparte la atención entre identidad, posición social, afecto y tiempo. Desde la obra puede explorarse Leonardo y el Renacimiento, pero también el concepto de retrato: una imagen que no sólo muestra a alguien, sino que organiza el encuentro con alguien que nunca termina de quedar presente.`,
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre tabla de álamo',
      dimensions: '77 × 53 cm',
      location: 'Museo del Louvre, París',
    },
    source: source(
      'Mona Lisa',
      'Musée du Louvre',
      'https://www.louvre.fr/en/explore/the-palace/leonardo-da-vinci',
      'Institutional context for Leonardo and the Louvre collection.',
    ),
  },
  {
    slug: 'olympia',
    summary: {
      es: 'Olympia, presentada por Édouard Manet en el Salón de 1865, reescribe las convenciones del desnudo reclinado. La figura no aparece como una diosa distante: mira frontalmente al espectador y sitúa el intercambio económico, el servicio y la clase dentro de la escena. La obra es un punto de partida para pensar modernidad, mirada, cuerpo y las tensiones del París del siglo XIX.',
      en: 'Olympia, shown by Édouard Manet at the Salon of 1865, rewrites the conventions of the reclining nude. Its figure is not a distant goddess: she confronts the viewer’s gaze and brings economic exchange, service, and class into the scene. The work is a starting point for thinking about modernity, looking, the body, and tensions in nineteenth-century Paris.',
    },
    essay: `## Un desnudo que devuelve la mirada

Olympia conserva una composición conocida: una mujer reclinada ocupa el centro de la imagen, mientras una figura a su lado introduce un ramo de flores. Pero Manet altera las convenciones que hacían reconocible ese tipo de desnudo. La modelo no aparece amparada por un mito clásico ni disuelta en una fantasía pastoral. Su mirada frontal, su contorno nítido y los signos de una habitación contemporánea impiden que el espectador la lea como una diosa distante.

El efecto no depende sólo de que la figura mire de frente. Importa cómo esa mirada devuelve la situación de ver. El cuadro hace visible que un desnudo no es una forma neutral: supone una relación entre quien observa, quien es observada y las condiciones sociales que vuelven esa observación posible. La mano de Olympia no es simplemente un gesto de pudor; organiza una frontera. No elimina la disponibilidad que el cuadro pone en escena, pero la hace problemática.

La criada y el ramo refuerzan ese problema. Se ha leído el envío de flores como signo de intercambio y la presencia de la criada como parte de una jerarquía racial y doméstica que el cuadro no resuelve. No basta con afirmar que Olympia es una imagen moderna porque escandalizó al Salón. La modernidad de la obra está en que no permite separar con comodidad belleza, dinero, servicio, deseo y clase.

También cambia la pintura misma. Frente a la transición suave y la profundidad ilusionista que el público podía esperar de un desnudo académico, Manet usa contrastes abruptos y una superficie que no oculta del todo el trabajo de la pincelada. La figura parece estar a la vez delante de nosotros y firmemente inscrita en una tela. Esa tensión formal acompaña la tensión social: el cuadro no ofrece un espacio en el que mirar pueda sentirse inocente.

Las lecturas feministas y sociales han insistido, con razones distintas, en que Olympia no libera sin más a su figura de los códigos del desnudo. La obra sigue participando de una economía visual desigual. Lo decisivo es que hace esa desigualdad difícil de ignorar. Al abrir Olympia en JANO, cuerpo, representación, París y Manet no deben funcionar como etiquetas intercambiables. Son rutas para preguntar cómo las imágenes producen posiciones: quién puede mirar, quién es mirado y qué queda oculto en esa escena.`,
    details: {
      technique: 'Pintura al óleo',
      materials: 'Óleo sobre lienzo',
      dimensions: '130,5 × 190 cm',
      location: 'Musée d’Orsay, París',
    },
    source: source(
      'Olympia',
      'Musée d’Orsay',
      'https://www.musee-orsay.fr/en/artworks/olympia-712',
      'Institutional object record.',
    ),
  },
  {
    slug: 'gran-ola-de-kanagawa',
    summary: {
      es: 'La gran ola de Kanagawa es una estampa de Katsushika Hokusai realizada hacia 1830–1832 dentro de la serie Treinta y seis vistas del monte Fuji. La ola domina la imagen, pero el monte aparece al fondo como una forma pequeña y estable. La obra muestra cómo el grabado ukiyo-e podía convertir paisaje, ritmo gráfico y circulación popular en una imagen de enorme precisión.',
      en: 'The Great Wave off Kanagawa is a print by Katsushika Hokusai made around 1830–32 in the series Thirty-six Views of Mount Fuji. The wave dominates the image, while Mount Fuji appears in the distance as a small, stable form. The work shows how ukiyo-e printmaking could turn landscape, graphic rhythm, and popular circulation into an image of great precision.',
    },
    essay: `## Paisaje, estampa y circulación

La gran ola de Kanagawa suele llegar al espectador como una imagen aislada: una ola gigantesca, tres embarcaciones frágiles y el monte Fuji reducido a una forma pequeña en el horizonte. Pero la estampa pertenece a una serie, Treinta y seis vistas del monte Fuji, y a una cultura de la impresión en la que las imágenes circulaban en múltiples ejemplares. Leerla sólo como una obra única y monumental borra una parte decisiva de lo que hace.

Hokusai organiza el paisaje con una inversión de escalas. El monte Fuji, centro nominal de la serie y emblema de permanencia, queda lejos y parece casi vulnerable frente a la cresta de la ola. A la vez, esa ola no es una masa informe: sus dedos de espuma se abren sobre los barcos y repiten el ritmo curvo de la montaña. La composición convierte un instante de peligro en una estructura gráfica muy controlada.

Las embarcaciones impiden que el paisaje sea pura contemplación. Hay trabajo, velocidad y riesgo. Los remeros no aparecen como individuos psicológicamente descritos, sino como cuerpos coordinados dentro de una situación material. La imagen no separa naturaleza y actividad humana: muestra una relación desigual entre ambas, organizada por el desplazamiento y la supervivencia.

La técnica importa en este sentido. Una estampa xilográfica se construye a partir de bloques, tinta, papel y un proceso de colaboración entre diseño, talla e impresión. Su precisión no equivale a la singularidad de una pincelada. La repetición y la variación entre impresiones forman parte de su condición. Esto ayuda a comprender por qué la posterior circulación internacional de La gran ola no debería borrar su lugar en el ukiyo-e y en el Japón del periodo Edo.

La obra también invita a evitar una oposición demasiado cómoda entre tradición japonesa y modernidad occidental. Su recepción posterior influyó en muchos artistas fuera de Japón, pero no necesita esa historia para ser relevante. En JANO puede abrir recorridos hacia Hokusai, ukiyo-e, paisaje y grabado. Cada vínculo formula una pregunta distinta: cómo se compone un paisaje, cómo circula una imagen reproducible y cómo una obra se vuelve global sin dejar de pertenecer a condiciones históricas concretas.`,
    details: {
      technique: 'Xilografía en color',
      materials: 'Tinta y color sobre papel',
      dimensions: '25,7 × 37,9 cm',
      location: 'The Metropolitan Museum of Art, Nueva York',
    },
    source: source(
      'Under the Wave off Kanagawa',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/art/collection/search/39799',
      'Institutional object record.',
    ),
  },
  {
    slug: 'fuente',
    summary: {
      es: 'Fountain es el nombre con que Marcel Duchamp presentó en 1917 un urinario industrial firmado “R. Mutt”. La obra desplaza la cuestión artística desde la fabricación manual hacia la elección, el contexto y la institución que decide qué puede exponerse. Es una entrada decisiva para explorar dadaísmo, arte conceptual, museo y los límites del objeto artístico.',
      en: 'Fountain is the name Marcel Duchamp gave to an industrial urinal submitted in 1917 under the signature “R. Mutt.” The work shifts the artistic question from manual making toward selection, context, and the institution that decides what may be exhibited. It is a decisive entry point to Dada, conceptual art, museums, and the limits of the art object.',
    },
    essay:
      '## Cuando una elección se vuelve una obra\n\nFountain no exige admiración por su forma. Su dificultad está en que introduce un objeto fabricado para un uso ordinario en el campo del arte sin transformarlo materialmente. Duchamp lo tituló, lo firmó y lo presentó para una exposición. Ese gesto obliga a preguntar qué hace que algo funcione como obra: la mano del artista, la apariencia del objeto, su contexto de presentación o la discusión que desencadena.\n\nLa respuesta no es que desde entonces cualquier cosa sea automáticamente arte. Fountain hace más incómoda la pregunta: si una institución admite una obra, ¿qué criterios está haciendo visibles? La exclusión del objeto de la exposición de la Society of Independent Artists fue parte de la obra tal como hoy la entendemos. El caso no sólo discute un urinario; expone las reglas, intereses y expectativas que normalmente quedan detrás de la palabra “arte”.\n\nTambién hay que distinguir el objeto original perdido de las réplicas posteriores autorizadas por Duchamp. La obra vive en versiones, fotografías, relatos y disputas. Esa condición no le resta importancia: muestra que una obra puede consistir tanto en una operación conceptual y pública como en una pieza material única.\n\nEn JANO, Fountain conecta con Duchamp, Dada y arte conceptual, pero esas relaciones no son equivalentes. Dada aporta una crítica histórica de la cultura y sus instituciones; el arte conceptual recoge y transforma el problema de la idea frente al objeto; Duchamp encarna una práctica que atravesó ambos marcos sin quedar reducida a uno.\n\nLa pregunta que deja Fountain no es “¿puede esto ser arte?”. Es más precisa: ¿quién, dónde y bajo qué condiciones tiene autoridad para formular esa pregunta?',
    source: source(
      'Marcel Duchamp: Fountain',
      'Tate',
      'https://www.tate.org.uk/art/artworks/duchamp-fountain-t07573',
      'Institutional record and context for the 1964 replica.',
    ),
  },
  {
    slug: 'el-grito',
    summary: {
      es: 'El grito, de Edvard Munch, condensa una experiencia de angustia mediante un paisaje ondulante, una figura sin rasgos individualizados y un color que parece vibrar. La versión de 1893 pertenece a un conjunto de obras donde Munch exploró amor, ansiedad, enfermedad y muerte. En JANO abre caminos hacia el expresionismo, el cuerpo y la historia de una imagen que se volvió emblema moderno de la inquietud.',
      en: 'The Scream, by Edvard Munch, condenses an experience of anxiety through a wavering landscape, a figure without individualized features, and colour that seems to vibrate. The 1893 version belongs to a group of works in which Munch explored love, anxiety, illness, and death. In JANO, it opens paths to Expressionism, the body, and a modern emblem of unease.',
    },
    essay: `## Una angustia sin dueño único

El grito parece describir una emoción inmediata, pero su fuerza no depende de que podamos identificar con precisión quién grita ni qué le ha ocurrido. La figura central carece de los rasgos que permitirían convertirla en retrato psicológico. Tiene la boca abierta, las manos junto a la cabeza y un cuerpo que parece deshacerse con el puente, el fiordo y el cielo. Munch no ilustra una anécdota: construye un mundo en el que el paisaje participa de una experiencia límite.

La presencia de dos figuras que continúan su camino al fondo hace todavía más extraña la escena. No ofrecen auxilio ni explicación. Pueden hacer que la figura del primer plano parezca aislada, pero también impiden leer la angustia como una interioridad totalmente privada. La obra sitúa el malestar en un espacio compartido: una pasarela, una ciudad cercana, un cielo que se vuelve materia inquieta.

Conviene además hablar de El grito en plural. Munch produjo varias versiones y el motivo reaparece en su trabajo. Esa repetición no es una simple variación decorativa: pone en cuestión la idea de que una imagen decisiva deba existir como objeto único. La angustia se vuelve un problema de forma que puede volver a pintarse, dibujarse o imprimirse, y cuya vida posterior depende también de reproducciones, museos y cultura popular.

Por eso resulta insuficiente tratar El grito como emblema universal de una emoción humana atemporal. Ha sido recibido de ese modo, pero nació dentro de una práctica y una época concretas, atravesadas por nuevas formas de ciudad, salud, sexualidad y vida moderna. La imagen conserva esa historia sin quedar encerrada en ella.

En JANO, Munch, expresionismo, cuerpo y muerte son rutas diferentes, no explicaciones equivalentes. Desde el cuerpo se puede preguntar cómo una figura se vuelve casi signo; desde el expresionismo, cómo color y línea producen intensidad; desde la memoria, cómo una obra cambia cuando se transforma en icono. El cuadro no da nombre definitivo a la angustia. Hace visible su dificultad para encontrar una forma estable.`,
    details: {
      technique: 'Témpera, óleo y pastel',
      materials: 'Témpera, óleo y pastel sobre cartón',
      dimensions: '91 × 73,5 cm',
      location: 'Museo Nacional de Noruega, Oslo',
    },
    source: source(
      'The Scream',
      'MUNCH',
      'https://www.munchmuseet.no/en/collection/the-scream/',
      'Institutional collection context.',
    ),
  },
  {
    slug: 'renacimiento',
    summary: {
      es: 'El Renacimiento designa un amplio conjunto de transformaciones artísticas e intelectuales desarrolladas en Europa entre los siglos XV y XVI, con especial intensidad en ciudades italianas. No fue un estilo único: reunió nuevas formas de estudiar la antigüedad, el espacio, el cuerpo y la posición social del artista. En JANO permite recorrer vínculos entre Florencia, Roma, Leonardo, Miguel Ángel, Rafael, pintura, arquitectura y perspectiva.',
      en: 'The Renaissance names a broad set of artistic and intellectual transformations that developed in Europe between the fifteenth and sixteenth centuries, with particular intensity in Italian cities. It was not a single style: it brought together new ways of studying antiquity, space, the body, and the artist’s social position. In JANO it connects Florence, Rome, Leonardo, Michelangelo, Raphael, painting, architecture, and perspective.',
    },
    definition:
      'Periodo de transformaciones artísticas e intelectuales europeas, especialmente italianas, entre los siglos XV y XVI.',
    source: source(
      'Renaissance art',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/toah/hd/reni/hd_reni.htm',
      'Institutional overview of Renaissance art.',
    ),
  },
  {
    slug: 'cubismo',
    summary: {
      es: 'El cubismo fue una investigación desarrollada en París a comienzos del siglo XX que cuestionó la perspectiva heredada y la unidad estable del objeto. Picasso y Georges Braque fragmentaron formas y puntos de vista para construir la imagen como un problema, no como una ventana transparente. En JANO el cubismo conecta artistas, obras y debates sobre representación, ciudad moderna y los límites de la pintura.',
      en: 'Cubism was an investigation developed in Paris in the early twentieth century that challenged inherited perspective and the object’s stable unity. Picasso and Georges Braque fragmented forms and viewpoints to make the image a problem rather than a transparent window. In JANO, Cubism connects artists, works, and debates about representation, the modern city, and painting’s limits.',
    },
    source: source(
      'Cubism',
      'Tate',
      'https://www.tate.org.uk/art/art-terms/c/cubism',
      'Institutional movement overview.',
    ),
  },
  {
    slug: 'impresionismo',
    summary: {
      es: 'El impresionismo reunió a artistas que, en Francia durante la segunda mitad del siglo XIX, ensayaron nuevas maneras de pintar la luz, el tiempo y la vida contemporánea. Sus pinceladas visibles y sus encuadres no son sólo una técnica: responden a una experiencia móvil de la ciudad, el ocio y el paisaje. En JANO es una entrada hacia Monet, Manet, Degas, París y la transformación de la pintura moderna.',
      en: 'Impressionism brought together artists who, in France during the second half of the nineteenth century, developed new ways of painting light, time, and contemporary life. Its visible brushwork and framing are not merely technical: they respond to a mobile experience of city, leisure, and landscape. In JANO, it opens paths to Monet, Manet, Degas, Paris, and the transformation of modern painting.',
    },
    source: source(
      'Impressionism',
      'Musée d’Orsay',
      'https://www.musee-orsay.fr/en/collections/works-in-focus/painting/commentaire_id/impression-sunrise-312.html',
      'Institutional context for Impressionism and Monet.',
    ),
  },
  {
    slug: 'cuerpo',
    summary: {
      es: 'Cuerpo es un concepto transversal para explorar cómo las imágenes construyen presencia, deseo, vulnerabilidad, identidad y control. No equivale al desnudo ni al retrato: puede aparecer en una escultura antigua, en una performance, en un autorretrato o en una imagen de violencia. En JANO sirve para atravesar épocas y medios atendiendo a cómo cada obra hace visible, regula o transforma la experiencia corporal.',
      en: 'Body is a transversal concept for exploring how images construct presence, desire, vulnerability, identity, and control. It is not equivalent to the nude or to portraiture: it may appear in an ancient sculpture, a performance, a self-portrait, or an image of violence. In JANO, it crosses periods and media by asking how each work makes bodily experience visible, regulates it, or transforms it.',
    },
    essay: `## El cuerpo no es un tema único

Hablar de cuerpo en arte no equivale a reunir imágenes de anatomía, desnudo o autorretrato. El cuerpo aparece también cuando una arquitectura organiza el movimiento, cuando un uniforme distribuye autoridad, cuando una fotografía registra trabajo o cuando una performance convierte la presencia de quien actúa en el material de la obra. Es menos un asunto delimitado que una pregunta: ¿qué cuerpos se hacen visibles, bajo qué condiciones y para quién?

Esa pregunta impide que el cuerpo se convierta en una etiqueta que todo lo conecta. Un Doríforo, Olympia, Las dos Fridas y Cut Piece pueden implicar corporalidad, pero no lo hacen del mismo modo. En una escultura antigua importan proporción, ideal y copia; en un desnudo moderno, mirada y clase; en una pintura de Frida Kahlo, dolor e identidad; en una performance, consentimiento, exposición y participación. El recorrido vale cuando mantiene esas diferencias en lugar de aplanarlas.

Las imágenes corporales tampoco son sólo representaciones. Pueden disciplinar, erotizar, cuidar, clasificar o excluir. La historia del arte ha heredado muchos cuerpos idealizados y muchas ausencias: cuerpos racializados, envejecidos, enfermos, trabajadores o no normativos han sido mostrados bajo condiciones que conviene volver visibles. Una lectura crítica no consiste en aplicar una acusación idéntica a toda obra, sino en preguntar qué relación concreta establece cada una entre forma, poder y experiencia.

El cuerpo permite además cruzar medios sin convertirlos en equivalentes. La materialidad de la escultura, la temporalidad de la performance y la reproductibilidad de la fotografía condicionan de manera distinta lo que puede sentirse como presencia. No basta con que una obra tenga una figura humana para que el concepto sea la ruta más interesante.

En JANO, cuerpo funciona mejor como una puerta de exploración guiada que como un centro universal. Desde él se puede pasar a deseo, muerte, retrato, guerra o representación, pero cada paso debe devolver una situación concreta. La utilidad del concepto está en abrir comparaciones exigentes: no en afirmar que todas las imágenes del cuerpo dicen lo mismo.`,
    definition:
      'Concepto para estudiar la representación, experiencia y regulación cultural de la corporalidad en el arte.',
    source: source(
      'The body in art',
      'Tate',
      'https://www.tate.org.uk/art/art-terms/b/body-art',
      'Institutional context for body-centred art practices.',
    ),
  },
  {
    slug: 'guerra',
    summary: {
      es: 'Guerra reúne obras que abordan conflicto, violencia, duelo, propaganda y la experiencia de quienes quedan expuestos a la destrucción. No es un género estable: cambia según los medios, las instituciones y las posiciones políticas de cada época. En JANO permite poner en relación imágenes como Guernica con acontecimientos históricos y con preguntas sobre memoria, poder y la responsabilidad de representar el sufrimiento.',
      en: 'War gathers works that address conflict, violence, mourning, propaganda, and the experience of those exposed to destruction. It is not a stable genre: it changes with media, institutions, and political positions in each period. In JANO, it relates images such as Guernica to historical events and to questions of memory, power, and the responsibility of representing suffering.',
    },
    definition:
      'Concepto transversal para explorar la representación del conflicto armado, la violencia y sus memorias.',
    source: source(
      'Repensar Guernica',
      'Museo Reina Sofía',
      'https://guernica.museoreinasofia.es/',
      'Institutional research context for art and war.',
    ),
  },
  {
    slug: 'representacion',
    summary: {
      es: 'Representación nombra el problema de cómo una imagen hace presente algo: una persona, un cuerpo, un acontecimiento, una idea o incluso el propio acto de mirar. En JANO no funciona como una etiqueta universal, sino como una pregunta de lectura. Sirve para comparar estrategias distintas —perspectiva, abstracción, retrato, montaje o apropiación— sin afirmar que todas signifiquen lo mismo.',
      en: 'Representation names the problem of how an image makes something present: a person, body, event, idea, or even the act of looking itself. In JANO it is not a universal label but a reading question. It helps compare distinct strategies—perspective, abstraction, portraiture, montage, or appropriation—without claiming that they all mean the same thing.',
    },
    definition:
      'Problema de cómo las imágenes hacen presente, construyen o transforman aquello que muestran.',
    source: source(
      'Representation',
      'Tate',
      'https://www.tate.org.uk/art/art-terms/r/representation',
      'Institutional glossary context.',
    ),
  },
  {
    slug: 'paris',
    summary: {
      es: 'París fue un centro decisivo para la producción, exhibición y discusión artística de los siglos XIX y XX. Sus salones, academias, galerías, cafés y exposiciones reunieron prácticas muy diferentes, pero también concentraron poder cultural y desigualdad. En JANO, París funciona como un lugar de encuentro entre impresionismo, cubismo, vanguardias y artistas que hicieron de la ciudad moderna un tema y una infraestructura.',
      en: 'Paris was a decisive centre for artistic production, exhibition, and debate in the nineteenth and twentieth centuries. Its salons, academies, galleries, cafés, and exhibitions brought together very different practices while also concentrating cultural power and inequality. In JANO, Paris is a meeting place for Impressionism, Cubism, the avant-gardes, and artists who made the modern city both a subject and an infrastructure.',
    },
    source: source(
      'Paris, Capital of the Arts',
      'The Metropolitan Museum of Art',
      'https://www.metmuseum.org/art/metpublications/Paris_Capital_of_the_Arts_1900_1968',
      'Institutional publication context.',
    ),
  },
  {
    slug: 'museo-del-prado',
    summary: {
      es: 'El Museo Nacional del Prado es una institución central para estudiar la pintura europea y, de modo particular, las colecciones vinculadas a la monarquía española. Su colección permite recorrer relaciones entre corte, religión, retrato, mito y poder. En JANO, el Prado es más que una ubicación: es una entrada institucional hacia Velázquez, Goya, Las Meninas y las formas históricas de exhibir y conservar el patrimonio.',
      en: 'The Museo Nacional del Prado is a central institution for studying European painting and, in particular, collections connected to the Spanish monarchy. Its holdings make it possible to trace relations among court, religion, portraiture, myth, and power. In JANO, the Prado is more than a location: it is an institutional entry point to Velázquez, Goya, Las Meninas, and historical forms of exhibiting and preserving heritage.',
    },
    source: source(
      'Museo Nacional del Prado',
      'Museo Nacional del Prado',
      'https://www.museodelprado.es/en',
      'Official institutional website.',
    ),
  },
];
