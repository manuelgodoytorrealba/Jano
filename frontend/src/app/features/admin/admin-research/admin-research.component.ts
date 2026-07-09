import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import {
  ResearchApi,
  ResearchDecisionAction,
  ResearchEvidence,
  ResearchJob,
  ResearchProject,
  ResearchProjectStatus,
  ResearchProjectSummary,
  ResearchProjectSource,
  ResearchSourceRecord,
} from '../../../core/api/research.api';
import { ResearchFindingsSectionComponent } from './research-findings-section.component';

type ResearchStatusFilter = '' | ResearchProjectStatus;

type ResearchListVm = {
  state: 'loading' | 'ready' | 'error';
  projects: ResearchProjectSummary[];
  selected: ResearchProjectSummary | null;
  selectedProject: ResearchProject | null;
  selectedError: string;
  total: number;
  error: string;
};

type ResearchEvidenceGroup = {
  sourceId: string;
  title: string;
  evidence: ResearchEvidence[];
};

@Component({
  standalone: true,
  selector: 'app-admin-research',
  imports: [AsyncPipe, DatePipe, FormsModule, RouterLink, ResearchFindingsSectionComponent],
  templateUrl: './admin-research.component.html',
  styleUrl: './admin-research.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminResearchComponent {
  private readonly api = inject(ResearchApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('titleInput')
  set titleInputRef(value: ElementRef<HTMLInputElement> | undefined) {
    if (!value || !this.autoFocusCreate) return;
    requestAnimationFrame(() => value.nativeElement.focus());
  }

  @ViewChild('evidenceLocatorInput')
  private evidenceLocatorInput?: ElementRef<HTMLInputElement>;

  readonly statuses: ResearchStatusFilter[] = [
    '',
    'ACTIVE',
    'PAUSED',
    'READY_TO_DECIDE',
    'ARCHIVED',
  ];
  readonly decisionActions: ResearchDecisionAction[] = ['INCORPORATE', 'REJECT', 'POSTPONE'];

  title = '';
  objective = '';
  scope = '';
  search = '';
  status: ResearchStatusFilter = '';
  evidenceSearch = '';
  evidenceSourceFilter = '';
  creating = false;
  feedback = '';
  error = '';

  sourceId = '';
  sourceSearch = '';
  selectedSourceLabel = '';
  sourceNote = '';
  evidenceSourceId = '';
  evidenceSourceVersion = '';
  evidenceLocator = '';
  evidenceQuote = '';
  evidenceContext = '';
  evidenceNote = '';
  findingTitle = '';
  findingKind = '';
  findingSummary = '';
  selectedFindingEvidenceIds: string[] = [];
  findingDecisionNotes: Record<string, string> = {};
  actionBusy = false;
  actionFeedback = '';
  actionError = '';

  private autoFocusCreate = false;
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly sourceSearch$ = new BehaviorSubject('');

  readonly vm$ = combineLatest([this.route.url, this.route.queryParamMap, this.refresh$]).pipe(
    switchMap(([segments, params]) => {
      this.autoFocusCreate = segments.some((segment) => segment.path === 'new');
      const selectedId = params.get('project');

      return this.api.list().pipe(
        switchMap((projects) => {
          const filtered = this.filterProjects(projects);
          const selected = projects.find((project) => project.id === selectedId) ?? null;
          const base = {
            state: 'ready' as const,
            projects: filtered,
            selected,
            selectedProject: null,
            selectedError: '',
            total: projects.length,
            error: '',
          };

          if (!selected) return of<ResearchListVm>(base);

          return this.api.getById(selected.id).pipe(
            map((selectedProject): ResearchListVm => ({ ...base, selectedProject })),
            catchError(() =>
              of<ResearchListVm>({
                ...base,
                selectedError: 'No se pudo abrir la investigación seleccionada.',
              }),
            ),
          );
        }),
        catchError(() =>
          of<ResearchListVm>({
            state: 'error',
            projects: [],
            selected: null,
            selectedProject: null,
            selectedError: '',
            total: 0,
            error: 'No se pudieron cargar las investigaciones.',
          }),
        ),
      );
    }),
  );

  readonly sourceResults$ = this.sourceSearch$.pipe(
    debounceTime(180),
    distinctUntilChanged(),
    switchMap((query) => {
      const trimmed = query.trim();
      if (!trimmed) return of([]);

      return this.api.searchSources(trimmed).pipe(
        catchError(() => {
          this.actionError = 'No se pudieron buscar fuentes.';
          return of([]);
        }),
      );
    }),
  );

  createResearch(): void {
    const title = this.title.trim();
    const objective = this.objective.trim();
    const scope = this.scope.trim();
    if (!title || !objective || this.creating) return;

    this.creating = true;
    this.feedback = '';
    this.error = '';

    this.api
      .create({
        title,
        objective,
        scope: scope || undefined,
      })
      .subscribe({
        next: (project) => {
          this.creating = false;
          this.feedback = `Investigación "${project.title}" creada.`;
          this.title = '';
          this.objective = '';
          this.scope = '';
          this.refresh$.next();
          void this.router.navigate(['/admin/research'], { queryParams: { project: project.id } });
        },
        error: (err) => {
          this.creating = false;
          this.error = err?.error?.message ?? 'No se pudo crear la investigación.';
        },
      });
  }

  addSource(projectId: string): void {
    const sourceId = this.sourceId.trim();
    if (!sourceId) return;

    this.runProjectAction(
      this.api.addSource(projectId, { sourceId, note: this.sourceNote.trim() || undefined }),
      'Fuente asociada.',
      () => {
        this.sourceId = '';
        this.sourceSearch = '';
        this.selectedSourceLabel = '';
        this.sourceNote = '';
        this.sourceSearch$.next('');
      },
    );
  }

  searchSources(): void {
    this.sourceId = '';
    this.selectedSourceLabel = '';
    this.sourceSearch$.next(this.sourceSearch.trim());
  }

  selectSource(source: ResearchSourceRecord): void {
    this.sourceId = source.id;
    this.selectedSourceLabel = this.sourceRecordLabel(source);
    this.sourceSearch = this.selectedSourceLabel;
  }

  createEvidence(projectId: string): void {
    const sourceId = this.evidenceSourceId.trim();
    const sourceVersion = this.evidenceSourceVersion.trim();
    const locator = this.evidenceLocator.trim();
    const quote = this.evidenceQuote.trim();
    if (!sourceId || !sourceVersion || !locator || !quote) return;

    this.runProjectAction(
      this.api.createEvidence(projectId, {
        sourceId,
        sourceVersion,
        locator,
        quote,
        context: this.evidenceContext.trim() || undefined,
        note: this.evidenceNote.trim() || undefined,
      }),
      'Evidencia registrada.',
      () => {
        this.evidenceLocator = '';
        this.evidenceQuote = '';
        this.evidenceContext = '';
        this.evidenceNote = '';
        requestAnimationFrame(() => this.evidenceLocatorInput?.nativeElement.focus());
      },
    );
  }

  prepareEvidenceForSource(sourceId: string): void {
    this.evidenceSourceId = sourceId;
    requestAnimationFrame(() => this.evidenceLocatorInput?.nativeElement.focus());
  }

  prepareSource(projectId: string, sourceId: string): void {
    this.runProjectAction(
      this.api.prepareSource(projectId, sourceId),
      'Fuente enviada a preparación.',
      () => undefined,
    );
  }

  createFinding(projectId: string): void {
    const title = this.findingTitle.trim();
    const evidenceIds = this.selectedFindingEvidenceIds;
    if (!title || !evidenceIds.length) return;

    this.runProjectAction(
      this.api.createFinding(projectId, {
        title,
        evidenceIds,
        kind: this.findingKind.trim() || undefined,
        summary: this.findingSummary.trim() || undefined,
      }),
      'Hallazgo propuesto.',
      () => {
        this.findingTitle = '';
        this.findingKind = '';
        this.findingSummary = '';
        this.selectedFindingEvidenceIds = [];
      },
    );
  }

  toggleFindingEvidence(evidenceId: string, checked: boolean): void {
    if (checked) {
      this.selectFindingEvidence(evidenceId);
    } else {
      this.removeFindingEvidence(evidenceId);
    }
  }

  selectFindingEvidence(evidenceId: string): void {
    this.selectedFindingEvidenceIds = [
      ...new Set([...this.selectedFindingEvidenceIds, evidenceId]),
    ];
  }

  selectFindingEvidenceGroup(evidenceIds: string[]): void {
    this.selectedFindingEvidenceIds = [
      ...new Set([...this.selectedFindingEvidenceIds, ...evidenceIds]),
    ];
  }

  removeFindingEvidence(evidenceId: string): void {
    this.selectedFindingEvidenceIds = this.selectedFindingEvidenceIds.filter(
      (id) => id !== evidenceId,
    );
  }

  isFindingEvidenceSelected(evidenceId: string): boolean {
    return this.selectedFindingEvidenceIds.includes(evidenceId);
  }

  setFindingDecisionNote(findingId: string, note: string): void {
    this.findingDecisionNotes = { ...this.findingDecisionNotes, [findingId]: note };
  }

  decideFinding(projectId: string, findingId: string, action: ResearchDecisionAction): void {
    const note = this.findingDecisionNotes[findingId]?.trim() || undefined;

    this.runProjectAction(
      this.api.decideFinding(projectId, findingId, { action, note }),
      'Decisión registrada.',
      () => {
        this.findingDecisionNotes = { ...this.findingDecisionNotes, [findingId]: '' };
      },
    );
  }

  openCreateRoute(): void {
    void this.router.navigate(['/admin/research/new']);
  }

  applyFilters(): void {
    this.refresh$.next();
  }

  clearEvidenceFilters(): void {
    this.evidenceSearch = '';
    this.evidenceSourceFilter = '';
  }

  hasEvidenceFilters(): boolean {
    return Boolean(this.evidenceSearch.trim() || this.evidenceSourceFilter);
  }

  statusLabel(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Activa',
      PAUSED: 'Pausada',
      READY_TO_DECIDE: 'Lista para decidir',
      ARCHIVED: 'Archivada',
    };
    return labels[(status ?? '').toUpperCase()] ?? 'Investigación';
  }

  jobTypeLabel(type: ResearchJob['type'] | string | null | undefined): string {
    const labels: Record<string, string> = {
      PREPARE_SOURCE: 'Preparar fuente',
      EXTRACT_FINDINGS: 'Extraer hallazgos',
    };
    return labels[(type ?? '').toUpperCase()] ?? 'Trabajo';
  }

  jobStatusLabel(status: ResearchJob['status'] | string | null | undefined): string {
    const labels: Record<string, string> = {
      QUEUED: 'En cola',
      RUNNING: 'En curso',
      SUCCEEDED: 'Completado',
      FAILED: 'Fallido',
    };
    return labels[(status ?? '').toUpperCase()] ?? 'Estado desconocido';
  }

  decisionActionLabel(action: ResearchDecisionAction | string | null | undefined): string {
    const labels: Record<string, string> = {
      INCORPORATE: 'Incorporar',
      REJECT: 'Rechazar',
      POSTPONE: 'Posponer',
    };
    return labels[(action ?? '').toUpperCase()] ?? 'Decisión';
  }

  projectMeta(project: ResearchProjectSummary): string {
    const counts = project._count;
    if (!counts) return project.scope ?? 'Investigación documental';
    return `${counts.sources} fuentes · ${counts.evidence} evidencias · ${counts.findings} hallazgos`;
  }

  sourceTitle(item: ResearchProjectSource): string {
    const source = item.source;
    if (!source) return 'Fuente asociada';
    return this.sourceRecordLabel(source);
  }

  sourceRecordLabel(source: ResearchSourceRecord): string {
    return source.author ? `${source.title} · ${source.author}` : source.title;
  }

  evidenceSourceTitle(project: ResearchProject, evidence: ResearchEvidence): string {
    return this.projectSourceTitle(project, evidence.sourceId);
  }

  projectSourceTitle(project: ResearchProject, sourceId: string): string {
    const item = project.sources.find((source) => source.sourceId === sourceId);
    return item ? this.sourceTitle(item) : 'Fuente asociada';
  }

  evidenceBySource(project: ResearchProject): ResearchEvidenceGroup[] {
    const groups = new Map<string, ResearchEvidence[]>();
    for (const evidence of this.filteredEvidence(project)) {
      groups.set(evidence.sourceId, [...(groups.get(evidence.sourceId) ?? []), evidence]);
    }
    return [...groups.entries()].map(([sourceId, evidence]) => ({
      sourceId,
      title: this.projectSourceTitle(project, sourceId),
      evidence,
    }));
  }

  filteredEvidence(project: ResearchProject): ResearchEvidence[] {
    const query = this.evidenceSearch.trim().toLowerCase();
    return project.evidence.filter((evidence) => {
      const matchesSource =
        !this.evidenceSourceFilter || evidence.sourceId === this.evidenceSourceFilter;
      if (!matchesSource) return false;
      if (!query) return true;

      const source = project.sources.find((item) => item.sourceId === evidence.sourceId)?.source;
      const text = [
        evidence.quote,
        evidence.locator,
        evidence.sourceVersion,
        evidence.context,
        evidence.note,
        source?.title,
        source?.author,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
  }

  findingCountForEvidence(project: ResearchProject, evidenceId: string): number {
    return project.findings.filter((finding) =>
      (finding.evidence ?? []).some((item) => item.evidenceId === evidenceId),
    ).length;
  }

  evidenceByIds(project: ResearchProject, evidenceIds: string[]): ResearchEvidence[] {
    return evidenceIds
      .map((id) => project.evidence.find((evidence) => evidence.id === id))
      .filter((evidence): evidence is ResearchEvidence => Boolean(evidence));
  }

  evidenceIds(evidence: ResearchEvidence[]): string[] {
    return evidence.map((item) => item.id);
  }

  private runProjectAction(
    request: Observable<ResearchProject>,
    message: string,
    reset: () => void,
  ): void {
    if (this.actionBusy) return;

    this.actionBusy = true;
    this.actionFeedback = '';
    this.actionError = '';

    request.subscribe({
      next: () => {
        this.actionBusy = false;
        this.actionFeedback = message;
        reset();
        this.refresh$.next();
      },
      error: (err) => {
        this.actionBusy = false;
        this.actionError =
          err?.error?.message ??
          'No se pudo completar la acción. Revisa los datos y vuelve a intentarlo.';
      },
    });
  }

  private filterProjects(projects: ResearchProjectSummary[]): ResearchProjectSummary[] {
    const query = this.search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = !this.status || project.status === this.status;
      const text = `${project.title} ${project.objective} ${project.scope ?? ''}`.toLowerCase();
      return matchesStatus && (!query || text.includes(query));
    });
  }
}
