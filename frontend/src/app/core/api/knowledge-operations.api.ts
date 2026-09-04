import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type KnowledgeOperationsSnapshot = {
  metrics: Record<string, number>;
  coverage: Record<string, number>;
  queue: Array<{
    entityId: string;
    entity: string;
    currentCoverage: string;
    mainGap: string | null;
    priority: number;
    suggestedResearchAction: string | null;
  }>;
};

@Injectable({ providedIn: 'root' })
export class KnowledgeOperationsApi {
  private readonly http = inject(HttpClient);

  snapshot() {
    return this.http.get<KnowledgeOperationsSnapshot>(apiUrl('/knowledge-operations/snapshot'));
  }
}
