import {
  AdminCreateRelationPayload,
  AdminEntityRelationRecord,
  AdminEntitySearchListItem,
  AdminUpdateRelationPayload,
} from '../../../core/api/admin-entities.api';
import { RelationType } from '../../../core/api/relation-types.api';

export type AdminEntityRelationDraft = {
  toId: string;
  type: string;
  relationTypeId: string;
  justificationEs: string;
  justificationEn: string;
};

export function createEmptyRelationDraft(relationTypes: RelationType[]): AdminEntityRelationDraft {
  const preferred =
    relationTypes.find((type) => type.key === 'RELATED_TO') ?? relationTypes[0] ?? null;

  return {
    toId: '',
    type: preferred?.key ?? 'RELATED_TO',
    relationTypeId: preferred?.id ?? '',
    justificationEs: '',
    justificationEn: '',
  };
}

export function resolveRelationTypeSelection(
  relationTypes: RelationType[],
  relationTypeId: string,
  current: AdminEntityRelationDraft,
): AdminEntityRelationDraft {
  const relationType = relationTypes.find((item) => item.id === relationTypeId);

  return {
    ...current,
    relationTypeId: relationType?.id ?? '',
    type: relationType?.key ?? current.type,
  };
}

export function canSubmitRelationDraft(entityId: string, draft: AdminEntityRelationDraft): boolean {
  return !!entityId && !!draft.toId && !!draft.type.trim();
}

export function buildCreateRelationPayload(
  draft: AdminEntityRelationDraft,
): AdminCreateRelationPayload {
  return {
    toId: draft.toId,
    type: draft.type.trim(),
    relationTypeId: draft.relationTypeId || undefined,
    justificationEs: draft.justificationEs.trim() || undefined,
    justificationEn: draft.justificationEn.trim() || undefined,
  };
}

export function buildUpdateRelationPayload(
  relation: AdminEntityRelationRecord,
): AdminUpdateRelationPayload {
  return {
    relationTypeId: relation.relationTypeId || relation.relationType?.id || undefined,
    type: relation.type || relation.relationTypeKey || undefined,
    justificationEs:
      String(relation.justificationEs ?? relation.justification ?? '').trim() || undefined,
    justificationEn: String(relation.justificationEn ?? '').trim() || undefined,
    weight: relation.weight ?? undefined,
  };
}

export function filterRelationSearchResults(
  items: AdminEntitySearchListItem[],
  currentEntityId: string,
): AdminEntitySearchListItem[] {
  return items.filter((item) => item.id !== currentEntityId);
}

export function shouldSearchRelationTargets(query: string): boolean {
  return query.trim().length >= 2;
}

export function buildSelectedRelationSearchLabel(entity: AdminEntitySearchListItem): string {
  return `${entity.title} (${entity.type})`;
}
