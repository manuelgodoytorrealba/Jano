# Search and Taxonomy

This document describes the implemented global search, normalized relation types,
and tag system.

## Global Search

Endpoint:

```http
GET /api/search?q=...&type=...&limit=...&includeDrafts=...&tag=...
```

Behavior:

- Searches across entities, not only artworks.
- Public requests return only `PUBLISHED` entities.
- `includeDrafts=true` is honored only for authenticated admin users.
- Optional `type` filters by `Entity.type`.
- Optional `tag` filters by tag slug.
- Empty requests without `q` and without `tag` return no results.

Ranking:

- PostgreSQL full-text search uses weighted fields:
  - `title`: A
  - `summary`: B
  - `content`: C
- The score combines `ts_rank_cd` with extra boosts for:
  - exact title match
  - title starts with query
  - partial title match
  - summary/content partial match
  - slug prefix match
- Short or partial queries also use `ILIKE` fallback matching.

Response shape:

```json
{
  "query": "picasso",
  "total": 1,
  "items": [
    {
      "id": "...",
      "slug": "pablo-picasso",
      "type": "ARTIST",
      "title": "Pablo Picasso",
      "summary": "...",
      "status": "PUBLISHED",
      "score": 145.4,
      "matchedFields": ["title"],
      "resolvedMedia": {
        "thumbnail": null,
        "card": null
      },
      "tags": []
    }
  ],
  "groups": {
    "ARTIST": []
  }
}
```

Frontend:

- `/search?q=...` renders a ranked mixed list.
- Header/app search navigates to `/search`.
- Type chips filter the result list.
- Result click navigates to `/entity/:slug`.

## Relation Type Normalization

Model:

- `RelationType.id`
- `RelationType.key`
- `RelationType.label`
- `RelationType.inverseLabel`
- `RelationType.directed`
- `RelationType.category`
- `RelationType.isActive`
- `RelationType.sortOrder`

Compatibility:

- `Relation.type` remains in place as the legacy fallback.
- `Relation.relationTypeId` is nullable.
- Existing relation strings are mapped into `RelationType` during migration.
- Returned relations expose normalized labels when available and fall back to
  the legacy string when not available.

API:

```http
GET /api/relation-types
GET /api/relation-types?includeInactive=true
```

Admin:

- Relation type selector is loaded from `/api/relation-types`.
- New relations send `relationTypeId`.
- Legacy `type` is still written for backward compatibility.

Graph:

- Uses normalized label and `directed` when available.
- Falls back to legacy `Relation.type`.

## Tag System

Models:

- `Tag`
  - `id`
  - `slug`
  - `label`
  - `description`
  - `category`
  - `isActive`
- `EntityTag`
  - `entityId`
  - `tagId`
  - `weight`
  - `source`

API:

```http
GET /api/tags
POST /api/tags
POST /api/entities/:id/tags
DELETE /api/entities/:id/tags/:tagId
```

Behavior:

- Tags are independent taxonomy records, not graph entities.
- Tags can be attached to entities through `EntityTag`.
- Entity detail includes tags.
- Search supports `tag` filtering.
- Explorer supports `tag` filtering.
- Admin entity form can create, attach, and remove tags.

## Migration Notes

The migration:

- Adds a GIN full-text index for weighted entity search.
- Creates `RelationType`, `Tag`, and `EntityTag`.
- Adds nullable `Relation.relationTypeId`.
- Seeds initial normalized relation types.
- Creates legacy relation types for existing free-text relation strings.
- Backfills `Relation.relationTypeId` without deleting `Relation.type`.

Run migrations:

```bash
npm run prisma:deploy
```

For local development with schema changes:

```bash
npm run prisma:migrate
```
