BEGIN;

UPDATE "Entity"
SET content=replace(content, chr(92)||'n', chr(10))
WHERE content LIKE '%'||chr(92)||'n%';

UPDATE "EntityTranslation"
SET essay=replace(essay, chr(92)||'n', chr(10))
WHERE essay LIKE '%'||chr(92)||'n%';

COMMIT;
