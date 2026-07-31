import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, catchError, map, of, shareReplay, switchMap } from 'rxjs';
import {
  ResearchApi,
  ResearchClaim,
  ResearchEvidence,
  ResearchKnowledge,
  ResearchKnowledgeRequest,
  ResearchRelation,
} from '../../../core/api/research.api';
import { createCircularGraphLayout, createLinePath } from '../../graph/graph-primitives';
import {
  ResearchVisualGraphEdge,
  ResearchVisualGraphModel,
  adaptResearchKnowledgeToVisualGraph,
} from './research-knowledge-visual-adapter';

type ResearchGraphSelection = {
  kind: 'entity' | 'relation' | 'claim' | 'evidence';
  id: string;
} | null;

type ResearchGraphVm = {
  knowledge: ResearchKnowledge | null;
  visual: ResearchVisualGraphModel | null;
  selection: ResearchGraphSelection;
  positions: Record<string, { x: number; y: number }>;
  selectedEntity: ResearchKnowledge['entities'][number] | null;
  selectedRelation: ResearchRelation | null;
  selectedClaim: ResearchClaim | null;
  selectedEvidence: ResearchEvidence | null;
  error: string;
};

@Component({
  standalone: true,
  selector: 'app-research-graph',
  imports: [AsyncPipe],
  templateUrl: './research-graph.component.html',
  styleUrl: './research-graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchGraphComponent {
  private readonly api = inject(ResearchApi);
  private readonly projectId$ = new BehaviorSubject<string | null>(null);
  private readonly request$ = new BehaviorSubject<ResearchKnowledgeRequest>({ scope: 'topology' });
  private readonly selection$ = new BehaviorSubject<ResearchGraphSelection>(null);
  private projectId: string | null = null;

  @Input({ required: true })
  set researchId(value: string) {
    if (!value || value === this.projectId) return;
    this.projectId = value;
    this.selection$.next(null);
    this.request$.next({ scope: 'topology' });
    this.projectId$.next(value);
  }

  private readonly knowledgeState$ = combineLatest([this.projectId$, this.request$]).pipe(
    switchMap(([projectId, request]) => {
      if (!projectId) return of({ knowledge: null, error: '' });
      return this.api.getKnowledge(projectId, request).pipe(
        map((knowledge) => ({ knowledge, error: '' })),
        catchError(() =>
          of({ knowledge: null, error: 'No se pudo cargar el conocimiento de investigación.' }),
        ),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly vm$ = combineLatest([this.knowledgeState$, this.selection$]).pipe(
    map(([state, selection]) => this.toVm(state.knowledge, selection, state.error)),
  );

  selectEntity(entityId: string): void {
    this.selection$.next({ kind: 'entity', id: entityId });
    this.request$.next({ scope: 'focus', focusType: 'entity', focusId: entityId });
  }

  selectRelation(relationId: string): void {
    this.selection$.next({ kind: 'relation', id: relationId });
    this.request$.next({ scope: 'traceability', focusType: 'relation', focusId: relationId });
  }

  selectClaim(claimId: string): void {
    this.selection$.next({ kind: 'claim', id: claimId });
  }

  selectEvidence(evidenceId: string): void {
    this.selection$.next({ kind: 'evidence', id: evidenceId });
  }
  evidenceTitle(evidence: ResearchEvidence): string {
    return (
      evidence.source?.title ??
      evidence.libraryExcerpt?.materialVersion.material.source?.title ??
      'Fuente bibliográfica'
    );
  }

  showTopology(): void {
    this.selection$.next(null);
    this.request$.next({ scope: 'topology' });
  }

  relationHasTension(relationId: string, visual: ResearchVisualGraphModel): boolean {
    return (
      visual.edges.find((edge) => edge.relationId === relationId)?.indicators.hasContradictions ??
      false
    );
  }

  relationPath(
    edge: ResearchVisualGraphEdge,
    positions: Record<string, { x: number; y: number }>,
  ): string {
    return createLinePath(
      positions[edge.sourceEntityId] ?? { x: 0, y: 0 },
      positions[edge.targetEntityId] ?? { x: 0, y: 0 },
    );
  }

  private toVm(
    knowledge: ResearchKnowledge | null,
    selection: ResearchGraphSelection,
    error: string,
  ): ResearchGraphVm {
    if (!knowledge) {
      return {
        knowledge: null,
        visual: null,
        selection,
        positions: {},
        selectedEntity: null,
        selectedRelation: null,
        selectedClaim: null,
        selectedEvidence: null,
        error,
      };
    }

    const visual = adaptResearchKnowledgeToVisualGraph(knowledge);
    const selectedEntity =
      selection?.kind === 'entity'
        ? (knowledge.entities.find((entity) => entity.id === selection.id) ?? null)
        : null;
    const selectedRelation =
      selection?.kind === 'relation'
        ? (knowledge.relations.find((relation) => relation.id === selection.id) ?? null)
        : null;
    const selectedClaim =
      selection?.kind === 'claim'
        ? (knowledge.claims.find((claim) => claim.id === selection.id) ?? null)
        : null;
    const selectedEvidence =
      selection?.kind === 'evidence' ? this.findEvidence(knowledge, selection.id) : null;

    return {
      knowledge,
      visual,
      selection,
      positions: createCircularGraphLayout(visual.nodes),
      selectedEntity,
      selectedRelation,
      selectedClaim,
      selectedEvidence,
      error,
    };
  }

  private findEvidence(knowledge: ResearchKnowledge, evidenceId: string): ResearchEvidence | null {
    return (
      knowledge.supportingEvidence.find((evidence) => evidence.id === evidenceId) ??
      knowledge.claims
        .flatMap((claim) => claim.evidence ?? [])
        .find((item) => item.evidenceId === evidenceId)?.evidence ??
      null
    );
  }
}
