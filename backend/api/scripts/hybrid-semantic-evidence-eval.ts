import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from '../src/ai/ai.provider';
import {
  AIProviderSemanticEvidenceModel,
  HybridSemanticEvidenceClassifier,
  resolveSupportQuote,
  type ClassificationMode,
  type SemanticModelOutput,
} from '../src/research/hybrid-semantic-evidence-classifier';
import {
  type EvidenceDecision,
  type SemanticEvidenceInput,
  validateEvidenceProposition,
} from '../src/research/semantic-evidence-classifier';

const root = process.cwd().endsWith('/backend/api') ? `${process.cwd()}/../..` : process.cwd();
const read = (path: string) => JSON.parse(readFileSync(`${root}/${path}`, 'utf8'));
const decisions: EvidenceDecision[] = ['KEEP', 'REVIEW', 'REJECT'];

type Row = {
  key: string;
  pilot: string;
  source: string;
  sourcePurpose: string;
  entity?: string;
  text: string;
  gold: {
    decision: EvidenceDecision | null;
    role: string;
    proposition: string | null;
    dimension: string | null;
  };
};
type Prediction = {
  prediction: Awaited<ReturnType<HybridSemanticEvidenceClassifier['classify']>> | null;
  error?: string;
};
type Run = {
  input: SemanticEvidenceInput;
  output?: SemanticModelOutput;
  error?: string;
  durationMs: number;
  diagnostics: any[];
};

function corpus(): Row[] {
  const rows: Row[] = [];
  for (const [i, artifact] of [
    read('artifacts/controlled-source-ingestion-pilot-final.json'),
    read('artifacts/controlled-source-ingestion-pilot2.json'),
  ].entries())
    for (const result of artifact.results)
      for (const [index, excerpt] of (result.excerptCandidates ?? []).entries())
        rows.push({
          key: `${result.source.title}::${excerpt.text}`,
          pilot: i === 0 ? 'PILOT_1' : 'PILOT_2',
          source: result.source.title,
          sourcePurpose: result.purpose,
          entity: excerpt.primaryEntity,
          text: excerpt.text,
          gold: require('../src/research/semantic-evidence-gold').goldLabel(
            i === 0 ? 'PILOT_1' : 'PILOT_2',
            result.source.title,
            index,
            excerpt.text,
          ),
        });
  for (const file of [
    'artifacts/semantic-evidence-pilot3-gold-eval.json',
    'artifacts/semantic-evidence-pilot4-gold-eval.json',
  ])
    for (const row of read(file).rows)
      rows.push({
        key: `${row.source.title}::${row.excerpt.text}`,
        pilot: file.includes('pilot3') ? 'PILOT_3' : 'PILOT_4',
        source: row.source.title,
        sourcePurpose: row.sourcePurpose,
        entity: row.excerpt.primaryEntity,
        text: row.excerpt.text,
        gold: {
          ...row.gold,
          decision: decisions.includes(row.gold.decision) ? row.gold.decision : null,
          role:
            row.gold.role ?? (row.gold.decision === 'CONTEXT_FOR' ? 'CONTEXT_FOR' : 'UNRELATED'),
        },
      });
  return [...new Map(rows.map((row) => [row.key, row])).values()];
}

function input(row: Row): SemanticEvidenceInput {
  return {
    excerpt: row.text,
    sourcePurpose: row.sourcePurpose,
    source: { title: row.source },
    candidateEntity: {
      id: row.entity ?? row.source,
      canonicalName: row.entity ?? row.source,
      type: 'UNKNOWN',
    },
  };
}

const ratio = (numerator: number, denominator: number) =>
  denominator ? numerator / denominator : null;

function operationalDimension(value: string | null | undefined) {
  if (!value) return null;
  if (/^[A-Z_]+$/.test(value)) return value;
  if (/provenance|commission/i.test(value)) return 'PROVENANCE_OR_COMMISSION';
  if (/definition|identity/i.test(value)) return 'DEFINITION_OR_IDENTITY';
  if (/chronology/i.test(value)) return 'CHRONOLOGY';
  if (/place/i.test(value)) return 'PLACE';
  if (/influence|reception|legacy/i.test(value)) return 'RECEPTION_OR_LEGACY';
  if (/related|relation/i.test(value)) return 'RELATION';
  if (/interpretation/i.test(value)) return 'INTERPRETATION';
  if (/visual|characteristic|form|material/i.test(value)) return 'FORM_OR_MATERIAL';
  if (/practice|method/i.test(value)) return 'PRACTICE_OR_METHOD';
  return 'HISTORICAL_CONTEXT';
}

