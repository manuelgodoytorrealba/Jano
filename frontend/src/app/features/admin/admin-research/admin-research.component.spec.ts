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
              sourceId: 'source-1',
              sourceVersion: 'v1',
              locator: 'p. 43',
              quote: 'Segundo fragmento',
              context: null,
              note: null,
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
    expect(vm.selectedProject?.sources.length).toBe(1);
    expect(vm.selectedProject?.evidence.length).toBe(2);
    expect(vm.selectedProject?.findings.length).toBe(1);
    expect(vm.selectedProject?.decisions.length).toBe(1);
    expect(component.projectMeta(vm.projects[0])).toBe('2 fuentes · 3 evidencias · 1 hallazgos');
    expect(component.sourceTitle(vm.selectedProject!.sources[0])).toBe(
      'Los desastres de la guerra · Museo del Prado',
    );
    expect(
      component.evidenceSourceTitle(vm.selectedProject!, vm.selectedProject!.evidence[0]),
    ).toBe('Los desastres de la guerra · Museo del Prado');

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

    component.evidenceSourceId = 'source-1';
    component.evidenceSourceVersion = ' v1 ';
    component.evidenceLocator = ' p. 1 ';
    component.evidenceQuote = ' Fragmento ';
    component.createEvidence('research-1');
    expect(api.createEvidence).toHaveBeenCalledWith('research-1', {
      sourceId: 'source-1',
      sourceVersion: 'v1',
      locator: 'p. 1',
      quote: 'Fragmento',
      context: undefined,
      note: undefined,
    });

    component.findingTitle = ' Hipótesis ';
    component.toggleFindingEvidence('evidence-1', true);
    component.toggleFindingEvidence('evidence-2', true);
    component.createFinding('research-1');
    expect(api.createFinding).toHaveBeenCalledWith('research-1', {
      title: 'Hipótesis',
      evidenceIds: ['evidence-1', 'evidence-2'],
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
