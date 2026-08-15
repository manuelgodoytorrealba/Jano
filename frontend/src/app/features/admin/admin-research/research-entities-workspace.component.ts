import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  ResearchApi,
  ResearchCanonicalEntityType,
  CreateResearchEntityPayload,
  ResearchEvidence,
  ResearchEntity,
  ResearchRelation,
  ResearchKnowledgeMapGeneration,
  ResearchProposal,
  ResearchProposalReviewState,
} from '../../../core/api/research.api';
import { ResearchGraphComponent } from './research-graph.component';

type EntitiesMode = 'review' | 'map';
type CandidateView = 'pending' | 'reviewed' | 'discarded';

@Component({
  standalone: true,
  selector: 'app-research-entities-workspace',
  imports: [AsyncPipe, FormsModule, ResearchGraphComponent],
  templateUrl: './research-entities-workspace.component.html',
  styleUrl: './research-entities-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchEntitiesWorkspaceComponent {
  private readonly api = inject(ResearchApi);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly researchId$ = new BehaviorSubject<string | null>(null);
  private readonly refresh$ = new BehaviorSubject(0);
  private currentResearchId = '';
  private latestProposals: ResearchProposal[] = [];

  mode: EntitiesMode = 'review';
  view: CandidateView = 'pending';
  query = '';
  kindFilter = '';
  showCandidates = true;
  selectedProposal: ResearchProposal | null = null;
  proposalTitle = '';
  proposalSummary = '';
  selectedEntityKind = '';
  mergeEntityId = '';
  editing = false;
  actionError = '';
  actionMessage = '';
  busy = false;
  generating = false;
  creatingEntity = false;
  manualTitle = '';
  manualSummary = '';
  manualCanonicalType: NonNullable<CreateResearchEntityPayload['canonicalType']> = 'ARTWORK';
  manualEvidenceIds: string[] = [];
  selectedMapEntityId: string | null = null;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.mode = params.get('entitiesView') === 'map' ? 'map' : 'review';
      this.selectedMapEntityId =
        this.mode === 'map' ? params.get('selectedResearchEntityId') : null;
    });
  }

  @Input() evidence: ResearchEvidence[] = [];

  @Input({ required: true })
  set researchId(value: string) {
    this.currentResearchId = value || '';
    this.researchId$.next(this.currentResearchId || null);
    if (this.currentResearchId) this.resumeGenerationPolling();
  }

  get researchId(): string {
    return this.currentResearchId;
  }

  readonly vm$ = this.researchId$.pipe(
    switchMap((researchId) => {
      if (!researchId) return of(this.emptyVm());
      return this.refresh$.pipe(
        switchMap(() =>
          combineLatest([
            this.api.listProposals(researchId, { limit: 100 }).pipe(
              map((page) => ({ items: page.items, error: '' })),
              catchError(() => of({ items: [], error: 'No se pudieron cargar las candidatas.' })),
            ),
            this.api.getKnowledge(researchId, { scope: 'topology' }).pipe(
              map((knowledge) => ({ knowledge, error: '' })),
              catchError(() =>
                of({ knowledge: null, error: 'No se pudo cargar el conocimiento privado.' }),
              ),
            ),
            this.api
              .getKnowledgeMapGeneration(researchId)
              .pipe(
                catchError(() =>
                  of({ job: null, stale: false, canGenerate: false, preparedMaterials: 0 }),
                ),
              ),
          ]).pipe(
            map(([proposals, knowledge, generation]) => ({
              proposals: proposals.items,
              entities: knowledge.knowledge?.entities ?? [],
              relations: knowledge.knowledge?.relations ?? [],
              entityCount: knowledge.knowledge?.entities.length ?? 0,
              relationCount: knowledge.knowledge?.relations.length ?? 0,
              error: proposals.error || knowledge.error,
              generation,
              refreshToken: this.refresh$.value,
            })),
            tap((vm) => (this.latestProposals = vm.proposals)),
          ),
        ),
      );
    }),
  );

  setMode(mode: EntitiesMode): void {
    this.mode = mode;
    this.syncMapContext(mode === 'map' ? this.selectedMapEntityId : null);
  }

  setView(view: CandidateView): void {
    this.view = view;
    this.selectedProposal = null;
    this.editing = false;
  }

  selectProposal(proposal: ResearchProposal): void {
    if (proposal.type !== 'ENTITY') return;
    this.mode = 'review';
    this.view =
      proposal.reviewState === 'REVIEWED'
        ? 'reviewed'
        : proposal.reviewState === 'REJECTED'
          ? 'discarded'
          : 'pending';
    this.selectedProposal = proposal;
    this.proposalTitle = proposal.title;
    this.proposalSummary = proposal.summary ?? '';
    this.selectedEntityKind = proposal.entityKind ?? '';
    this.mergeEntityId = '';
    this.editing = false;
    this.actionError = '';
    this.actionMessage = '';
    this.syncMapContext(null);
  }

  candidates(proposals: ResearchProposal[]): ResearchProposal[] {
    const state = this.reviewState(this.view);
    const query = this.query.trim().toLocaleLowerCase();
    return proposals.filter(
      (proposal) =>
        proposal.type === 'ENTITY' &&
        proposal.reviewState === state &&
        (!this.kindFilter || proposal.entityKind === this.kindFilter) &&
        (!query ||
          `${proposal.title} ${proposal.summary ?? ''}`.toLocaleLowerCase().includes(query)),
    );
  }

  relationsFor(candidate: ResearchProposal, proposals: ResearchProposal[]): ResearchProposal[] {
    if (!candidate.proposalKey) return [];
    return proposals.filter(
      (proposal) =>
        proposal.type === 'RELATION' &&
        proposal.jobId === candidate.jobId &&
        (proposal.relationFromKey === candidate.proposalKey ||
          proposal.relationToKey === candidate.proposalKey),
    );
  }

  otherEndpoint(
    relation: ResearchProposal,
    proposals: ResearchProposal[],
  ): ResearchProposal | null {
    const selectedKey = this.selectedProposal?.proposalKey;
    const key =
      relation.relationFromKey === selectedKey ? relation.relationToKey : relation.relationFromKey;
    return (
      proposals.find(
        (proposal) =>
          proposal.type === 'ENTITY' &&
          proposal.jobId === relation.jobId &&
          proposal.proposalKey === key,
      ) ?? null
    );
  }

  canConsolidateRelation(relation: ResearchProposal, proposals: ResearchProposal[]): boolean {
    const endpoints = proposals.filter(
      (proposal) =>
        proposal.type === 'ENTITY' &&
        proposal.jobId === relation.jobId &&
        (proposal.proposalKey === relation.relationFromKey ||
          proposal.proposalKey === relation.relationToKey),
    );
    return endpoints.length === 2 && endpoints.every((proposal) => !!proposal.convertedEntityId);
  }

  saveProposal(): void {
    const proposal = this.selectedProposal;
    if (!proposal || !this.proposalTitle.trim()) return;
    this.runAction(
      this.api.updateProposal(this.researchId, proposal.id, {
        title: this.proposalTitle.trim(),
        summary: this.proposalSummary.trim(),
        ...(this.selectedEntityKind ? { entityKind: this.selectedEntityKind as never } : {}),
      }),
      'Borrador guardado.',
      false,
    );
  }

  createPrivateEntity(): void {
    if (!this.selectedProposal) return;
    this.runAction(
      this.api.acceptProposal(this.researchId, this.selectedProposal.id),
      'Entidad añadida al conocimiento privado.',
    );
  }

  mergeWithEntity(entities: ResearchEntity[]): void {
    const candidate = this.selectedProposal;
    if (!candidate || !entities.some((entity) => entity.id === this.mergeEntityId)) return;
    const target = entities.find((entity) => entity.id === this.mergeEntityId)!;
    this.runAction(
      this.api.mergeEntityProposal(this.researchId, candidate.id, target.id),
      `Añadido a ${target.title}.`,
    );
  }

  discardSelectedProposal(): void {
    if (!this.selectedProposal) return;
    this.runAction(
      this.api.reviewProposal(this.researchId, this.selectedProposal.id, {
        reviewState: 'REJECTED',
      }),
      'Candidata descartada.',
    );
  }

  reviewRelation(relation: ResearchProposal, accept: boolean): void {
    const action = accept
      ? this.api.acceptProposal(this.researchId, relation.id)
      : this.api.reviewProposal(this.researchId, relation.id, { reviewState: 'REJECTED' });
    this.runAction(action, accept ? 'Relación consolidada.' : 'Relación descartada.', false);
  }

  openMap(): void {
    this.setMode('map');
    this.selectedProposal = null;
  }

  selectMapEntity(entityId: string): void {
    this.selectedMapEntityId = entityId;
    this.syncMapContext(entityId);
  }

  openEntity(entityId: string, entities: ResearchEntity[]): void {
    const entity = entities.find((item) => item.id === entityId);
    if (!entity?.canonicalEntityId) return;
    const returnTo = this.router.serializeUrl(
      this.router.createUrlTree(['/admin/research', this.researchId], {
        queryParams: {
          mode: 'entities',
          entitiesView: 'map',
          selectedResearchEntityId: entity.id,
        },
      }),
    );
    void this.router.navigate(['/admin/entities', entity.canonicalEntityId], {
      queryParams: { returnTo },
    });
  }

  toggleManualEvidence(evidenceId: string, checked: boolean): void {
    this.manualEvidenceIds = checked
      ? [...new Set([...this.manualEvidenceIds, evidenceId])]
      : this.manualEvidenceIds.filter((id) => id !== evidenceId);
  }

  createManualEntity(existingEntities: ResearchEntity[]): void {
    const title = this.manualTitle.trim();
    if (!title || !this.manualEvidenceIds.length) return;
    const existingIds = new Set(existingEntities.map((entity) => entity.id));
    this.busy = true;
    this.actionError = '';
    this.api
      .createEntity(this.researchId, {
        canonicalType: this.manualCanonicalType,
        title,
        summary: this.manualSummary.trim() || undefined,
        evidenceIds: this.manualEvidenceIds,
      })
      .subscribe({
        next: (project) => {
          const entities = project.entities ?? project.knowledge?.entities ?? [];
          const created = entities.find((entity) => !existingIds.has(entity.id));
          this.busy = false;
          this.creatingEntity = false;
          this.manualTitle = '';
          this.manualSummary = '';
          this.manualEvidenceIds = [];
          this.actionMessage = 'Entidad añadida al conocimiento privado.';
          this.mode = 'map';
          this.selectedMapEntityId = created?.id ?? null;
          this.syncMapContext(this.selectedMapEntityId);
          this.refresh$.next(this.refresh$.value + 1);
          this.cdr.markForCheck();
        },
        error: () => {
          this.busy = false;
          this.actionError = 'No se pudo crear la entidad privada.';
          this.cdr.markForCheck();
        },
      });
  }

  promoteEntity(request: { entityId: string; canonicalType: ResearchCanonicalEntityType }): void {
    this.runAction(
      this.api.promoteEntity(this.researchId, request.entityId, request.canonicalType),
      'Entidad promovida como borrador del Knowledge Core.',
      false,
    );
  }

  setGraphReviewState(
    entities: ResearchEntity[],
    relations: ResearchRelation[],
    reviewState: ResearchProposalReviewState,
  ): void {
    const entityActions = entities
      .filter((entity) => entity.reviewState !== reviewState)
      .map((entity) => this.api.reviewEntity(this.researchId, entity.id, reviewState));
    const relationActions = relations
      .filter((relation) => relation.reviewState !== reviewState)
      .map((relation) => this.api.reviewRelation(this.researchId, relation.id, reviewState));
    if (!entityActions.length && !relationActions.length) return;
    this.busy = true;
    this.actionError = '';
    forkJoin([...entityActions, ...relationActions]).subscribe({
      next: () => {
        this.busy = false;
        this.actionMessage =
          reviewState === 'REVIEWED'
            ? 'Todo el grafo está revisado y listo para la publicación.'
            : reviewState === 'PENDING'
              ? 'Todo el grafo ha vuelto a quedar pendiente.'
              : 'Todo el grafo se ha descartado.';
        this.refresh$.next(this.refresh$.value + 1);
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudo actualizar todo el grafo.';
        this.cdr.markForCheck();
      },
    });
  }

  deleteMapEntity(entityId: string, title: string): void {
    if (!window.confirm(`¿Eliminar “${title}” del conocimiento de esta investigación?`)) return;
    this.runAction(
      this.api.deleteEntity(this.researchId, entityId),
      'Entidad eliminada del conocimiento privado.',
    );
    this.selectedMapEntityId = null;
    this.syncMapContext(null);
  }

  reviewMapEntity(request: { entityId: string; reviewState: ResearchProposalReviewState }): void {
    this.runAction(
      this.api.reviewEntity(this.researchId, request.entityId, request.reviewState),
      request.reviewState === 'REVIEWED' ? 'Entidad revisada.' : 'Entidad pendiente.',
    );
  }

  selectNextCandidate(): void {
    const next = this.latestProposals.find(
      (proposal) => proposal.type === 'ENTITY' && proposal.reviewState === 'PENDING',
    );
    if (next) this.selectProposal(next);
  }

  generateKnowledgeMap(): void {
    this.generating = true;
    this.actionError = '';
    this.api.generateKnowledgeMap(this.researchId).subscribe({
      next: () => {
        this.actionMessage = 'JANO está preparando nuevas propuestas para revisión.';
        this.pollGenerationStatus();
      },
      error: () => {
        this.generating = false;
        this.actionError =
          'No se pudo iniciar el análisis. Comprueba que exista material preparado.';
        this.cdr.markForCheck();
      },
    });
  }

  count(proposals: ResearchProposal[], state: ResearchProposalReviewState): number {
    return proposals.filter(
      (proposal) => proposal.type === 'ENTITY' && proposal.reviewState === state,
    ).length;
  }

  progress(proposals: ResearchProposal[]): number {
    const candidates = proposals.filter((proposal) => proposal.type === 'ENTITY');
    return candidates.length
      ? Math.round(
          (candidates.filter((item) => item.reviewState !== 'PENDING').length / candidates.length) *
            100,
        )
      : 0;
  }

  sourceCount(proposal: ResearchProposal): number {
    return new Set(
      proposal.evidence.map((item) => item.evidence.sourceId ?? item.evidence.libraryExcerptId),
    ).size;
  }

  evidenceTitle(evidence: ResearchEvidence): string {
    return (
      evidence.source?.title ??
      evidence.libraryExcerpt?.materialVersion.material.title ??
      'Fuente bibliográfica'
    );
  }

  kindLabel(kind: string | null): string {
    return (
      (
        {
          PERSON: 'Persona',
          WORK: 'Obra',
          ABSTRACTION: 'Concepto',
          EVENT: 'Evento',
          PLACE: 'Lugar',
          ORGANIZATION: 'Organización',
        } as Record<string, string>
      )[kind ?? ''] ?? 'Entidad'
    );
  }

  private reviewState(view: CandidateView): ResearchProposalReviewState {
    return view === 'reviewed' ? 'REVIEWED' : view === 'discarded' ? 'REJECTED' : 'PENDING';
  }

  private syncMapContext(selectedResearchEntityId: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        entitiesView: this.mode === 'map' ? 'map' : null,
        selectedResearchEntityId: this.mode === 'map' ? selectedResearchEntityId : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private emptyVm() {
    return {
      proposals: [],
      entities: [],
      relations: [],
      entityCount: 0,
      relationCount: 0,
      error: '',
      refreshToken: 0,
      generation: {
        job: null,
        stale: false,
        canGenerate: false,
        preparedMaterials: 0,
      } as ResearchKnowledgeMapGeneration,
    };
  }

  private runAction(action: Observable<unknown>, success: string, clearSelection = true): void {
    this.busy = true;
    this.actionError = '';
    this.actionMessage = '';
    action.subscribe({
      next: () => {
        if (clearSelection) this.selectedProposal = null;
        this.editing = false;
        this.busy = false;
        this.actionMessage = success;
        this.refresh$.next(this.refresh$.value + 1);
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.actionError =
          'No se pudo completar la acción. Revisa la evidencia y vuelve a intentarlo.';
        this.cdr.markForCheck();
      },
    });
  }

  private resumeGenerationPolling(): void {
    this.api.getKnowledgeMapGeneration(this.researchId).subscribe((generation) => {
      if (generation.job?.status === 'QUEUED' || generation.job?.status === 'RUNNING') {
        this.generating = true;
        this.pollGenerationStatus();
        this.cdr.markForCheck();
      }
    });
  }

  private pollGenerationStatus(): void {
    window.setTimeout(() => {
      this.api.getKnowledgeMapGeneration(this.researchId).subscribe({
        next: (generation) => {
          this.refresh$.next(this.refresh$.value + 1);
          this.generating =
            generation.job?.status === 'QUEUED' || generation.job?.status === 'RUNNING';
          if (this.generating) this.pollGenerationStatus();
          else if (generation.job?.status === 'FAILED')
            this.actionError = generation.job.lastError ?? 'El análisis no pudo completarse.';
          else if (generation.job?.status === 'SUCCEEDED')
            this.actionMessage = 'Nuevas candidatas disponibles para revisión.';
          this.cdr.markForCheck();
        },
        error: () => {
          this.generating = false;
          this.actionError = 'No se pudo consultar el estado del análisis.';
          this.cdr.markForCheck();
        },
      });
    }, 2_000);
  }
}
