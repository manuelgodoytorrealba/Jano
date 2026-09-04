import type { EvidenceDecision, RelevanceRole } from './semantic-evidence-classifier';

export type GoldLabel = {
  decision: EvidenceDecision;
  role: RelevanceRole;
  proposition: string | null;
  dimension: string | null;
  rationale: string;
};

export function goldLabel(
  pilot: 'PILOT_1' | 'PILOT_2',
  source: string,
  index: number,
  excerpt: string,
): GoldLabel {
  if (pilot === 'PILOT_1') {
    if (source === 'Pablo Picasso' || source === 'Repensar Guernica')
      return {
        decision: 'KEEP',
        role: 'PRIMARY_SUBJECT',
        proposition: excerpt.split(/(?<=[.!?])\s+/)[0],
        dimension: 'development / context',
        rationale:
          'La fuente está dedicada a la entidad y el fragmento contiene información sustantiva.',
      };
    if (source === 'Cubism' && index < 3)
      return {
        decision: 'KEEP',
        role: 'PRIMARY_SUBJECT',
        proposition: excerpt.split(/(?<=[.!?])\s+/)[0],
        dimension: 'characteristics / origin',
        rationale: 'Describe rasgos u origen del movimiento.',
      };
    if (source === 'Cubism')
      return {
        decision: 'REVIEW',
        role: 'ABOUT',
        proposition: null,
        dimension: 'characteristics',
        rationale: 'Fragmento truncado y con metadata de obras mezclada.',
      };
    if (source === 'Madrid Destino')
      return {
        decision: 'REVIEW',
        role: 'CONTEXT_FOR',
        proposition: null,
        dimension: 'cultural context',
        rationale:
          'Contenido turístico/promocional, no evidencia suficiente para una explicación cultural.',
      };
    return {
      decision: 'REJECT',
      role: 'UNRELATED',
      proposition: null,
      dimension: null,
      rationale: 'Navegación o listado relacionado.',
    };
  }
  if (source === 'The body in art' && index === 0)
    return {
      decision: 'KEEP',
      role: 'PRIMARY_SUBJECT',
      proposition:
        'Body art es una práctica artística en la que el cuerpo es el medio y foco principal.',
      dimension: 'definition',
      rationale: 'Definición explícita del concepto.',
    };
  if (source === 'The body in art')
    return {
      decision: 'REVIEW',
      role: 'ABOUT',
      proposition: null,
      dimension: 'examples / context',
      rationale:
        'El fragmento aporta contexto sobre prácticas corporales, pero mezcla listado o información insuficiente para un claim autónomo.',
    };
  if (source === 'The Bayeux Tapestry' && index === 1)
    return {
      decision: 'REVIEW',
      role: 'ABOUT',
      proposition: null,
      dimension: 'identity / chronology',
      rationale: 'Identifica la obra y 1066, pero con formulación promocional insuficiente.',
    };
  if (source === 'Bayeux Tapestry')
    return {
      decision: 'REJECT',
      role: 'UNRELATED',
      proposition: null,
      dimension: null,
      rationale: 'Información práctica del museo.',
    };
  if (source === 'Louise Bourgeois overview' && index === 1)
    return {
      decision: 'REVIEW',
      role: 'CONTEXT_FOR',
      proposition: null,
      dimension: 'context',
      rationale: 'Listado de exposiciones y artistas, sin explicar Maman.',
    };
  return {
    decision: 'REJECT',
    role: 'UNRELATED',
    proposition: null,
    dimension: null,
    rationale: 'Navegación/promoción o selección de obras sin claim sobre la entidad.',
  };
}
