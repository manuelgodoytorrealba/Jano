import type { EditorialGenerationOutput } from './entity-editorial-generation';

export const RITUAL_EDITORIAL_REGRESSION: EditorialGenerationOutput = {
  definition:
    'Práctica reglada que una comunidad reconoce como significativa y que puede incluir gestos, objetos, palabras o imágenes.',
  summary:
    'Un ritual es una acción o secuencia de acciones realizada según ciertas reglas y a la que una comunidad atribuye un significado especial. Puede formar parte de una ceremonia religiosa, una transición vital, una celebración pública o una práctica cotidiana. La repetición por sí sola no basta: el gesto ritual adquiere sentido porque remite a símbolos compartidos, marca un tiempo o un lugar distinto de la vida ordinaria y reúne a quienes reconocen sus reglas. El arte puede intervenir mediante imágenes, objetos, música, vestimenta o espacios preparados para la ceremonia. Cuando esas prácticas desaparecen, sus objetos pueden sobrevivir, aunque ya no resulte fácil reconstruir cómo se usaron. Las Pinturas de Lascaux se han relacionado con el ritual por su ubicación subterránea y por la disposición de sus imágenes, pero esa lectura sigue siendo una hipótesis: no existen textos paleolíticos que expliquen su función.',
  essay: `## Qué convierte una acción en ritual

Una costumbre repetida no es necesariamente un ritual. Para hablar de ritual suele haber una secuencia reconocible, unas reglas sobre quién actúa, cuándo y dónde, y un significado que el grupo comparte. Un saludo diario puede ser sólo un hábito; una fórmula pronunciada durante una boda transforma públicamente la situación de dos personas porque la comunidad reconoce el acto y sus consecuencias.

## Símbolos, objetos y comunidad

Los rituales hacen visible una idea mediante acciones y símbolos: un símbolo es algo —un objeto, imagen, sonido o gesto— que representa un significado compartido. Una máscara, por ejemplo, no posee un sentido ritual universal. Lo adquiere dentro de una práctica concreta, cuando una comunidad sabe quién puede llevarla, qué representa y qué debe ocurrir durante su uso. Por eso no basta con identificar un objeto llamativo para concluir que tuvo una función ceremonial.

## Cuando el arte forma parte de la acción

Muchas obras que hoy se contemplan en museos fueron creadas para actuar dentro de ceremonias, edificios religiosos o conmemoraciones. Su forma podía orientar el movimiento, concentrar la atención o hacer presente a una figura ausente. Al separarse del lugar y de la acción originales, el objeto permanece, pero una parte de su significado puede perderse. Comprenderlo exige relacionar su material, posición y desgaste con testimonios escritos, restos arqueológicos o prácticas comparables bien documentadas.

## El límite de la evidencia

Identificar rituales en sociedades sin fuentes escritas es especialmente difícil. Las [[Pinturas de Lascaux]] suelen aparecer en esta discusión porque muchas imágenes se encuentran en zonas profundas y de acceso difícil dentro de la cueva. Este dato permite preguntar si algunas áreas tuvieron usos ceremoniales, pero no demuestra qué acciones ocurrieron allí ni qué significaban los animales representados. Una interpretación ritual es posible; presentarla como un hecho excedería la evidencia disponible.

## Qué conviene recordar

El ritual une reglas, símbolos y reconocimiento colectivo. En el arte, la pregunta útil no es sólo qué representa un objeto, sino qué hacía, dónde se encontraba, quién podía verlo o tocarlo y qué pruebas sostienen esa reconstrucción. Cuando faltan esas pruebas, reconocer la incertidumbre explica mejor el pasado que asignar una función solemne por intuición.`,
};

export const RITUAL_BASIC_EXPLANATION: EditorialGenerationOutput = {
  definition: RITUAL_EDITORIAL_REGRESSION.definition,
  summary:
    'Ritual nombra una práctica reglada que una comunidad reconoce como significativa. Puede incluir gestos, objetos, palabras o imágenes. Con la información documentada hoy, puede explicarse esta definición y señalar sus límites: no hay evidencia suficiente para afirmar qué función tuvo una obra concreta ni para atribuir un uso ceremonial a las Pinturas de Lascaux.',
  essay: `## Qué significa

Un ritual es una práctica reglada que un grupo reconoce como significativa. La definición disponible permite explicar reglas, acciones y reconocimiento colectivo, pero no documenta ejemplos históricos concretos ni demuestra usos rituales de obras específicas. Por eso conviene mantener separadas la definición general y cualquier interpretación arqueológica.`,
};

export const EDITORIAL_TYPE_FIXTURES = [
  { type: 'ARTWORK', title: 'Pinturas de Lascaux', heading: '## Animales en la oscuridad' },
  { type: 'ARTIST', title: 'Pablo Picasso', heading: '## Málaga, Barcelona y París' },
  { type: 'MOVEMENT', title: 'Cubismo', heading: '## El problema de un solo punto de vista' },
  { type: 'CONCEPT', title: 'Ritual', heading: '## Qué convierte una acción en ritual' },
  { type: 'PERIOD', title: 'Renacimiento', heading: '## Ciudades, talleres y encargos' },
  { type: 'PLACE', title: 'París', heading: '## Una capital construida por intercambios' },
] as const;
