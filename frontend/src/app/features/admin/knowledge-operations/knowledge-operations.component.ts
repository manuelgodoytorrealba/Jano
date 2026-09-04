import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { KnowledgeOperationsApi } from '../../../core/api/knowledge-operations.api';

@Component({
  standalone: true,
  selector: 'app-knowledge-operations',
  imports: [AsyncPipe, DecimalPipe, RouterLink],
  templateUrl: './knowledge-operations.component.html',
  styleUrl: './knowledge-operations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeOperationsComponent {
  private readonly api = inject(KnowledgeOperationsApi);
  readonly vm$ = this.api.snapshot().pipe(
    map((data) => ({ state: 'ready' as const, data })),
    catchError(() => of({ state: 'error' as const, data: null })),
    startWith({ state: 'loading' as const, data: null }),
  );

  readonly metricKeys = [
    ['totalEntities', 'Entities'],
    ['totalRelations', 'Relations'],
    ['totalSources', 'Sources'],
    ['researchQueueSize', 'Research queue'],
    ['pendingEntityProposals', 'Entity proposals'],
    ['pendingRelationProposals', 'Relation proposals'],
  ] as const;
}
