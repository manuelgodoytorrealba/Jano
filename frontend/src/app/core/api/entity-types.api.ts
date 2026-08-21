import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from './api-base';

export type EntityTypeFieldDefinition = {
  id?: string;
  attributeDefinitionId: string;
  sortOrder: number;
  isRequired: boolean;
  attributeDefinition: { id: string; key: string; label: string; valueType: string };
};
export type EntityTypeDefinition = {
  id: string;
  key: string;
  singularName: string;
  pluralName: string;
  description?: string | null;
  icon: string;
  colorToken: string;
  baseKind: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  systemType: boolean;
  _count?: { entities: number };
  fields?: EntityTypeFieldDefinition[];
};
export type EntityTypeDefinitionPayload = Omit<
  EntityTypeDefinition,
  'id' | 'systemType' | '_count' | 'fields'
>;

@Injectable({ providedIn: 'root' })
export class EntityTypesApi {
  private readonly http = inject(HttpClient);
  list(active = false) {
    return this.http.get<EntityTypeDefinition[]>(apiUrl('/entity-types'), {
      params: active ? { active: 'true' } : undefined,
    });
  }
  create(payload: EntityTypeDefinitionPayload) {
    return this.http.post<EntityTypeDefinition>(apiUrl('/entity-types'), payload);
  }
  update(key: string, payload: Partial<EntityTypeDefinitionPayload>) {
    return this.http.patch<EntityTypeDefinition>(
      apiUrl('/entity-types/' + encodeURIComponent(key)),
      payload,
    );
  }
  replaceFields(
    key: string,
    fields: Array<
      Pick<EntityTypeFieldDefinition, 'attributeDefinitionId' | 'sortOrder' | 'isRequired'>
    >,
  ) {
    return this.http.patch<EntityTypeDefinition>(
      apiUrl('/entity-types/' + encodeURIComponent(key) + '/fields'),
      { fields },
    );
  }
  remove(key: string) {
    return this.http.delete<{ ok: true }>(apiUrl('/entity-types/' + encodeURIComponent(key)));
  }
}
