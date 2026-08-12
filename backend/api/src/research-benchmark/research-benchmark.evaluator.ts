export type GoldRelevance = 'CENTRAL' | 'RELEVANT' | 'SECONDARY';
export type GoldEntity = {
  documentId: string;
  goldId: string;
  canonicalName: string;
  kind: string;
  aliases: string[];
  possibleAliases?: string[];
  relevance: GoldRelevance;
  shouldExtract: boolean;
  sourceSpans: string[];
  expectedFacts: string[];
  forbiddenFacts: string[];
  notes: string;
  relatedGoldEntities?: string[];
};
export type NegativeEntityCandidate = {
  documentId: string;
  text: string;
  category: string;
};
export type EntityProposal = {
  id: string;
  aiExecutionId: string;
  title: string;
  entityKind: string | null;
  summary: string | null;
  documentIds: string[];
  evidence: Array<{ id: string; quote: string | null; locator: string; documentId: string }>;
};

type NamingClass =
  | 'EXACT_CANONICAL'
  | 'KNOWN_ALIAS'
  | 'POSSIBLE_ALIAS_REVIEW'
  | 'POOR_NAME'
  | 'FALSE_ENTITY';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokens = (value: string) =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));

const STOP_WORDS = new Set([
  'para',
  'como',
  'esta',
  'este',
  'estos',
  'estas',
  'desde',
  'entre',
  'sobre',
  'solo',
  'tambien',
  'donde',
  'cuando',
  'cada',
  'porque',
  'puede',
  'permite',
  'mediante',
  'debe',
  'hace',
  'tiene',
]);

export function isOwnedBenchmarkRun(projectTitle: string, ownerEmail: string, runId: string) {
  return (
    projectTitle.startsWith('[BENCHMARK]') &&
    ownerEmail === `research-benchmark+${runId}@jano.invalid`
  );
}

const overlap = (needle: string, haystack: string) => {
  const expected = tokens(needle);
  if (!expected.length) return 0;
  const available = new Set(tokens(haystack));
  return expected.filter((token) => available.has(token)).length / expected.length;
};

export function validateGoldDataset(
  documents: Array<{ id: string; content: string }>,
  entities: GoldEntity[],
  validKinds: string[],
) {
  const errors: string[] = [];
  const documentMap = new Map(
    documents.map((document) => [document.id, normalize(document.content)]),
  );
  const goldIds = new Set<string>();
  for (const entity of entities) {
    if (goldIds.has(entity.goldId)) errors.push(`Duplicate goldId: ${entity.goldId}`);
    goldIds.add(entity.goldId);
    if (!validKinds.includes(entity.kind))
      errors.push(`Invalid kind ${entity.kind}: ${entity.goldId}`);
    const content = documentMap.get(entity.documentId);
    if (!content) {
      errors.push(`Unknown document ${entity.documentId}: ${entity.goldId}`);
      continue;
    }
    for (const anchor of entity.sourceSpans) {
      if (!content.includes(normalize(anchor)))
        errors.push(`Missing anchor for ${entity.goldId}: ${anchor}`);
    }
    const names = [entity.canonicalName, ...entity.aliases].map(normalize);
    if (new Set(names).size !== names.length) errors.push(`Duplicate alias for ${entity.goldId}`);
  }
  return errors;
}

