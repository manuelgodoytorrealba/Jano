export type EditorialEntity = { id: string; slug: string; canonicalName: string; type: string };

export type EditorialGenerationContext = {
  locale: string;
  entityData: Record<string, unknown>;
  relations: Array<Record<string, unknown>>;
  relationMetadata: Array<Record<string, unknown>>;
  availableEntities: EditorialEntity[];
  sources: Array<Record<string, unknown>>;
  documentaryContext: Array<Record<string, unknown>>;
};

export type EditorialGenerationOutput = { summary: string; essay: string; definition: string };

export const INTERNAL_LANGUAGE = [
  'en jano',
  'esta ficha',
  'este nodo',
  'dentro del sistema',
  'funciona como vía de lectura',
  'funciona en jano',
  'el sistema relaciona',
  'dentro del grafo',
] as const;

export const ENTITY_EDITORIAL_TASK = `
Escribe conocimiento autónomo sobre la entidad, nunca una explicación de su función en JANO.
La audiencia es inteligente y curiosa, pero puede empezar sin conocimientos de arte o historia.

Antes de escribir, decide en silencio qué es, qué datos importan, qué contexto falta para entenderlos,
qué relaciones están justificadas y qué grado de certeza permite cada fuente. Explica dato → contexto →
consecuencia → relación. No narres una lista de metadata. Introduce y define brevemente todo término técnico.

La definition (si se deriva para la ficha factual) debe ser texto plano, autónomo y breve: una o dos frases,
sin enlaces ni formato. Nunca repitas en ella el resumen. El resumen debe tener normalmente 100–180 palabras,
ser texto plano sin enlaces y responder qué es, contexto mínimo, rasgo principal, importancia y hasta dos
conexiones útiles. Debe funcionar fuera de JANO y no describir una ficha.

El ensayo debe tener encabezados Markdown ## elegidos específicamente para esta entidad. No reutilices una
plantilla fija. Empieza por lo básico y añade después contexto, rasgos, evolución, importancia, relaciones,
matices e incertidumbre. Para obras ayuda a mirar; para artistas explica trayectoria y cambios; para
movimientos explica origen y rasgos; para conceptos define primero en lenguaje ordinario y usa ejemplos;
para periodos explica tiempo, lugar y transformaciones; para lugares explica por qué fueron culturalmente
relevantes.

Sólo puedes afirmar hechos presentes en ENTITY_DATA, RELATIONS, RELATION_METADATA, SOURCES o
DOCUMENTARY_CONTEXT. No completes huecos. Distingue hecho, contexto, interpretación, hipótesis y comparación.
Una relación no prueba por sí sola una influencia, uso histórico o intención. Explica por qué existe cada
relación mencionada usando su justificación o evidencia; omítela si no aporta comprensión o no puede explicarse.

Para enlazar otra entidad escribe exactamente [[Nombre canónico]], y sólo si ese nombre aparece exactamente en
AVAILABLE_ENTITIES. Enlaza la primera aparición significativa, sin saturar. No inventes enlaces.

Prohibido hablar de JANO, fichas, nodos, sistema, grafo, navegación, recorridos, datos conservados o relaciones
editoriales. Evita prosa genérica como «nos invita a reflexionar», «desde tiempos inmemoriales», «rico tapiz»,
«ofrece una ventana», «sirve como lente» o «se entrelazan». Devuelve JSON con {"definition": string,
"summary": string, "essay": string}.
Antes de devolverlo, elimina repetición, relleno, títulos genéricos y cualquier frase reutilizable sin cambios
para muchas entidades.`.trim();

export function buildEditorialGenerationRequest(context: EditorialGenerationContext) {
  return {
    task: ENTITY_EDITORIAL_TASK,
    schemaVersion: 'entity-editorial-v2',
    input: {
      ENTITY_DATA: context.entityData,
      RELATIONS: context.relations,
      RELATION_METADATA: context.relationMetadata,
      AVAILABLE_ENTITIES: context.availableEntities.map(({ canonicalName, type }) => ({
        canonicalName,
        type,
      })),
      SOURCES: context.sources,
      DOCUMENTARY_CONTEXT: context.documentaryContext,
      LOCALE: context.locale,
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'essay', 'definition'],
      properties: {
        summary: { type: 'string' },
        essay: { type: 'string' },
        definition: { type: 'string' },
      },
    },
    maxOutputTokens: 2_800,
  };
}

export function normalizeAndValidateEditorialOutput(
  output: EditorialGenerationOutput,
  availableEntities: EditorialEntity[],
): EditorialGenerationOutput {
  const summary = output.summary?.trim();
  const essay = output.essay?.trim();
  const definition = output.definition?.trim();
  if (!summary || !essay || !definition)
    throw new Error('Editorial output requires definition, summary and essay');
  const combined = `${summary}\n${essay}`;
  const internal = INTERNAL_LANGUAGE.find((phrase) =>
    combined.toLocaleLowerCase('es').includes(phrase),
  );
  if (internal) throw new Error(`Internal product language is forbidden: ${internal}`);
  if (!/^##\s+\S/m.test(essay)) throw new Error('Essay requires entity-specific Markdown sections');

  const byName = new Map(availableEntities.map((entity) => [entity.canonicalName, entity]));
  const bySlug = new Map(availableEntities.map((entity) => [entity.slug, entity]));
  const normalizeLinks = (value: string) =>
    value.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, rawTarget, rawLabel) => {
      const target = String(rawTarget).trim();
      const label = rawLabel ? String(rawLabel).trim() : target;
      const entity = byName.get(target) ?? bySlug.get(target);
      if (!entity) throw new Error(`Invented or unavailable entity link: ${target}`);
      if (rawLabel && label !== entity.canonicalName)
        throw new Error(`Entity link label must use canonical name: ${label}`);
      return `[[${entity.slug}|${entity.canonicalName}]]`;
    });

  if (/\[\[|[#*_`]/.test(definition))
    throw new Error('Definition must be plain text without rich text');
  if (definition.length > 320) throw new Error('Definition is too long for the detail sheet');
  if (/\[\[|[#*_`]/.test(summary)) throw new Error('Summary must be plain text without rich text');
  return { definition, summary, essay: normalizeLinks(essay) };
}
