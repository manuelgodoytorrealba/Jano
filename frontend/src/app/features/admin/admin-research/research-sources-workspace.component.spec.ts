import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi } from '../../../core/api/research.api';
import { ResearchSourcesWorkspaceComponent } from './research-sources-workspace.component';

describe('ResearchSourcesWorkspaceComponent', () => {
  it('associates the selected canonical source once', () => {
    const api = {
      searchSources: vi.fn(),
      addSource: vi.fn().mockReturnValue(of({})),
    };
    TestBed.configureTestingModule({
      imports: [ResearchSourcesWorkspaceComponent],
      providers: [{ provide: ResearchApi, useValue: api }],
    });
    const component = TestBed.createComponent(ResearchSourcesWorkspaceComponent).componentInstance;
    component.researchId = 'research-1';
    component.selected = {
      id: 'source-1',
      type: 'BOOK',
      title: 'Las señoritas de Aviñón',
      author: 'Autor',
      publisher: null,
      year: null,
      url: null,
      createdAt: '',
    };
    component.note = 'Lectura de contexto';

    component.associate();

    expect(api.addSource).toHaveBeenCalledWith('research-1', {
      sourceId: 'source-1',
      note: 'Lectura de contexto',
    });
  });

  it('finishes an empty search so the user can see its result', () => {
    const api = { searchSources: vi.fn().mockReturnValue(of([])), addSource: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ResearchSourcesWorkspaceComponent],
      providers: [{ provide: ResearchApi, useValue: api }],
    });
    const component = TestBed.createComponent(ResearchSourcesWorkspaceComponent).componentInstance;
    component.search = 'Goya';

    component.searchSources();

    expect(component.searching).toBe(false);
    expect(component.hasSearched).toBe(true);
    expect(component.results).toEqual([]);
  });

  it('groups only the concrete cited items under their canonical source', () => {
    const api = { searchSources: vi.fn(), addSource: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ResearchSourcesWorkspaceComponent],
      providers: [{ provide: ResearchApi, useValue: api }],
    });
    const component = TestBed.createComponent(ResearchSourcesWorkspaceComponent).componentInstance;
    component.citations = [
      {
        id: 'citation-excerpt',
        projectId: 'research-1',
        sourceId: 'source-1',
        materialId: null,
        libraryExcerptId: 'excerpt-1',
        evidenceId: null,
        createdAt: '',
        libraryExcerpt: { locator: 'caracteres 1–30', text: 'Pasaje seleccionado' },
      },
      {
        id: 'citation-evidence',
        projectId: 'research-1',
        sourceId: 'source-1',
        materialId: null,
        libraryExcerptId: null,
        evidenceId: 'evidence-1',
        createdAt: '',
        evidence: {
          locator: 'caracteres 40–70',
          quote: 'Otro pasaje',
          context: 'Sostiene una lectura concreta',
        },
      },
      {
        id: 'citation-other-source',
        projectId: 'research-1',
        sourceId: 'source-2',
        materialId: null,
        libraryExcerptId: 'excerpt-2',
        evidenceId: null,
        createdAt: '',
      },
    ];

    expect(component.publicationSelections('source-1').map((citation) => citation.id)).toEqual([
      'citation-excerpt',
      'citation-evidence',
    ]);
    expect(component.publicationExcerptCount('source-1')).toBe(1);
    expect(component.publicationEvidenceCount('source-1')).toBe(1);
    expect(component.isCited('excerpt', 'excerpt-2')).toBe(true);
    expect(component.isCited('evidence', 'evidence-2')).toBe(false);
  });
});
