import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';
import { AIProvider } from '../src/ai/ai.provider';
import { publicRelationJustification } from '../src/entities/entity.presenter';
import {
  buildClaimPlannerRequest,
  buildDefinitionRepairRequest,
  buildEditorialRealizerRequest,
  buildClaimLockedSentenceRequest,
  buildSentenceEntailmentRequest,
  buildUncertainSentenceRepairRequest,
  editorialContextFingerprint,
  publicOutputFromMapped,
  validateClaimPlan,
  validateMappedEditorialOutput,
  validateSingleMappedSentence,
  normalizeMappedSentenceIds,
  validateSentenceEntailment,
  type ClaimPlan,
  type EditorialClaim,
  type EditorialLinkableEntity,
  type EditorialKnowledgeUnit,
  type MappedEditorialOutput,
  type MappedSentence,
  type SentenceEntailmentAudit,
} from '../src/foundational/entity-editorial-claim-provenance';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const slugs = process.argv
  .find((argument) => argument.startsWith('--slugs='))
  ?.split('=')[1]
  .split(',') ?? ['guernica', 'ritual'];
const outputDir = resolve(
  process.cwd(),
  process.argv.find((value) => value.startsWith('--output='))?.split('=')[1] ?? '../../artifacts',
);

type EntityRecord = Prisma.EntityGetPayload<{
  include: {
    translations: true;
    sourceRefs: { include: { source: true } };
    attributes: { include: { definition: true; citations: { include: { source: true } } } };
    outgoing: {
      include: { relationType: true; to: true; citations: { include: { source: true } } };
    };
    incoming: {
      include: { relationType: true; from: true; citations: { include: { source: true } } };
    };
    artwork: true;
    artist: true;
    concept: true;
    period: true;
  };
}>;

const typeName: Record<string, string> = {
  ARTWORK: 'obra cultural',
  ARTIST: 'artista',
  ARTICLE: 'artículo',
  CONCEPT: 'concepto cultural',
  MOVEMENT: 'movimiento cultural',
  PERIOD: 'periodo cultural',
  TEXT: 'texto',
  PLACE: 'lugar',
  EVENT: 'acontecimiento',
  ORGANIZATION: 'organización',
};

const fact = (
  id: string,
  statement: string,
  entityId: string,
  provenance: Record<string, unknown>,
): EditorialKnowledgeUnit => ({
  id: `FACT:${id}`,
  kind: 'CANONICAL_FACT',
  statement,
  certainty: 'DOCUMENTED',
  entityIds: [entityId],
  provenance,
});

