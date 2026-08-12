import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ResearchApi, ResearchProposal } from '../../../core/api/research.api';
import { ResearchEntitiesWorkspaceComponent } from './research-entities-workspace.component';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

const evidence = {
  id: 'evidence-1',
  projectId: 'research-1',
  sourceId: 'source-1',
  sourceVersion: 'v1',
  locator: 'p. 38',
  libraryExcerptId: null,
  excerptStatus: 'UNAVAILABLE',
  source: {
    id: 'source-1',
    type: 'BOOK',
    title: 'El arte como experiencia',
    author: 'John Dewey',
    publisher: null,
    year: 2008,
    url: null,
  },
  libraryExcerpt: null,
  quote: 'La experiencia estética transforma nuestra lectura.',
  context: 'Fundamento',
  note: null,
  fingerprint: 'one',
  createdAt: '',
  updatedAt: '',
} as const;

function proposal(data: Partial<ResearchProposal>): ResearchProposal {
  return {
    id: 'entity-proposal',
    projectId: 'research-1',
    jobId: 'job-1',
    type: 'ENTITY',
    proposalKey: 'entity-a',
    title: 'Experiencia estética',
    summary: 'Una propuesta editorial.',
    entityKind: 'ABSTRACTION',
    relationFromKey: null,
    relationToKey: null,
    relationTypeId: null,
    explanation: null,
    reviewState: 'PENDING',
    createdAt: '',
    evidence: [{ evidenceId: evidence.id, evidence }],
    ...data,
  };
}

async function setup(queryParams?: Record<string, string>) {
  const proposals = [
    proposal({}),
    proposal({
      id: 'relation-proposal',
      type: 'RELATION',
      proposalKey: 'relation-a',
      title: 'Fundamenta',
      entityKind: null,
      relationFromKey: 'entity-a',
      relationToKey: 'entity-b',
      relationType: { id: 'type-1', key: 'RELATED_TO', label: 'Fundamenta' },
    }),
    proposal({ id: 'entity-b', proposalKey: 'entity-b', title: 'Educación artística' }),
    proposal({ id: 'claim-proposal', type: 'CLAIM', proposalKey: 'claim-a', title: 'Un claim' }),
  ];
  const api = {
    listProposals: vi.fn(() =>
      of({ items: proposals, page: 1, limit: 100, total: proposals.length, totalPages: 1 }),
    ),
    getKnowledge: vi.fn(() =>
      of({
        projectId: 'research-1',
        scope: 'topology',
        focus: null,
        expansions: { claims: 'SUMMARY', evidence: 'NOT_LOADED', traceability: 'NOT_LOADED' },
        entities: [],
        relations: [],
        claims: [],
        contradictions: [],
        supportingEvidence: [],
      }),
    ),
    getKnowledgeMapGeneration: vi.fn(() =>
      of({ job: null, stale: false, canGenerate: true, preparedMaterials: 1 }),
    ),
    updateProposal: vi.fn(() => of({})),
    acceptProposal: vi.fn(() => of({})),
    reviewProposal: vi.fn(() => of({})),
    mergeEntityProposal: vi.fn(() => of({})),
    generateKnowledgeMap: vi.fn(() => of({})),
    createEntity: vi.fn(() =>
      of({
        entities: [
          {
            id: 'manual-entity',
            projectId: 'research-1',
            canonicalEntityId: 'canonical-manual-entity',
            kind: 'ABSTRACTION',
            title: 'Romanticismo oscuro',
            summary: null,
            confidence: null,
            mentionCount: 0,
            reviewState: 'REVIEWED',
            createdAt: '',
            updatedAt: '',
          },
        ],
        knowledge: { entities: [] },
      }),
    ),
    promoteEntity: vi.fn(() => of({})),
  };
  await TestBed.configureTestingModule({
    imports: [ResearchEntitiesWorkspaceComponent],
    providers: [provideRouter([]), { provide: ResearchApi, useValue: api }],
  }).compileComponents();
  if (queryParams) await TestBed.inject(Router).navigate([], { queryParams });
  const fixture = TestBed.createComponent(ResearchEntitiesWorkspaceComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, api, proposals };
}

