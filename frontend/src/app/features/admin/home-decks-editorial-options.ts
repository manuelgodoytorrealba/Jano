export type HomeDeckSurfaceValue = 'HOME' | 'RECOMMENDED';

export type HomeDeckCtaRouteOption = {
  label: string;
  value: string;
  detail: string;
};

export const HOME_DECK_CTA_ROUTE_OPTIONS: HomeDeckCtaRouteOption[] = [
  {
    label: 'Abrir selección curada del deck',
    value: '',
    detail: 'Usa las entities seleccionadas y conserva su orden editorial.',
  },
  { label: 'Obras', value: '/entities/artwork', detail: 'Ruta principal de ARTWORK.' },
  { label: 'Artículos', value: '/entities/article', detail: 'Ruta principal de ARTICLE.' },
  { label: 'Artistas', value: '/entities/artist', detail: 'Ruta principal de ARTIST.' },
  { label: 'Movimientos', value: '/entities/movement', detail: 'Ruta principal de MOVEMENT.' },
  { label: 'Períodos', value: '/entities/period', detail: 'Ruta principal de PERIOD.' },
  { label: 'Conceptos', value: '/entities/concept', detail: 'Ruta principal de CONCEPT.' },
  { label: 'Lugares', value: '/entities/place', detail: 'Ruta principal de PLACE.' },
  { label: 'Textos', value: '/entities/text', detail: 'Ruta principal de TEXT.' },
];

export function homeDeckSurfaceLabel(surface: HomeDeckSurfaceValue | undefined): string {
  return surface === 'RECOMMENDED' ? 'Curated' : 'Home';
}

export function homeDeckSurfaceDescription(surface: HomeDeckSurfaceValue | undefined): string {
  return surface === 'RECOMMENDED'
    ? 'Lista curada: el deck abre siempre sus entities seleccionadas.'
    : 'Entrada editorial: puede abrir una ruta principal o una selección curada.';
}

export function homeDeckPublicRoute(surface: HomeDeckSurfaceValue | undefined): string {
  return surface === 'RECOMMENDED' ? '/curated' : '/';
}
