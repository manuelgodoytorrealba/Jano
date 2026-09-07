BEGIN;

-- A Rich Text essay may link to related entities, never to its own entity.
-- Remove only self-links and preserve the visible canonical label.
UPDATE "Entity" e
SET content = regexp_replace(
  e.content,
  format($$\[\[%s\|([^\]]+)\]\]$$, e.slug),
  $$\1$$,
  'g'
)
WHERE e.content LIKE '%'||chr(91)||chr(91)||e.slug||chr(124)||'%';

UPDATE "EntityTranslation" t
SET essay = regexp_replace(
  t.essay,
  format($$\[\[%s\|([^\]]+)\]\]$$, e.slug),
  $$\1$$,
  'g'
)
FROM "Entity" e
WHERE t."entityId"=e.id
  AND t.essay LIKE '%'||chr(91)||chr(91)||e.slug||chr(124)||'%';

COMMIT;