describe('ResearchEntitiesWorkspaceComponent', () => {
  it('separates Revisión from Mapa and lists Entity candidates instead of Claims', async () => {
    const { fixture } = await setup();
    expect(
      fixture.nativeElement.querySelectorAll('.entities-workspace__modes button'),
    ).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.candidate-card')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).not.toContain('Un claim');
    expect(fixture.nativeElement.querySelector('app-research-graph')).toBeNull();
  });

  it('opens an editorial dossier with provenance and suggested relations', async () => {
    const { fixture } = await setup();
    fixture.nativeElement.querySelector('.candidate-card').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Propuesta de JANO');
    expect(fixture.nativeElement.textContent).toContain('El arte como experiencia');
    expect(fixture.nativeElement.textContent).toContain('p. 38');
    expect(fixture.nativeElement.textContent).toContain('Relaciones sugeridas');
    expect(fixture.nativeElement.textContent).toContain('Educación artística');
  });

  it('creates private knowledge through the explicit proposal action', async () => {
    const { fixture, proposals, api } = await setup();
    fixture.componentInstance.selectProposal(proposals[0]);
    fixture.componentInstance.createPrivateEntity();
    expect(api.acceptProposal).toHaveBeenCalledWith('research-1', 'entity-proposal');
  });

  it('creates a manual private entity with Research evidence and selects it on the map', async () => {
    const { fixture, api } = await setup();
    fixture.componentInstance.manualTitle = '  Romanticismo oscuro  ';
    fixture.componentInstance.manualSummary = 'Una lectura editorial del concepto.';
    fixture.componentInstance.manualEvidenceIds = ['evidence-1'];
    fixture.componentInstance.createManualEntity([]);

    expect(api.createEntity).toHaveBeenCalledWith('research-1', {
      canonicalType: 'ARTWORK',
      title: 'Romanticismo oscuro',
      summary: 'Una lectura editorial del concepto.',
      evidenceIds: ['evidence-1'],
    });
    expect(fixture.componentInstance.mode).toBe('map');
    expect(fixture.componentInstance.selectedMapEntityId).toBe('manual-entity');
  });

  it('opens only the canonical entity and preserves the Research map return context', async () => {
    const { fixture } = await setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    const privateEntity = {
      id: 'research-entity',
      projectId: 'research-1',
      canonicalEntityId: 'canonical-entity',
      kind: 'WORK',
      title: 'Pinturas negras',
      summary: null,
      confidence: null,
      mentionCount: 1,
      reviewState: 'REVIEWED' as const,
      createdAt: '',
      updatedAt: '',
    };

    fixture.componentInstance.openEntity(privateEntity.id, [privateEntity]);
    expect(navigate).toHaveBeenCalledWith(['/admin/entities', 'canonical-entity'], {
      queryParams: {
        returnTo:
          '/admin/research/research-1?mode=entities&entitiesView=map&selectedResearchEntityId=research-entity',
      },
    });

    navigate.mockClear();
    fixture.componentInstance.openEntity('missing', [privateEntity]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('restores the map and selected private entity from the return context', async () => {
    const { fixture } = await setup({
      mode: 'entities',
      entitiesView: 'map',
      selectedResearchEntityId: 'research-entity',
    });

    expect(fixture.componentInstance.mode).toBe('map');
    expect(fixture.componentInstance.selectedMapEntityId).toBe('research-entity');
    expect(fixture.nativeElement.querySelector('app-research-graph')).toBeTruthy();
  });

  it('promotes private knowledge only through the explicit Knowledge Core action', async () => {
    const { fixture, api } = await setup();

    fixture.componentInstance.promoteEntity({
      entityId: 'research-entity',
      canonicalType: 'CONCEPT',
    });

    expect(api.promoteEntity).toHaveBeenCalledWith('research-1', 'research-entity', 'CONCEPT');
  });
});