function knowledgeUnits(entity: EntityRecord): EditorialKnowledgeUnit[] {
  const units: EditorialKnowledgeUnit[] = [
    fact(
      `${entity.id}:identity`,
      `${entity.title} es ${articleFor(typeName[entity.type] ?? 'entidad cultural')} ${typeName[entity.type] ?? 'entidad cultural'}.`,
      entity.id,
      { table: 'Entity', id: entity.id, fields: ['title', 'type'] },
    ),
  ];
  if (entity.startYear !== null) {
    const statement =
      entity.type === 'ARTIST'
        ? `${entity.title} nació en ${entity.startYear}.`
        : entity.type === 'PERIOD' && entity.endYear !== null
          ? `${entity.title} abarca aproximadamente desde ${entity.startYear} hasta ${entity.endYear}.`
          : `${entity.title} está fechada en ${formatYear(entity.startYear)}.`;
    units.push(
      fact(`${entity.id}:startYear`, statement, entity.id, {
        table: 'Entity',
        id: entity.id,
        field: 'startYear',
      }),
    );
  }
  if (entity.type === 'ARTIST' && entity.endYear !== null)
    units.push(
      fact(`${entity.id}:endYear`, `${entity.title} murió en ${entity.endYear}.`, entity.id, {
        table: 'Entity',
        id: entity.id,
        field: 'endYear',
      }),
    );

  const details = [
    ['technique', entity.artwork?.technique],
    ['materials', entity.artwork?.materials],
    ['location', entity.artwork?.location],
    ['collection', entity.artwork?.collection],
    ['country', entity.artist?.country],
    ['city', entity.artist?.city],
    ['definition', entity.concept?.definition ?? entity.period?.definition],
  ].filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim()),
  );
  for (const [field, value] of details)
    units.push(
      fact(`${entity.id}:${field}`, `${entity.title}: ${value.trim()}`, entity.id, {
        table: detailTable(entity.type),
        id: entity.id,
        field,
      }),
    );

  for (const attribute of entity.attributes.filter((item) => item.status === 'PUBLISHED')) {
    const value =
      attribute.valueText ??
      attribute.valueNumber ??
      attribute.valueBoolean ??
      attribute.valueDate ??
      attribute.valueYear ??
      attribute.valueJson;
    if (value === null || value === undefined) continue;
    units.push(
      fact(
        attribute.id,
        `${entity.title} — ${attribute.definition.label}: ${String(value)}.`,
        entity.id,
        {
          table: 'EntityAttribute',
          id: attribute.id,
          citationIds: attribute.citations.map((citation) => citation.id),
        },
      ),
    );
  }

  for (const reference of entity.sourceRefs) {
    const quote = reference.quote?.trim();
    if (!quote) continue;
    units.push({
      id: `EVIDENCE:${reference.id}`,
      kind: 'REVIEWED_EVIDENCE',
      statement: quote,
      certainty: 'ATTRIBUTED',
      entityIds: [entity.id],
      provenance: {
        table: 'SourceRef',
        id: reference.id,
        sourceId: reference.sourceId,
        sourceTitle: reference.source.title,
        locator: reference.page,
      },
    });
  }

  const relations = [
    ...entity.outgoing.map((relation) => ({ ...relation, other: relation.to })),
    ...entity.incoming.map((relation) => ({ ...relation, other: relation.from })),
  ];
  for (const relation of relations) {
    if (
      (relation.relationType.key === 'USES_TECHNIQUE' && entity.artwork?.technique) ||
      (relation.relationType.key === 'USES_MATERIAL' && entity.artwork?.materials) ||
      (relation.relationType.key === 'LOCATED_IN' && entity.artwork?.location)
    )
      continue;
    const statement = publicRelationJustification(relation.justification);
    if (relation.status !== 'PUBLISHED' || !statement || !relation.citations.length) continue;
    units.push({
      id: `RELATION:${relation.id}`,
      kind: 'SUPPORTED_RELATION',
      statement,
      certainty: 'DOCUMENTED',
      entityIds: [entity.id, relation.other.id],
      provenance: {
        table: 'Relation',
        id: relation.id,
        relationType: relation.relationType.key,
        citationIds: relation.citations.map((citation) => citation.id),
        sourceIds: [...new Set(relation.citations.map((citation) => citation.sourceId))],
      },
    });
  }
  return units;
}

function classifyRelations(entity: EntityRecord) {
  const relations = [
    ...entity.outgoing.map((relation) => ({
      ...relation,
      direction: 'outgoing',
      other: relation.to,
    })),
    ...entity.incoming.map((relation) => ({
      ...relation,
      direction: 'incoming',
      other: relation.from,
    })),
  ];
  return relations.map((relation) => {
    const supported =
      relation.status === 'PUBLISHED' &&
      relation.citations.length > 0 &&
      Boolean(publicRelationJustification(relation.justification));
    return {
      id: relation.id,
      type: relation.relationType.key,
      direction: relation.direction,
      target: relation.other.title,
      targetId: relation.other.id,
      classification: supported
        ? 'SUPPORTED_RELATION'
        : relation.status === 'PUBLISHED'
          ? 'NAVIGATIONAL_RELATION'
          : 'INSUFFICIENT_FOR_PROSE',
    };
  });
}

