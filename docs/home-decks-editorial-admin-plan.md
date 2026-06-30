# Home Decks Editorial Admin Plan

> Estado: **IMPLEMENTED** (2026-06-30)
>
> Plan histórico. `HomeDeck`/`HomeDeckItem`, el editor admin, la resolución de media y la lectura
> pública desde contenido persistido ya están implementados. El fallback virtual y su
> materialización fueron retirados. La arquitectura vigente está en
> [`architecture-overview.md`](./architecture-overview.md).

## Purpose

Home decks are the editorial surface of JANO's home page. They should let an admin shape discovery paths without touching code while keeping the backend as the source of truth.

This plan prepared the implementation; the sections below preserve the original design context.

## Product Decision

Use a hybrid approach:

- A central admin area owns creation, ordering, validation, and publishing of home decks.
- The public home can show admin-only contextual edit shortcuts.
- The public home renders backend data and does not duplicate editorial resolution logic.

The current visual admin selector can remain temporarily, but it should stop being the primary admin entry. The primary admin entry should become an editorial dashboard focused on status, actions, and content quality.

## Current State

- The public home uses `EntityDeckComponent` with hardcoded `DeckItem[]` data in `frontend/src/app/features/home/home.component.ts`.
- The admin root currently loads `AdminEntitiesDeckComponent`, which reuses the public deck pattern as a visual selector.
- The backend has `GET /entities/home`, but it currently selects recent published entities by type. It does not model decks, deck copy, deck image, deck order, deck status, or ordered editorial selections.
- Media resolution already exists for entities and should be reused rather than duplicated.

## Non Goals For MVP

- Inline editing directly on the public home.
- A generic CMS/page builder.
- Scheduling.
- Version history.
- A/B tests.
- Personalized decks.
- Multiple layout templates.
- Workflow approval beyond active/inactive.

## Editorial Model

### HomeDeck

Represents one editorial block/deck on the home page.

Suggested fields:

- `id`
- `slug`
- `title`
- `subtitle`
- `description`
- `ctaLabel`
- `ctaUrl`
- `ctaRoute`
- `imageUrl`
- `imageMediaId`
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

Notes:

- For MVP, support either `imageUrl` or `imageMediaId`. Prefer `imageMediaId` if the implementation can reuse the existing media library cleanly.
- `ctaUrl` is for external or explicit links. `ctaRoute` is for internal routes. Only one should be required for an active CTA.
- `slug` should be stable enough to support contextual admin links and future analytics.

### HomeDeckItem

Represents one entity selected inside a deck.

Suggested fields:

- `id`
- `deckId`
- `entityId`
- `sortOrder`
- `createdAt`

Rules:

- A deck cannot contain the same entity twice.
- Public endpoints should only return published entities.
- Admin endpoints may show selected draft or review entities with warnings.
- Ordering is explicit and owned by backend persistence.

## Backend API Contract

### Public

`GET /home-decks`

Returns active decks ordered by `sortOrder`, with resolved image and published entities.

Expected response shape:

```ts
type HomeDeckPublicResponse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaRoute: string | null;
  image: {
    url: string;
    width: number | null;
    height: number | null;
    alt: string | null;
  } | null;
  sortOrder: number;
  entities: HomeDeckEntityResponse[];
};
```

`HomeDeckEntityResponse` should use the same resolved entity/media conventions used elsewhere in the app.

### Admin

Suggested backend admin routes, following the current resource-first API style used by `entities/admin`:

- `GET /home-decks/admin`
- `GET /home-decks/admin/:id`
- `POST /home-decks`
- `PATCH /home-decks/:id`
- `DELETE /home-decks/:id`
- `POST /home-decks/:id/entities`
- `DELETE /home-decks/:id/entities/:entityId`
- `PATCH /home-decks/:id/entities/:entityId`

Frontend admin routes can still live under `/admin/home-decks`; that is a UI routing concern, not the backend API namespace.

MVP reorder can use repeated `PATCH` calls with `sortOrder`. A bulk reorder endpoint can come later if needed.

Admin response should include warnings:

```ts
type HomeDeckWarning = {
  code:
    | 'missing_title'
    | 'missing_image'
    | 'missing_cta'
    | 'missing_entities'
    | 'inactive'
    | 'unpublished_entity'
    | 'long_description';
  severity: 'info' | 'warning';
  message: string;
};
```

## Frontend Contract

Create a dedicated API service:

- `frontend/src/app/core/api/home-decks.api.ts`
- `frontend/src/app/core/api/admin-home-decks.api.ts`

Public home maps `HomeDeckPublicResponse` to `DeckItem` only at the presentation boundary.

The existing `EntityDeckComponent` can remain the public renderer. It should not gain admin editing responsibility.

## Admin UX

### `/admin`

Replace the visual selector as the default admin home with an Editorial Desk.

Recommended sections:

- Portada
  - active deck count
  - inactive deck count
  - incomplete deck count
  - link to manage home decks
- Contenido
  - published entities
  - drafts
  - in review
  - recent updates
- Quality Signals
  - entities missing hero media
  - decks without entities
  - decks without image
- Quick Actions
  - new entity
  - new article
  - new home deck

The page should feel editorial and operational: calm, dense, readable, and action-oriented.

