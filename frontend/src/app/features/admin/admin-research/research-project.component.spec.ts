import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, RouterLink, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  ResearchApi,
  ResearchDocument,
  ResearchEvidence,
  ResearchLibraryExcerpt,
  ResearchOutlineSection,
  ResearchProject,
} from '../../../core/api/research.api';
import { LibraryApi } from '../../../core/api/library.api';
import { EntitiesApi } from '../../../core/api/entities.api';
import { RichTextComponent } from '../../../shared/rich-text/rich-text.component';
import { ResearchClaimCaptureComponent } from './research-claim-capture.component';
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

const corpusMaterial: ResearchDocument = {
  id: 'material-1',
  projectId: project.id,
  materialVersionId: 'version-1',
  sourceId: null,
  kind: 'TEXT',
  status: 'READY',
  title: 'Cuaderno de lectura',
  content: 'Primer pasaje.',
  url: null,
  originalName: null,
  mimeType: null,
  sizeBytes: null,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
};

const sectionEvidence: ResearchEvidence = {
  id: 'evidence-section-1',
  projectId: project.id,
  sourceId: 'source-1',
  sourceVersion: 'edición',
  locator: 'p. 42',
  libraryExcerptId: 'excerpt-1',
  quote: null,
  context: null,
  note: null,
  fingerprint: 'fingerprint-1',
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
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
  drafts: [],
  materialReferences: [],
  questions: [],
  excerptReferences: [],
  dossier: {
    excerpts: [],
    evidence: [sectionEvidence],
    claims: [],
    entities: [],
    relations: [],
    review: { nextTask: { kind: 'CREATE_CLAIM', title: 'Formula una afirmación.' } },
    summary: {
      excerptCount: 0,
      evidenceCount: 1,
      claimCount: 0,
      supportedClaimCount: 0,
      questionedClaimCount: 0,
      contradictionCount: 0,
      questionsWithoutExplicitSupport: [],
      state: {
        kind: 'NEEDS_ARGUMENT',
        title: 'Formula un argumento',
        description: 'Hay evidencia disponible.',
      },
    },
  },
});

