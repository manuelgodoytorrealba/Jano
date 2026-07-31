import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi } from '../../../core/api/research.api';
import { ResearchGraphComponent } from './research-graph.component';

const entity = (id: string, title: string) => ({
  id,
  projectId: 'research-1',
  kind: 'PERSON',
  title,
  summary: null,
  confidence: null,
  mentionCount: 1,
  reviewState: 'REVIEWED',
  createdAt: '2026-07-31T08:00:00.000Z',
  updatedAt: '2026-07-31T08:00:00.000Z',
});

const relation = {
  id: 'relation-1',
  projectId: 'research-1',
  fromEntityId: 'entity-1',
  toEntityId: 'entity-2',
  fromEntity: { id: 'entity-1', title: 'Goya', kind: 'PERSON' },
  toEntity: { id: 'entity-2', title: 'La guerra', kind: 'PERSON' },
  relationTypeId: 'INFLUENCES',
  explanation: 'Lectura privada.',
  claims: [
    {
      relationId: 'relation-1',
      claimId: 'claim-1',
      claim: {
        id: 'claim-1',
        title: 'Tensión de atribución',
        kind: 'CONTRADICTION',
        status: 'CONTRADICTED',
      },
    },
  ],
  confidence: null,
  reviewState: 'REVIEWED',
  createdAt: '2026-07-31T08:00:00.000Z',
  updatedAt: '2026-07-31T08:00:00.000Z',
};

const knowledge = (scope: 'topology' | 'focus' | 'traceability') => ({
  projectId: 'research-1',
  scope,
  focus: scope === 'topology' ? null : { type: 'relation' as const, id: 'relation-1' },
  expansions: {
    claims: scope === 'topology' ? ('SUMMARY' as const) : ('LOADED' as const),
    evidence: scope === 'traceability' ? ('LOADED' as const) : ('NOT_LOADED' as const),
    traceability: scope === 'traceability' ? ('LOADED' as const) : ('NOT_LOADED' as const),
  },
  entities: [entity('entity-1', 'Goya'), entity('entity-2', 'La guerra')],
  relations: [relation],
  claims:
    scope === 'topology'
      ? []
      : [
          {
            id: 'claim-1',
            projectId: 'research-1',
            kind: 'CONTRADICTION',
            title: 'Tensión de atribución',
            summary: 'Dos Claims coexisten.',
            subjectClaimId: null,
            objectClaimId: null,
            status: 'CONTRADICTED',
            createdAt: '2026-07-31T08:00:00.000Z',
            updatedAt: '2026-07-31T08:00:00.000Z',
            evidence:
              scope === 'traceability'
                ? [
                    {
                      claimId: 'claim-1',
                      evidenceId: 'evidence-1',
                      evidence: {
                        id: 'evidence-1',
                        projectId: 'research-1',
                        sourceId: 'source-1',
                        sourceVersion: 'v1',
                        locator: 'p. 42',
                        libraryExcerptId: null,
                        excerptStatus: 'UNAVAILABLE',
                        source: {
                          id: 'source-1',
                          type: 'BOOK',
                          title: 'Catálogo',
                          author: null,
                          publisher: null,
                          year: 2008,
                          url: null,
                        },
                        libraryExcerpt: null,
                        quote: 'Fragmento bibliográfico.',
                        context: null,
                        note: null,
                        fingerprint: 'fingerprint',
                        createdAt: '2026-07-31T08:00:00.000Z',
                        updatedAt: '2026-07-31T08:00:00.000Z',
                      },
                    },
                  ]
                : [],
            subject: null,
            object: null,
          },
        ],
  contradictions: [],
  supportingEvidence:
    scope === 'traceability'
      ? [
          {
            id: 'evidence-1',
            projectId: 'research-1',
            sourceId: 'source-1',
            sourceVersion: 'v1',
            locator: 'p. 42',
            libraryExcerptId: null,
            excerptStatus: 'UNAVAILABLE',
            source: {
              id: 'source-1',
              type: 'BOOK',
              title: 'Catálogo',
              author: null,
              publisher: null,
              year: 2008,
              url: null,
            },
            libraryExcerpt: null,
            quote: 'Fragmento bibliográfico.',
            context: null,
            note: null,
            fingerprint: 'fingerprint',
            createdAt: '2026-07-31T08:00:00.000Z',
            updatedAt: '2026-07-31T08:00:00.000Z',
          },
        ]
      : [],
});

async function createFixture() {
  const api = {
    getKnowledge: vi.fn(
      (_projectId: string, request: { scope?: 'topology' | 'focus' | 'traceability' }) =>
        of(knowledge(request.scope ?? 'topology')),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [ResearchGraphComponent],
    providers: [{ provide: ResearchApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchGraphComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, api };
}

describe('ResearchGraphComponent', () => {
  it('opens with topology and renders only private Entity nodes and Relation edges', async () => {
    const { fixture, api } = await createFixture();

    expect(api.getKnowledge).toHaveBeenCalledWith('research-1', { scope: 'topology' });
    expect(fixture.nativeElement.querySelectorAll('.research-graph__node')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.research-graph__edge')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.research-graph__edge.has-tension')).toBeTruthy();
    expect(api.getKnowledge.mock.calls.map(([, request]) => request.scope)).toEqual(['topology']);
  });

  it('loads focus for an Entity and traceability for a Relation', async () => {
    const { fixture, component, api } = await createFixture();

    component.selectEntity('entity-1');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.getKnowledge).toHaveBeenLastCalledWith('research-1', {
      scope: 'focus',
      focusType: 'entity',
      focusId: 'entity-1',
    });

    component.selectRelation('relation-1');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.getKnowledge).toHaveBeenLastCalledWith('research-1', {
      scope: 'traceability',
      focusType: 'relation',
      focusId: 'relation-1',
    });
    expect(fixture.nativeElement.textContent).toContain('Claims asociados');
    expect(fixture.nativeElement.textContent).toContain('Tensión');
  });

  it('opens Claim and Evidence inspection from traceability without external graph dependencies', async () => {
    const { fixture, component } = await createFixture();

    component.selectRelation('relation-1');
    fixture.detectChanges();
    await fixture.whenStable();
    component.selectClaim('claim-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dos Claims coexisten.');

    component.selectEvidence('evidence-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fragmento no disponible.');
    expect(fixture.nativeElement.textContent).toContain('Catálogo');
  });
});
