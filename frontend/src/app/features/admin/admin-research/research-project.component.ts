import { AsyncPipe, DatePipe, DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap } from 'rxjs';
import {
  ResearchApi,
  ResearchOutlineSection,
  ResearchOutlineSectionStatus,
  ResearchClaimStatus,
  ResearchProject,
  ResearchQuestion,
  ResearchLibraryExcerpt,
  ResearchLibraryExcerptReference,
  ResearchClaim,
  ResearchDocument,
  ResearchDocumentKind,
  ResearchDraft,
} from '../../../core/api/research.api';
import { LibraryApi, LibraryMaterial } from '../../../core/api/library.api';
import { MaterialContextMenuComponent, MaterialMenuState } from './material-context-menu.component';
import { ResearchClaimCaptureComponent } from './research-claim-capture.component';
import { ResearchEvidenceCaptureComponent } from './research-evidence-capture.component';
import { ResearchGraphComponent } from './research-graph.component';
import { ResearchMaterialReaderComponent } from './research-material-reader.component';
import { RichTextComponent } from '../../../shared/rich-text/rich-text.component';
import { ResearchSectionAssistantComponent } from './research-section-assistant.component';

const MAX_PDF_SIZE_BYTES = 300 * 1024 * 1024;
const MATERIAL_POLL_INTERVAL_MS = 2000;

