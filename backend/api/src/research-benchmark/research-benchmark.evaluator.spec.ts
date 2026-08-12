import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KnowledgeEntityKind } from '@prisma/client';
import {
  evaluateEntityProposals,
  type GoldEntity,
  type NegativeEntityCandidate,
  isOwnedBenchmarkRun,
  validateGoldDataset,
} from './research-benchmark.evaluator';

const fixtureRoot = resolve(process.cwd(), 'test/fixtures/research-benchmark');

describe('Research benchmark evaluator', () => {
  it('only authorizes cleanup for the exact benchmark owner and run', () => {
    expect(
      isOwnedBenchmarkRun(
        '[BENCHMARK] baseline-01',
        'research-benchmark+baseline-01@jano.invalid',
        'baseline-01',
      ),
    ).toBe(true);
    expect(isOwnedBenchmarkRun('Normal research', 'owner@jano.test', 'baseline-01')).toBe(false);
    expect(
      isOwnedBenchmarkRun(
        '[BENCHMARK] baseline-01',
        'research-benchmark+another-run@jano.invalid',
        'baseline-01',
      ),
    ).toBe(false);
  });

  it('loads a valid GOLD with unique IDs, real anchors and canonical kinds', () => {
    const metadata = JSON.parse(
      readFileSync(resolve(fixtureRoot, 'gold/document-metadata.json'), 'utf8'),
    ) as { documents: Array<{ id: string; file: string }> };
    const gold = JSON.parse(readFileSync(resolve(fixtureRoot, 'gold/entities.json'), 'utf8')) as {
      entities: GoldEntity[];
    };
    const documents = metadata.documents.map((document) => ({
      id: document.id,
      content: readFileSync(resolve(fixtureRoot, 'documents', document.file), 'utf8'),
    }));

    expect(
      validateGoldDataset(documents, gold.entities, Object.values(KnowledgeEntityKind)),
    ).toEqual([]);
    expect(new Set(gold.entities.map((entity) => entity.goldId)).size).toBe(gold.entities.length);
  });

  it('calculates raw precision, identity recall and duplicates separately', () => {
    const gold: GoldEntity[] = [
      {
        documentId: 'doc',
        goldId: 'person-elena',
        canonicalName: 'Elena Varo',
        kind: 'PERSON',
        aliases: ['E. Varo'],
        relevance: 'CENTRAL',
        shouldExtract: true,
        sourceSpans: ['Elena Varo trabaja'],
        expectedFacts: ['trabaja con fotografía intervenida'],
        forbiddenFacts: ['nació en'],
        notes: '',
      },
      {
        documentId: 'doc',
        goldId: 'work-jardin',
        canonicalName: 'El jardín inverso',
        kind: 'WORK',
        aliases: [],
        relevance: 'RELEVANT',
        shouldExtract: true,
        sourceSpans: ['El jardín inverso reúne'],
        expectedFacts: ['reúne fotografías'],
        forbiddenFacts: [],
        notes: '',
      },
    ];
    const evidence = [
      {
        id: 'e1',
        quote: 'Elena Varo trabaja con fotografía intervenida.',
        locator: '1',
        documentId: 'doc',
      },
    ];
    const result = evaluateEntityProposals(
      [
        {
          id: 'p1',
          aiExecutionId: 'a1',
          title: 'Elena Varo',
          entityKind: 'PERSON',
          summary: 'Trabaja con fotografía intervenida.',
          documentIds: ['doc'],
          evidence,
        },
        {
          id: 'p2',
          aiExecutionId: 'a2',
          title: 'E. Varo',
          entityKind: 'PERSON',
          summary: 'Elena Varo trabaja con fotografía.',
          documentIds: ['doc'],
          evidence,
        },
        {
          id: 'p3',
          aiExecutionId: 'a2',
          title: 'Resultados finales',
          entityKind: 'ABSTRACTION',
          summary: null,
          documentIds: ['doc'],
          evidence,
        },
      ],
      gold,
      [
        { documentId: 'doc', text: 'Resultados finales', category: 'HEADING' },
      ] satisfies NegativeEntityCandidate[],
      [
        {
          id: 'doc',
          content:
            'Elena Varo trabaja con fotografía intervenida. El jardín inverso reúne fotografías.',
        },
      ],
    );

    expect(result.metrics.rawEntityProposals).toBe(3);
    expect(result.metrics.detectedGoldIdentities).toBe(1);
    expect(result.metrics.duplicateProposals).toBe(1);
    expect(result.metrics.precision).toBeCloseTo(2 / 3);
    expect(result.metrics.recall).toBe(0.5);
    expect(result.metrics.recallByRelevance.CENTRAL.recall).toBe(1);
    expect(result.evaluations[2].negativeCategory).toBe('HEADING');
  });
});
