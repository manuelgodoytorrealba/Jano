export type DeckItem = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
  cta?: string;
  image: string;
  imageWidth?: number;
  imageHeight?: number;
  badge?: string;
  routeType?: string;
  ctaRoute?: string;
  ctaUrl?: string;
  adminEditRoute?: string;
};

export type DeckRailAction = 'home' | 'picks' | 'profile';
