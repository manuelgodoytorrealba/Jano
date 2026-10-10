export const ENTITY_SYMBOLS = {
  PERSON: {
    color: '#cf9bed',
    shape: 'rounded-square',
    path: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-2a7 7 0 0 1 14 0v2',
  },
  WORK: {
    color: '#8ec9ee',
    shape: 'rounded-square',
    path: 'M3 3h18v18H3ZM3 16l5-5 4 4 3-3 6 6M16 7h.01',
  },
  CONCEPT: {
    color: '#ecc18a',
    shape: 'rounded-square',
    path: 'M9 18h6M10 21h4M8.5 14a5.5 5.5 0 1 1 7 0L15 18H9l-.5-4ZM12 1v1M3 8H2M22 8h-1M4 2l1 1M20 2l-1 1',
  },
  MOVEMENT: {
    color: '#85d6b6',
    shape: 'diamond',
    path: 'M4 7c5 4 11-4 16 0M4 12c5 4 11-4 16 0M4 17c5 4 11-4 16 0',
  },
  PERIOD: {
    color: '#b8a9eb',
    shape: 'rounded-square',
    path: 'M5 5h14v16H5ZM8 3v4M16 3v4M5 10h14M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01',
  },
  PLACE: {
    color: '#9cc8d0',
    shape: 'rounded-square',
    path: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  },
  EVENT: {
    color: '#e3bc85',
    shape: 'rounded-square',
    path: 'M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2',
  },
  ORGANIZATION: {
    color: '#b6b0eb',
    shape: 'rounded-square',
    path: 'M3 21h18M5 21V9h14v12M3 9l9-6 9 6ZM9 12v6M15 12v6',
  },
  TEXT: {
    color: '#abc3df',
    shape: 'rounded-square',
    path: 'M6 3h8l4 4v14H6ZM14 3v5h4M9 12h6M9 16h6',
  },
  ENTITY: {
    color: '#b1bac7',
    shape: 'circle',
    path: 'M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM12 9v6M9 12h6',
  },
} as const;

export function entitySymbol(type: string, kind?: string | null) {
  const aliases: Record<string, keyof typeof ENTITY_SYMBOLS> = {
    ARTIST: 'PERSON',
    ARTWORK: 'WORK',
    ARTICLE: 'TEXT',
    ABSTRACTION: 'CONCEPT',
  };
  const key = aliases[type] ?? type;
  return (
    ENTITY_SYMBOLS[key] ??
    ENTITY_SYMBOLS[(aliases[kind ?? ''] ?? kind)] ??
    ENTITY_SYMBOLS.ENTITY
  );
}
