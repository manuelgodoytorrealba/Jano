import { AdminEntitySearchListItem } from '../../../core/api/admin-entities.api';

export type AdminEntityLinkMatch = {
  query: string;
  startIndex: number;
};

export function detectAdminEntityLinkMatch(
  value: string,
  cursor: number,
): AdminEntityLinkMatch | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/\[\[([^[\]]*)$/);

  if (!match) {
    return null;
  }

  const query = (match[1] ?? '').trim();
  const startIndex = beforeCursor.lastIndexOf('[[');

  if (query.includes(']]')) {
    return null;
  }

  return { query, startIndex };
}

export function insertAdminEntityLink(
  value: string,
  startIndex: number,
  cursor: number,
  entity: Pick<AdminEntitySearchListItem, 'slug' | 'title'>,
): { value: string; cursor: number } {
  const before = value.slice(0, startIndex);
  const after = value.slice(cursor);
  const inserted = `[[${entity.slug}|${entity.title}]]`;
  const nextValue = `${before}${inserted}${after}`;

  return {
    value: nextValue,
    cursor: before.length + inserted.length,
  };
}
