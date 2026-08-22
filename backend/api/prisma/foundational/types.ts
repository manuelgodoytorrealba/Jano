export type SeedEntityType =
  | 'ARTWORK'
  | 'ARTIST'
  | 'PERSON'
  | 'CONCEPT'
  | 'MOVEMENT'
  | 'PERIOD'
  | 'PLACE'
  | 'EVENT'
  | 'ORGANIZATION';

export type FoundationalEntity = {
  slug: string;
  type: SeedEntityType;
  title: string;
  en: string;
  startYear?: number;
  endYear?: number;
  aliases?: string[];
  summary?: string;
  tier: 'A' | 'B' | 'C';
  block: string;
};

export type FoundationalRelation = {
  from: string;
  to: string;
  type: string;
  /** A short factual reason shown in the inspector, never an invented essay. */
  justification?: string;
};
