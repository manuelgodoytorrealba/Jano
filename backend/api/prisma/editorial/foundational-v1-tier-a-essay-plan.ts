import { entities } from '../foundational/catalog';
import { tierA } from '../foundational/editorial-priority';

export type EssayEligibility = 'YES' | 'MAYBE' | 'NO';
export type EssayPriority = 'E1' | 'E2' | 'E3';

export type TierAEssayPlanEntry = {
  slug: string;
  title: string;
  type: string;
  eligibility: EssayEligibility;
  priority: EssayPriority;
  question: string;
  reason: string;
  existing: boolean;
};

type PlannedEntry = Pick<
  TierAEssayPlanEntry,
  'eligibility' | 'priority' | 'question' | 'reason' | 'existing'
>;

// This is editorial planning data, not a second content model. Entries omitted
// below are deliberately NO/E3: their factual sheet, summary and graph are the
// appropriate MVP layer unless a later editorial brief creates a specific need.
const focused: Record<string, PlannedEntry> = {
  guernica: {
    eligibility: 'YES',
    priority: 'E1',
    existing: true,
    question:
      '¿Cómo convierte una catástrofe situada en una imagen abierta de violencia y memoria?',
    reason: 'La relación entre acontecimiento, forma y memoria pública excede la ficha.',
  },
  'las-meninas': {
    eligibility: 'YES',
    priority: 'E1',
    existing: true,
    question: '¿Quién ocupa el lugar de la mirada en una imagen de corte?',
    reason: 'La obra activa un problema de representación, poder y posición del espectador.',
  },
  fuente: {
    eligibility: 'YES',
    priority: 'E1',
    existing: true,
    question: '¿Cómo una elección y un contexto institucional llegan a constituir una obra?',
    reason: 'Su problema central no cabe en la materialidad del objeto ni en una cronología.',
  },
  olympia: {
    eligibility: 'YES',
    priority: 'E1',
    existing: false,
    question: '¿Cómo reordena Olympia la mirada, el desnudo, el trabajo y la clase?',
    reason: 'Permite una lectura situada de modernidad y representación del cuerpo.',
  },
  'mona-lisa': {
    eligibility: 'YES',
    priority: 'E1',
    existing: false,
    question: '¿Cómo construye el retrato una presencia que parece devolver la mirada?',
    reason: 'La recepción de la obra necesita distinguir técnica, fama y experiencia visual.',
  },
  'gran-ola-de-kanagawa': {
    eligibility: 'YES',
    priority: 'E1',
    existing: false,
    question:
      '¿Qué cambia al leer La gran ola como estampa, paisaje y objeto de circulación global?',
    reason: 'Evita reducir ukiyo-e a una imagen aislada de la historia japonesa.',
  },
  'el-grito': {
    eligibility: 'YES',
    priority: 'E1',
    existing: false,
    question: '¿Cómo opera la angustia entre versiones, biografía y cultura visual moderna?',
    reason: 'La multiplicidad material y la recepción popular justifican una lectura específica.',
  },
  'la-traicion-de-las-imagenes': {
    eligibility: 'YES',
    priority: 'E1',
    existing: false,
    question: '¿Qué separa una imagen, una palabra y la cosa que ambas nombran?',
    reason: 'Su potencia está en un problema semiótico, no en una ficha de objeto.',
  },
  cuerpo: {
    eligibility: 'YES',
    priority: 'E1',
    existing: false,
    question: '¿Cómo cambia la idea de cuerpo al atravesar medios, periodos y relaciones de poder?',
    reason: 'Es un concepto transversal que puede orientar recorridos no redundantes.',
  },
  colonialismo: {
    eligibility: 'YES',
    priority: 'E1',
    existing: false,
    question:
      '¿Cómo condicionan el colonialismo la producción, circulación y lectura de imágenes y objetos?',
    reason: 'Exige atribución historiográfica y no debe resolverse con una definición breve.',
  },

  renacimiento: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué prácticas, ciudades e instituciones reúne el nombre Renacimiento?',
    reason: 'Sólo procede si el ensayo evita una narración europea plana.',
  },
  barroco: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué problemas de imagen, afecto y poder permite comparar el Barroco?',
    reason: 'Requiere un encargo que acote su amplitud histórica.',
  },
  cubismo: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo hace el cubismo de la representación un problema constructivo?',
    reason: 'La ficha y las obras ya dan una entrada suficiente para MVP.',
  },
  dadaismo: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué formas de crítica cultural activa Dada más allá de la provocación?',
    reason: 'Puede desarrollarse desde Fountain sin duplicar su ensayo.',
  },
  surrealismo: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo articuló el surrealismo deseo, imagen y política?',
    reason: 'Necesita una selección de obras más amplia para no ser genérico.',
  },
  'bauhaus-movement': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo relacionó Bauhaus pedagogía, diseño y producción?',
    reason: 'Conviene esperar a una base disciplinar algo más densa.',
  },
  representacion: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué preguntas permite hacer representación sin convertirla en un superconcepto?',
    reason: 'La definición operativa y el grafo ya son la capa correcta hoy.',
  },
  guerra: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué responsabilidades aparecen al representar violencia y sufrimiento?',
    reason: 'Puede crecer desde Guernica y Goya con una bibliografía explícita.',
  },
  memoria: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo producen las imágenes memoria, duelo y disputa pública?',
    reason: 'Necesita casos comparables antes de convertirse en ensayo general.',
  },
  religion: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo operan las imágenes en prácticas religiosas y espacios de culto?',
    reason: 'La amplitud intercultural exige un encargo delimitado.',
  },
  poder: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo organiza el arte visibilidad, autoridad y acceso?',
    reason: 'Puede activarse desde Las Meninas; no es prioritario aún.',
  },
  fotografia: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué cambia cuando una imagen se produce técnicamente y circula como registro?',
    reason: 'Necesita más casos fotográficos para una pieza fundacional sólida.',
  },
  retrato: {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo negocia el retrato identidad, estatus y presencia?',
    reason: 'Las obras existentes ya ofrecen un punto de partida navegable.',
  },

  'el-nacimiento-de-venus': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo se cruzan antigüedad, cuerpo y patronazgo en la Venus de Botticelli?',
    reason: 'Una lectura puede aportar valor si se apoya en contexto florentino verificable.',
  },
  'ultima-cena': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo trabaja La última cena entre narración religiosa, espacio y restauración?',
    reason: 'La compleja historia material exige un encargo específico.',
  },
  'david-de-miguel-angel': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo llegó David a actuar como figura cívica además de bíblica?',
    reason: 'La ficha es suficiente hasta que exista una ruta florentina.',
  },
  'tres-de-mayo-1808': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo convierte Goya una ejecución en un problema de mirada y violencia?',
    reason: 'Es un candidato natural para un futuro díptico con Guernica.',
  },
  'saturno-devorando-a-su-hijo': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué hace incierta la lectura de una Pintura negra?',
    reason: 'Requiere tratar atribución, ubicación y recepción con cuidado.',
  },
  'las-senoritas-de-avignon': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué tensiones de cuerpo, mirada y apropiación abre la obra?',
    reason: 'Debe evitar una lectura simplificada del cubismo y de las referencias africanas.',
  },
  'cuadrado-negro': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué significa presentar un cuadrado como imagen, objeto y manifiesto?',
    reason: 'Aporta si se sitúa con precisión en el suprematismo.',
  },
  'las-dos-fridas': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo articula la obra identidad, corporalidad y doble autorrepresentación?',
    reason: 'Necesita fuentes específicas antes de ir más allá del resumen.',
  },
  'migrant-mother': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo se convierten una fotografía documental y una vida concreta en icono público?',
    reason: 'Exige tratar archivo, ética y contexto social.',
  },
  'diptico-marilyn': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué ocurre con el retrato cuando se vuelve repetición, mercancía y duelo?',
    reason: 'Puede abrir una pieza sobre reproducción y celebridad.',
  },
  'cut-piece': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo reparte Cut Piece agencia, mirada y vulnerabilidad entre artista y público?',
    reason: 'Una lectura responsable necesita bibliografía y contexto de performance.',
  },
  'bronces-de-benin': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo conectan los bronces de Benín historia de corte, expolio y restitución?',
    reason: 'Sólo con fuentes patrimoniales y voces situadas; no como contenido de relleno.',
  },
  'piedra-del-sol': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué problemas crea llamar calendario a la Piedra del Sol?',
    reason: 'Requiere precisión arqueológica e historiográfica.',
  },
  'templo-de-kukulcan': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Cómo se relacionan arquitectura, ritual y turismo patrimonial en Chichén Itzá?',
    reason: 'Necesita un marco maya específico, no una síntesis genérica.',
  },
  'lineas-de-nazca': {
    eligibility: 'MAYBE',
    priority: 'E2',
    existing: false,
    question: '¿Qué cambia al leer las líneas como paisaje, práctica y patrimonio?',
    reason: 'Una pieza requiere fuentes andinas especializadas.',
  },
};

function defaultNo(
  type: string,
): Pick<PlannedEntry, 'eligibility' | 'priority' | 'question' | 'reason' | 'existing'> {
  const reason =
    type === 'ARTWORK'
      ? 'La ficha factual, el resumen y las relaciones cubren su función fundacional actual.'
      : type === 'ARTIST'
        ? 'Su trayectoria se entiende adecuadamente desde la ficha, el resumen y sus obras presentes.'
        : 'Su función de contexto o navegación está mejor servida por definición, resumen y relaciones.';
  return {
    eligibility: 'NO',
    priority: 'E3',
    question: 'No procede sin una pregunta editorial nueva y acotada.',
    reason,
    existing: false,
  };
}

/** Complete, generated table for all Tier A entities. */
export function foundationalV1TierAEssayPlan(): TierAEssayPlanEntry[] {
  return entities
    .filter((entity) => tierA.has(entity.slug))
    .map((entity) => ({
      slug: entity.slug,
      title: entity.title,
      type: entity.type,
      ...(focused[entity.slug] ?? defaultNo(entity.type)),
    }));
}