@Component({
  standalone: true,
  selector: 'app-research-project',
  imports: [
    AsyncPipe,
    DatePipe,
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    ResearchClaimCaptureComponent,
    ResearchEvidenceCaptureComponent,
    ResearchGraphComponent,
    ResearchMaterialReaderComponent,
    MaterialContextMenuComponent,
    RichTextComponent,
    ResearchSectionAssistantComponent,
  ],
  templateUrl: './research-project.component.html',
  styleUrl: './research-project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchProjectComponent implements OnDestroy {
  private readonly api = inject(ResearchApi);
  private readonly libraryApi = inject(LibraryApi);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private materialPollTimer: ReturnType<typeof setTimeout> | null = null;
  private workspaceSectionId: string | null = null;
  private savedObjective = '';
  private savedNotes = '';
  savedDraftContent = '';

  readonly modes = [
    { id: 'corpus', label: 'Corpus', available: true },
    { id: 'index', label: 'Índice', available: true },
    { id: 'argument', label: 'Argumento', available: false },
    { id: 'entities', label: 'Entidades', available: false },
    { id: 'publication', label: 'Publicación', available: false },
  ] as const;

  title = '';
  subsectionParentId: string | null = null;
  readonly collapsedSectionIds = new Set<string>();
  draggedSection: ResearchOutlineSection | null = null;
  dropTargetSectionId: string | null = null;
  dropAfterTarget = false;
  questionText = '';
  workspaceObjective = '';
  workspaceNotes = '';
  sectionImageUploading = false;
  projectCoverUploading = false;
  sectionSidePanel: 'context' | 'assistant' = 'context';
  draftContent = '';
  draftEditorContent = '';
  savingDraft = false;
  draftMessage = '';
  error = '';
  preparedExcerpt: ResearchLibraryExcerptReference | null = null;
  reviewExcerpt: ResearchLibraryExcerpt | null = null;
  materialKind: ResearchDocumentKind = 'TEXT';
  materialTitle = '';
  materialContent = '';
  materialUrl = '';
  materialPdf: File | null = null;
  pdfDragActive = false;
  addingMaterial = false;
  materialMessage = '';
  selectedMaterialId = '';
  selectedSectionMaterialVersionId = '';
  materialMenu: MaterialMenuState | null = null;
  focusMode = false;
  corpusView: 'intake' | 'reader' = 'intake';
  readonly statuses: ResearchOutlineSectionStatus[] = [
    'NOT_STARTED',
    'IN_PROGRESS',
    'READY_FOR_REVIEW',
    'COMPLETED',
  ];

  readonly vm$ = combineLatest([
    this.route.paramMap,
    this.route.queryParamMap ?? this.route.paramMap,
    this.refresh$,
  ]).pipe(
    switchMap(([params, query]) =>
      combineLatest([
        this.api.getById(params.get('id')!),
        this.api.list(),
        this.libraryApi.list().pipe(catchError(() => of([]))),
      ]).pipe(
        map(([project, projects, libraryMaterials]) => {
          this.scheduleMaterialPoll(project);
          const mode = this.workspaceMode(query.get('mode'), params.get('sectionId'));
          const sectionId = query.get('section') ?? params.get('sectionId');
          const activeSection =
            project.outlineSections.find((section) => section.id === sectionId) ??
            (mode === 'index' ? project.outlineSections[0] : null) ??
            null;
          this.syncWorkspace(activeSection);
          return { project, projects, libraryMaterials, activeSection, mode, error: '' };
        }),
        catchError(() => {
          this.stopMaterialPolling();
          return of({
            project: null,
            projects: [],
            libraryMaterials: [],
            activeSection: null,
            mode: 'corpus',
            error: 'No se pudo abrir esta investigación.',
          });
        }),
      ),
    ),
  );

  retryMaterial(project: ResearchProject, materialId: string): void {
    this.api.prepareMaterial(project.id, materialId).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo reintentar la preparación.'),
    });
  }

  createMaterial(project: ResearchProject): void {
    if (!this.canCreateMaterial() || this.addingMaterial) return;
    const title = this.materialTitle.trim();
    const request =
      this.materialKind === 'PDF'
        ? this.materialPdf
          ? this.api.createPdfMaterial(project.id, this.materialPdf, title)
          : null
        : this.api.createMaterial(project.id, {
            kind: this.materialKind,
            title,
            content: this.materialKind === 'TEXT' ? this.materialContent.trim() : undefined,
            url: this.materialKind === 'URL' ? this.materialUrl.trim() : undefined,
          });
    if (!request) return;

    this.addingMaterial = true;
    this.materialMessage = '';
    request.subscribe({
      next: () => {
        this.addingMaterial = false;
        this.materialTitle = '';
        this.materialContent = '';
        this.materialUrl = '';
        this.materialPdf = null;
        this.materialMessage = 'Material incorporado al corpus.';
        this.refresh$.next();
      },
      error: () => {
        this.addingMaterial = false;
        this.materialMessage = 'No se pudo incorporar el material.';
      },
    });
  }

  selectPdf(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setPdf(input.files?.[0] ?? null);
  }

  dragPdfOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.pdfDragActive = true;
  }

  leavePdfDropZone(event: DragEvent): void {
    const zone = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && zone.contains(event.relatedTarget)) return;
    this.pdfDragActive = false;
  }

  dropPdf(event: DragEvent): void {
    event.preventDefault();
    this.pdfDragActive = false;
    this.setPdf(event.dataTransfer?.files.item(0) ?? null);
  }

  canCreateMaterial(): boolean {
    if (!this.materialTitle.trim()) return false;
    if (this.materialKind === 'TEXT') return Boolean(this.materialContent.trim());
    if (this.materialKind === 'URL') return Boolean(this.materialUrl.trim());
    return Boolean(this.materialPdf);
  }

  private setPdf(file: File | null): void {
    this.materialPdf = null;
    if (!file) return;
    if (file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) {
      this.materialMessage = 'Selecciona un archivo PDF válido.';
      return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      this.materialMessage = 'El PDF supera el máximo de 300 MB.';
      return;
    }
    this.materialPdf = file;
    this.materialMessage = '';
    if (!this.materialTitle.trim()) this.materialTitle = file.name.replace(/\.pdf$/i, '');
  }

  createSection(project: ResearchProject, parentSectionId?: string): void {
    const title = this.title.trim();
    if (!title) return;
    this.api
      .createOutlineSection(project.id, { title, ...(parentSectionId ? { parentSectionId } : {}) })
      .subscribe({
        next: () => {
          this.title = '';
          this.subsectionParentId = null;
          this.refresh$.next();
        },
        error: () => (this.error = 'No se pudo crear la sección.'),
      });
  }

  startSubsection(parentSectionId: string): void {
    this.title = '';
    this.subsectionParentId = parentSectionId;
    this.collapsedSectionIds.delete(parentSectionId);
  }

  cancelSubsection(): void {
    this.title = '';
    this.subsectionParentId = null;
  }

  deleteSection(project: ResearchProject, section: ResearchOutlineSection): void {
    const childCount = this.children(project, section.id).length;
    const detail = childCount
      ? ` También se eliminarán ${childCount} ${childCount === 1 ? 'subsección' : 'subsecciones'}.`
      : '';
    if (!this.document.defaultView?.confirm(`¿Eliminar “${section.title}”?${detail}`)) return;
    this.api.deleteOutlineSection(project.id, section.id).subscribe({
      next: () => {
        this.collapsedSectionIds.delete(section.id);
        if (this.subsectionParentId === section.id) this.cancelSubsection();
        this.refresh$.next();
      },
      error: () => (this.error = 'No se pudo eliminar la sección.'),
    });
  }

  toggleSection(sectionId: string): void {
    if (this.collapsedSectionIds.has(sectionId)) this.collapsedSectionIds.delete(sectionId);
    else this.collapsedSectionIds.add(sectionId);
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSectionIds.has(sectionId);
  }

  moveSection(project: ResearchProject, section: ResearchOutlineSection, direction: -1 | 1): void {
    const siblings = section.parentSectionId
      ? this.children(project, section.parentSectionId)
      : this.roots(project);
    const index = siblings.findIndex((item) => item.id === section.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    this.saveSectionOrder(project, section.parentSectionId, siblings);
  }

  canMoveSection(
    project: ResearchProject,
    section: ResearchOutlineSection,
    direction: -1 | 1,
  ): boolean {
    const siblings = section.parentSectionId
      ? this.children(project, section.parentSectionId)
      : this.roots(project);
    const target = siblings.findIndex((item) => item.id === section.id) + direction;
    return target >= 0 && target < siblings.length;
  }

  startSectionDrag(event: DragEvent, section: ResearchOutlineSection): void {
    this.draggedSection = section;
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', section.id);
  }

  dragSectionOver(event: DragEvent, target: ResearchOutlineSection): void {
    if (
      !this.draggedSection ||
      this.draggedSection.id === target.id ||
      this.draggedSection.parentSectionId !== target.parentSectionId
    )
      return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropTargetSectionId = target.id;
    this.dropAfterTarget = event.clientY >= bounds.top + bounds.height / 2;
  }

  dropSection(event: DragEvent, project: ResearchProject, target: ResearchOutlineSection): void {
    event.preventDefault();
    const dragged = this.draggedSection;
    if (
      !dragged ||
      dragged.parentSectionId !== target.parentSectionId ||
      dragged.id === target.id
    ) {
      this.finishSectionDrag();
      return;
    }
    const siblings = target.parentSectionId
      ? this.children(project, target.parentSectionId)
      : this.roots(project);
    const reordered = siblings.filter((section) => section.id !== dragged.id);
    const targetIndex = reordered.findIndex((section) => section.id === target.id);
    reordered.splice(targetIndex + (this.dropAfterTarget ? 1 : 0), 0, dragged);
    this.finishSectionDrag();
    if (siblings.every((section, index) => section.id === reordered[index]?.id)) return;
    this.saveSectionOrder(project, target.parentSectionId, reordered);
  }

  finishSectionDrag(): void {
    this.draggedSection = null;
    this.dropTargetSectionId = null;
    this.dropAfterTarget = false;
  }

  private saveSectionOrder(
    project: ResearchProject,
    parentSectionId: string | null,
    sections: ResearchOutlineSection[],
  ): void {
    this.api
      .reorderOutlineSections(
        project.id,
        parentSectionId,
        sections.map((section) => section.id),
      )
      .subscribe({
        next: () => this.refresh$.next(),
        error: () => (this.error = 'No se pudo reordenar el índice.'),
      });
  }

  updateStatus(
    project: ResearchProject,
    section: ResearchOutlineSection,
    status: ResearchOutlineSectionStatus,
  ): void {
    this.api.updateOutlineSection(project.id, section.id, { status }).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo actualizar el estado.'),
    });
  }

  saveSectionTitle(
    project: ResearchProject,
    section: ResearchOutlineSection,
    input: HTMLInputElement,
  ): void {
    const title = input.value.trim();
    if (!title) {
      input.value = section.title;
      return;
    }
    if (title === section.title) return;
    this.api.updateOutlineSection(project.id, section.id, { title }).subscribe({
      next: () => this.refresh$.next(),
      error: () => {
        input.value = section.title;
        this.error = 'No se pudo actualizar el título de la Section.';
      },
    });
  }

  formatDraft(
    editor: RichTextComponent,
    format: 'heading' | 'bold' | 'italic' | 'bullet-list' | 'number-list' | 'quote' | 'link',
  ): void {
    editor.format(format);
  }

  handleDraftShortcut(event: KeyboardEvent, editor: RichTextComponent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    const format =
      event.key.toLowerCase() === 'b' ? 'bold' : event.key.toLowerCase() === 'i' ? 'italic' : null;
    if (!format) return;
    event.preventDefault();
    this.formatDraft(editor, format);
  }

  activeDraft(section: ResearchOutlineSection): ResearchDraft | null {
    return section.drafts[0] ?? null;
  }

  saveDraft(project: ResearchProject, section: ResearchOutlineSection): void {
    if (this.savingDraft || this.draftContent === this.savedDraftContent) return;
    const draft = this.activeDraft(section);
    this.savingDraft = true;
    this.draftMessage = '';
    const request = draft
      ? this.api.reviseDraft(project.id, draft.id, this.draftContent)
      : this.api.createDraft(project.id, section.id, this.draftContent);
    request.subscribe({
      next: (saved) => {
        this.savingDraft = false;
        this.savedDraftContent = saved.currentRevision?.content ?? '';
        this.draftMessage = draft ? 'Revisión guardada.' : 'Borrador creado.';
        this.refresh$.next();
      },
      error: () => {
        this.savingDraft = false;
        this.draftMessage = 'No se pudo guardar el borrador.';
      },
    });
  }

  saveWorkspace(project: ResearchProject, section: ResearchOutlineSection | null): void {
    if (
      !section ||
      (this.workspaceObjective === this.savedObjective && this.workspaceNotes === this.savedNotes)
    )
      return;
    this.api
      .updateOutlineSection(project.id, section.id, {
        objective: this.workspaceObjective,
        notes: this.workspaceNotes,
      })
      .subscribe({
        next: () => {
          this.savedObjective = this.workspaceObjective;
          this.savedNotes = this.workspaceNotes;
          this.refresh$.next();
        },
        error: () => (this.error = 'No se pudo guardar el contexto de la sección.'),
      });
  }

  selectSectionImage(
    event: Event,
    project: ResearchProject,
    section: ResearchOutlineSection,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (file) this.uploadSectionImage(project, section, file);
  }

  dragSectionImageOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dragProjectCoverOver(event: DragEvent): void {
    this.dragSectionImageOver(event);
  }

  dropSectionImage(
    event: DragEvent,
    project: ResearchProject,
    section: ResearchOutlineSection,
  ): void {
    event.preventDefault();
    const file = event.dataTransfer?.files.item(0) ?? null;
    if (file) this.uploadSectionImage(project, section, file);
  }

  clearSectionImage(project: ResearchProject, section: ResearchOutlineSection): void {
    this.api.clearOutlineSectionImage(project.id, section.id).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo retirar la imagen editorial.'),
    });
  }

  selectProjectCover(event: Event, project: ResearchProject): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (file) this.uploadProjectCover(project, file);
  }

  dropProjectCover(event: DragEvent, project: ResearchProject): void {
    event.preventDefault();
    const file = event.dataTransfer?.files.item(0) ?? null;
    if (file) this.uploadProjectCover(project, file);
  }

  clearProjectCover(project: ResearchProject): void {
    this.api.clearProjectCover(project.id).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo retirar la portada de la investigación.'),
    });
  }

  addQuestion(project: ResearchProject, section: ResearchOutlineSection | null): void {
    const text = this.questionText.trim();
    if (!section || !text) return;
    this.api.createQuestion(project.id, section.id, text).subscribe({
      next: () => {
        this.questionText = '';
        this.refresh$.next();
      },
      error: () => (this.error = 'No se pudo añadir la pregunta.'),
    });
  }

  availableSectionMaterials(
    libraryMaterials: LibraryMaterial[],
    section: ResearchOutlineSection,
  ): LibraryMaterial[] {
    const selected = new Set(section.materialReferences.map((item) => item.materialVersionId));
    return libraryMaterials.filter(
      (material) => material.version && !selected.has(material.version.id),
    );
  }

  addSectionMaterial(
    project: ResearchProject,
    section: ResearchOutlineSection,
    libraryMaterials: LibraryMaterial[],
  ): void {
    if (!this.selectedSectionMaterialVersionId) return;
    const materialVersionId = this.selectedSectionMaterialVersionId;
    const material = libraryMaterials.find((item) => item.version?.id === materialVersionId);
    if (!material) return;
    const alreadyInResearch = project.materials.some((item) => item.id === material.id);
    const request = alreadyInResearch
      ? this.api.addOutlineSectionMaterial(project.id, section.id, materialVersionId)
      : this.api
          .associateLibraryMaterial(project.id, material.id)
          .pipe(
            switchMap(() =>
              this.api.addOutlineSectionMaterial(project.id, section.id, materialVersionId),
            ),
          );
    request.subscribe({
      next: () => {
        this.selectedSectionMaterialVersionId = '';
        this.refresh$.next();
      },
      error: () => (this.error = 'No se pudo añadir el material a esta Section.'),
    });
  }

  sectionMaterialExcerptCount(section: ResearchOutlineSection): number {
    return section.materialReferences.reduce(
      (count, reference) => count + reference.materialVersion.excerpts.length,
      0,
    );
  }

  removeSectionMaterial(
    project: ResearchProject,
    section: ResearchOutlineSection,
    materialVersionId: string,
  ): void {
    this.api.removeOutlineSectionMaterial(project.id, section.id, materialVersionId).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo retirar el material de esta Section.'),
    });
  }

  updateQuestion(
    project: ResearchProject,
    section: ResearchOutlineSection,
    question: ResearchQuestion,
    text: string,
  ): void {
    const next = text.trim();
    if (!next || next === question.text) return;
    this.api.updateQuestion(project.id, section.id, question.id, next).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo actualizar la pregunta.'),
    });
  }

  deleteQuestion(
    project: ResearchProject,
    section: ResearchOutlineSection,
    question: ResearchQuestion,
  ): void {
    this.api.deleteQuestion(project.id, section.id, question.id).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo eliminar la pregunta.'),
    });
  }

  moveQuestion(
    project: ResearchProject,
    section: ResearchOutlineSection,
    index: number,
    direction: -1 | 1,
  ): void {
    const questions = [...section.questions];
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    [questions[index], questions[target]] = [questions[target], questions[index]];
    this.api
      .reorderQuestions(
        project.id,
        section.id,
        questions.map((question) => question.id),
      )
      .subscribe({
        next: () => this.refresh$.next(),
        error: () => (this.error = 'No se pudo reordenar las preguntas.'),
      });
  }

  openSection(project: ResearchProject, section: ResearchOutlineSection): void {
    void this.router.navigate(['/admin/research', project.id], {
      queryParams: { mode: 'index', section: section.id },
    });
  }

  openMode(mode: (typeof this.modes)[number]): void {
    if (!mode.available) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: mode.id, section: mode.id === 'index' ? undefined : null },
      queryParamsHandling: 'merge',
    });
  }

  switchResearch(projectId: string): void {
    if (!projectId) return;
    void this.router.navigate(['/admin/research', projectId], { queryParams: { mode: 'corpus' } });
  }

  readerMaterialId(project: ResearchProject): string {
    return (
      project.materials.find((material) => material.id === this.selectedMaterialId)?.id ??
      project.materials.find((material) => this.isReadableMaterial(material))?.id ??
      ''
    );
  }

  selectMaterial(material: ResearchDocument): void {
    if (!this.isReadableMaterial(material)) return;
    this.selectedMaterialId = material.id;
    this.corpusView = 'reader';
  }

  openCorpusView(view: 'intake' | 'reader'): void {
    this.corpusView = view;
  }

  openMaterialMenu(event: MouseEvent, material: ResearchDocument): void {
    event.preventDefault();
    event.stopPropagation();
    const view = this.document.defaultView;
    this.materialMenu = {
      materialId: material.id,
      title: material.title,
      x: Math.max(8, Math.min(event.clientX, (view?.innerWidth ?? event.clientX + 220) - 220)),
      y: Math.max(8, Math.min(event.clientY, (view?.innerHeight ?? event.clientY + 110) - 110)),
    };
  }

  removeMaterial(project: ResearchProject, materialId: string): void {
    this.materialMenu = null;
    this.api.removeMaterial(project.id, materialId).subscribe({
      next: () => {
        if (this.selectedMaterialId === materialId) this.selectedMaterialId = '';
        this.materialMessage = 'Material retirado de esta investigación.';
        this.refresh$.next();
      },
      error: () => (this.error = 'No se pudo retirar el material del corpus.'),
    });
  }

  deleteLibraryMaterial(project: ResearchProject, materialId: string, title: string): void {
    this.materialMenu = null;
    if (
      !this.document.defaultView?.confirm(
        `¿Eliminar “${title}” de Biblioteca? Se quitará también de todas las investigaciones.`,
      )
    )
      return;
    this.libraryApi.delete(materialId).subscribe({
      next: () => {
        if (this.selectedMaterialId === materialId) this.selectedMaterialId = '';
        this.materialMessage = 'Material eliminado de Biblioteca.';
        this.refresh$.next();
      },
      error: (err) =>
        (this.error = err?.error?.message ?? 'No se pudo eliminar el material de Biblioteca.'),
    });
  }

  @HostListener('document:click')
  closeMaterialMenu(): void {
    this.materialMenu = null;
  }

  isReadableMaterial(material: ResearchDocument): boolean {
    return material.status === 'READY' && material.content !== null;
  }

  materialStatusLabel(material: ResearchDocument): string {
    if (material.status === 'READY') return 'Disponible';
    if (material.status === 'FAILED') return 'Preparación fallida';
    return 'Preparando contenido';
  }

  toggleFocus(): void {
    this.focusMode = !this.focusMode;
    this.document.body.classList.toggle('app-stage-immersive', this.focusMode);
  }

  @HostListener('document:keydown.escape')
  exitFocus(): void {
    this.materialMenu = null;
    if (!this.focusMode) return;
    this.focusMode = false;
    this.document.body.classList.remove('app-stage-immersive');
  }

  ngOnDestroy(): void {
    this.stopMaterialPolling();
    this.document.body.classList.remove('app-stage-immersive');
  }

  roots(project: ResearchProject): ResearchOutlineSection[] {
    return project.outlineSections.filter((section) => !section.parentSectionId);
  }

  children(project: ResearchProject, parentId: string): ResearchOutlineSection[] {
    return project.outlineSections.filter((section) => section.parentSectionId === parentId);
  }

  prepareEvidenceFromExcerpt(excerpt: ResearchLibraryExcerptReference): void {
    this.preparedExcerpt = excerpt;
  }

  addExcerptToSection(project: ResearchProject, section: ResearchOutlineSection): void {
    if (!this.preparedExcerpt) return;
    this.api.addOutlineSectionExcerpt(project.id, section.id, this.preparedExcerpt.id).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo añadir el extracto a esta sección.'),
    });
  }

  reviewClaim(project: ResearchProject, claimId: string, status: ResearchClaimStatus): void {
    this.api.setClaimStatus(project.id, claimId, status).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo actualizar el estado del Claim.'),
    });
  }

  reviewClaimFor(section: ResearchOutlineSection): ResearchClaim | null {
    const claimId = section.dossier.review.nextTask.claimId;
    return section.dossier.claims.find((claim) => claim.id === claimId) ?? null;
  }

  openExcerptInReader(excerpt: ResearchLibraryExcerpt): void {
    this.reviewExcerpt = excerpt;
    setTimeout(() =>
      document
        .getElementById('research-reader')
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
    );
  }

  claimStatusLabel(status: ResearchClaimStatus): string {
    return {
      DRAFT: 'En borrador',
      SUPPORTED: 'Respaldada',
      QUESTIONED: 'Cuestionada',
      CONTRADICTED: 'En contradicción',
    }[status];
  }

  removeExcerptFromSection(
    project: ResearchProject,
    section: ResearchOutlineSection,
    excerptId: string,
  ): void {
    this.api.removeOutlineSectionExcerpt(project.id, section.id, excerptId).subscribe({
      next: () => this.refresh$.next(),
      error: () => (this.error = 'No se pudo eliminar el extracto asociado.'),
    });
  }

  clearPreparedExcerpt(): void {
    this.preparedExcerpt = null;
  }

  refreshResearch(): void {
    this.refresh$.next();
  }

  statusLabel(status: ResearchOutlineSectionStatus): string {
    return {
      NOT_STARTED: 'Sin empezar',
      IN_PROGRESS: 'En desarrollo',
      READY_FOR_REVIEW: 'Lista para revisión',
      COMPLETED: 'Completada',
    }[status];
  }

  private scheduleMaterialPoll(project: ResearchProject): void {
    this.stopMaterialPolling();
    if (!project.materials.some((material) => material.status === 'PENDING_PREPARATION')) return;
    this.materialPollTimer = setTimeout(() => {
      this.materialPollTimer = null;
      this.refresh$.next();
    }, MATERIAL_POLL_INTERVAL_MS);
  }

  private stopMaterialPolling(): void {
    if (this.materialPollTimer === null) return;
    clearTimeout(this.materialPollTimer);
    this.materialPollTimer = null;
  }

  private syncWorkspace(section: ResearchOutlineSection | null): void {
    if (!section || section.id === this.workspaceSectionId) return;
    this.workspaceSectionId = section.id;
    this.workspaceObjective = section.objective ?? '';
    this.workspaceNotes = section.notes ?? '';
    this.savedObjective = this.workspaceObjective;
    this.savedNotes = this.workspaceNotes;
    this.draftContent = section.drafts[0]?.currentRevision?.content ?? '';
    this.draftEditorContent = this.draftContent;
    this.savedDraftContent = this.draftContent;
    this.draftMessage = '';
    this.selectedSectionMaterialVersionId = '';
    this.questionText = '';
    this.reviewExcerpt = null;
    this.sectionSidePanel = 'context';
  }

  private uploadSectionImage(
    project: ResearchProject,
    section: ResearchOutlineSection,
    file: File,
  ): void {
    this.sectionImageUploading = true;
    this.api.uploadOutlineSectionImage(project.id, section.id, file).subscribe({
      next: () => {
        this.sectionImageUploading = false;
        this.refresh$.next();
      },
      error: () => {
        this.sectionImageUploading = false;
        this.error = 'No se pudo subir la imagen. Usa JPEG, PNG, WEBP, GIF o AVIF (máx. 15 MB).';
      },
    });
  }

  private uploadProjectCover(project: ResearchProject, file: File): void {
    this.projectCoverUploading = true;
    this.api.uploadProjectCover(project.id, file).subscribe({
      next: () => {
        this.projectCoverUploading = false;
        this.refresh$.next();
      },
      error: () => {
        this.projectCoverUploading = false;
        this.error = 'No se pudo subir la portada. Usa JPEG, PNG, WEBP, GIF o AVIF (máx. 15 MB).';
      },
    });
  }

  private workspaceMode(mode: string | null, sectionId: string | null) {
    if (sectionId) return 'index';
    return this.modes.some((item) => item.id === mode) ? mode! : 'corpus';
  }
}
