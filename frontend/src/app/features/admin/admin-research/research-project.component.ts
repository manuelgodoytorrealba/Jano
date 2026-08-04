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
} from '../../../core/api/research.api';
import { ResearchClaimCaptureComponent } from './research-claim-capture.component';
import { ResearchEvidenceCaptureComponent } from './research-evidence-capture.component';
import { ResearchGraphComponent } from './research-graph.component';
import { ResearchMaterialReaderComponent } from './research-material-reader.component';

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
  ],
  templateUrl: './research-project.component.html',
  styleUrl: './research-project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchProjectComponent implements OnDestroy {
  private readonly api = inject(ResearchApi);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private workspaceSectionId: string | null = null;
  private savedObjective = '';
  private savedNotes = '';

  readonly modes = [
    { id: 'corpus', label: 'Corpus', available: true },
    { id: 'index', label: 'Índice', available: true },
    { id: 'argument', label: 'Argumento', available: false },
    { id: 'entities', label: 'Entidades', available: false },
    { id: 'publication', label: 'Publicación', available: false },
  ] as const;

  title = '';
  questionText = '';
  workspaceObjective = '';
  workspaceNotes = '';
  error = '';
  preparedExcerpt: ResearchLibraryExcerptReference | null = null;
  reviewExcerpt: ResearchLibraryExcerpt | null = null;
  materialKind: ResearchDocumentKind = 'TEXT';
  materialTitle = '';
  materialContent = '';
  materialUrl = '';
  materialPdf: File | null = null;
  addingMaterial = false;
  materialMessage = '';
  selectedMaterialId = '';
  focusMode = false;
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
      combineLatest([this.api.getById(params.get('id')!), this.api.list()]).pipe(
        map(([project, projects]) => {
          const mode = this.workspaceMode(query.get('mode'), params.get('sectionId'));
          const sectionId = query.get('section') ?? params.get('sectionId');
          const activeSection =
            project.outlineSections.find((section) => section.id === sectionId) ??
            (mode === 'index' ? project.outlineSections[0] : null) ??
            null;
          this.syncWorkspace(activeSection);
          return { project, projects, activeSection, mode, error: '' };
        }),
        catchError(() =>
          of({
            project: null,
            projects: [],
            activeSection: null,
            mode: 'corpus',
            error: 'No se pudo abrir esta investigación.',
          }),
        ),
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
    this.materialPdf = input.files?.[0] ?? null;
    if (this.materialPdf && !this.materialTitle.trim()) {
      this.materialTitle = this.materialPdf.name.replace(/\.pdf$/i, '');
    }
  }

  canCreateMaterial(): boolean {
    if (!this.materialTitle.trim()) return false;
    if (this.materialKind === 'TEXT') return Boolean(this.materialContent.trim());
    if (this.materialKind === 'URL') return Boolean(this.materialUrl.trim());
    return Boolean(this.materialPdf);
  }

  createSection(project: ResearchProject, parentSectionId?: string): void {
    const title = this.title.trim();
    if (!title) return;
    this.api
      .createOutlineSection(project.id, { title, ...(parentSectionId ? { parentSectionId } : {}) })
      .subscribe({
        next: () => {
          this.title = '';
          this.refresh$.next();
        },
        error: () => (this.error = 'No se pudo crear la sección.'),
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
      project.materials.find(
        (material) => material.id === this.selectedMaterialId && this.isReadableMaterial(material),
      )?.id ??
      project.materials.find((material) => this.isReadableMaterial(material))?.id ??
      ''
    );
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
    if (!this.focusMode) return;
    this.focusMode = false;
    this.document.body.classList.remove('app-stage-immersive');
  }

  ngOnDestroy(): void {
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

  private syncWorkspace(section: ResearchOutlineSection | null): void {
    if (!section || section.id === this.workspaceSectionId) return;
    this.workspaceSectionId = section.id;
    this.workspaceObjective = section.objective ?? '';
    this.workspaceNotes = section.notes ?? '';
    this.savedObjective = this.workspaceObjective;
    this.savedNotes = this.workspaceNotes;
    this.questionText = '';
    this.reviewExcerpt = null;
  }

  private workspaceMode(mode: string | null, sectionId: string | null) {
    if (sectionId) return 'index';
    return this.modes.some((item) => item.id === mode) ? mode! : 'corpus';
  }
}
