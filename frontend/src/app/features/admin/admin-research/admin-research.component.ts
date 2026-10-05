import { AsyncPipe, DatePipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, convertToParamMap } from '@angular/router';
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
  CreateResearchEntityPayload,
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchDecisionAction,
  ResearchEvidence,
  ResearchDocumentKind,
  ResearchProject,
  ResearchProposalReviewState,
  ResearchProjectStatus,
  ResearchProjectSummary,
  ResearchSourceRecord,
} from '../../../core/api/research.api';
import { RelationTypesApi } from '../../../core/api/relation-types.api';
import { LibraryApi, LibraryMaterial } from '../../../core/api/library.api';
import { MaterialContextMenuComponent, MaterialMenuState } from './material-context-menu.component';
import {
  aiExecutionStateLabel,
  claimIds,
  claimKindLabel,
  claimStatusLabel,
  decisionActionLabel,
  displayedClaims,
  evidenceByIds,
  evidenceSourceTitle,
  filterResearchEvidence,
  groupEvidenceBySource,
  hasQueuedJobs,
  jobStatusLabel,
  jobTypeLabel,
  materialKindLabel,
  materialSize,
  materialStatusLabel,
  projectMeta,
  projectSourceTitle,
  proposalReviewStateLabel,
  sourceRecordLabel,
  sourceTitle,
  statusLabel,
} from './research-list.presenter';

type ResearchStatusFilter = '' | ResearchProjectStatus;

type ResearchListVm = {
  state: 'loading' | 'ready' | 'error';
  projects: ResearchProjectSummary[];
  selected: ResearchProjectSummary | null;
  selectedProject: ResearchProject | null;
  selectedError: string;
  total: number;
  error: string;
  detailMode: boolean;
  createMode: boolean;
  libraryMode: boolean;
  libraryMaterials: LibraryMaterial[];
};

