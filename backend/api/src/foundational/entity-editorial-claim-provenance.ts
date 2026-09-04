import { createHash } from 'node:crypto';
import { INTERNAL_LANGUAGE, type EditorialEntity } from './entity-editorial-generation';

export type EditorialKnowledgeUnit = {
  id: `FACT:${string}` | `EVIDENCE:${string}` | `RELATION:${string}`;
  kind: 'CANONICAL_FACT' | 'REVIEWED_EVIDENCE' | 'SUPPORTED_RELATION';
  statement: string;
  certainty: 'DOCUMENTED' | 'ATTRIBUTED' | 'UNCERTAIN';
  entityIds: string[];
  provenance: Record<string, unknown>;
};

export type EditorialClaim = {
  id: string;
  statement: string;
  claimType: 'IDENTITY' | 'CHRONOLOGY' | 'ATTRIBUTE' | 'EVIDENCE' | 'RELATION';
  provenanceRefs: string[];
  certainty: EditorialKnowledgeUnit['certainty'];
};

export type ClaimPlan = {
  claims: EditorialClaim[];
  definitionClaimIds: string[];
  summaryClaimIds: string[];
  sections: Array<{ heading: string; claimIds: string[] }>;
};

export type MappedSentence = { id: string; text: string; claimIds: string[] };
export type MappedEditorialOutput = {
  definition: MappedSentence;
  summary: MappedSentence[];
  sections: Array<{ heading: string; sentences: MappedSentence[] }>;
};
export type EditorialLinkableEntity = EditorialEntity & {
  reasonAllowed: string;
  aliases?: string[];
};
export type SentenceEntailmentAudit = {
  results: Array<{
    sentenceId: string;
    verdict: 'SUPPORTED' | 'UNSUPPORTED' | 'UNCERTAIN';
    reason: string;
  }>;
};

export function normalizeMappedSentenceIds(output: MappedEditorialOutput): MappedEditorialOutput {
  const used = new Set<string>();
  let sequence = 0;
  const next = (sentence: MappedSentence, fallback: string): MappedSentence => {
    const base = sentence.id?.trim() || fallback;
    const id = !used.has(base) ? base : `${fallback}-${sequence++}`;
    used.add(id);
    return { ...sentence, id };
  };
  return {
    definition: next(output.definition, 'definition'),
    summary: (output.summary ?? []).map((sentence, index) =>
      next(sentence, `summary-${index + 1}`),
    ),
    sections: (output.sections ?? []).map((section, sectionIndex) => ({
      ...section,
      sentences: (section.sentences ?? []).map((sentence, sentenceIndex) =>
        next(sentence, `section-${sectionIndex + 1}-${sentenceIndex + 1}`),
      ),
    })),
  };
}

export const CLAIM_PLANNER_VERSION = 'claim-level-editorial-v1-planner';
export const CLAIM_REALIZER_VERSION = 'claim-level-editorial-v1-realizer';

const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();

export function editorialContextFingerprint(
  entityId: string,
  locale: string,
  depth: string,
  units: EditorialKnowledgeUnit[],
) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        entityId,
        locale,
        depth,
        contract: CLAIM_REALIZER_VERSION,
        units: [...units].sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest('hex');
}

