import { DeckItem } from '../../shared/ui/entity-deck/entity-deck.types';

export type HomeDeckStarter = {
  id: string;
  surface: 'HOME' | 'RECOMMENDED';
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  meta: string;
  ctaLabel: string;
  ctaRoute: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
};

const STARTERS: HomeDeckStarter[] = [
  {
    id: 'home-artwork',
    surface: 'HOME',
    slug: 'artwork',
    title: 'Obras',
    subtitle: 'Artwork',
    description: 'Piezas clave para estudiar forma, técnica, simbolismo y contexto.',
    meta: 'Artwork',
    ctaLabel: 'Explorar obras',
    ctaRoute: '/entities/artwork',
    image: '/assets/home/artwork.jpg',
    imageWidth: 736,
    imageHeight: 736,
  },
  {
    id: 'home-article',
    surface: 'HOME',
    slug: 'article',
    title: 'Artículos',
    subtitle: 'Article',
    description: 'Lecturas editoriales, opinión y conexiones entre obras, autores e ideas.',
    meta: 'Article',
    ctaLabel: 'Explorar artículos',
    ctaRoute: '/entities/article',
    image: '/assets/home/concept.jpg',
    imageWidth: 639,
    imageHeight: 960,
  },
  {
    id: 'home-artist',
    surface: 'HOME',
    slug: 'artist',
    title: 'Artistas',
    subtitle: 'Artist',
    description: 'Autores, trayectorias, obsesiones visuales e influencias cruzadas.',
    meta: 'Artist',
    ctaLabel: 'Explorar artistas',
    ctaRoute: '/entities/artist',
    image: '/assets/home/artist.jpg',
    imageWidth: 736,
    imageHeight: 736,
  },
  {
    id: 'home-movement',
    surface: 'HOME',
    slug: 'movement',
    title: 'Movimientos',
    subtitle: 'Movement',
    description: 'Corrientes estéticas e ideas que redefinieron la historia del arte.',
    meta: 'Movement',
    ctaLabel: 'Explorar movimientos',
    ctaRoute: '/entities/movement',
    image: '/assets/home/movement.jpg',
    imageWidth: 736,
    imageHeight: 977,
  },
  {
    id: 'home-period',
    surface: 'HOME',
    slug: 'period',
    title: 'Períodos',
    subtitle: 'Period',
    description: 'Etapas históricas para entender cambios culturales y visuales.',
    meta: 'Period',
    ctaLabel: 'Explorar períodos',
    ctaRoute: '/entities/period',
    image: '/assets/home/period.jpg',
    imageWidth: 600,
    imageHeight: 800,
  },
  {
    id: 'home-concept',
    surface: 'HOME',
    slug: 'concept',
    title: 'Conceptos',
    subtitle: 'Concept',
    description: 'Ideas fundamentales para leer obras y relaciones con más claridad.',
    meta: 'Concept',
    ctaLabel: 'Explorar conceptos',
    ctaRoute: '/entities/concept',
    image: '/assets/home/concept.jpg',
    imageWidth: 639,
    imageHeight: 960,
  },
  {
    id: 'recommended-artwork',
    surface: 'RECOMMENDED',
    slug: 'recommended-artwork',
    title: 'Obras esenciales',
    subtitle: 'Staff Pick',
    description: 'Una selección curada para entrar a Jano por piezas clave y conexiones fuertes.',
    meta: 'Curated List',
    ctaLabel: 'Ver selección',
    ctaRoute: '/entities/artwork',
    image: '/assets/home/artwork.jpg',
    imageWidth: 736,
    imageHeight: 736,
  },
  {
    id: 'recommended-artist',
    surface: 'RECOMMENDED',
    slug: 'recommended-artist',
    title: 'Artistas para empezar',
    subtitle: 'Staff Pick',
    description: 'Autores fundamentales para entender estilos, rupturas e influencias.',
    meta: 'Curated List',
    ctaLabel: 'Explorar artistas',
    ctaRoute: '/entities/artist',
    image: '/assets/home/artist.jpg',
    imageWidth: 736,
    imageHeight: 736,
  },
  {
    id: 'recommended-movement',
    surface: 'RECOMMENDED',
    slug: 'recommended-movement',
    title: 'Movimientos imprescindibles',
    subtitle: 'Staff Pick',
    description: 'Corrientes que reorganizaron la mirada y cambiaron la historia del arte.',
    meta: 'Curated List',
    ctaLabel: 'Explorar movimientos',
    ctaRoute: '/entities/movement',
    image: '/assets/home/movement.jpg',
    imageWidth: 736,
    imageHeight: 977,
  },
  {
    id: 'recommended-period',
    surface: 'RECOMMENDED',
    slug: 'recommended-period',
    title: 'Períodos clave',
    subtitle: 'Staff Pick',
    description: 'Etapas históricas para orientarte rápido dentro del archivo.',
    meta: 'Curated List',
    ctaLabel: 'Explorar períodos',
    ctaRoute: '/entities/period',
    image: '/assets/home/period.jpg',
    imageWidth: 600,
    imageHeight: 800,
  },
  {
    id: 'recommended-concept',
    surface: 'RECOMMENDED',
    slug: 'recommended-concept',
    title: 'Conceptos base',
    subtitle: 'Staff Pick',
    description: 'Términos e ideas para leer mejor obras, artistas y relaciones.',
    meta: 'Curated List',
    ctaLabel: 'Explorar conceptos',
    ctaRoute: '/entities/concept',
    image: '/assets/home/concept.jpg',
    imageWidth: 639,
    imageHeight: 960,
  },
];

export const HOME_DECK_STARTERS = STARTERS;
export const HOME_FALLBACK_STARTERS = STARTERS.filter((starter) => starter.surface === 'HOME');
export const RECOMMENDED_FALLBACK_STARTERS = STARTERS.filter((starter) => starter.surface === 'RECOMMENDED');

export function starterToDeckItem(starter: HomeDeckStarter): DeckItem {
  return {
    id: starter.id,
    eyebrow: starter.subtitle,
    title: starter.title,
    description: starter.description,
    meta: starter.meta,
    cta: `${starter.ctaLabel} →`,
    image: starter.image,
    imageWidth: starter.imageWidth,
    imageHeight: starter.imageHeight,
    ctaRoute: starter.ctaRoute,
  };
}
