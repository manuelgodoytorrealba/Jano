import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ResearchApi, ResearchProposal } from '../../../core/api/research.api';
import { EntitiesApi } from '../../../core/api/entities.api';
import { GraphComponent } from '../../graph/graph.component';
import { ResearchGraphComponent } from './research-graph.component';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

const entity = {
  id: 'entity-1',
  projectId: 'research-1',
  canonicalEntityId: 'canonical-1',
  kind: 'WORK',
  title: 'Las señoritas de Avignon',
  summary: 'Una obra central.',
  confidence: null,
  mentionCount: 2,
  reviewState: 'REVIEWED',
  createdAt: '',
  updatedAt: '',
  evidence: [],
};
const knowledge = {
  projectId: 'research-1',
  scope: 'topology' as const,
  focus: null,
  expansions: {
    claims: 'SUMMARY' as const,
    evidence: 'NOT_LOADED' as const,
    traceability: 'NOT_LOADED' as const,
  },
  entities: [entity],
  relations: [],
  claims: [],
  contradictions: [],
  supportingEvidence: [],
};
const candidate: ResearchProposal = {
  id: 'candidate-1',
  projectId: 'research-1',
  jobId: 'job-1',
  type: 'ENTITY',
  proposalKey: 'entity-1',
  title: 'Cubismo',
  summary: 'Movimiento propuesto.',
  entityKind: 'ABSTRACTION',
  relationFromKey: null,
  relationToKey: null,
  relationTypeId: null,
  explanation: null,
  reviewState: 'PENDING',
  createdAt: '',
  evidence: [],
};

async function fixture(canonicalEntityId: string | null = 'canonical-1') {
  const currentKnowledge = {
    ...knowledge,
    entities: [{ ...entity, canonicalEntityId }],
  };
  const api = {
    getKnowledge: vi.fn((_id, request) =>
      of({
        ...currentKnowledge,
        scope: request.scope,
        focus: request.scope === 'traceability' ? { type: 'entity', id: 'entity-1' } : null,
      }),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [ResearchGraphComponent],
    providers: [
      provideRouter([]),
      { provide: ResearchApi, useValue: api },
      { provide: EntitiesApi, useValue: { graph: vi.fn() } },
    ],
  }).compileComponents();
  const result = TestBed.createComponent(ResearchGraphComponent);
  result.componentRef.setInput('researchId', 'research-1');
  result.componentRef.setInput('proposals', [candidate]);
  result.detectChanges();
  await result.whenStable();
  result.detectChanges();
  return { result, api };
}

describe('ResearchGraphComponent', () => {
  it('renders Research through the shared GraphComponent', async () => {
    const { result } = await fixture();
    expect(result.nativeElement.querySelector('app-graph')).toBeTruthy();
    expect(result.nativeElement.querySelector('.research-graph__canvas')).toBeNull();
    expect(result.nativeElement.querySelector('.graph-node.is-candidate')).toBeTruthy();
  });

  it('loads traceability when a private node is selected', async () => {
    const { result, api } = await fixture();
    result.componentInstance.selectNode('entity-1');
    result.detectChanges();
    await result.whenStable();
    expect(api.getKnowledge).toHaveBeenCalledWith('research-1', {
      scope: 'traceability',
      focusType: 'entity',
      focusId: 'entity-1',
    });
    expect(result.nativeElement.textContent).toContain('Una obra central.');
  });

  it('selects on one activation and opens on the second activation only', async () => {
    const { result } = await fixture();
    const opened = vi.fn();
    result.componentInstance.entityOpen.subscribe(opened);
    const graph = result.debugElement.query(By.directive(GraphComponent)).componentInstance;

    graph.handleNodeActivation('entity-1');
    expect(opened).not.toHaveBeenCalled();
    graph.handleNodeActivation('entity-1');
    expect(opened).toHaveBeenCalledWith('entity-1');
  });

  it('does not expose entity navigation for an unmaterialized candidate', async () => {
    const { result } = await fixture();
    const opened = vi.fn();
    result.componentInstance.entityOpen.subscribe(opened);
    const graph = result.debugElement.query(By.directive(GraphComponent)).componentInstance;

    graph.handleNodeActivation('proposal:candidate-1');
    graph.handleNodeActivation('proposal:candidate-1');
    result.detectChanges();

    expect(opened).not.toHaveBeenCalled();
    expect(result.nativeElement.querySelector('.research-map__open')).toBeNull();
  });

  it('offers the explicit accessible action for a canonical-linked private entity', async () => {
    const { result } = await fixture();
    const opened = vi.fn();
    result.componentInstance.entityOpen.subscribe(opened);
    result.componentInstance.selectNode('entity-1');
    result.detectChanges();
    await result.whenStable();
    result.detectChanges();

    const button: HTMLButtonElement = result.nativeElement.querySelector('.research-map__open');
    button.click();
    expect(opened).toHaveBeenCalledWith('entity-1');
  });

  it('offers explicit promotion for a private entity without a canonical link', async () => {
    const { result } = await fixture(null);
    const promoted = vi.fn();
    result.componentInstance.promotionRequested.subscribe(promoted);
    result.componentInstance.selectNode('entity-1');
    result.detectChanges();
    await result.whenStable();
    result.detectChanges();

    const button: HTMLButtonElement = result.nativeElement.querySelector(
      '.research-map__promotion button',
    );
    button.click();
    expect(promoted).toHaveBeenCalledWith({
      entityId: 'entity-1',
      canonicalType: 'ARTWORK',
    });
  });

  it('toggles full-screen focus mode and exits with Escape behavior', async () => {
    const { result } = await fixture();
    const focusButton: HTMLButtonElement =
      result.nativeElement.querySelector('.research-map__focus');
    focusButton.click();
    result.detectChanges();
    expect(result.componentInstance.focused).toBe(true);
    expect(result.nativeElement.querySelector('.research-map.is-focused')).toBeTruthy();

    result.componentInstance.exitFocus();
    result.detectChanges();
    expect(result.componentInstance.focused).toBe(false);
  });

  it('emits candidate selection for editorial review', async () => {
    const { result } = await fixture();
    const selected = vi.fn();
    result.componentInstance.proposalSelected.subscribe(selected);
    result.componentInstance.selectNode('proposal:candidate-1');
    expect(selected).toHaveBeenCalledWith(candidate);
  });
});