const reviewExcerpt: ResearchLibraryExcerpt = {
  id: 'excerpt-1',
  locator: 'p. 42',
  text: 'Pasaje para revisión.',
  materialVersion: {
    id: 'version-1',
    version: 1,
    material: { id: 'material-1', title: 'Cuaderno', source: null },
  },
};

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
async function createFixture(
  api: Record<string, ReturnType<typeof vi.fn>>,
  active = false,
  mode = 'corpus',
  waitForStable = true,
) {
  api['getKnowledge'] ??= vi.fn().mockReturnValue(of(topology));
  api['list'] ??= vi.fn().mockReturnValue(of([project]));
  await TestBed.configureTestingModule({
    imports: [ResearchProjectComponent],
    providers: [
      { provide: ResearchApi, useValue: api },
      {
        provide: LibraryApi,
        useValue: {
          list: vi.fn().mockReturnValue(of([])),
          delete: vi.fn().mockReturnValue(of({ deleted: true })),
        },
      },
      {
        provide: EntitiesApi,
        useValue: {
          list: vi
            .fn()
            .mockReturnValue(of({ items: [], page: 1, limit: 8, total: 0, totalPages: 0 })),
          adminList: vi
            .fn()
            .mockReturnValue(of({ items: [], page: 1, limit: 8, total: 0, totalPages: 0 })),
          preview: vi.fn().mockReturnValue(
            of({
              id: 'entity-1',
              slug: 'pablo-picasso',
              title: 'Pablo Picasso',
              type: 'ARTIST',
              summary: 'Pintor y figura central del cubismo.',
            }),
          ),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(
            convertToParamMap({ id: project.id, ...(active ? { sectionId: 'section-1' } : {}) }),
          ),
          queryParamMap: of(convertToParamMap({ mode })),
        },
      },
      { provide: Router, useValue: { navigate: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchProjectComponent);
  fixture.detectChanges();
  if (waitForStable) await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('ResearchProjectComponent', () => {
  it('offers a direct return to the research list', async () => {
    const fixture = await createFixture({ getById: vi.fn().mockReturnValue(of(project)) });
    const backLink = fixture.debugElement.query(By.css('.research-project__back'));

    expect(backLink.injector.get(RouterLink)).toBeTruthy();
    expect(backLink.nativeElement.textContent).toContain('Investigaciones');
  });

  it('switches research and enters and exits focus mode', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of(project)),
      list: vi
        .fn()
        .mockReturnValue(of([project, { ...project, id: 'research-2', title: 'Surrealismo' }])),
    };
    const fixture = await createFixture(api);
    const router = TestBed.inject(Router);
    const selector = fixture.nativeElement.querySelector(
      '[aria-label="Cambiar investigación activa"]',
    );
    selector.value = 'research-2';
    selector.dispatchEvent(new Event('change'));
    expect(router.navigate).toHaveBeenCalledWith(['/admin/research', 'research-2'], {
      queryParams: { mode: 'corpus' },
    });

    fixture.nativeElement.querySelector('.research-project__focus-toggle').click();
    expect(document.body.classList.contains('app-stage-immersive')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.body.classList.contains('app-stage-immersive')).toBe(false);
  });

  it('orients an empty outline and creates its first section', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of(project)),
      createOutlineSection: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api, false, 'index');
    expect(fixture.nativeElement.textContent).toContain('El argumento empieza aquí.');
    const input = fixture.nativeElement.querySelector('input[name="sectionTitle"]');
    input.value = 'Antes del cubismo';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('.research-project__create')
      .dispatchEvent(new Event('submit'));
    expect(api.createOutlineSection).toHaveBeenCalledWith(project.id, {
      title: 'Antes del cubismo',
    });
  });

  it('creates a subsection without imposing numbering on authorial titles', async () => {
    const parent = section();
    const child = {
      ...section(),
      id: 'section-1-1',
      parentSectionId: parent.id,
      title: 'La fragmentación de la forma',
    };
    const research = { ...project, outlineSections: [parent, child] };
    const api = {
      getById: vi.fn().mockReturnValue(of(research)),
      list: vi.fn().mockReturnValue(of([research])),
      createOutlineSection: vi.fn().mockReturnValue(of(research)),
    };
    const fixture = await createFixture(api, false, 'index');

    expect(fixture.nativeElement.querySelector('.research-project__tree-number')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Cubismo analítico');
    expect(fixture.nativeElement.textContent).toContain('La fragmentación de la forma');

    fixture.nativeElement
      .querySelector('[aria-label="Añadir subsección a Cubismo analítico"]')
      .click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[name="subsectionTitle"]');
    expect(input).not.toBeNull();
    fixture.componentInstance.title = 'Influencia africana';
    fixture.detectChanges();
    fixture.debugElement
      .query(By.css('.research-project__create--nested'))
      .triggerEventHandler('ngSubmit');

    expect(api.createOutlineSection).toHaveBeenCalledWith(project.id, {
      title: 'Influencia africana',
      parentSectionId: parent.id,
    });
  });

  it('reorders sections only among their siblings', async () => {
    const firstRoot = section();
    const secondRoot = { ...section(), id: 'section-2', title: 'Cubismo sintético', sortOrder: 1 };
    const firstChild = {
      ...section(),
      id: 'section-1-1',
      parentSectionId: firstRoot.id,
      title: 'Fragmentación',
    };
    const secondChild = {
      ...firstChild,
      id: 'section-1-2',
      title: 'Perspectiva múltiple',
      sortOrder: 1,
    };
    const research = {
      ...project,
      outlineSections: [firstRoot, secondRoot, firstChild, secondChild],
    };
    const api = {
      getById: vi.fn().mockReturnValue(of(research)),
      list: vi.fn().mockReturnValue(of([research])),
      reorderOutlineSections: vi.fn().mockReturnValue(of(research)),
    };
    const fixture = await createFixture(api, false, 'index');
    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() };
    const preventDefault = vi.fn();

    fixture.componentInstance.startSectionDrag({ dataTransfer } as unknown as DragEvent, firstRoot);
    fixture.componentInstance.dragSectionOver(
      {
        preventDefault,
        dataTransfer,
        clientY: 80,
        currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 100 }) },
      } as unknown as DragEvent,
      secondRoot,
    );
    fixture.componentInstance.dropSection(
      { preventDefault } as unknown as DragEvent,
      research as unknown as ResearchProject,
      secondRoot,
    );

    expect(preventDefault).toHaveBeenCalled();
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', firstRoot.id);
    expect(api.reorderOutlineSections).toHaveBeenNthCalledWith(1, project.id, null, [
      secondRoot.id,
      firstRoot.id,
    ]);

    fixture.nativeElement.querySelector('[aria-label="Bajar Fragmentación"]').click();
    expect(api.reorderOutlineSections).toHaveBeenNthCalledWith(2, project.id, firstRoot.id, [
      secondChild.id,
      firstChild.id,
    ]);
  });

  it('collapses and expands the subsections of a parent section', async () => {
    const parent = section();
    const child = {
      ...section(),
      id: 'section-1-1',
      parentSectionId: parent.id,
      title: 'Fragmentación',
    };
    const research = { ...project, outlineSections: [parent, child] };
    const fixture = await createFixture(
      {
        getById: vi.fn().mockReturnValue(of(research)),
        list: vi.fn().mockReturnValue(of([research])),
      },
      false,
      'index',
    );

    expect(
      fixture.nativeElement.querySelector('[aria-label="Bajar Fragmentación"]'),
    ).not.toBeNull();
    fixture.nativeElement.querySelector('[aria-label="Contraer Cubismo analítico"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Bajar Fragmentación"]')).toBeNull();

    fixture.nativeElement.querySelector('[aria-label="Expandir Cubismo analítico"]').click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Bajar Fragmentación"]'),
    ).not.toBeNull();
  });

  it('confirms deletion of a parent and its subsections', async () => {
    const parent = section();
    const child = { ...section(), id: 'section-1-1', parentSectionId: parent.id };
    const research = { ...project, outlineSections: [parent, child] };
    const api = {
      getById: vi.fn().mockReturnValue(of(research)),
      list: vi.fn().mockReturnValue(of([research])),
      deleteOutlineSection: vi.fn().mockReturnValue(of(project)),
    };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = await createFixture(api, false, 'index');

    fixture.nativeElement.querySelector('[aria-label="Eliminar Cubismo analítico"]').click();

    expect(confirm).toHaveBeenCalledWith(
      '¿Eliminar “Cubismo analítico”? También se eliminarán 1 subsección.',
    );
    expect(api.deleteOutlineSection).toHaveBeenCalledWith(project.id, parent.id);
    confirm.mockRestore();
  });

  it('incorporates corpus before creating an outline section', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of(project)),
      createMaterial: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api);
    expect(fixture.nativeElement.textContent).toContain('Reúne primero los materiales');
    const title = fixture.nativeElement.querySelector('input[name=materialTitle]');
    const content = fixture.nativeElement.querySelector('textarea[name=materialContent]');
    title.value = 'Carta de Apollinaire';
    title.dispatchEvent(new Event('input'));
    content.value = 'Texto de trabajo';
    content.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('.research-project__material-intake')
      .dispatchEvent(new Event('submit'));
    expect(api.createMaterial).toHaveBeenCalledWith(project.id, {
      kind: 'TEXT',
      title: 'Carta de Apollinaire',
      content: 'Texto de trabajo',
      url: undefined,
    });
  });

  it('accepts a PDF dropped into the corpus intake', async () => {
    const fixture = await createFixture({ getById: vi.fn().mockReturnValue(of(project)) });
    const file = new File(['pdf'], 'catalogo.pdf', { type: 'application/pdf' });
    const preventDefault = vi.fn();

    fixture.componentInstance.dropPdf({
      preventDefault,
      dataTransfer: { files: { item: () => file } },
    } as unknown as DragEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(fixture.componentInstance.materialPdf).toBe(file);
    expect(fixture.componentInstance.materialTitle).toBe('catalogo');
  });

  it('uses the sidebar as the compact corpus material selector', async () => {
    const materials = [
      corpusMaterial,
      {
        ...corpusMaterial,
        id: 'material-2',
        materialVersionId: 'version-2',
        title: 'Segunda lectura',
        content: 'Segundo pasaje.',
      },
    ];
    const research = { ...project, materials };
    const fixture = await createFixture({
      getById: vi.fn().mockReturnValue(of(research)),
      list: vi.fn().mockReturnValue(of([research])),
    });
    const buttons = fixture.nativeElement.querySelectorAll(
      '.research-project__corpus-materials button',
    );

    expect(buttons).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('app-research-material-reader nav')).toBeNull();
    buttons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMaterialId).toBe('material-2');
    expect(fixture.nativeElement.textContent).toContain('Segundo pasaje.');
  });

  it('opens a material context menu and removes only its research association', async () => {
    const failedMaterial = {
      ...corpusMaterial,
      status: 'FAILED' as const,
      content: null,
    };
    const research = { ...project, materials: [failedMaterial] };
    const api = {
      getById: vi.fn().mockReturnValue(of(research)),
      list: vi.fn().mockReturnValue(of([research])),
      removeMaterial: vi.fn().mockReturnValue(of({ ...research, materials: [] })),
    };
    const fixture = await createFixture(api);
    const material = fixture.nativeElement.querySelector(
      '.research-project__corpus-materials button',
    );

    material.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 180 }),
    );
    fixture.detectChanges();

    const action = fixture.nativeElement.querySelector('.material-menu button');
    expect(action.textContent).toContain('Quitar de esta investigación');
    expect(fixture.nativeElement.textContent).toContain('Eliminar de Biblioteca');
    action.click();

    expect(api.removeMaterial).toHaveBeenCalledWith(project.id, corpusMaterial.id);
  });

  it('refreshes automatically while a material is preparing', async () => {
    vi.useFakeTimers();
    try {
      const pending = {
        ...project,
        materials: [{ ...corpusMaterial, status: 'PENDING_PREPARATION' as const, content: null }],
      };
      const ready = { ...project, materials: [corpusMaterial] };
      const api = {
        getById: vi.fn().mockReturnValueOnce(of(pending)).mockReturnValue(of(ready)),
        list: vi.fn().mockReturnValue(of([project])),
      };
      const fixture = await createFixture(api, false, 'corpus', false);

      expect(fixture.nativeElement.textContent).toContain('Preparando contenido');
      await vi.advanceTimersByTimeAsync(2000);
      fixture.detectChanges();

      expect(api.getById).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.textContent).toContain('Disponible');
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the first section from Index', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [section()] })),
    };
    const fixture = await createFixture(api, false, 'index');
    expect(fixture.nativeElement.textContent).toContain('Cubismo analítico');
  });

  it('restores the opened section and its editorial context from the URL', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [section()] })),
    };
    const fixture = await createFixture(api, true);
    expect(fixture.nativeElement.textContent).toContain('Cubismo analítico');
    expect(fixture.nativeElement.textContent).toContain('En desarrollo');
    expect(fixture.nativeElement.querySelector('textarea[name=sectionObjective]').value).toBe(
      'Comprender la fragmentación.',
    );
    expect(fixture.nativeElement.querySelector('textarea[name=sectionNotes]').value).toBe(
      'Volver a las cartas.',
    );
    expect(fixture.nativeElement.textContent).toContain('Trabajo para esta sección');
    expect(fixture.nativeElement.textContent).toContain('Cómo continuar esta Section');
    expect(fixture.nativeElement.textContent).toContain('Siguiente paso razonable:');
    expect(fixture.nativeElement.textContent).toContain(
      'El corpus y el conocimiento siguen siendo compartidos por toda la investigación.',
    );
  });

  it('updates the objective and notes as one section context', async () => {
    const active = section();
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })),
      updateOutlineSection: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api, true);
    const textarea = fixture.nativeElement.querySelector('textarea[name=sectionObjective]');
    textarea.value = 'Explicar el método analítico';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new Event('blur'));
    expect(api.updateOutlineSection).toHaveBeenCalledWith(project.id, active.id, {
      objective: 'Explicar el método analítico',
      notes: active.notes,
    });
  });

  it('creates the first authorial Draft from the active Section', async () => {
    const active = section();
    const saved = {
      id: 'draft-1',
      projectId: project.id,
      sectionId: active.id,
      title: active.title,
      currentRevisionId: 'revision-1',
      archivedAt: null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      currentRevision: {
        id: 'revision-1',
        draftId: 'draft-1',
        authorId: 'user-1',
        number: 1,
        content: 'Una nueva representación del espacio.',
        createdAt: project.createdAt,
      },
    };
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })),
      createDraft: vi.fn().mockReturnValue(of(saved)),
    };
    const fixture = await createFixture(api, true);
    const editor = fixture.nativeElement.querySelector('.rt-editable');
    editor.innerHTML = `<p>${saved.currentRevision.content}</p>`;
    editor.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.research-project__draft footer button').click();

    expect(api.createDraft).toHaveBeenCalledWith(
      project.id,
      active.id,
      saved.currentRevision.content,
    );
  });

  it('associates a Library material with the Research before adding it to the Section', async () => {
    const active = section();
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })),
      associateLibraryMaterial: vi.fn().mockReturnValue(of(project)),
      addOutlineSectionMaterial: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api, true);
    const component = fixture.componentInstance;
    const material = {
      id: 'material-1',
      sourceId: null,
      kind: 'TEXT' as const,
      title: 'Cartas a Émile Bernard',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      version: {
        id: 'version-1',
        status: 'READY' as const,
        url: null,
        originalName: null,
        mimeType: null,
        sizeBytes: null,
      },
      research: [],
    };
    component.selectedSectionMaterialVersionId = material.version.id;

    component.addSectionMaterial(project as unknown as ResearchProject, active, [material]);

    expect(api.associateLibraryMaterial).toHaveBeenCalledWith(project.id, material.id);
    expect(api.addOutlineSectionMaterial).toHaveBeenCalledWith(
      project.id,
      active.id,
      material.version.id,
    );
  });

  it('updates the editorial status of the active section', async () => {
    const active = section();
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })),
      updateOutlineSection: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api, true);
    const select = fixture.nativeElement.querySelector('select[name="sectionStatus"]');
    select.value = 'READY_FOR_REVIEW';
    select.dispatchEvent(new Event('change'));

    expect(api.updateOutlineSection).toHaveBeenCalledWith(project.id, active.id, {
      status: 'READY_FOR_REVIEW',
    });
  });

  it('edits the Section title and applies Draft formatting without changing knowledge', async () => {
    const active = section();
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })),
      updateOutlineSection: vi.fn().mockReturnValue(of(project)),
    };
    const fixture = await createFixture(api, true);
    const component = fixture.componentInstance;

    const titleInput = document.createElement('input');
    titleInput.value = ' Nueva mirada ';
    component.saveSectionTitle(project as unknown as ResearchProject, active, titleInput);
    expect(api.updateOutlineSection).toHaveBeenCalledWith(project.id, active.id, {
      title: 'Nueva mirada',
    });

    const editor = fixture.debugElement.query(By.directive(RichTextComponent)).componentInstance;
    const editable = fixture.nativeElement.querySelector('.rt-editable');
    editable.innerHTML = '<h2>Una nueva mirada</h2>';
    const range = document.createRange();
    range.selectNodeContents(editable.firstElementChild);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    editor.updateFormatState();
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('button[aria-label="Encabezado nivel 2"]')
        .classList.contains('is-active'),
    ).toBe(true);

    const originalExecCommand = document.execCommand;
    document.execCommand = vi.fn();
    component.formatDraft(editor, 'heading');
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, 'p');
    document.execCommand = originalExecCommand;
  });

  it('renders headings, citations and lists with the shared editorial renderer', async () => {
    const content =
      '## Una nueva mirada\n\n> El arte es una armonía paralela.\n> — Paul Cézanne\n\n- Cézanne\n- Braque';
    const active = {
      ...section(),
      drafts: [
        {
          id: 'draft-1',
          projectId: project.id,
          sectionId: 'section-1',
          title: 'Cubismo analítico',
          currentRevisionId: 'revision-1',
          archivedAt: null,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          currentRevision: {
            id: 'revision-1',
            draftId: 'draft-1',
            authorId: 'user-1',
            number: 1,
            content,
            createdAt: project.createdAt,
          },
        },
      ],
    };
    const fixture = await createFixture(
      { getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })) },
      true,
    );

    expect(fixture.nativeElement.querySelector('.rt-h2').textContent).toContain('Una nueva mirada');
    expect(fixture.nativeElement.querySelector('.rt-quote').textContent).toContain(
      'El arte es una armonía paralela.',
    );
    expect(fixture.nativeElement.querySelector('.rt-quote br')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.rt-list li')).toHaveLength(2);

    const editor = fixture.nativeElement.querySelector('.rt-editable');
    const quote = editor.querySelector('blockquote');
    const range = document.createRange();
    range.selectNodeContents(quote);
    range.collapse(false);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(editor.querySelectorAll('blockquote')).toHaveLength(1);
    editor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    expect(quote.nextElementSibling?.tagName).toBe('P');

    editor.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(editor.lastElementChild?.tagName).toBe('P');
    expect(document.getSelection()?.anchorNode?.parentElement?.closest('blockquote')).toBeNull();
  });

  it('links an existing entity from the visual picker and keeps the shared preview', async () => {
    const active = section();
    const fixture = await createFixture(
      { getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [active] })) },
      true,
    );
    const editor = fixture.debugElement.query(By.directive(RichTextComponent)).componentInstance;
    fixture.nativeElement.querySelector('button[aria-label="Enlace a Entidad"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.entity-picker input')).toBeTruthy();

    editor.chooseEntity({
      id: 'entity-1',
      slug: 'pablo-picasso',
      title: 'Pablo Picasso',
      type: 'ARTIST',
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.draftContent).toContain('[[pablo-picasso|Pablo Picasso]]');

    expect(fixture.nativeElement.querySelectorAll('.rt-editable .link')).toHaveLength(1);
    const link = fixture.nativeElement.querySelector('.rt-editable .link');
    link.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(TestBed.inject(EntitiesApi).preview).toHaveBeenCalledWith('pablo-picasso', {
      includeDrafts: true,
    });
    expect(fixture.nativeElement.querySelector('.tooltip .tt-title').textContent).toContain(
      'Pablo Picasso',
    );
    expect(fixture.nativeElement.querySelector('.tooltip .tt-summary').textContent).toContain(
      'figura central del cubismo',
    );
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
    expect(fixture.nativeElement.textContent).toContain('Este contexto pertenece a la Section.');
    expect(fixture.nativeElement.textContent).toContain(
      'No existe todavía suficiente contexto para responder esta pregunta.',
    );
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

  it('keeps research-wide editorial tools out of a project without Sections', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [] })),
    };
    const fixture = await createFixture(api);
    expect(fixture.debugElement.query(By.directive(ResearchClaimCaptureComponent))).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Reúne primero los materiales');
  });

  it('offers only the active Section evidence when formulating an assertion', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(
        of({
          ...project,
          evidence: [{ ...sectionEvidence, id: 'evidence-global' }],
          outlineSections: [section()],
        }),
      ),
    };
    const fixture = await createFixture(api, true);

    expect(
      fixture.debugElement.query(By.directive(ResearchClaimCaptureComponent)).componentInstance
        .evidence,
    ).toEqual([sectionEvidence]);
  });

  it('returns a review to its exact LibraryExcerpt', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [section()] })),
    };
    const fixture = await createFixture(api, true);

    fixture.componentInstance.openExcerptInReader(reviewExcerpt);

    expect(fixture.componentInstance.reviewExcerpt).toEqual(reviewExcerpt);
  });

  it('refreshes the workspace after a Claim is saved', async () => {
    const api = {
      getById: vi.fn().mockReturnValue(of({ ...project, outlineSections: [section()] })),
    };
    const fixture = await createFixture(api, true);

    const callsBeforeSave = api.getById.mock.calls.length;
    fixture.debugElement
      .query(By.directive(ResearchClaimCaptureComponent))
      .componentInstance.saved.emit();

    expect(api.getById.mock.calls.length).toBeGreaterThan(callsBeforeSave);
  });
});
