# Foundational Knowledge Core

Foundational Knowledge is JANO's shared, canonical starting graph. It is not a Research project, an Article, a Publication, a personal collection, or a way to make empty product surfaces look populated.

The current seed lives in `backend/api/prisma/foundational/`. Its records are declarative, reviewed, deterministic by slug, and separated from system bootstrap (`seed-system.ts`). Every entity has a Spanish and English title; aliases resolve to the same canonical entity.

## Adding knowledge

Add an entity to `catalog.ts` only when it enables an identifiable future path: a period, work, person, place, institution, event, material, technique, or concept with concrete relations. Add factual relations in `relations`; use `CREATED_BY`, `BELONGS_TO_MOVEMENT`, `LOCATED_IN`, `USES_TECHNIQUE`, and `USES_MATERIAL` before generic predicates. Do not add Articles, Research, Publications, user data, generated essays, placeholder images, or invented provenance.

Run these checks after each reviewed block:

```bash
npm run foundational:validate
npm run seed:system
npm run seed:foundational
npm run foundational:report
npm run foundational:idempotency
```

`foundational:validate` catches duplicate/invalid slugs, duplicate declared edges, broken endpoints, and a curated checklist. `foundational:report` checks persisted duplicates, missing creators, connected components, coverage proxies, provenance, translations, and empty-product tables. `foundational:idempotency` runs the seed twice and asserts stable entity/relation/alias counts without Research, Articles, or Collections.

## Clean development bootstrap

This is deliberately the only destructive helper and it rejects any environment other than `development` or `test`:

```bash
NODE_ENV=development npm run db:reset:development
```

It migrates the local database, removes the three legacy migration demo records, seeds infrastructure, then seeds the Foundational Core. It must never be used for production. Production deployments keep using `infra/docker-compose.prod.yml` through `infra/scripts/prod.sh`; an editorial/data migration in production needs its own backup and explicit review.