export function evaluateEntityProposals(
  proposals: EntityProposal[],
  gold: GoldEntity[],
  negatives: NegativeEntityCandidate[],
  documents: Array<{ id: string; content: string }>,
) {
  const eligibleGold = gold.filter((entity) => entity.shouldExtract);
  const evaluations = proposals.map((proposal) => {
    const title = normalize(proposal.title);
    const candidates = gold.filter((entity) => proposal.documentIds.includes(entity.documentId));
    const canonical = candidates.find((entity) => normalize(entity.canonicalName) === title);
    const alias = candidates.find((entity) =>
      entity.aliases.some((value) => normalize(value) === title),
    );
    const possible = candidates.find((entity) =>
      entity.possibleAliases?.some((value) => normalize(value) === title),
    );
    const matchedGold = canonical ?? alias ?? possible ?? null;
    const negative = negatives.find(
      (item) => proposal.documentIds.includes(item.documentId) && normalize(item.text) === title,
    );
    const naming: NamingClass = canonical
      ? 'EXACT_CANONICAL'
      : alias
        ? 'KNOWN_ALIAS'
        : possible
          ? 'POSSIBLE_ALIAS_REVIEW'
          : negative
            ? 'FALSE_ENTITY'
            : 'POOR_NAME';
    const evidenceText = proposal.evidence.map((item) => item.quote ?? '').join('\n');
    const documentText = matchedGold
      ? (documents.find((item) => item.id === matchedGold.documentId)?.content ?? '')
      : '';
    const summary = proposal.summary ?? '';
    const reflectedFacts = matchedGold
      ? matchedGold.expectedFacts.filter((fact) => overlap(fact, summary) >= 0.5)
      : [];
    const evidenceAvailableFacts = matchedGold
      ? matchedGold.expectedFacts.filter((fact) => overlap(fact, evidenceText) >= 0.5)
      : [];
    const corpusAvailableFacts = matchedGold
      ? matchedGold.expectedFacts.filter((fact) => overlap(fact, documentText) >= 0.5)
      : [];
    const forbiddenHits = matchedGold
      ? matchedGold.forbiddenFacts.filter((fact) => normalize(summary).includes(normalize(fact)))
      : [];
    const evidenceLexicalSupport = summary ? overlap(summary, evidenceText) : 0;
    const grounding = matchedGold
      ? forbiddenHits.length
        ? 1
        : Math.round(Math.min(5, 2 + evidenceLexicalSupport * 3))
      : 0;
    const coverage = matchedGold?.expectedFacts.length
      ? Math.round((reflectedFacts.length / matchedGold.expectedFacts.length) * 5)
      : 0;
    const specificity = matchedGold
      ? Math.round(Math.min(5, 2 + overlap(summary, matchedGold.expectedFacts.join(' ')) * 3))
      : 0;
    const editorialUsefulness = matchedGold
      ? Math.round((grounding + coverage + specificity) / 3)
      : 0;
    const overallDraftScore = matchedGold
      ? Math.round((grounding + coverage + specificity + editorialUsefulness) / 4)
      : 0;
    const supportedAnchors = matchedGold
      ? matchedGold.sourceSpans.filter((anchor) => overlap(anchor, evidenceText) >= 0.55).length
      : 0;
    const contextStatus = !matchedGold
      ? null
      : supportedAnchors === matchedGold.sourceSpans.length
        ? 'CONTEXT_COMPLETE'
        : supportedAnchors > 0
          ? 'CONTEXT_PARTIAL'
          : 'CONTEXT_SEVERELY_FRAGMENTED';
    return {
      proposalId: proposal.id,
      title: proposal.title,
      documentIds: proposal.documentIds,
      goldId: matchedGold?.goldId ?? null,
      naming,
      negativeCategory: negative?.category ?? null,
      kind: proposal.entityKind,
      goldKind: matchedGold?.kind ?? null,
      kindCorrect: matchedGold ? proposal.entityKind === matchedGold.kind : null,
      duplicate: false,
      summary: proposal.summary,
      summaryEvaluation: {
        automatedHeuristic: true,
        grounding,
        coverage,
        specificity,
        editorialUsefulness,
        overallDraftScore,
        reflectedFacts,
        missingFromLocalSummary: evidenceAvailableFacts.filter(
          (fact) => !reflectedFacts.includes(fact),
        ),
        missingFromFullIdentityContext: corpusAvailableFacts.filter(
          (fact) => !reflectedFacts.includes(fact),
        ),
        forbiddenHits,
        evidenceLexicalSupport: Number(evidenceLexicalSupport.toFixed(3)),
        contextStatus,
        manualReviewRequired: true,
      },
    };
  });

  const byGold = new Map<string, typeof evaluations>();
  for (const evaluation of evaluations) {
    if (!evaluation.goldId) continue;
    const group = byGold.get(evaluation.goldId) ?? [];
    group.push(evaluation);
    byGold.set(evaluation.goldId, group);
  }
  for (const group of byGold.values()) group.slice(1).forEach((item) => (item.duplicate = true));

  const detectedGoldIds = new Set(byGold.keys());
  const definitive = evaluations.filter((item) => item.naming !== 'POSSIBLE_ALIAS_REVIEW');
  const truePositives = definitive.filter((item) => item.goldId !== null).length;
  const precision = definitive.length ? truePositives / definitive.length : null;
  const recall = eligibleGold.length
    ? eligibleGold.filter((entity) => detectedGoldIds.has(entity.goldId)).length /
      eligibleGold.length
    : null;
  const f1 =
    precision !== null && recall !== null && precision + recall
      ? (2 * precision * recall) / (precision + recall)
      : null;
  const recallByRelevance = Object.fromEntries(
    (['CENTRAL', 'RELEVANT', 'SECONDARY'] as const).map((relevance) => {
      const expected = eligibleGold.filter((entity) => entity.relevance === relevance);
      const detected = expected.filter((entity) => detectedGoldIds.has(entity.goldId));
      return [
        relevance,
        {
          detected: detected.length,
          expected: expected.length,
          recall: expected.length ? detected.length / expected.length : null,
        },
      ];
    }),
  );
  const matched = evaluations.filter((item) => item.goldId !== null);
  const kindCorrect = matched.filter((item) => item.kindCorrect).length;
  const confusion = matched.reduce<Record<string, number>>((matrix, item) => {
    const key = `${item.goldKind}->${item.kind}`;
    matrix[key] = (matrix[key] ?? 0) + 1;
    return matrix;
  }, {});
  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  return {
    evaluations,
    metrics: {
      rawEntityProposals: proposals.length,
      definitiveProposals: definitive.length,
      ambiguousForManualReview: evaluations.length - definitive.length,
      matchedRawProposals: evaluations.filter((item) => item.goldId !== null).length,
      detectedGoldIdentities: detectedGoldIds.size,
      expectedGoldIdentities: eligibleGold.length,
      falseEntities: evaluations.filter((item) => item.goldId === null).length,
      duplicateProposals: evaluations.filter((item) => item.duplicate).length,
      duplicateRatio: proposals.length
        ? evaluations.filter((item) => item.duplicate).length / proposals.length
        : 0,
      precision,
      recall,
      f1,
      recallByRelevance,
      kindAccuracy: matched.length ? kindCorrect / matched.length : null,
      kindConfusion: confusion,
      naming: evaluations.reduce<Record<string, number>>((counts, item) => {
        counts[item.naming] = (counts[item.naming] ?? 0) + 1;
        return counts;
      }, {}),
      summary: {
        groundingAverage: average(matched.map((item) => item.summaryEvaluation.grounding)),
        coverageAverage: average(matched.map((item) => item.summaryEvaluation.coverage)),
        specificityAverage: average(matched.map((item) => item.summaryEvaluation.specificity)),
        editorialUsefulnessAverage: average(
          matched.map((item) => item.summaryEvaluation.editorialUsefulness),
        ),
        overallDraftAverage: average(
          matched.map((item) => item.summaryEvaluation.overallDraftScore),
        ),
        draftAtLeastFour: matched.filter((item) => item.summaryEvaluation.overallDraftScore >= 4)
          .length,
        draftAtMostTwo: matched.filter((item) => item.summaryEvaluation.overallDraftScore <= 2)
          .length,
        forbiddenFactHits: matched.reduce(
          (count, item) => count + item.summaryEvaluation.forbiddenHits.length,
          0,
        ),
      },
    },
  };
}