function articleFor(noun: string) {
  return /^(obra|entidad|organización)\b/i.test(noun) ? 'una' : 'un';
}

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} a. C.` : String(year);
}

function detailTable(type: string) {
  if (type === 'ARTWORK') return 'ArtworkDetails';
  if (type === 'ARTIST') return 'ArtistDetails';
  if (type === 'CONCEPT') return 'ConceptDetails';
  if (type === 'PERIOD') return 'PeriodDetails';
  return 'Entity';
}

function maxDepth(units: EditorialKnowledgeUnit[]) {
  if (units.length <= 2) return 'IDENTITY_ONLY';
  if (units.length <= 4) return 'BASIC_EXPLANATION';
  if (units.length <= 8) return 'EDITORIAL_ENTRY';
  return 'CONTEXTUAL_ESSAY';
}

function deterministicClaimPlan(units: EditorialKnowledgeUnit[]): ClaimPlan {
  const claims = units.map((unit, index) => ({
    id: unit.id,
    statement: unit.statement,
    claimType:
      unit.kind === 'SUPPORTED_RELATION'
        ? 'RELATION'
        : unit.kind === 'REVIEWED_EVIDENCE'
          ? 'EVIDENCE'
          : index === 0
            ? 'IDENTITY'
            : 'ATTRIBUTE',
    provenanceRefs: [unit.id],
    certainty: unit.certainty,
  })) as EditorialClaim[];
  return {
    claims,
    definitionClaimIds: claims.slice(0, 1).map((claim) => claim.id),
    summaryClaimIds: claims.slice(0, Math.min(3, claims.length)).map((claim) => claim.id),
    sections: [{ heading: 'Contexto', claimIds: claims.slice(1).map((claim) => claim.id) }],
  };
}

function sentenceById(output: MappedEditorialOutput, id: string) {
  return [
    output.definition,
    ...output.summary,
    ...output.sections.flatMap((section) => section.sentences),
  ].find((sentence) => sentence.id === id);
}

function replaceSentence(
  output: MappedEditorialOutput,
  replacement: MappedEditorialOutput['definition'],
) {
  if (output.definition.id === replacement.id) output.definition = replacement;
  output.summary = output.summary.map((sentence) =>
    sentence.id === replacement.id ? replacement : sentence,
  );
  output.sections = output.sections.map((section) => ({
    ...section,
    sentences: section.sentences.map((sentence) =>
      sentence.id === replacement.id ? replacement : sentence,
    ),
  }));
}

async function main() {
  const writer = new AIProvider(new ConfigService());
  const validator = new AIProvider(
    new ConfigService({
      AI_PROVIDER: 'ollama',
      AI_MODEL: 'qwen2.5:14b',
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    }),
  );
  if (!writer.isAvailable() || !['qwen3.8:27b', 'qwen2.5:14b'].includes(writer.metadata().model))
    throw new Error('Run with AI_PROVIDER=ollama AI_MODEL=qwen3.8:27b or qwen2.5:14b');
  mkdirSync(outputDir, { recursive: true });

  for (const slug of slugs) {
    try {
      const entity = await prisma.entity.findUnique({
        where: { slug },
        include: {
          translations: true,
          sourceRefs: { include: { source: true } },
          attributes: { include: { definition: true, citations: { include: { source: true } } } },
          outgoing: {
            include: {
              relationType: true,
              to: { include: { aliases: true } },
              citations: { include: { source: true } },
            },
          },
          incoming: {
            include: {
              relationType: true,
              from: { include: { aliases: true } },
              citations: { include: { source: true } },
            },
          },
          aliases: true,
          artwork: true,
          artist: true,
          concept: true,
          period: true,
        },
      });
      if (!entity) throw new Error(`Entity not found: ${slug}`);
      const units = knowledgeUnits(entity);
      const depth = maxDepth(units);
      const canonicalEntity = {
        id: entity.id,
        slug: entity.slug,
        canonicalName: entity.title,
        type: entity.type,
      };
      const relatedById = new Map(
        [
          ...entity.outgoing.map((relation) => relation.to),
          ...entity.incoming.map((relation) => relation.from),
        ].map((related) => [related.id, related]),
      );
      let proposedPlan!: ClaimPlan;
      let accepted: EditorialClaim[] = [];
      let rejected: Array<{ claim: EditorialClaim; reason: string }> = [];
      let invalidReferences: string[] = [];
      for (let attempt = 0; attempt < 2 && !accepted.length; attempt += 1) {
        if (process.env.EDITORIAL_PLANNER_MODE === 'deterministic') {
          proposedPlan = deterministicClaimPlan(units);
          const result = validateClaimPlan(proposedPlan, units);
          accepted = result.accepted;
          rejected = result.rejected;
          invalidReferences = result.invalidReferences;
          break;
        }
        const request = buildClaimPlannerRequest({ entity: canonicalEntity, units, depth });
        if (attempt)
          request.task += `\n\nREINTENTO OBLIGATORIO: los provenanceRefs anteriores eran inválidos. Copia literalmente un id de AVAILABLE_KNOWLEDGE_UNITS, incluyendo su prefijo FACT:, EVIDENCE: o RELATION:. Nunca uses nombres de tablas ni inventes ids.`;
        const plannerResult = await writer.runStructured(request);
        proposedPlan = plannerResult.output as ClaimPlan;
        const result = validateClaimPlan(proposedPlan, units);
        accepted = result.accepted;
        rejected = result.rejected;
        invalidReferences = result.invalidReferences;
      }
      if (!accepted.length)
        throw new Error(
          `Planner accepted no claims for ${slug}: ${JSON.stringify({ proposed: proposedPlan.claims, rejected })}`,
        );

      const unitById = new Map<string, EditorialKnowledgeUnit>(
        units.map((unit) => [unit.id, unit]),
      );
      const linkableEntities = accepted
        .flatMap((claim) => claim.provenanceRefs)
        .map((ref) => unitById.get(ref))
        .filter((unit): unit is EditorialKnowledgeUnit => unit?.kind === 'SUPPORTED_RELATION')
        .flatMap((unit) => unit.entityIds)
        .filter((id) => id !== entity.id)
        .map((id) => relatedById.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .filter(
          (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index,
        )
        .map(
          (item): EditorialLinkableEntity => ({
            id: item.id,
            slug: item.slug,
            canonicalName: item.title,
            type: item.type,
            aliases: item.aliases?.map((alias) => alias.value),
            reasonAllowed: [
              ...new Set(
                accepted
                  .filter((claim) =>
                    claim.provenanceRefs.some((ref) =>
                      unitById.get(ref)?.entityIds.includes(item.id),
                    ),
                  )
                  .flatMap((claim) => claim.provenanceRefs),
              ),
            ].join(','),
          }),
        );

      const realized = [] as MappedSentence[];
      for (const claim of accepted) {
        const result = await writer.runStructured(
          buildClaimLockedSentenceRequest({
            entity: canonicalEntity,
            claim,
            allowedLinkedEntities: linkableEntities,
            locale: 'es',
          }),
        );
        const output = result.output as { claimId: string; sentence: string };
        if (output.claimId !== claim.id || !output.sentence?.trim())
          throw new Error('Invalid per-claim realization');
        realized.push({
          id: `claim-${realized.length + 1}`,
          text: output.sentence.trim(),
          claimIds: [claim.id],
        });
      }
      const mappedOutput: MappedEditorialOutput = {
        definition: realized[0],
        summary: realized.slice(0, Math.min(3, realized.length)),
        sections: [{ heading: 'Contexto', sentences: realized.slice(1) }],
      };
      let sentences;
      try {
        sentences = validateMappedEditorialOutput(
          mappedOutput,
          accepted,
          canonicalEntity,
          linkableEntities,
          depth,
          entity.aliases?.map((alias) => alias.value),
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'Definition is too long') {
          try {
            const repaired = await writer.runStructured(
              buildDefinitionRepairRequest({
                entity: canonicalEntity,
                definition: mappedOutput.definition,
                claims: accepted.filter((claim) =>
                  mappedOutput.definition.claimIds.includes(claim.id),
                ),
                maxCharacters: 320,
              }),
            );
            mappedOutput.definition = validateSingleMappedSentence(
              repaired.output as MappedSentence,
              accepted,
              canonicalEntity,
              linkableEntities,
              entity.aliases?.map((alias) => alias.value),
            );
            sentences = validateMappedEditorialOutput(
              mappedOutput,
              accepted,
              canonicalEntity,
              linkableEntities,
              depth,
              entity.aliases?.map((alias) => alias.value),
            );
          } catch (repairError) {
            throw repairError;
          }
        } else {
          const failedArtifact = {
            entity: canonicalEntity,
            contextFingerprint: editorialContextFingerprint(entity.id, 'es', depth, units),
            availableKnowledgeUnits: units,
            proposedClaims: proposedPlan.claims,
            acceptedClaims: accepted,
            rejectedClaims: rejected,
            invalidPlanReferences: invalidReferences,
            mappedOutput,
            publicOutput: null,
            validationFailure: error instanceof Error ? error.message : String(error),
            model: writer.metadata(),
            promptVersion: {
              planner: 'claim-level-editorial-v1-planner',
              realizer: 'claim-level-editorial-v1-realizer',
              entailment: 'claim-level-editorial-v1-entailment',
            },
            depth,
            generatedAt: new Date().toISOString(),
          };
          writeFileSync(
            resolve(outputDir, `claim-level-editorial-v1-${slug}-rejected.json`),
            `${JSON.stringify(failedArtifact, null, 2)}\n`,
            { mode: 0o600 },
          );
          throw error;
        }
      }
      let entailmentResult = await validator.runStructured(
        buildSentenceEntailmentRequest(sentences, accepted),
      );
      let entailment = validateSentenceEntailment(
        sentences,
        entailmentResult.output as SentenceEntailmentAudit,
      );
      const repairs: Array<{ sentenceId: string; status: string; reason?: string }> = [];
      for (const rejectedSentence of entailment.rejected.filter(
        ({ result }) => result.verdict === 'UNCERTAIN',
      )) {
        const original = sentenceById(mappedOutput, rejectedSentence.sentence.id);
        if (!original) continue;
        try {
          const repairResult = await writer.runStructured(
            buildUncertainSentenceRepairRequest(
              original,
              original.claimIds
                .map((id) => accepted.find((claim) => claim.id === id)!)
                .filter(Boolean),
              rejectedSentence.result.reason,
            ),
          );
          const candidate = repairResult.output as MappedSentence;
          if (
            candidate.id !== original.id ||
            JSON.stringify([...candidate.claimIds].sort()) !==
              JSON.stringify([...original.claimIds].sort())
          )
            throw new Error('Repair changed sentence id or claim references');
          const repaired = validateSingleMappedSentence(
            candidate,
            accepted,
            canonicalEntity,
            linkableEntities,
            entity.aliases?.map((alias) => alias.value),
          );
          replaceSentence(mappedOutput, repaired);
          repairs.push({ sentenceId: original.id, status: 'REPAIRED' });
        } catch (error) {
          repairs.push({
            sentenceId: original.id,
            status: 'REPAIR_FAILED',
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (repairs.some((repair) => repair.status === 'REPAIRED')) {
        sentences = validateMappedEditorialOutput(
          mappedOutput,
          accepted,
          canonicalEntity,
          linkableEntities,
          depth,
          entity.aliases?.map((alias) => alias.value),
        );
        entailmentResult = await validator.runStructured(
          buildSentenceEntailmentRequest(sentences, accepted),
        );
        entailment = validateSentenceEntailment(
          sentences,
          entailmentResult.output as SentenceEntailmentAudit,
        );
      }
      const publicOutput = entailment.rejected.length
        ? null
        : publicOutputFromMapped(mappedOutput, linkableEntities);
      const artifact = {
        entity: canonicalEntity,
        contextFingerprint: editorialContextFingerprint(entity.id, 'es', depth, units),
        availableKnowledgeUnits: units,
        relationClassification: classifyRelations(entity),
        proposedClaims: proposedPlan.claims,
        acceptedClaims: accepted,
        rejectedClaims: rejected,
        invalidPlanReferences: invalidReferences,
        mappedOutput,
        publicOutput,
        sentenceToClaimMapping: sentences,
        entailment,
        repairs,
        parametricKnowledgeTest: {
          omittedFact:
            slug === 'guernica' ? 'bombing circumstances and location' : 'specific ritual examples',
          leaked:
            slug === 'guernica'
              ? /bombarde|guerra civil|pabell[oó]n|pa[ií]s vasco/i.test(
                  JSON.stringify(publicOutput),
                )
              : /religios|ceremon|liturg|bodas?|funeral/i.test(JSON.stringify(publicOutput)),
        },
        model: writer.metadata(),
        entailmentModel: validator.metadata(),
        promptVersion: {
          planner: 'claim-level-editorial-v1-planner',
          realizer: 'claim-level-editorial-v1-realizer',
          entailment: 'claim-level-editorial-v1-entailment',
        },
        depth,
        generatedAt: new Date().toISOString(),
      };
      const path = resolve(outputDir, `claim-level-editorial-v1-${slug}.json`);
      writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
      console.log(
        JSON.stringify({
          slug,
          depth,
          units: units.length,
          accepted: accepted.length,
          rejected: rejected.length,
          sentenceFailures: entailment.rejected.length,
          parametricLeak: artifact.parametricKnowledgeTest.leaked,
          artifact: path,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          slug,
          status: 'FAIL',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
