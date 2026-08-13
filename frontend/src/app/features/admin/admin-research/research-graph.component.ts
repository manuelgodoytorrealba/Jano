import { AsyncPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  Renderer2,
  inject,
} from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, map, of, shareReplay, switchMap } from 'rxjs';
import {
  ResearchApi,
  ResearchCanonicalEntityType,
  ResearchEvidence,
  ResearchKnowledge,
  ResearchProposal,
  ResearchRelation,
} from '../../../core/api/research.api';
import { GraphComponent } from '../../graph/graph.component';
import { adaptResearchKnowledgeToGraphData } from './research-knowledge-visual-adapter';

type SelectedContext =
  | { kind: 'entity'; entityId: string }
  | { kind: 'proposal'; proposalId: string }
  | null;

@Component({
  standalone: true,
  selector: 'app-research-graph',
  imports: [AsyncPipe, GraphComponent],
  templateUrl: './research-graph.component.html',
  styleUrl: './research-graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchGraphComponent implements OnDestroy {
  private readonly api = inject(ResearchApi);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly researchId$ = new BehaviorSubject('');
  private readonly proposals$ = new BehaviorSubject<ResearchProposal[]>([]);
  private readonly showCandidates$ = new BehaviorSubject(true);
  private readonly refresh$ = new BehaviorSubject(0);
  private readonly selection$ = new BehaviorSubject<SelectedContext>(null);

  @Output() readonly proposalSelected = new EventEmitter<ResearchProposal>();
  @Output() readonly reviewRequested = new EventEmitter<ResearchProposal>();
  @Output() readonly showCandidatesChange = new EventEmitter<boolean>();
  @Output() readonly entitySelected = new EventEmitter<string>();
  @Output() readonly entityOpen = new EventEmitter<string>();
  @Output() readonly promotionRequested = new EventEmitter<{
    entityId: string;
    canonicalType: ResearchCanonicalEntityType;
  }>();

  @Input() promotionBusy = false;
  focused = false;

  @Input({ required: true })
  set researchId(value: string) {
    if (value && value !== this.researchId$.value) {
      this.selection$.next(null);
      this.researchId$.next(value);
    }
  }

  @Input()
  set proposals(value: ResearchProposal[]) {
    this.proposals$.next(value ?? []);
  }

  @Input()
  set showCandidates(value: boolean) {
    this.showCandidates$.next(value);
  }

  @Input()
  set refreshToken(value: number) {
    this.refresh$.next(value);
  }

  @Input()
  set selectedEntityId(value: string | null) {
    this.selection$.next(value ? { kind: 'entity', entityId: value } : null);
  }

  readonly topology$ = combineLatest([this.researchId$, this.refresh$]).pipe(
    switchMap(([researchId]) =>
      researchId
        ? this.api.getKnowledge(researchId, { scope: 'topology' }).pipe(
            map((knowledge) => ({ knowledge, error: '' })),
            catchError(() => of({ knowledge: null, error: 'No se pudo cargar el mapa privado.' })),
          )
        : of({ knowledge: null, error: '' }),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly selectedKnowledge$ = combineLatest([this.researchId$, this.selection$]).pipe(
    switchMap(([researchId, selection]) => {
      if (!researchId || selection?.kind !== 'entity') return of(null);
      return this.api
        .getKnowledge(researchId, {
          scope: 'traceability',
          focusType: 'entity',
          focusId: selection.entityId,
        })
        .pipe(catchError(() => of(null)));
    }),
  );

  readonly vm$ = combineLatest([
    this.topology$,
    this.proposals$,
    this.showCandidates$,
    this.selection$,
    this.selectedKnowledge$,
  ]).pipe(
    map(([topology, proposals, showCandidates, selection, selectedKnowledge]) => {
      const knowledge = topology.knowledge;
      const selectedProposal =
        selection?.kind === 'proposal'
          ? (proposals.find((proposal) => proposal.id === selection.proposalId) ?? null)
          : null;
      const selectedEntity =
        selection?.kind === 'entity'
          ? (selectedKnowledge?.entities.find((entity) => entity.id === selection.entityId) ??
            knowledge?.entities.find((entity) => entity.id === selection.entityId) ??
            null)
          : null;
      return {
        knowledge,
        graphData: knowledge
          ? adaptResearchKnowledgeToGraphData(knowledge, proposals, showCandidates)
          : null,
        showCandidates,
        selectedProposal,
        selectedEntity,
        selectedKnowledge,
        selectedNodeId:
          selection?.kind === 'entity'
            ? selection.entityId
            : selection?.kind === 'proposal'
              ? `proposal:${selection.proposalId}`
              : null,
        error: topology.error,
      };
    }),
  );

  selectNode(nodeId: string): void {
    if (nodeId.startsWith('proposal:')) {
      const proposal = this.proposals$.value.find((item) => `proposal:${item.id}` === nodeId);
      if (!proposal) return;
      this.selection$.next({ kind: 'proposal', proposalId: proposal.id });
      this.proposalSelected.emit(proposal);
      return;
    }
    this.selection$.next({ kind: 'entity', entityId: nodeId });
    this.entitySelected.emit(nodeId);
  }

  openNode(nodeId: string): void {
    if (!nodeId.startsWith('proposal:')) this.entityOpen.emit(nodeId);
  }

  canonicalTypesFor(kind: string): Array<{ value: ResearchCanonicalEntityType; label: string }> {
    switch (kind) {
      case 'PERSON':
        return [{ value: 'ARTIST', label: 'Artista' }];
      case 'WORK':
        return [
          { value: 'ARTWORK', label: 'Obra' },
          { value: 'ARTICLE', label: 'Artículo' },
          { value: 'TEXT', label: 'Texto' },
        ];
      case 'ABSTRACTION':
        return [
          { value: 'CONCEPT', label: 'Concepto' },
          { value: 'MOVEMENT', label: 'Movimiento' },
          { value: 'PERIOD', label: 'Periodo' },
        ];
      case 'EVENT':
        return [{ value: 'EVENT', label: 'Evento' }];
      case 'PLACE':
        return [{ value: 'PLACE', label: 'Lugar' }];
      case 'ORGANIZATION':
        return [{ value: 'ORGANIZATION', label: 'Organización' }];
      default:
        return [];
    }
  }

  requestPromotion(entityId: string, kind: string, canonicalType: string): void {
    const valid = this.canonicalTypesFor(kind).find((item) => item.value === canonicalType);
    if (valid) this.promotionRequested.emit({ entityId, canonicalType: valid.value });
  }

  toggleFocus(): void {
    this.focused = !this.focused;
    this.syncFocusBody();
  }

  @HostListener('window:keydown.escape')
  exitFocus(): void {
    if (!this.focused) return;
    this.focused = false;
    this.syncFocusBody();
  }

  ngOnDestroy(): void {
    if (this.focused) this.renderer.removeClass(this.document.body, 'app-stage-immersive');
  }

  toggleCandidates(checked: boolean): void {
    this.showCandidates$.next(checked);
    this.showCandidatesChange.emit(checked);
    if (!checked && this.selection$.value?.kind === 'proposal') this.selection$.next(null);
  }

  review(proposal: ResearchProposal): void {
    this.reviewRequested.emit(proposal);
  }

  evidenceTitle(evidence: ResearchEvidence): string {
    return (
      evidence.source?.title ?? evidence.libraryExcerpt?.materialVersion.material.title ?? 'Fuente'
    );
  }

  relationsFor(
    entityId: string,
    topology: ResearchKnowledge | null,
    traceability: ResearchKnowledge | null,
  ): ResearchRelation[] {
    const relations = [...(topology?.relations ?? []), ...(traceability?.relations ?? [])].filter(
      (relation, index, all) => all.findIndex((item) => item.id === relation.id) === index,
    );
    return relations.filter(
      (relation) => relation.fromEntityId === entityId || relation.toEntityId === entityId,
    );
  }

  relationTarget(relation: ResearchRelation, entityId: string): string {
    return relation.fromEntityId === entityId
      ? (relation.toEntity?.title ?? relation.toEntityId)
      : (relation.fromEntity?.title ?? relation.fromEntityId);
  }

  private syncFocusBody(): void {
    if (this.focused) this.renderer.addClass(this.document.body, 'app-stage-immersive');
    else this.renderer.removeClass(this.document.body, 'app-stage-immersive');
  }
}
