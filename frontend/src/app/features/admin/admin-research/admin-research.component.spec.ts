import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, filter, firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi } from '../../../core/api/research.api';
import { AdminResearchComponent } from './admin-research.component';

describe('AdminResearchComponent', () => {
  it('lists, opens and creates research projects', async () => {
    const queryParams$ = new BehaviorSubject(convertToParamMap({ project: 'research-1' }));
    const projectSummary = {
      id: 'research-1',
      title: 'Goya y guerra',
      objective: 'Reunir fuentes',
      scope: 'Prado',
      status: 'ACTIVE',
      lastActiveAt: '2026-07-07T08:00:00.000Z',
      createdAt: '2026-07-06T08:00:00.000Z',
      updatedAt: '2026-07-07T08:00:00.000Z',
      _count: { sources: 2, evidence: 3, findings: 1 },
    };
    const api = {
      list: vi.fn().mockReturnValue(of([projectSummary])),
      getById: vi.fn().mockReturnValue(
        of({
          ...projectSummary,
          sources: [
            {
              projectId: 'research-1',
              sourceId: 'source-1',
              note: 'Corpus inicial',
              createdAt: '2026-07-07T08:00:00.000Z',
              source: {
                id: 'source-1',
                type: 'BOOK',
                title: 'Los desastres de la guerra',
                author: 'Museo del Prado',
                publisher: null,
                year: 2008,
                url: null,
                createdAt: '2026-07-07T08:00:00.000Z',
              },
            },
            {
              projectId: 'research-1',
              sourceId: 'source-2',
              note: null,
              createdAt: '2026-07-07T08:00:00.000Z',
              source: {
                id: 'source-2',
                type: 'CATALOG',
                title: 'Catálogo razonado',
                author: null,
                publisher: 'JANO Archivo',
                year: 2018,
                url: null,
                createdAt: '2026-07-07T08:00:00.000Z',
              },
            },
          ],
          evidence: [
            {
              id: 'evidence-1',
              projectId: 'research-1',
              sourceId: 'source-1',
              sourceVersion: 'v1',
              locator: 'p. 42',
              quote: 'Fragmento',
              context: null,
              note: null,
              fingerprint: 'hash',
              createdAt: '2026-07-07T08:00:00.000Z',
              updatedAt: '2026-07-07T08:00:00.000Z',
            },
            {
              id: 'evidence-2',
              projectId: 'research-1',
              sourceId: 'source-2',
              sourceVersion: 'v1',
              locator: 'p. 43',
              quote: 'Segundo fragmento',
              context: 'Capítulo de procedencia',
              note: 'Contrastar con inventario',
              fingerprint: 'hash-2',
              createdAt: '2026-07-07T08:00:00.000Z',
              updatedAt: '2026-07-07T08:00:00.000Z',
            },
          ],
          findings: [
            {
              id: 'finding-1',
              projectId: 'research-1',
              title: 'Hipótesis',
              kind: 'attribution',
              summary: 'Depende de una fuente',
              status: 'PROPOSED',
              createdAt: '2026-07-07T08:00:00.000Z',
              updatedAt: '2026-07-07T08:00:00.000Z',
              evidence: [
                {
                  findingId: 'finding-1',
                  evidenceId: 'evidence-1',
                  evidence: {
                    id: 'evidence-1',
                    projectId: 'research-1',
                    sourceId: 'source-1',
                    sourceVersion: 'v1',
                    locator: 'p. 42',
                    quote: 'Fragmento',
                    context: null,
                    note: null,
                    fingerprint: 'hash',
                    createdAt: '2026-07-07T08:00:00.000Z',
                    updatedAt: '2026-07-07T08:00:00.000Z',
                  },
                },
              ],
            },
            {
              id: 'finding-2',
              projectId: 'research-1',
              title: 'Hipótesis sin evidencia visible',
              kind: null,
              summary: null,
              status: 'PROPOSED',
              createdAt: '2026-07-07T08:00:00.000Z',
              updatedAt: '2026-07-07T08:00:00.000Z',
              evidence: [],
            },
          ],
          decisions: [
            {
              id: 'decision-1',
              projectId: 'research-1',
              findingId: 'finding-1',
              actorId: 'user-1',
              action: 'POSTPONE',
              note: 'Falta contraste',
              createdAt: '2026-07-07T08:00:00.000Z',
            },
          ],
          jobs: [],
        }),
      ),
      create: vi.fn().mockReturnValue(
        of({
          id: 'research-2',
          title: 'Nueva investigación',
          objective: 'Objetivo',
          scope: null,
          status: 'ACTIVE',
          lastActiveAt: '2026-07-07T09:00:00.000Z',
          createdAt: '2026-07-07T09:00:00.000Z',
          updatedAt: '2026-07-07T09:00:00.000Z',
        }),
      ),
      searchSources: vi.fn().mockReturnValue(
        of([
          {
            id: 'source-2',
            type: 'BOOK',
            title: 'Goya en el Prado',
            author: 'Museo del Prado',
            publisher: null,
            year: 2020,
            url: null,
            createdAt: '2026-07-07T08:00:00.000Z',
          },
        ]),
      ),
      addSource: vi.fn().mockReturnValue(of({})),
      createEvidence: vi.fn().mockReturnValue(of({})),
      createFinding: vi.fn().mockReturnValue(of({})),
      decideFinding: vi.fn().mockReturnValue(of({})),
    };
    const router = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [AdminResearchComponent],
      providers: [
        { provide: ResearchApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { url: of([]), queryParamMap: queryParams$ },
        },
        { provide: Router, useValue: router },
      ],
    });

    const component = TestBed.createComponent(AdminResearchComponent).componentInstance;
    const vm = await firstValueFrom(component.vm$.pipe(filter((value) => value.state === 'ready')));

    expect(api.getById).toHaveBeenCalledWith('research-1');
    expect(vm.selected?.id).toBe('research-1');
    expect(vm.selectedProject?.sources.length).toBe(2);
    expect(vm.selectedProject?.evidence.length).toBe(2);
    expect(vm.selectedProject?.findings.length).toBe(2);
    expect(vm.selectedProject?.decisions.length).toBe(1);
    expect(component.projectMeta(vm.projects[0])).toBe('2 fuentes · 3 evidencias · 1 hallazgos');
    expect(component.sourceTitle(vm.selectedProject!.sources[0])).toBe(
      'Los desastres de la guerra · Museo del Prado',
    );
    expect(component.evidenceBySource(vm.selectedProject!)).toEqual([
      expect.objectContaining({
        sourceId: 'source-1',
        title: 'Los desastres de la guerra · Museo del Prado',
        evidence: [expect.objectContaining({ quote: 'Fragmento' })],
      }),
      expect.objectContaining({
        sourceId: 'source-2',
        title: 'Catálogo razonado',
        evidence: [
          expect.objectContaining({
            quote: 'Segundo fragmento',
            context: 'Capítulo de procedencia',
            note: 'Contrastar con inventario',
          }),
        ],
      }),
    ]);
    expect(
      component.evidenceSourceTitle(vm.selectedProject!, vm.selectedProject!.evidence[0]),
    ).toBe('Los desastres de la guerra · Museo del Prado');
    expect(
      component.visibleFindingEvidence(vm.selectedProject!, vm.selectedProject!.findings[0]),
    ).toEqual([
      expect.objectContaining({ locator: 'p. 42', sourceVersion: 'v1', quote: 'Fragmento' }),
    ]);
    expect(
      component.hiddenFindingEvidenceCount(vm.selectedProject!, vm.selectedProject!.findings[0]),
    ).toBe(0);
    expect(component.findingEvidence(vm.selectedProject!, vm.selectedProject!.findings[1])).toEqual(
      [],
    );
    expect(component.findingCountForEvidence(vm.selectedProject!, 'evidence-1')).toBe(1);
    expect(component.findingCountForEvidence(vm.selectedProject!, 'evidence-2')).toBe(0);

    component.evidenceSearch = 'segundo';
    expect(component.filteredEvidence(vm.selectedProject!)).toEqual([
      expect.objectContaining({ id: 'evidence-2' }),
    ]);

    component.evidenceSearch = '';
    component.evidenceSourceFilter = 'source-2';
    expect(component.filteredEvidence(vm.selectedProject!)).toEqual([
      expect.objectContaining({ id: 'evidence-2' }),
    ]);

    component.evidenceSourceFilter = '';
    component.evidenceSearch = 'inventario';
    expect(component.filteredEvidence(vm.selectedProject!)).toEqual([
      expect.objectContaining({ id: 'evidence-2' }),
    ]);

    component.evidenceSearch = 'sin coincidencias';
    expect(component.filteredEvidence(vm.selectedProject!)).toEqual([]);

    component.evidenceSearch = '';

    component.selectSource({
      id: 'source-2',
      type: 'BOOK',
      title: 'Goya en el Prado',
      author: 'Museo del Prado',
      publisher: null,
      year: 2020,
      url: null,
      createdAt: '2026-07-07T08:00:00.000Z',
    });
    expect(component.sourceId).toBe('source-2');
    expect(component.selectedSourceLabel).toBe('Goya en el Prado · Museo del Prado');

    component.title = ' Nueva investigación ';
    component.objective = ' Objetivo ';
    component.createResearch();

    expect(api.create).toHaveBeenCalledWith({
      title: 'Nueva investigación',
      objective: 'Objetivo',
      scope: undefined,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/admin/research'], {
      queryParams: { project: 'research-2' },
    });

    component.sourceId = ' source-2 ';
    component.sourceNote = ' Nota ';
    component.addSource('research-1');
    expect(api.addSource).toHaveBeenCalledWith('research-1', {
      sourceId: 'source-2',
      note: 'Nota',
    });

    component.prepareEvidenceForSource('source-1');
    expect(component.evidenceSourceId).toBe('source-1');
    component.evidenceSourceVersion = ' v1 ';
    component.evidenceLocator = ' p. 1 ';
    component.evidenceQuote = ' Fragmento ';
    component.evidenceContext = ' Contexto ';
    component.evidenceNote = ' Nota editorial ';
    component.createEvidence('research-1');
    expect(api.createEvidence).toHaveBeenCalledWith('research-1', {
      sourceId: 'source-1',
      sourceVersion: 'v1',
      locator: 'p. 1',
      quote: 'Fragmento',
      context: 'Contexto',
      note: 'Nota editorial',
    });
    expect(component.evidenceSourceId).toBe('source-1');
    expect(component.evidenceSourceVersion).toBe(' v1 ');
    expect(component.evidenceLocator).toBe('');
    expect(component.evidenceQuote).toBe('');
    expect(component.evidenceContext).toBe('');
    expect(component.evidenceNote).toBe('');

    component.findingTitle = ' Hipótesis ';
    component.selectFindingEvidence('evidence-1');
    component.selectFindingEvidence('evidence-1');
    expect(component.selectedFindingEvidenceIds).toEqual(['evidence-1']);
    component.selectFindingEvidenceGroup(['evidence-1', 'evidence-2']);
    expect(component.selectedFindingEvidenceIds).toEqual(['evidence-1', 'evidence-2']);
    component.removeFindingEvidence('evidence-1');
    expect(component.selectedFindingEvidenceIds).toEqual(['evidence-2']);
    component.selectFindingEvidence('evidence-1');
    component.createFinding('research-1');
    expect(api.createFinding).toHaveBeenCalledWith('research-1', {
      title: 'Hipótesis',
      evidenceIds: ['evidence-2', 'evidence-1'],
      kind: undefined,
      summary: undefined,
    });
    expect(component.selectedFindingEvidenceIds).toEqual([]);

    component.setFindingDecisionNote('finding-1', ' Duplicado ');
    component.decideFinding('research-1', 'finding-1', 'REJECT');
    expect(api.decideFinding).toHaveBeenCalledWith('research-1', 'finding-1', {
      action: 'REJECT',
      note: 'Duplicado',
    });
    expect(component.findingDecisionNotes['finding-1']).toBe('');

    component.setFindingDecisionNote('finding-1', '   ');
    component.decideFinding('research-1', 'finding-1', 'POSTPONE');
    expect(api.decideFinding).toHaveBeenLastCalledWith('research-1', 'finding-1', {
      action: 'POSTPONE',
      note: undefined,
    });
  });
});