function score(rows: Row[], predictions: Prediction[]) {
  const paired = rows.map((row, index) => ({ row, ...predictions[index] }));
  const completed = paired.filter((item) => item.prediction);
  const decisionRows = paired.filter((item) => item.row.gold.decision !== null);
  const completedDecisionRows = decisionRows.filter((item) => item.prediction);
  const roleRows = paired.filter((item) => Boolean(item.row.gold.role));
  const keep = completedDecisionRows.filter((item) => item.prediction!.decision === 'KEEP');
  const review = completedDecisionRows.filter((item) => item.prediction!.decision === 'REVIEW');
  const reject = completedDecisionRows.filter((item) => item.prediction!.decision === 'REJECT');
  const goldKeep = decisionRows.filter((item) => item.row.gold.decision === 'KEEP');
  const trueKeep = keep.filter((item) => item.row.gold.decision === 'KEEP');
  const dimensionRows = decisionRows.filter((item) => item.row.gold.dimension !== null);
  return {
    denominators: {
      totalUnique: rows.length,
      decisionLabeled: decisionRows.length,
      roleLabeled: roleRows.length,
      completedDecision: completedDecisionRows.length,
      completedAll: completed.length,
    },
    completed: completed.length,
    failures: paired
      .filter((item) => item.error)
      .map((item) => ({ key: item.row.key, error: item.error })),
    keepPrecision: ratio(trueKeep.length, keep.length),
    keepRecall: ratio(trueKeep.length, goldKeep.length),
    reviewPrecision: ratio(
      review.filter((item) => item.row.gold.decision === 'REVIEW').length,
      review.length,
    ),
    rejectPrecision: ratio(
      reject.filter((item) => item.row.gold.decision === 'REJECT').length,
      reject.length,
    ),
    reviewRate: ratio(review.length, completedDecisionRows.length),
    rejectRate: ratio(reject.length, completedDecisionRows.length),
    falseKeep: keep.filter((item) => item.row.gold.decision !== 'KEEP').length,
    falseReject: completedDecisionRows.filter(
      (item) => item.prediction!.decision === 'REJECT' && item.row.gold.decision === 'KEEP',
    ).length,
    overallAgreement: ratio(
      completedDecisionRows.filter((item) => item.prediction!.decision === item.row.gold.decision)
        .length,
      decisionRows.length,
    ),
    propositionPresentLiteralRate: ratio(
      goldKeep.filter((item) => item.prediction?.propositionPresentLiteral).length,
      goldKeep.length,
    ),
    propositionEntailmentAccuracy: null,
    propositionEntailmentNote:
      'Manual audit required: literal equality is not entailment and is not scored automatically.',
    supportQuoteAccuracy: ratio(
      goldKeep.filter((item) =>
        ['VALID_EXACT', 'VALID_NORMALIZED'].includes(
          item.prediction?.supportQuoteStatus ?? 'MISSING',
        ),
      ).length,
      goldKeep.length,
    ),
    entityRoleAccuracy: ratio(
      roleRows.filter((item) => item.prediction?.relevanceRole === item.row.gold.role).length,
      roleRows.length,
    ),
    dimensionAccuracy: ratio(
      dimensionRows.filter(
        (item) =>
          operationalDimension(item.prediction?.evidenceProposition?.supportedDimension) ===
          operationalDimension(item.row.gold.dimension),
      ).length,
      dimensionRows.length,
    ),
    confusionMatrix: Object.fromEntries(
      decisions.map((prediction) => [
        prediction,
        Object.fromEntries(
          decisions.map((gold) => [
            gold,
            completedDecisionRows.filter(
              (item) => item.prediction!.decision === prediction && item.row.gold.decision === gold,
            ).length,
          ]),
        ),
      ]),
    ),
  };
}

