import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type AttributeValueType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'YEAR' | 'JSON';
export type KnowledgeAssertionStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';

export type AttributeDefinition = {
  id: string;
  key: string;
  label: string;
  valueType: AttributeValueType;
  isMultiple: boolean;
};

export type CreateAttributeDefinitionPayload = {
  key: string;
  label: string;
  valueType: AttributeValueType;
  isMultiple?: boolean;
};

export type EntityAttribute = {
  id: string;
  definition: AttributeDefinition;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
  valueYear?: number | null;
  valueJson?: unknown;
  status: KnowledgeAssertionStatus;
  confidence?: number | null;
  validFromYear?: number | null;
  validToYear?: number | null;
};

export type EntityAttributeMutationPayload = {
  definitionId?: string;
  valueText?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueYear?: number;
  valueJson?: unknown;
  status?: KnowledgeAssertionStatus;
  confidence?: number | null;
  validFromYear?: number | null;
  validToYear?: number | null;
};

@Injectable({ providedIn: 'root' })
export class AttributesApi {
  private http = inject(HttpClient);

  definitions() {
    return this.http.get<AttributeDefinition[]>(apiUrl('/attribute-definitions'));
  }

  createDefinition(payload: CreateAttributeDefinitionPayload) {
    return this.http.post<AttributeDefinition>(apiUrl('/attribute-definitions'), payload);
  }

  list(entityId: string) {
    return this.http.get<EntityAttribute[]>(apiUrl(`/entities/${entityId}/attributes`));
  }

  create(entityId: string, payload: EntityAttributeMutationPayload) {
    return this.http.post<EntityAttribute>(apiUrl(`/entities/${entityId}/attributes`), payload);
  }

  update(id: string, payload: EntityAttributeMutationPayload) {
    return this.http.patch<EntityAttribute>(apiUrl(`/entity-attributes/${id}`), payload);
  }

  remove(id: string) {
    return this.http.delete<{ ok: true }>(apiUrl(`/entity-attributes/${id}`));
  }
}
