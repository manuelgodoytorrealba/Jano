import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi, ResearchOutlineSection } from '../../../core/api/research.api';
import { ResearchProjectComponent } from './research-project.component';

const project = {
  id: 'research-1',
  title: 'Cubismo',
  objective: 'Comprender la invención del cubismo.',
  scope: null,
  status: 'ACTIVE',
  lastActiveAt: '2026-07-27T08:00:00.000Z',
  createdAt: '2026-07-27T08:00:00.000Z',
  updatedAt: '2026-07-27T08:00:00.000Z',
  sources: [],
  evidence: [],
  findings: [],
  entities: [],
  relations: [],
  findingProposals: [],
  aiExecutions: [],
  decisions: [],
  jobs: [],
  materials: [],
  claims: [],
  outlineSections: [],
};

const section = (): ResearchOutlineSection => ({
  id: 'section-1',
  projectId: project.id,
  parentSectionId: null,
  title: 'Cubismo analítico',
  status: 'IN_PROGRESS',
  sortOrder: 0,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  objective: 'Comprender la fragmentación.',
  notes: 'Volver a las cartas.',
  questions: [],
});

const topology = {
  projectId: project.id,
  scope: 'topology' as const,
  focus: null,
  expansions: {
    claims: 'SUMMARY' as const,
    evidence: 'NOT_LOADED' as const,
    traceability: 'NOT_LOADED' as const,
  },
  entities: [],
  relations: [],
  claims: [],
  contradictions: [],
  supportingEvidence: [],
};
async function createFixture(api: Record<string, ReturnType<typeof vi.fn>>, active = false) {
  api['getKnowledge'] ??= vi.fn().mockReturnValue(of(topology));
  await TestBed.configureTestingModule({
    imports: [ResearchProjectComponent],
    providers: [
      { provide: ResearchApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(
            convertToParamMap({ id: project.id, ...(active ? { sectionId: 'section-1' } : {}) }),
          ),
        },
      },
      { provide: Router, useValue: { navigate: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchProjectComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('ResearchProjectComponent', () => {
  it('orients an empty outline and creates its first section', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of(project)),
      createOutlineSection: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api);
    expect(fixture.nativeElement.textContent).toContain('El argumento empieza aquí.');
    const input = fixture.nativeElement.querySelector('input[name="sectionTitle"]');
    input.value = 'Antes del cubismo';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(api.createOutlineSection).toHaveBeenCalledWith(project.id, {
      title: 'Antes del cubismo',
    });
  });

  it('restores the opened section and its editorial context from the URL', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [section()] })),
    };
    const fixture = await createFixture(api, true);
    expect(fixture.nativeElement.textContent).toContain('Cubismo analítico');
    expect(fixture.nativeElement.textContent).toContain('En desarrollo');
    expect(fixture.nativeElement.querySelectorAll('textarea')[0].value).toBe(
      'Comprender la fragmentación.',
    );
    expect(fixture.nativeElement.querySelectorAll('textarea')[1].value).toBe(
      'Volver a las cartas.',
    );
  });

  it('updates the objective and notes as one section context', async () => {
    const active = section();
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })),
      updateOutlineSection: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api, true);
    const textarea = fixture.nativeElement.querySelectorAll('textarea')[0];
    textarea.value = 'Explicar el método analítico';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new Event('blur'));
    expect(api.updateOutlineSection).toHaveBeenCalledWith(project.id, active.id, {
      objective: 'Explicar el método analítico',
      notes: active.notes,
    });
  });

  it('creates, edits, deletes and reorders research questions in the active section', async () => {
    const active = {
      ...section(),
      questions: [
        {
          id: 'q1',
          sectionId: 'section-1',
          text: '¿Qué se fragmenta?',
          sortOrder: 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        {
          id: 'q2',
          sectionId: 'section-1',
          text: '¿Qué permanece?',
          sortOrder: 1,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      ],
    };
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })),
      createQuestion: vi.fn().mockReturnValue(of(project)),
      updateQuestion: vi.fn().mockReturnValue(of(project)),
      deleteQuestion: vi.fn().mockReturnValue(of(project)),
      reorderQuestions: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api, true);
    const questionInput = fixture.nativeElement.querySelector('input[name="question"]');
    questionInput.value = '¿Cómo cambia la mirada?';
    questionInput.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('.research-project__question-create')
      .dispatchEvent(new Event('submit'));
    expect(api.createQuestion).toHaveBeenCalledWith(
      project.id,
      active.id,
      '¿Cómo cambia la mirada?',
    );
    const existing = fixture.nativeElement.querySelector('.research-project__questions input');
    existing.value = '¿Qué se descompone?';
    existing.dispatchEvent(new Event('blur'));
    expect(api.updateQuestion).toHaveBeenCalledWith(
      project.id,
      active.id,
      'q1',
      '¿Qué se descompone?',
    );
    fixture.nativeElement.querySelector('[aria-label="Bajar pregunta"]').click();
    expect(api.reorderQuestions).toHaveBeenCalledWith(project.id, active.id, ['q2', 'q1']);
    fixture.nativeElement.querySelector('[aria-label="Eliminar pregunta"]').click();
    expect(api.deleteQuestion).toHaveBeenCalledWith(project.id, active.id, 'q1');
  });
});
