import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ResearchApi, ResearchEntity, ResearchProject } from '../../../core/api/research.api';
import { ResearchPublicationWorkspaceComponent } from './research-publication-workspace.component';

const project = {
  id: 'research-1',
  title: 'Materia y memoria',
  objective: 'Una lectura editorial de los archivos domésticos.',
  coverImageUrl: null,
  status: 'ACTIVE',
  lastActiveAt: '',
  createdAt: '',
  updatedAt: '',
  sources: [],
  evidence: [],
  entities: [],
  relations: [],
  knowledge: {
    entities: [],
    relations: [],
    claims: [],
    contradictions: [],
    supportingEvidence: [],
  },
  aiExecutions: [],
  decisions: [],
  jobs: [],
  materials: [],
  claims: [],
  outlineSections: [
    {
      id: 'section-1',
      projectId: 'research-1',
      parentSectionId: null,
      title: 'Entrada',
      status: 'COMPLETED',
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
      objective: null,
      notes: null,
      imageUrl: null,
      questions: [],
      excerptReferences: [],
      materialReferences: [],
      dossier: {} as never,
      drafts: [
        {
          id: 'draft-1',
          projectId: 'research-1',
          sectionId: 'section-1',
          title: null,
          currentRevisionId: 'revision-1',
          archivedAt: null,
          createdAt: '',
          updatedAt: '',
          currentRevision: {
            id: 'revision-1',
            draftId: 'draft-1',
            authorId: 'author-1',
            number: 1,
            content: 'Texto editorial de apertura.',
            createdAt: '',
          },
        },
      ],
    },
    {
      id: 'section-2',
      projectId: 'research-1',
      parentSectionId: 'section-1',
      title: 'Deriva',
      status: 'IN_PROGRESS',
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
      objective: null,
      notes: null,
      imageUrl: null,
      questions: [],
      excerptReferences: [],
      materialReferences: [],
      dossier: {} as never,
      drafts: [],
    },
  ],
} as unknown as ResearchProject;

describe('ResearchPublicationWorkspaceComponent', () => {
  it('opens in content and preserves outline hierarchy for reading', () => {
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    const component = TestBed.runInInjectionContext(
      () => new ResearchPublicationWorkspaceComponent(),
    );
    component.project = project;

    expect(component.activeTab).toBe('content');
    expect(component.publicationSections.map((section) => [section.title, section.depth])).toEqual([
      ['Entrada', 0],
      ['Deriva', 1],
    ]);
    expect(component.readingTime).toBe(1);
  });

  it('persists a non-default publication tab without changing Research mode', () => {
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    const component = TestBed.runInInjectionContext(
      () => new ResearchPublicationWorkspaceComponent(),
    );
    component.project = project;

    component.setTab('knowledge-map');

    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { mode: 'publication', publicationTab: 'knowledge-map' },
      queryParamsHandling: 'merge',
    });
  });

  it('uses the canonical type and image for a promoted entity card', () => {
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    const component = TestBed.runInInjectionContext(
      () => new ResearchPublicationWorkspaceComponent(),
    );
    const entity: ResearchEntity = {
      id: 'entity-1',
      projectId: 'research-1',
      kind: 'WORK',
      title: 'Prueba',
      summary: null,
      confidence: null,
      mentionCount: 0,
      reviewState: 'REVIEWED',
      createdAt: '',
      updatedAt: '',
      canonicalEntityId: 'canonical-1',
      canonicalEntity: {
        id: 'canonical-1',
        title: 'Prueba',
        type: 'ARTWORK',
        kind: 'WORK',
        imageUrl: '/artwork.jpg',
      },
    };

    expect(component.entityType(entity)).toBe('ARTWORK');
    expect(component.entityImage(entity)).toBe('/artwork.jpg');
  });

  it('returns a published Research to its active private state', () => {
    const router = { navigate: vi.fn() };
    const researchApi = {
      updateProjectStatus: vi.fn().mockReturnValue(of({ ...project, status: 'ACTIVE' })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: ResearchApi, useValue: researchApi },
      ],
    });
    const component = TestBed.runInInjectionContext(
      () => new ResearchPublicationWorkspaceComponent(),
    );
    component.project = { ...project, status: 'PUBLISHED' };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.unpublish();

    expect(researchApi.updateProjectStatus).toHaveBeenCalledWith('research-1', 'ACTIVE');
    expect(component.project.status).toBe('ACTIVE');
    confirm.mockRestore();
  });

  it('adds an editorially selected related research project', () => {
    const router = { navigate: vi.fn() };
    const researchApi = { addRelatedProject: vi.fn().mockReturnValue(of({})) };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: ResearchApi, useValue: researchApi },
      ],
    });
    const component = TestBed.runInInjectionContext(
      () => new ResearchPublicationWorkspaceComponent(),
    );
    component.project = project;
    component.candidates = [
      project,
      {
        id: 'research-2',
        title: 'Otra investigación',
        objective: 'Continúa la lectura',
        scope: null,
        coverImageUrl: null,
        status: 'PUBLISHED',
        lastActiveAt: '',
      },
    ] as ResearchProject[];
    component.relatedProjectId = 'research-2';

    component.addRelatedProject();

    expect(researchApi.addRelatedProject).toHaveBeenCalledWith('research-1', 'research-2');
  });
});