export function buildClaimPlannerRequest(args: {
  entity: EditorialEntity;
  units: EditorialKnowledgeUnit[];
  depth: string;
}) {
  return {
    schemaVersion: CLAIM_PLANNER_VERSION,
    task: `Selecciona únicamente conocimiento útil para explicar TARGET_ENTITY.
Cada claim debe copiar EXACTAMENTE statement de una sola AVAILABLE_KNOWLEDGE_UNIT y referenciar su id.
No parafrasees, combines ni añadas conocimiento. Separa decision editorial de estilo. Una sección sólo puede
usar claims seleccionadas. IDENTITY_ONLY no necesita secciones.`,
    input: {
      TARGET_ENTITY: args.entity,
      MAX_SAFE_EDITORIAL_DEPTH: args.depth,
      AVAILABLE_KNOWLEDGE_UNITS: args.units,
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['claims', 'definitionClaimIds', 'summaryClaimIds', 'sections'],
      properties: {
        claims: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'statement', 'claimType', 'provenanceRefs', 'certainty'],
            properties: {
              id: { type: 'string' },
              statement: { type: 'string' },
              claimType: {
                type: 'string',
                enum: ['IDENTITY', 'CHRONOLOGY', 'ATTRIBUTE', 'EVIDENCE', 'RELATION'],
              },
              provenanceRefs: { type: 'array', items: { type: 'string' }, minItems: 1 },
              certainty: { type: 'string', enum: ['DOCUMENTED', 'ATTRIBUTED', 'UNCERTAIN'] },
            },
          },
        },
        definitionClaimIds: { type: 'array', items: { type: 'string' } },
        summaryClaimIds: { type: 'array', items: { type: 'string' } },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['heading', 'claimIds'],
            properties: {
              heading: { type: 'string' },
              claimIds: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    maxOutputTokens: 2_200,
    timeoutMs: 180_000,
  };
}

export function validateClaimPlan(plan: ClaimPlan, units: EditorialKnowledgeUnit[]) {
  const byUnit = new Map<string, EditorialKnowledgeUnit>(units.map((unit) => [unit.id, unit]));
  const accepted: EditorialClaim[] = [];
  const rejected: Array<{ claim: EditorialClaim; reason: string }> = [];
  const ids = new Set<string>();
  for (const claim of plan.claims ?? []) {
    const unit = claim.provenanceRefs?.length === 1 ? byUnit.get(claim.provenanceRefs[0]) : null;
    const reason =
      !claim.id || ids.has(claim.id)
        ? 'INVALID_CLAIM_ID'
        : !unit
          ? 'INVALID_PROVENANCE_REF'
          : normalize(claim.statement) !== normalize(unit.statement)
            ? 'CLAIM_NOT_ENTAILED'
            : claim.certainty !== unit.certainty
              ? 'CERTAINTY_NOT_PRESERVED'
              : null;
    if (reason) rejected.push({ claim, reason });
    else {
      ids.add(claim.id);
      accepted.push(claim);
    }
  }
  const acceptedIds = new Set(accepted.map((claim) => claim.id));
  const referenced = [
    ...(plan.definitionClaimIds ?? []),
    ...(plan.summaryClaimIds ?? []),
    ...(plan.sections ?? []).flatMap((section) => section.claimIds ?? []),
  ];
  const invalidReferences = [...new Set(referenced.filter((id) => !acceptedIds.has(id)))];
  return { accepted, rejected, invalidReferences };
}