@Component({
  standalone: true,
  selector: 'app-admin-research',
  imports: [AsyncPipe, DatePipe, FormsModule, RouterLink, MaterialContextMenuComponent],
  templateUrl: './admin-research.component.html',
  styleUrl: './admin-research.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminResearchComponent {
  private readonly api = inject(ResearchApi);
  private readonly libraryApi = inject(LibraryApi);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly relationTypesApi = inject(RelationTypesApi);
  readonly relationTypes$ = this.relationTypesApi.list().pipe(catchError(() => of([])));

  @ViewChild('titleInput')
  set titleInputRef(value: ElementRef<HTMLInputElement> | undefined) {
    if (!value || !this.autoFocusCreate) return;
    globalThis.requestAnimationFrame?.(() => value.nativeElement.focus());
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
  readonly claimKinds: ResearchClaimKind[] = [
    'ASSERTION',
    'CONCEPT',
    'CONNECTION_HYPOTHESIS',
    'SYNTHESIS_STATEMENT',
    'CONTRADICTION',
    'OPEN_QUESTION',
  ];

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
  materialKind: ResearchDocumentKind = 'TEXT';
  materialTitle = '';
  materialContent = '';
  materialUrl = '';
  materialPdf: File | null = null;
  claimKind: ResearchClaimKind = 'ASSERTION';
  claimTitle = '';
  claimSummary = '';
  claimSubjectId = '';
  claimObjectId = '';
  selectedClaimEvidenceIds: string[] = [];
  relationFromEntityId = '';
  relationToEntityId = '';
  relationExplanation = '';
  relationTypeId = '';
  selectedRelationClaimIds: string[] = [];
  entityTitle = '';
  entityKind: CreateResearchEntityPayload['kind'] = 'ABSTRACTION';
  entitySummary = '';
  selectedEntityEvidenceIds: string[] = [];
  actionBusy = false;
  actionFeedback = '';
  actionError = '';
  librarySearch = '';
  libraryKind: '' | ResearchDocumentKind = '';
  libraryStatus = '';
  libraryProjectId = '';
  materialMenu: MaterialMenuState | null = null;

  private autoFocusCreate = false;
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly sourceSearch$ = new BehaviorSubject('');

  readonly vm$ = combineLatest([
    this.route.url,
    this.route.paramMap ?? of(convertToParamMap({})),
    this.route.queryParamMap,
    this.refresh$,
  ]).pipe(
    switchMap(([segments, routeParams, params]) => {
      const createMode = segments.some((segment) => segment.path === 'new');
      this.autoFocusCreate = createMode;
      const routeProjectId = routeParams.get('id');
      const selectedId = routeProjectId ?? params.get('project');
      const detailMode = !!routeProjectId;
      const libraryMode = !detailMode && params.get('view') === 'library';

      if (createMode) {
        return of<ResearchListVm>({
          state: 'ready',
          projects: [],
          selected: null,
          selectedProject: null,
          selectedError: '',
          total: 0,
          error: '',
          detailMode: false,
          createMode: true,
          libraryMode: false,
          libraryMaterials: [],
        });
      }

      if (detailMode && selectedId) {
        return this.api.getById(selectedId).pipe(
          map(
            (selectedProject): ResearchListVm => ({
              state: 'ready',
              projects: [],
              selected: null,
              selectedProject,
              selectedError: '',
              total: 0,
              error: '',
              detailMode,
              createMode,
              libraryMode: false,
              libraryMaterials: [],
            }),
          ),
          catchError(() =>
            of<ResearchListVm>({
              state: 'ready',
              projects: [],
              selected: null,
              selectedProject: null,
              selectedError: 'No se pudo abrir la investigación seleccionada.',
              total: 0,
              error: '',
              detailMode,
              createMode,
              libraryMode: false,
              libraryMaterials: [],
            }),
          ),
        );
      }

      if (libraryMode) {
        return combineLatest([this.api.list(), this.libraryApi.list()]).pipe(
          map(([projects, libraryMaterials]): ResearchListVm => {
            if (!this.libraryProjectId) {
              this.libraryProjectId =
                projects.find((project) => project.status === 'ACTIVE')?.id ??
                projects[0]?.id ??
                '';
            }
            return {
              state: 'ready',
              projects,
              selected: null,
              selectedProject: null,
              selectedError: '',
              total: projects.length,
              error: '',
              detailMode: false,
              createMode: false,
              libraryMode: true,
              libraryMaterials,
            };
          }),
          catchError(() =>
            of<ResearchListVm>({
              state: 'error',
              projects: [],
              selected: null,
              selectedProject: null,
              selectedError: '',
              total: 0,
              error: 'No se pudo cargar la Biblioteca.',
              detailMode: false,
              createMode: false,
              libraryMode: true,
              libraryMaterials: [],
            }),
          ),
        );
      }

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
            detailMode,
            createMode,
            libraryMode: false,
            libraryMaterials: [],
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
            detailMode,
            createMode,
            libraryMode: false,
            libraryMaterials: [],
          }),
        ),
      );
    }),
  );

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('project')),
        distinctUntilChanged(),
      )
      .subscribe((projectId) => {
        if (projectId) {
          void this.router.navigate(['/admin/research', projectId], { replaceUrl: true });
        }
      });
  }

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

    this.api.create({ title, objective, scope: scope || undefined }).subscribe({
      next: (project) => {
        this.creating = false;
        this.feedback = `Investigación "${project.title}" creada.`;
        this.title = '';
        this.objective = '';
        this.scope = '';
        this.refresh$.next();
        void this.router.navigate(['/admin/research', project.id]);
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

  createMaterial(projectId: string): void {
    const title = this.materialTitle.trim();
    if (!title) return;

    const request =
      this.materialKind === 'PDF'
        ? this.materialPdf
          ? this.api.createPdfMaterial(projectId, this.materialPdf, title)
          : null
        : this.api.createMaterial(projectId, {
            kind: this.materialKind,
            title,
            content: this.materialKind === 'TEXT' ? this.materialContent.trim() : undefined,
            url: this.materialKind === 'URL' ? this.materialUrl.trim() : undefined,
          });
    if (!request) return;

    this.runProjectAction(request, 'Material añadido a la investigación.', () => {
      this.materialTitle = '';
      this.materialContent = '';
      this.materialUrl = '';
      this.materialPdf = null;
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

  createClaim(projectId: string): void {
    const title = this.claimTitle.trim();
    if (!title || !this.selectedClaimEvidenceIds.length) return;

    this.runProjectAction(
      this.api.createClaim(projectId, {
        kind: this.claimKind,
        title,
        summary: this.claimSummary.trim() || undefined,
        evidenceIds: this.selectedClaimEvidenceIds,
        subjectClaimId:
          this.claimKind === 'CONNECTION_HYPOTHESIS' ? this.claimSubjectId : undefined,
        objectClaimId: this.claimKind === 'CONNECTION_HYPOTHESIS' ? this.claimObjectId : undefined,
      }),
      'Síntesis añadida al Canvas.',
      () => {
        this.claimTitle = '';
        this.claimSummary = '';
        this.claimSubjectId = '';
        this.claimObjectId = '';
        this.selectedClaimEvidenceIds = [];
      },
    );
  }

  toggleClaimEvidence(evidenceId: string, checked: boolean): void {
    this.selectedClaimEvidenceIds = checked
      ? [...new Set([...this.selectedClaimEvidenceIds, evidenceId])]
      : this.selectedClaimEvidenceIds.filter((id) => id !== evidenceId);
  }

  setClaimStatus(projectId: string, claimId: string, status: ResearchClaimStatus): void {
    this.runProjectAction(
      this.api.setClaimStatus(projectId, claimId, status),
      'Estado del Claim actualizado.',
      () => undefined,
    );
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
        globalThis.requestAnimationFrame?.(() => this.evidenceLocatorInput?.nativeElement.focus());
      },
    );
  }

  prepareEvidenceForSource(sourceId: string): void {
    this.evidenceSourceId = sourceId;
    globalThis.requestAnimationFrame?.(() => this.evidenceLocatorInput?.nativeElement.focus());
  }

  prepareSource(projectId: string, sourceId: string): void {
    this.runProjectAction(
      this.api.prepareSource(projectId, sourceId),
      'Fuente enviada a preparación.',
      () => undefined,
    );
  }

  runNextJob(): void {
    if (this.actionBusy) return;

    this.actionBusy = true;
    this.actionFeedback = '';
    this.actionError = '';

    this.api.runNextJob().subscribe({
      next: (result) => {
        this.actionBusy = false;
        this.actionFeedback = result.processed
          ? 'Trabajo ejecutado.'
          : 'No hay trabajos pendientes.';
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

  createRelation(projectId: string): void {
    if (
      !this.relationFromEntityId ||
      !this.relationToEntityId ||
      !this.selectedRelationClaimIds.length
    )
      return;
    this.runProjectAction(
      this.api.createRelation(projectId, {
        fromEntityId: this.relationFromEntityId,
        toEntityId: this.relationToEntityId,
        relationTypeId: this.relationTypeId || undefined,
        explanation: this.relationExplanation.trim() || undefined,
        claimIds: this.selectedRelationClaimIds,
      }),
      'Relación creada.',
      () => {
        this.relationFromEntityId = '';
        this.relationToEntityId = '';
        this.relationExplanation = '';
        this.relationTypeId = '';
        this.selectedRelationClaimIds = [];
      },
    );
  }

  toggleRelationClaim(evidenceId: string, checked: boolean): void {
    this.selectedRelationClaimIds = checked
      ? [...new Set([...this.selectedRelationClaimIds, evidenceId])]
      : this.selectedRelationClaimIds.filter((id) => id !== evidenceId);
  }

  createEntity(projectId: string): void {
    if (!this.entityTitle.trim() || !this.selectedEntityEvidenceIds.length) return;
    this.runProjectAction(
      this.api.createEntity(projectId, {
        kind: this.entityKind,
        title: this.entityTitle.trim(),
        summary: this.entitySummary.trim() || undefined,
        evidenceIds: this.selectedEntityEvidenceIds,
      }),
      'Entidad de investigación creada.',
      () => {
        this.entityTitle = '';
        this.entitySummary = '';
        this.selectedEntityEvidenceIds = [];
      },
    );
  }

  toggleEntityEvidence(evidenceId: string, checked: boolean): void {
    this.selectedEntityEvidenceIds = checked
      ? [...new Set([...this.selectedEntityEvidenceIds, evidenceId])]
      : this.selectedEntityEvidenceIds.filter((id) => id !== evidenceId);
  }

  reviewRelation(
    projectId: string,
    entityId: string,
    reviewState: Extract<ResearchProposalReviewState, 'REVIEWED' | 'REJECTED'>,
  ): void {
    this.runProjectAction(
      this.api.reviewRelation(projectId, entityId, reviewState),
      reviewState === 'REVIEWED' ? 'Relación revisada.' : 'Relación rechazada.',
      () => undefined,
    );
  }

  reviewEntity(
    projectId: string,
    entityId: string,
    reviewState: Extract<ResearchProposalReviewState, 'REVIEWED' | 'REJECTED'>,
  ): void {
    this.runProjectAction(
      this.api.reviewEntity(projectId, entityId, reviewState),
      reviewState === 'REVIEWED' ? 'Candidato revisado.' : 'Candidato rechazado.',
      () => undefined,
    );
  }

  openCreateRoute(): void {
    void this.router.navigate(['/admin/research/new']);
  }

  applyFilters(): void {
    this.refresh$.next();
  }

  setProjectStatus(project: ResearchProjectSummary, status: ResearchProjectStatus): void {
    if (project.status === status || this.actionBusy) return;
    this.actionBusy = true;
    this.actionError = '';
    this.api.updateProjectStatus(project.id, status).subscribe({
      next: () => {
        this.actionBusy = false;
        this.refresh$.next();
      },
      error: (err) => {
        this.actionBusy = false;
        this.actionError = err?.error?.message ?? 'No se pudo cambiar el estado.';
      },
    });
  }

  deleteProject(project: ResearchProjectSummary): void {
    if (
      this.actionBusy ||
      !this.document.defaultView?.confirm(
        `Eliminar “${project.title}” y todo su trabajo privado? Esta acción no se puede deshacer.`,
      )
    )
      return;
    this.actionBusy = true;
    this.actionError = '';
    this.api.deleteProject(project.id).subscribe({
      next: () => {
        this.actionBusy = false;
        this.refresh$.next();
      },
      error: (err) => {
        this.actionBusy = false;
        this.actionError = err?.error?.message ?? 'No se pudo eliminar la investigación.';
      },
    });
  }

  filteredLibraryMaterials(materials: LibraryMaterial[]): LibraryMaterial[] {
    const query = this.librarySearch.trim().toLowerCase();
    return materials.filter((material) => {
      const matchesKind = !this.libraryKind || material.kind === this.libraryKind;
      const matchesStatus = !this.libraryStatus || material.version?.status === this.libraryStatus;
      const text = [material.title, material.version?.originalName, material.version?.url]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesKind && matchesStatus && (!query || text.includes(query));
    });
  }

  associateLibraryMaterial(material: LibraryMaterial): void {
    if (!this.libraryProjectId || this.isMaterialAssociated(material)) return;
    this.runProjectAction(
      this.api.associateLibraryMaterial(this.libraryProjectId, material.id),
      'Material asociado a la investigación.',
      () => undefined,
    );
  }

  isMaterialAssociated(material: LibraryMaterial): boolean {
    return material.research.some((project) => project.id === this.libraryProjectId);
  }

  openLibraryMaterialMenu(event: MouseEvent, material: LibraryMaterial): void {
    event.preventDefault();
    event.stopPropagation();
    const view = this.document.defaultView;
    this.materialMenu = {
      materialId: material.id,
      title: material.title,
      x: Math.max(8, Math.min(event.clientX, (view?.innerWidth ?? event.clientX + 228) - 228)),
      y: Math.max(8, Math.min(event.clientY, (view?.innerHeight ?? event.clientY + 110) - 110)),
    };
  }

  deleteLibraryMaterial(materialId: string, title: string): void {
    this.materialMenu = null;
    if (
      !this.document.defaultView?.confirm(
        `¿Eliminar “${title}” de Biblioteca? Se quitará también de todas las investigaciones.`,
      )
    )
      return;
    this.actionBusy = true;
    this.libraryApi.delete(materialId).subscribe({
      next: () => {
        this.actionBusy = false;
        this.actionFeedback = 'Material eliminado de Biblioteca.';
        this.refresh$.next();
      },
      error: (err) => {
        this.actionBusy = false;
        this.actionError = err?.error?.message ?? 'No se pudo eliminar el material de Biblioteca.';
      },
    });
  }

  @HostListener('document:click')
  closeMaterialMenu(): void {
    this.materialMenu = null;
  }

  clearEvidenceFilters(): void {
    this.evidenceSearch = '';
    this.evidenceSourceFilter = '';
  }

  scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  hasEvidenceFilters(): boolean {
    return Boolean(this.evidenceSearch.trim() || this.evidenceSourceFilter);
  }
  readonly statusLabel = statusLabel;
  readonly jobTypeLabel = jobTypeLabel;
  readonly jobStatusLabel = jobStatusLabel;
  readonly proposalReviewStateLabel = proposalReviewStateLabel;
  readonly materialKindLabel = materialKindLabel;
  readonly materialStatusLabel = materialStatusLabel;
  readonly claimKindLabel = claimKindLabel;
  readonly claimStatusLabel = claimStatusLabel;
  readonly displayedClaims = displayedClaims;
  readonly materialSize = materialSize;
  readonly aiExecutionStateLabel = aiExecutionStateLabel;
  readonly hasQueuedJobs = hasQueuedJobs;
  readonly decisionActionLabel = decisionActionLabel;
  readonly projectMeta = projectMeta;
  readonly sourceTitle = sourceTitle;
  readonly sourceRecordLabel = sourceRecordLabel;
  readonly evidenceSourceTitle = evidenceSourceTitle;
  readonly projectSourceTitle = projectSourceTitle;
  readonly evidenceByIds = evidenceByIds;
  readonly claimIds = claimIds;

  evidenceBySource(project: ResearchProject) {
    return groupEvidenceBySource(project, this.filteredEvidence(project));
  }

  filteredEvidence(project: ResearchProject): ResearchEvidence[] {
    return filterResearchEvidence(project, this.evidenceSearch, this.evidenceSourceFilter);
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
