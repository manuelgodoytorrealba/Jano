export type DeckItem = {
    id: string;
    eyebrow?: string;
    title: string;
    description?: string;
    meta?: string;
    cta?: string;
    image: string;
    badge?: string;
    routeType?: string;
};

export type DeckRailAction = 'home' | 'picks' | 'profile';