export function buildEditorialRealizerRequest(args: {
  entity: EditorialEntity;
  claims: EditorialClaim[];
  linkableEntities: EditorialLinkableEntity[];
  depth: string;
  locale: string;
}) {
  const claimLockedRealization = args.claims.map((claim) => ({
    claimId: claim.id,
    subject: args.entity.canonicalName,
    claimType: claim.claimType,
    proposition: claim.statement,
    requiredQualifiers: requiredQualifiers(claim.statement),
    requiredAttribution: /\b(según|according to|describe|caracteriza|Tate)\b/i.test(
      claim.statement,
    ),
    forbiddenStrengthenings: [
      'invented causality',
      'stronger certainty',
      'broader scope',
      'transitive graph inference',
    ],
  }));
  return {
    schemaVersion: CLAIM_REALIZER_VERSION,
    task: `Escribe prosa natural que explique TARGET_ENTITY usando EXCLUSIVAMENTE ACCEPTED_CLAIMS.
Cada frase debe tener exactamente un claimId primario (claimIds con un solo elemento). No añadas fechas, lugares, nombres, causalidad,
interpretaciones ni relaciones ausentes. Puedes sintetizar claims, pero no ampliar su significado.
Usa ÚNICAMENTE los IDs exactos de ACCEPTED_CLAIMS; copia cada claimIds literalmente y no inventes IDs.
La definición debe nombrar TARGET_ENTITY. Definition y summary pueden usar [[Nombre canónico]] sólo para
LINKABLE_ENTITIES. TARGET_ENTITY nunca se enlaza consigo misma: elimina el marcado y conserva el texto visible.
Prefiere una frase factual por claim. Preserva todos los requiredQualifiers de CLAIM_LOCKED_REALIZATION: no conviertas partly en influencia total, around/approximately en fecha exacta, seems/perhaps en certeza, ni one of en the. No derives relaciones recorriendo el grafo.
IDENTITY_ONLY debe ser breve y puede devolver sections vacío;
EDITORIAL_ENTRY o mayor requiere al menos una sección. No repitas literalmente definition como summary.
No menciones JANO ni el proceso.`,
    input: {
      TARGET_ENTITY: args.entity,
      ACCEPTED_CLAIMS: args.claims,
      LINKABLE_ENTITIES: args.linkableEntities,
      MAX_SAFE_EDITORIAL_DEPTH: args.depth,
      LOCALE: args.locale,
      CLAIM_LOCKED_REALIZATION: claimLockedRealization,
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['definition', 'summary', 'sections'],
      properties: {
        definition: sentenceSchema(args.claims.map((claim) => claim.id)),
        summary: {
          type: 'array',
          items: sentenceSchema(args.claims.map((claim) => claim.id)),
          minItems: 1,
        },
        sections: {
          type: 'array',
          minItems: ['IDENTITY_ONLY', 'BASIC_EXPLANATION'].includes(args.depth) ? 0 : 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['heading', 'sentences'],
            properties: {
              heading: { type: 'string' },
              sentences: {
                type: 'array',
                items: sentenceSchema(args.claims.map((claim) => claim.id)),
              },
            },
          },
        },
      },
    },
    maxOutputTokens: realizerOutputBudget(args.depth, args.claims.length),
    timeoutMs: 240_000,
  };
}

export function buildClaimLockedSentenceRequest(args: {
  entity: EditorialEntity;
  claim: EditorialClaim;
  allowedLinkedEntities: EditorialLinkableEntity[];
  locale: string;
}) {
  return {
    schemaVersion: `${CLAIM_REALIZER_VERSION}-per-claim`,
    task: `Reescribe UN SOLO claim canónico como UNA sola frase natural en español. Devuelve únicamente claimId y sentence. Expresa sólo la proposición dada; conserva incertidumbre, atribución, alcance, dirección de relación y precisión temporal. No añadas contexto, causalidad, nombres ni relaciones. No uses conocimiento del grafo.`,
    input: {
      CLAIM_ID: args.claim.id,
      SUBJECT: args.entity.canonicalName,
      CANONICAL_PROPOSITION: args.claim.statement,
      CLAIM_TYPE: args.claim.claimType,
      REQUIRED_QUALIFIERS: requiredQualifiers(args.claim.statement),
      ALLOWED_LINKED_ENTITIES: args.allowedLinkedEntities,
      LOCALE: args.locale,
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['claimId', 'sentence'],
      properties: {
        claimId: { type: 'string', const: args.claim.id },
        sentence: { type: 'string' },
      },
    },
    maxOutputTokens: 180,
    timeoutMs: 120_000,
  };
}

export function buildDefinitionRepairRequest(args: {
  entity: EditorialEntity;
  definition: MappedSentence;
  claims: EditorialClaim[];
  maxCharacters: number;
}) {
  return {
    schemaVersion: `${CLAIM_REALIZER_VERSION}-definition-repair`,
    task: `Reescribe únicamente la definition de TARGET_ENTITY en <= ${args.maxCharacters} caracteres.
Conserva sólo la información de ACCEPTED_DEFINITION_CLAIMS. No añadas hechos y mantén exactamente claimIds.
Devuelve una sola frase breve y natural; no uses enlaces hacia TARGET_ENTITY.`,
    input: {
      TARGET_ENTITY: args.entity,
      ORIGINAL_DEFINITION: args.definition,
      ACCEPTED_DEFINITION_CLAIMS: args.claims,
      MAXIMUM_CHARACTERS: args.maxCharacters,
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'text', 'claimIds'],
      properties: {
        id: { type: 'string', const: args.definition.id },
        text: { type: 'string', maxLength: args.maxCharacters },
        claimIds: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', enum: args.claims.map((claim) => claim.id) },
        },
      },
    },
    maxOutputTokens: 500,
    timeoutMs: 120_000,
  };
}

