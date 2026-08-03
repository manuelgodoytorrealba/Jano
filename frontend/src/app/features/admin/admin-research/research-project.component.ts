import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  ResearchLibraryExcerptReference,
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
export class ResearchProjectComponent {
  private readonly api = inject(ResearchApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private workspaceSectionId: string | null = null;
  private savedObjective = '';
  private savedNotes = '';

  title = '';
  questionText = '';
  workspaceObjective = '';
  workspaceNotes = '';
  error = '';
  preparedExcerpt: ResearchLibraryExcerptReference | null = null;
  readonly statuses: ResearchOutlineSectionStatus[] = [
    'NOT_STARTED',
    'IN_PROGRESS',
    'READY_FOR_REVIEW',
    'COMPLETED',
  ];

  readonly vm$ = combineLatest([this.route.paramMap, this.refresh$]).pipe(
    switchMap(([params]) =>
      this.api.getById(params.get('id')!).pipe(
        map((project) => {
          const activeSection =
            project.outlineSections.find((section) => section.id === params.get('sectionId')) ??
            null;
          this.syncWorkspace(activeSection);
          return { project, activeSection, error: '' };
        }),
        catchError(() =>
          of({ project: null, activeSection: null, error: 'No se pudo abrir esta investigación.' }),
        ),
      ),
    ),
  );

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
    void this.router.navigate(['/admin/research', project.id, 'sections', section.id]);
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
  }
}