async function main() {
  const rows = corpus();
  const provider = new AIProvider(new ConfigService());
  if (!provider.isAvailable()) throw new Error('AI_PROVIDER must name an available provider.');
  const runs = new Map<string, Run>();
  const model = new AIProviderSemanticEvidenceModel(provider);
  const semanticModel = {
    classify: async (value: SemanticEvidenceInput) => {
      const key = JSON.stringify(value),
        cached = runs.get(key);
      if (cached?.output) return cached.output;
      if (cached?.error) throw new Error(cached.error);
      const before = provider.getStructuredOutputDiagnostics().length,
        startedAt = Date.now();
      try {
        const output = await model.classify(value);
        runs.set(key, {
          input: value,
          output,
          durationMs: Date.now() - startedAt,
          diagnostics: [...provider.getStructuredOutputDiagnostics().slice(before)],
        });
        return output;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        runs.set(key, {
          input: value,
          error: message,
          durationMs: Date.now() - startedAt,
          diagnostics: [...provider.getStructuredOutputDiagnostics().slice(before)],
        });
        throw error;
      }
    },
  };
  const classifier = new HybridSemanticEvidenceClassifier(semanticModel);
  const modes: ClassificationMode[] = ['DETERMINISTIC_ONLY', 'SEMANTIC_ONLY', 'HYBRID'];
  const predictions = Object.fromEntries(modes.map((mode) => [mode, [] as Prediction[]])) as Record<
    ClassificationMode,
    Prediction[]
  >;
  const deterministicLatencyMs: number[] = [];
  for (const row of rows) {
    const value = input(row);
    for (const mode of modes) {
      const startedAt = Date.now();
      try {
        predictions[mode].push({ prediction: await classifier.classify(value, mode) });
      } catch (error) {
        predictions[mode].push({
          prediction: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      if (mode === 'DETERMINISTIC_ONLY') deterministicLatencyMs.push(Date.now() - startedAt);
    }
  }
  const rawRuns = [...runs.values()];
  const percentile = (values: number[], p: number) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
  };
  const errorCodes = rawRuns.reduce<Record<string, number>>((counts, run) => {
    if (!run.error) return counts;
    const code =
      run.error.match(
        /(MODEL_OUTPUT_TRUNCATED|INVALID_ENUM|INVALID_SUPPORT_QUOTE|AMBIGUOUS_SUPPORT_QUOTE|INVALID_PROPOSITION|MISSING_REQUIRED_FIELD|MODEL_OUTPUT_INVALID)/,
      )?.[1] ?? 'OTHER';
    counts[code] = (counts[code] ?? 0) + 1;
    return counts;
  }, {});
  const semanticLatencies = rawRuns.map((run) => run.durationMs);
  const totalSemanticMs = rawRuns.reduce((sum, run) => sum + run.durationMs, 0);
  const totalDeterministicMs = deterministicLatencyMs.reduce((sum, value) => sum + value, 0);
  const latestDiagnostic = (run: Run) => run.diagnostics.at(-1);
  const suppliedQuotes = rawRuns.filter((run) => run.output?.supportQuote);
  const quoteStatus = (run: Run) =>
    resolveSupportQuote(run.input.excerpt, run.output?.supportQuote ?? null).status;
  const suppliedPropositions = rawRuns.filter((run) => run.output?.evidenceProposition);
  const propositionValidation = (run: Run) => {
    const dimension = run.output?.supportedDimension;
    const statement = run.output?.evidenceProposition;
    if (!dimension || !statement) return null;
    const quote = resolveSupportQuote(run.input.excerpt, run.output?.supportQuote ?? null);
    return validateEvidenceProposition(
      {
        statement,
        supportedDimension: dimension,
        evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
      },
      run.input,
      quote.span?.text ?? run.output?.supportQuote ?? '',
      run.output?.relevanceRole,
    );
  };
  const hybridRows = rows.map((row, index) => ({
    row,
    prediction: predictions.HYBRID[index].prediction,
  }));
  const decisionHybridRows = hybridRows.filter((item) => item.row.gold.decision !== null);
  const goldKeepHybridRows = decisionHybridRows.filter((item) => item.row.gold.decision === 'KEEP');
  const finalHybridKeeps = decisionHybridRows.filter(
    (item) => item.prediction?.decision === 'KEEP',
  );
  const deterministicGoldKeeps = rows.filter(
    (row, index) =>
      row.gold.decision === 'KEEP' &&
      predictions.DETERMINISTIC_ONLY[index].prediction?.decision === 'KEEP',
  );
  const output = {
    configuration: {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      provider: provider.metadata(),
      semanticContract: 'semantic-evidence-v3',
      classifierSha256: createHash('sha256')
        .update(
          readFileSync(`${root}/backend/api/src/research/hybrid-semantic-evidence-classifier.ts`),
        )
        .digest('hex'),
      deterministicGatesSha256: createHash('sha256')
        .update(readFileSync(`${root}/backend/api/src/research/semantic-evidence-classifier.ts`))
        .digest('hex'),
      providerOptions: { temperature: 0.2, maxOutputTokens: 500, retries: 1 },
      modeOrder: modes,
      corpusHash: createHash('sha256')
        .update(JSON.stringify(rows.map((row) => [row.key, row.gold])))
        .digest('hex'),
      corpusTotal: rows.length,
      gold: Object.fromEntries(
        decisions.map((decision) => [
          decision,
          rows.filter((row) => row.gold.decision === decision).length,
        ]),
      ),
    },
    deterministic: score(rows, predictions.DETERMINISTIC_ONLY),
    semantic: score(rows, predictions.SEMANTIC_ONLY),
    hybrid: score(rows, predictions.HYBRID),
    composition: {
      baseDeterministicGoldKeep: deterministicGoldKeeps.length,
      preservedDeterministicGoldKeep: goldKeepHybridRows.filter(
        (item) =>
          item.prediction?.decision === 'KEEP' &&
          item.prediction.compositionSource === 'DETERMINISTIC_SAFE_KEEP',
      ).length,
      semanticRecoveredGoldKeep: goldKeepHybridRows.filter(
        (item) =>
          item.prediction?.decision === 'KEEP' &&
          item.prediction.compositionSource === 'SEMANTIC_RECOVERY',
      ).length,
      finalHybridGoldKeep: goldKeepHybridRows.filter((item) => item.prediction?.decision === 'KEEP')
        .length,
      deterministicSafeKeepRows: hybridRows.filter(
        (item) => item.prediction?.compositionSource === 'DETERMINISTIC_SAFE_KEEP',
      ).length,
      deterministicHardRejectRows: hybridRows.filter(
        (item) => item.prediction?.compositionSource === 'DETERMINISTIC_HARD_REJECT',
      ).length,
      semanticRecoveryRows: hybridRows.filter(
        (item) => item.prediction?.compositionSource === 'SEMANTIC_RECOVERY',
      ).length,
      modelReviewRows: hybridRows.filter((item) => item.prediction?.reviewKind === 'MODEL_REVIEW')
        .length,
      systemFailsafeReviewRows: hybridRows.filter(
        (item) => item.prediction?.reviewKind === 'SYSTEM_FAILSAFE_REVIEW',
      ).length,
      finalKeepValidation: {
        uncertaintyPreserved: ratio(
          finalHybridKeeps.filter((item) => item.prediction?.uncertaintyPreserved).length,
          finalHybridKeeps.length,
        ),
        entityCentered: ratio(
          finalHybridKeeps.filter((item) => item.prediction?.entityCentered).length,
          finalHybridKeeps.length,
        ),
        atomic: ratio(
          finalHybridKeeps.filter((item) => item.prediction?.atomic).length,
          finalHybridKeeps.length,
        ),
      },
    },
    semanticRuntime: {
      calls: rawRuns.length,
      latencyMs: { total: totalSemanticMs, mean: ratio(totalSemanticMs, rawRuns.length) },
      latencyPercentilesMs: {
        p50: percentile(semanticLatencies, 0.5),
        p95: percentile(semanticLatencies, 0.95),
      },
      deterministicLatencyMs: {
        total: totalDeterministicMs,
        mean: ratio(totalDeterministicMs, deterministicLatencyMs.length),
      },
      tokens: rawRuns.reduce(
        (sum, run) =>
          sum +
          run.diagnostics.reduce(
            (inner, diagnostic) =>
              inner +
              (diagnostic.responseMetadata?.evalCount ?? 0) +
              (diagnostic.responseMetadata?.promptEvalCount ?? 0),
            0,
          ),
        0,
      ),
      unsupportedAdditions: Object.fromEntries(
        ['NONE', 'MINOR', 'MAJOR', 'CRITICAL'].map((severity) => [
          severity,
          rawRuns.filter((run) => propositionValidation(run)?.unsupportedAddition === severity)
            .length,
        ]),
      ),
      failures: rawRuns.filter((run) => run.error).length,
      contractReliability: {
        modelCalls: rawRuns.length,
        validJsonRate: ratio(
          rawRuns.filter((run) => latestDiagnostic(run)?.strictJsonValid).length,
          rawRuns.length,
        ),
        validSchemaRate: ratio(
          rawRuns.filter(
            (run) =>
              latestDiagnostic(run)?.strictJsonValid &&
              latestDiagnostic(run)?.schemaValidationErrors.length === 0 &&
              Boolean(run.output),
          ).length,
          rawRuns.length,
        ),
        validSupportQuoteRate: ratio(
          suppliedQuotes.filter((run) =>
            ['VALID_EXACT', 'VALID_NORMALIZED'].includes(quoteStatus(run)),
          ).length,
          suppliedQuotes.length,
        ),
        validSupportQuoteDenominator: suppliedQuotes.length,
        ambiguousQuoteRate: ratio(
          suppliedQuotes.filter((run) => quoteStatus(run) === 'AMBIGUOUS').length,
          suppliedQuotes.length,
        ),
        truncationRate: ratio(
          rawRuns.filter((run) => latestDiagnostic(run)?.appearsAbruptlyTerminated).length,
          rawRuns.length,
        ),
        invalidPropositionRate: ratio(
          suppliedPropositions.filter((run) => propositionValidation(run)?.valid === false).length,
          suppliedPropositions.length,
        ),
        invalidPropositionDenominator: suppliedPropositions.length,
        errorsByCode: errorCodes,
      },
    },
    rows: rows.map((row, index) => ({
      ...row,
      semanticModelOutput: runs.get(JSON.stringify(input(row)))?.output ?? null,
      predictions: Object.fromEntries(modes.map((mode) => [mode, predictions[mode][index]])),
    })),
  };
  writeFileSync(
    `${root}/artifacts/hybrid-semantic-evidence-eval.json`,
    JSON.stringify(output, null, 2),
  );
  console.log(JSON.stringify(output, null, 2));
}

void main();