function realizerOutputBudget(depth: string, claimCount: number) {
  const base =
    depth === 'IDENTITY_ONLY'
      ? 700
      : depth === 'BASIC_EXPLANATION'
        ? 1_400
        : depth === 'EDITORIAL_ENTRY'
          ? 2_800
          : depth === 'CONTEXTUAL_ESSAY'
            ? 7_000
            : 7_500;
  return Math.min(base, Math.max(700, 700 + claimCount * 500));
}

function sentenceSchema(claimIds?: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'text', 'claimIds'],
    properties: {
      id: { type: 'string' },
      text: { type: 'string' },
      claimIds: {
        type: 'array',
        items: claimIds?.length ? { type: 'string', enum: claimIds } : { type: 'string' },
        minItems: 1,
        maxItems: 1,
      },
    },
  };
}

export function requiredQualifiers(statement: string) {
  const qualifiers = [
    'approximately',
    'around',
    'generally',
    'seems',
    'appears',
    'perhaps',
    'possibly',
    'partly',
    'late work',
    'attributed to',
    'according to',
    'one of',
    'aproximadamente',
    'alrededor',
    'generalmente',
    'parece',
    'quizá',
    'quizás',
    'parcialmente',
    'obra tardía',
    'atribuido',
    'según',
    'uno de',
  ];
  return qualifiers.filter((qualifier) => statement.toLocaleLowerCase().includes(qualifier));
}

export function canonicalPublicProposition(quote: string, note?: string | null) {
  return note?.match(/^\[[^\]]+\]\s*(.+)$/s)?.[1]?.trim() || quote.trim();
}

export function isEditoriallyClaimableRelation(statement: string) {
  return !/(?:se sitúa historiográficamente en relación con|se comprende en diálogo con|https?:\/\/|\bSource\b)/i.test(
    statement.replace(/^La Source documenta que\s+/i, ''),
  );
}

function validateQualifierPreservation(sentence: string, support: string) {
  const missing = requiredQualifiers(support).find(
    (qualifier) => !sentence.toLocaleLowerCase().includes(qualifier),
  );
  if (missing) throw new Error(`Sentence loses required qualifier: ${missing}`);
  const attribution = support.match(/\b(Tate|MoMA)\b/i)?.[0];
  if (attribution && !sentence.toLocaleLowerCase().includes(attribution.toLocaleLowerCase()))
    throw new Error(`Sentence loses required attribution: ${attribution}`);
}