### `/admin/home-decks`

List view columns:

- status
- order
- title
- subtitle
- entity count
- image state
- warnings
- updated date
- actions

Initial actions:

- create
- edit
- activate/deactivate
- move up
- move down
- view on home

### `/admin/home-decks/:id/edit`

Recommended layout:

- Left panel: editorial fields.
- Right panel: preview, selected entities, entity search.

Fields:

- title
- subtitle
- description
- CTA label
- CTA target
- image
- active/inactive
- sort order

Entity controls:

- search entities
- add entity
- remove entity
- move entity up/down
- show entity status
- warn if entity is not published

Preview:

- compact deck preview in admin
- link to public home
- no full inline editing on public home in MVP

## Implementation Phases

### Phase 1: Backend Foundation

Scope:

- Prisma models and migration.
- Backend module/service/controller for home decks.
- Public and admin endpoints.
- Seed data matching the current home decks.
- Service tests for ordering, active filtering, and unpublished entity filtering.

Exit criteria:

- The database can represent the current hardcoded decks.
- `GET /home-decks` returns only active decks.
- Public response excludes unpublished entities.
- Admin response includes warnings.

Verification:

- `npm run prisma:generate`
- `npm --prefix backend/api run test -- home`
- `npm run backend:build`

### Phase 2: Public Home Integration

Scope:

- Add public `HomeDecksApi`.
- Load decks from `GET /home-decks`.
- Map responses into `DeckItem`.
- Keep existing `EntityDeckComponent` for display.
- Add loading, empty, and API failure fallback states.

Exit criteria:

- Home no longer depends on hardcoded deck content.
- Public UX remains visually stable.
- CTA/navigation behavior still works.

Verification:

- `npm run frontend:build`
- Manual check at `/`
- Manual check with API unavailable or no active decks.

### Phase 3: Editorial Desk

Scope:

- Replace `/admin` default with a functional dashboard.
- Add summary cards/sections for portada, content, quality signals, and quick actions.
- Keep the old visual selector only if still useful as a secondary route.

Exit criteria:

- Admin root explains what needs attention.
- The admin is no longer primarily a public-style deck.
- Users can reach entities and home deck management quickly.

Verification:

- `npm run frontend:build`
- Manual check as admin.
- Manual check as non-admin cannot access `/admin`.

### Phase 4: Home Deck List Admin

Scope:

- Add `/admin/home-decks`.
- Add `AdminHomeDecksApi`.
- List decks with state, ordering, warnings, and actions.
- Create basic deck.
- Activate/deactivate.
- Move decks up/down.

Exit criteria:

- Admin can manage deck metadata and ordering.
- Changes persist and affect the public home after refresh.

Verification:

- `npm run frontend:build`
- Backend service tests.
- Manual create/edit/order flow.

### Phase 5: Home Deck Editor

Scope:

- Add edit route.
- Field editing.
- Entity search/add/remove/reorder.
- Warnings for incomplete decks.
- Compact preview.

Exit criteria:

- Admin can build a complete deck from scratch.
- Admin can control entity order.
- Warnings prevent accidental weak publishing without overblocking.

Verification:

- Backend tests for entity add/remove/reorder.
- Frontend build.
- Manual end-to-end flow from create to public home.

### Phase 6: Contextual Home Shortcuts

Scope:

- Show an admin-only edit icon on each public deck.
- Link to the exact admin editor with `returnTo=/`.
- Optional global admin shortcut for editing the home.

Exit criteria:

- Admin gets useful context-aware editing.
- Non-admin public layout is unchanged.
- No inline editing complexity is introduced.

Verification:

- Manual check as admin.
- Manual check as non-admin.
- Responsive check to avoid overlay collisions.

### Phase 7: Polish And Quality Signals

Scope:

- Improve preview fidelity.
- Add richer warnings.
- Add drag/drop only after basic ordering is stable.
- Improve image selector if needed.

Exit criteria:

- The admin feels like a professional editorial tool.
- Editors can see what changed, what is saved, and what needs attention.

## Risks And Mitigations

- Risk: Duplicating backend logic in Angular.
  - Mitigation: frontend only renders API state and local form drafts.
- Risk: Overbuilding a CMS.
  - Mitigation: keep MVP to decks, fields, active state, image, and ordered entities.
- Risk: Public home breaks when there are no active decks.
  - Mitigation: keep a stable fallback state during Phase 2.
- Risk: Media model becomes duplicated.
  - Mitigation: prefer existing `Media` and resolved media helpers when feasible.
- Risk: Admin becomes visually premium but operationally weak.
  - Mitigation: use tables, states, warnings, and previews rather than full-screen public-style decks.

## Recommended First Implementation Slice

Start with Phase 1 only.

Do not touch the public home until backend persistence and response contracts are working. That keeps the system truthful and avoids replacing hardcoded data with unstable data.

## Completion Definition For MVP

The MVP is complete when:

- Admin can create, edit, order, activate, and deactivate home decks.
- Admin can attach and order entities inside a deck.
- Public home renders active decks from backend data.
- Non-admin users never see admin controls.
- There is a fallback when there are no active decks.
- Backend tests cover filtering and ordering.
- Frontend build passes.
