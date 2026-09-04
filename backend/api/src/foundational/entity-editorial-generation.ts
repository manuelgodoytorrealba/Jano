export type EditorialEntity = { id: string; slug: string; canonicalName: string; type: string };

export type EditorialGenerationContext = {
  locale: string;
  maxSafeEditorialDepth?:
    | 'IDENTITY_ONLY'
    | 'BASIC_EXPLANATION'
    | 'EDITORIAL_ENTRY'
    | 'CONTEXTUAL_ESSAY'
    | 'DOCUMENTARY_ESSAY';
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
  'la ficha',
  'relaciones de lectura',
  'cómo continuar',
  'vía de lectura',
] as const;

export const ENTITY_EDITORIAL_TASK = `
Escribe conocimiento autónomo sobre la entidad, nunca una explicación de su función en JANO.
La audiencia es inteligente y curiosa, pero puede empezar sin conocimientos de arte o historia.

Antes de escribir, decide en silencio qué es, qué datos importan, qué contexto falta para entenderlos,
qué relaciones están justificadas y qué grado de certeza permite cada fuente. Explica dato → contexto →
consecuencia → relación. No narres una lista de metadata. Introduce y define brevemente todo término técnico.
TARGET_ENTITY es el sujeto obligatorio de definition, summary y essay. Una entidad relacionada nunca puede
sustituirla como tema principal.

La definition (si se deriva para la ficha factual) debe ser texto plano, autónomo y breve: una o dos frases y
como máximo 320 caracteres,
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
para muchas entidades.

Respeta MAX_SAFE_EDITORIAL_DEPTH. IDENTITY_ONLY admite sólo definición y resumen factual; BASIC_EXPLANATION,
un ensayo breve de 1–2 secciones; EDITORIAL_ENTRY, 2–4 secciones; CONTEXTUAL_ESSAY, 3–6 secciones;
DOCUMENTARY_ESSAY, 4–8 secciones con fuentes documentales suficientes. Nunca alargues para alcanzar un nivel.`.trim();

export function buildEditorialGenerationRequest(context: EditorialGenerationContext) {
  const targetName = String(context.entityData.canonicalName ?? context.entityData.title ?? '');
  const linkCandidates = new Set([
    targetName,
    ...context.relations.flatMap((relation) =>
      [relation.canonicalName, relation.target, relation.source]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim()),
    ),
  ]);
  return {
    task: ENTITY_EDITORIAL_TASK,
    schemaVersion: 'entity-editorial-v3',
    input: {
      ENTITY_DATA: context.entityData,
      TARGET_ENTITY: {
        canonicalName: targetName,
        type: context.entityData.type,
      },
      RELATIONS: context.relations,
      RELATION_METADATA: context.relationMetadata,
      AVAILABLE_ENTITIES: context.availableEntities
        .filter(({ canonicalName }) => linkCandidates.has(canonicalName))
        .map(({ canonicalName, type }) => ({ canonicalName, type })),
      SOURCES: context.sources,
      DOCUMENTARY_CONTEXT: context.documentaryContext,
      MAX_SAFE_EDITORIAL_DEPTH: context.maxSafeEditorialDepth ?? 'EDITORIAL_ENTRY',
      LOCALE: context.locale,
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'essay', 'definition'],
      properties: {
        summary: { type: 'string' },
        essay: { type: 'string' },
        // Ollama's grammar parser currently fails when several string length
        // constraints share this schema, but accepts this critical single bound.
        definition: { type: 'string', maxLength: 320 },
      },
    },
    maxOutputTokens:
      context.maxSafeEditorialDepth === 'IDENTITY_ONLY'
        ? 500
        : context.maxSafeEditorialDepth === 'BASIC_EXPLANATION'
          ? 900
          : context.maxSafeEditorialDepth === 'EDITORIAL_ENTRY'
            ? 1_500
            : context.maxSafeEditorialDepth === 'CONTEXTUAL_ESSAY'
              ? 2_200
              : 2_800,
    timeoutMs: 180_000,
  };
}

export function normalizeAndValidateEditorialOutput(
  output: EditorialGenerationOutput,
  availableEntities: EditorialEntity[],
  maxSafeEditorialDepth: EditorialGenerationContext['maxSafeEditorialDepth'] = 'EDITORIAL_ENTRY',
  expectedEntityNames: string[] = [],
): EditorialGenerationOutput {
  const summary = output.summary?.trim();
  const essay = output.essay?.trim();
  const definition = output.definition?.trim();
  if (!summary || !essay || !definition)
    throw new Error('Editorial output requires definition, summary and essay');
  const normalizeName = (value: string) =>
    value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
  const definitionTokens: string[] = normalizeName(definition).match(/[\p{L}\p{N}]+/gu) ?? [];
  const centered = expectedEntityNames.some((name) => {
    const normalized = normalizeName(name);
    const distinctive = normalized
      .split(/\s+/)
      .filter((token) => token.length >= 4)
      .at(-1);
    const index = distinctive ? definitionTokens.indexOf(distinctive) : -1;
    return normalizeName(definition).startsWith(normalized) || (index >= 0 && index <= 3);
  });
  if (expectedEntityNames.length && !centered)
    throw new Error(`Editorial output is not centered on ${expectedEntityNames[0]}`);
  const combined = `${summary}\n${essay}`;
  const internal = INTERNAL_LANGUAGE.find((phrase) =>
    combined.toLocaleLowerCase('es').includes(phrase),
  );
  if (internal) throw new Error(`Internal product language is forbidden: ${internal}`);
  if (
    !['IDENTITY_ONLY', 'BASIC_EXPLANATION'].includes(maxSafeEditorialDepth) &&
    !/^#{1,3}\s+\S/m.test(essay)
  )
    throw new Error('Essay requires entity-specific Markdown sections');

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
  return {
    definition,
    summary,
    essay: normalizeLinks(essay.replace(/^#{1,3}\s+/gm, '## ')),
  };
}