export function uniqueSentenceClaimPairs(sentences: MappedSentence[]) {
  const seen = new Set<string>();
  return sentences.filter((sentence) => {
    const key = `${[...sentence.claimIds].sort().join('\u0000')}\u0000${normalize(sentence.text).toLocaleLowerCase('es')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function editorialAssemblyLocations(output: MappedEditorialOutput) {
  const locations = new Map<string, string[]>();
  const add = (sentence: MappedSentence, location: string) => {
    const key = `${[...sentence.claimIds].sort().join('\u0000')}\u0000${normalize(sentence.text).toLocaleLowerCase('es')}`;
    locations.set(key, [...(locations.get(key) ?? []), location]);
  };
  add(output.definition, 'definition');
  output.summary.forEach((sentence) => add(sentence, 'summary'));
  output.sections.forEach((section) =>
    section.sentences.forEach((sentence) => add(sentence, 'section')),
  );
  return [...locations.values()];
}

type AuditedSentence = {
  sentence: MappedSentence;
  result: SentenceEntailmentAudit['results'][number];
  supported: boolean;
};

export async function realizeClaimWithFallback(args: {
  claim: EditorialClaim;
  writerSentence: MappedSentence;
  audit: (sentence: MappedSentence) => Promise<AuditedSentence>;
  repair: (sentence: MappedSentence, reason: string) => Promise<MappedSentence>;
}) {
  const writer = await args.audit(args.writerSentence);
  let repair: AuditedSentence | null = null;
  let canonicalFallback: AuditedSentence | null = null;
  if (!writer.supported) {
    try {
      repair = await args.audit(await args.repair(args.writerSentence, writer.result.reason));
    } catch (error) {
      repair = {
        sentence: args.writerSentence,
        result: {
          sentenceId: args.writerSentence.id,
          verdict: 'UNSUPPORTED',
          reason: error instanceof Error ? error.message : String(error),
        },
        supported: false,
      };
    }
  }
  const selected = writer.supported ? writer : repair?.supported ? repair : null;
  if (!selected) {
    canonicalFallback = await args.audit({
      id: args.writerSentence.id,
      text: args.claim.statement,
      claimIds: [args.claim.id],
    });
  }
  return {
    selected: selected ?? canonicalFallback!,
    writer,
    repair,
    canonicalFallback,
    acceptedBy: writer.supported
      ? 'WRITER'
      : repair?.supported
        ? 'REPAIR'
        : canonicalFallback?.supported
          ? 'CANONICAL_FALLBACK'
          : 'BLOCKED',
  } as const;
}

export function validateMappedEditorialOutput(
  output: MappedEditorialOutput,
  claims: EditorialClaim[],
  target: EditorialEntity,
  linkableEntities: EditorialLinkableEntity[],
  depth = 'EDITORIAL_ENTRY',
  targetAliases: string[] = [],
) {
  const normalizedOutput = normalizeRichLinks(output, target, linkableEntities, targetAliases);
  output.definition = normalizedOutput.definition;
  output.summary = normalizedOutput.summary;
  output.sections = normalizedOutput.sections;
  const byClaim = new Map(claims.map((claim) => [claim.id, claim]));
  const sentences = [
    output.definition,
    ...(output.summary ?? []),
    ...(output.sections ?? []).flatMap((section) => section.sentences ?? []),
  ];
  if (
    !normalize(output.definition?.text ?? '')
      .toLocaleLowerCase('es')
      .includes(normalize(target.canonicalName).toLocaleLowerCase('es'))
  )
    throw new Error('Definition does not identify target entity');
  if (output.definition.text.length > 320) throw new Error('Definition is too long');
  if (!['IDENTITY_ONLY', 'BASIC_EXPLANATION'].includes(depth) && !(output.sections ?? []).length)
    throw new Error('Editorial depth requires at least one section');
  for (const sentence of sentences) {
    if (!sentence?.text || !sentence.claimIds?.length) throw new Error('Unmapped public sentence');
    if (sentence.claimIds.length !== 1)
      throw new Error('Sentence must have exactly one primary claim');
    const referenced = sentence.claimIds.map((id) => byClaim.get(id));
    if (referenced.some((claim) => !claim)) throw new Error('Sentence references unknown claim');
    const support = referenced.map((claim) => claim!.statement).join(' ');
    validateQualifierPreservation(sentence.text, support);
    if (
      sentence.claimIds.length > 1 &&
      /\b(por tanto|porque|por lo tanto|lo que llevó a|como resultado|así pues|influye|influyó|fundamental|revolucionari[oa])\b/i.test(
        sentence.text,
      ) &&
      !/\b(por tanto|porque|por lo tanto|lo que llevó a|como resultado|así pues|influye|influyó|fundamental|revolucionari[oa])\b/i.test(
        support,
      )
    )
      throw new Error('Sentence combines claims with unsupported connective');
    const allowedNumbers = new Set(support.match(/-?\d+(?:[.,]\d+)?/g) ?? []);
    const introducedNumber = (sentence.text.match(/-?\d+(?:[.,]\d+)?/g) ?? []).find(
      (number) => !allowedNumbers.has(number),
    );
    if (introducedNumber)
      throw new Error(`Sentence introduces unsupported number: ${introducedNumber}`);
    for (const match of sentence.text.matchAll(/\[\[[^\]|]+\|([^\]]+)\]\]/g)) {
      if (!normalize(support).includes(normalize(match[1])))
        throw new Error(`Sentence link is not supported by its claims: ${match[1]}`);
    }
    const internal = INTERNAL_LANGUAGE.find((phrase) =>
      sentence.text.toLocaleLowerCase('es').includes(phrase),
    );
    if (internal) throw new Error(`Internal product language is forbidden: ${internal}`);
  }
  return sentences;
}

export function normalizeRichLinks(
  output: MappedEditorialOutput,
  target: EditorialEntity,
  linkableEntities: EditorialLinkableEntity[],
  targetAliases: string[] = [],
): MappedEditorialOutput {
  const targetNames = new Set([target.canonicalName, target.slug, ...targetAliases].map(normalize));
  const candidates = new Map<string, EditorialLinkableEntity | null>();
  for (const entity of linkableEntities) {
    for (const name of [entity.canonicalName, entity.slug, ...(entity.aliases ?? [])]) {
      const key = normalize(name);
      if (candidates.has(key) && candidates.get(key)?.id !== entity.id) candidates.set(key, null);
      else candidates.set(key, entity);
    }
  }
  const rewrite = (value: string) =>
    value.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, rawName, rawLabel) => {
      const name = normalize(String(rawName));
      const visible = String(rawLabel ?? rawName).trim();
      if (targetNames.has(name)) return visible;
      const entity = candidates.get(name);
      if (entity === null) throw new Error(`Ambiguous rich link: ${rawName}`);
      if (!entity) throw new Error(`Sentence links unavailable entity: ${rawName}`);
      return `[[${entity.slug}|${entity.canonicalName}]]`;
    });
  return {
    definition: { ...output.definition, text: rewrite(output.definition.text) },
    summary: output.summary.map((sentence) => ({ ...sentence, text: rewrite(sentence.text) })),
    sections: output.sections.map((section) => ({
      ...section,
      heading: rewrite(section.heading),
      sentences: section.sentences.map((sentence) => ({
        ...sentence,
        text: rewrite(sentence.text),
      })),
    })),
  };
}

export function validateSingleMappedSentence(
  sentence: MappedSentence,
  claims: EditorialClaim[],
  target: EditorialEntity,
  linkableEntities: EditorialLinkableEntity[],
  targetAliases: string[] = [],
) {
  const normalized = normalizeRichLinks(
    { definition: sentence, summary: [], sections: [] },
    target,
    linkableEntities,
    targetAliases,
  ).definition;
  const byClaim = new Map(claims.map((claim) => [claim.id, claim]));
  const referenced = normalized.claimIds.map((id) => byClaim.get(id));
  if (!normalized.text || !normalized.claimIds.length || referenced.some((claim) => !claim))
    throw new Error('Sentence references unknown claim');
  const support = referenced.map((claim) => claim!.statement).join(' ');
  validateQualifierPreservation(normalized.text, support);
  if (
    normalized.claimIds.length > 1 &&
    /\b(por tanto|porque|por lo tanto|lo que llevó a|como resultado|así pues|influye|influyó|fundamental|revolucionari[oa])\b/i.test(
      normalized.text,
    ) &&
    !/\b(por tanto|porque|por lo tanto|lo que llevó a|como resultado|así pues|influye|influyó|fundamental|revolucionari[oa])\b/i.test(
      support,
    )
  )
    throw new Error('Sentence combines claims with unsupported connective');
  const allowedNumbers = new Set(support.match(/-?\d+(?:[.,]\d+)?/g) ?? []);
  const introducedNumber = (normalized.text.match(/-?\d+(?:[.,]\d+)?/g) ?? []).find(
    (number) => !allowedNumbers.has(number),
  );
  if (introducedNumber)
    throw new Error(`Sentence introduces unsupported number: ${introducedNumber}`);
  for (const match of normalized.text.matchAll(/\[\[[^\]|]+\|([^\]]+)\]\]/g)) {
    if (!normalize(support).includes(normalize(match[1])))
      throw new Error(`Sentence link is not supported by its claims: ${match[1]}`);
  }
  const internal = INTERNAL_LANGUAGE.find((phrase) =>
    normalized.text.toLocaleLowerCase('es').includes(phrase),
  );
  if (internal) throw new Error(`Internal product language is forbidden: ${internal}`);
  return normalized;
}

export function buildUncertainSentenceRepairRequest(
  sentence: MappedSentence,
  claims: EditorialClaim[],
  reason: string,
) {
  return {
    schemaVersion: 'claim-level-editorial-v1-repair',
    task: `Reformula UNA sola frase para hacerla más conservadora. Usa exactamente los mismos claimIds y sólo
los claims proporcionados. Elimina cualquier alcance, relación o interpretación dudosa; no añadas conocimiento.
Devuelve la frase en español sin explicación adicional.`,
    input: {
      REJECTED_SENTENCE: sentence,
      REFERENCED_CLAIMS: claims,
      AUDITOR_REASON: reason,
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'text', 'claimIds'],
      properties: {
        id: { type: 'string' },
        text: { type: 'string' },
        claimIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
      },
    },
    maxOutputTokens: 500,
    timeoutMs: 180_000,
  };
}

export function buildSentenceEntailmentRequest(
  sentences: MappedSentence[],
  claims: EditorialClaim[],
) {
  const byClaim = new Map(claims.map((claim) => [claim.id, claim]));
  return {
    schemaVersion: 'claim-level-editorial-v1-entailment',
    task: `Comprueba si cada PUBLIC_SENTENCE está completamente implicada por sus REFERENCED_CLAIMS.
SUPPORTED sólo si no añade hechos, fechas, nombres, lugares, causalidad, intención, influencia o interpretación.
La síntesis retórica sin contenido factual nuevo es válida. Ante duda devuelve UNCERTAIN, nunca completes contexto.`,
    input: {
      SENTENCES: sentences.map((sentence) => ({
        ...sentence,
        referencedClaims: sentence.claimIds.map((id) => byClaim.get(id)),
      })),
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['results'],
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['sentenceId', 'verdict', 'reason'],
            properties: {
              sentenceId: { type: 'string' },
              verdict: { type: 'string', enum: ['SUPPORTED', 'UNSUPPORTED', 'UNCERTAIN'] },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    maxOutputTokens: 1_200,
    timeoutMs: 180_000,
  };
}

export function validateSentenceEntailment(
  sentences: MappedSentence[],
  audit: SentenceEntailmentAudit,
) {
  const byId = new Map(audit.results?.map((result) => [result.sentenceId, result]) ?? []);
  const missing = sentences.find((sentence) => !byId.has(sentence.id));
  if (missing) throw new Error(`Entailment result missing sentence: ${missing.id}`);
  const rejected = sentences
    .map((sentence) => ({ sentence, result: byId.get(sentence.id)! }))
    .filter(({ result }) => result.verdict !== 'SUPPORTED');
  return { accepted: sentences.length - rejected.length, rejected };
}

export function publicOutputFromMapped(
  output: MappedEditorialOutput,
  linkableEntities: EditorialEntity[] = [],
) {
  const links = new Map(linkableEntities.map((entity) => [entity.canonicalName, entity]));
  const render = (value: string) =>
    normalize(value).replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_match, name) => {
      const entity = links.get(String(name).trim());
      return entity ? `[[${entity.slug}|${entity.canonicalName}]]` : _match;
    });
  return {
    definition: render(output.definition.text),
    summary: output.summary.map((sentence) => render(sentence.text)).join(' '),
    essay: output.sections
      .map(
        (section) =>
          `## ${render(section.heading)}\n\n${section.sentences
            .map((sentence) => render(sentence.text))
            .join(' ')}`,
      )
      .join('\n\n'),
  };
}
