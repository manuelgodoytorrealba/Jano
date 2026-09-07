BEGIN;

-- Rich-text retrofit for the same 20 Batch 001 essays.
-- Converts literal backslash-n sequences into real line breaks and adds
-- only links to published entities already present in the grounded batch context.
-- Idempotent: essays containing a rich-text link are skipped.

-- Spanish
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'dio lugar a Guernica', 'dio lugar a [[guernica|Guernica]]') WHERE "entityId"='cmsvvxi9700hc85sjjoidcq8a' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Les Demoiselles d’Avignon', '[[las-senoritas-de-avignon|Las señoritas de Aviñón]]') WHERE "entityId"='cmsvvxhgm002r85sjdntcbn33' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Sandro Botticelli', '[[sandro-botticelli|Sandro Botticelli]]') WHERE "entityId"='cmsvvxif800ku85sjmrawpu0e' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Louise Bourgeois', '[[louise-bourgeois|Louise Bourgeois]]') WHERE "entityId"='cmqmnymtz004o4vsj0wtos3ox' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Barroco', '[[barroco|Barroco]]') WHERE "entityId"='cmqmnymu5004r4vsjrvya8fdp' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Francisco de Goya', '[[francisco-de-goya|Francisco de Goya]]') WHERE "entityId"='cmqmnymt100494vsjefqf57vp' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Fountain', '[[fountain|Fountain]]') WHERE "entityId"='cmqmnymsu00474vsjen0o2yni' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Edward Hopper', '[[edward-hopper|Edward Hopper]]') WHERE "entityId"='cmqmnymui004v4vsjjq7adr8c' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Nighthawks', '[[nighthawks|Nighthawks]]') WHERE "entityId"='cmqmnymsm00454vsjw8djfbo0' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'El cuerpo', '[[cuerpo|Cuerpo]]') WHERE "entityId"='cmqmnymsr00464vsj35ef244h' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Marcel Duchamp', '[[marcel-duchamp|Marcel Duchamp]]') WHERE "entityId"='cmqmnymuo004x4vsjni2c67mr' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Marcel Duchamp', '[[marcel-duchamp|Marcel Duchamp]]') WHERE "entityId"='cmqmnymuu004z4vsjje52odxv' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Pablo Picasso', '[[pablo-picasso|Pablo Picasso]]') WHERE "entityId"='cmsvvxiio00mv85sj920czcuo' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, 'lugares de memoria pública', 'lugares de [[memoria|memoria]] pública'), chr(92)||'n', chr(10)) WHERE "entityId"='cmtptpmi90002gxss42zn1ydw' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, 'Black Mountain College', '[[black-mountain-college|Black Mountain College]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxj8a012s85sjedihcwi5' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, 'Black Mountain College', '[[black-mountain-college|Black Mountain College]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxiy500w485sjaswn4h4o' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, 'Katsushika Hokusai', '[[katsushika-hokusai|Katsushika Hokusai]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxile00og85sjyt9ud6rp' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, 'arte egipcio', '[[arte-egipcio|Arte egipcio]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxidz00k385sjl9wykswf' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, 'Édouard Manet', '[[edouard-manet|Édouard Manet]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxihi00m785sje6zpfn92' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Contexto' || chr(10) || chr(10) || replace(replace(essay, 'Francisco de Goya', '[[francisco-de-goya|Francisco de Goya]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxigt00ls85sj3rcd1lec' AND locale='es' AND essay NOT LIKE '%[[%';

-- English
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'led to Guernica', 'led to [[guernica|Guernica]]') WHERE "entityId"='cmsvvxi9700hc85sjjoidcq8a' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Les Demoiselles d’Avignon', '[[las-senoritas-de-avignon|Las señoritas de Aviñón]]') WHERE "entityId"='cmsvvxhgm002r85sjdntcbn33' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, chr(92)||'n', chr(10)), 'Sandro Botticelli', '[[sandro-botticelli|Sandro Botticelli]]') WHERE "entityId"='cmsvvxif800ku85sjmrawpu0e' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Louise Bourgeois', '[[louise-bourgeois|Louise Bourgeois]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymtz004o4vsj0wtos3ox' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'the Baroque', 'the [[barroco|Barroco]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymu5004r4vsjrvya8fdp' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Francisco de Goya', '[[francisco-de-goya|Francisco de Goya]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymt100494vsjefqf57vp' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Marcel Duchamp', '[[marcel-duchamp|Marcel Duchamp]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymsu00474vsjen0o2yni' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Edward Hopper', '[[edward-hopper|Edward Hopper]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymui004v4vsjjq7adr8c' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Nighthawks', '[[nighthawks|Nighthawks]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymsm00454vsjw8djfbo0' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'the body', 'the [[cuerpo|Cuerpo]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymsr00464vsj35ef244h' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Marcel Duchamp', '[[marcel-duchamp|Marcel Duchamp]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymuo004x4vsjni2c67mr' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Marcel Duchamp', '[[marcel-duchamp|Marcel Duchamp]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmqmnymuu004z4vsjje52odxv' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Pablo Picasso', '[[pablo-picasso|Pablo Picasso]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxiio00mv85sj920czcuo' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'sites of public memory', 'sites of public [[memoria|memory]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmtptpmi90002gxss42zn1ydw' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Black Mountain College', '[[black-mountain-college|Black Mountain College]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxj8a012s85sjedihcwi5' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'the Bauhaus', 'the [[bauhaus|Bauhaus]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxiy500w485sjaswn4h4o' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Katsushika Hokusai', '[[katsushika-hokusai|Katsushika Hokusai]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxile00og85sjyt9ud6rp' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Egyptian art', '[[arte-egipcio|Arte egipcio]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxidz00k385sjl9wykswf' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Édouard Manet', '[[edouard-manet|Édouard Manet]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxihi00m785sje6zpfn92' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = '## Context' || chr(10) || chr(10) || replace(replace(essay, 'Francisco de Goya', '[[francisco-de-goya|Francisco de Goya]]'), chr(92)||'n', chr(10)) WHERE "entityId"='cmsvvxigt00ls85sj3rcd1lec' AND locale='en' AND essay NOT LIKE '%[[%';

-- Repair pass for essays whose first targeted phrase was absent.
-- Keep the operation idempotent and add a meaningful related entity, not a self-link.
UPDATE "EntityTranslation" SET essay = replace(essay, 'El nacimiento de Venus fue pintado', '[[sandro-botticelli|Sandro Botticelli]] pintó El nacimiento de Venus') WHERE "entityId"='cmsvvxif800ku85sjmrawpu0e' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'The Birth of Venus was painted', '[[sandro-botticelli|Sandro Botticelli]] painted The Birth of Venus') WHERE "entityId"='cmsvvxif800ku85sjmrawpu0e' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Realizada en 1999', '[[louise-bourgeois|Louise Bourgeois]] realizó la obra en 1999') WHERE "entityId"='cmqmnymtz004o4vsj0wtos3ox' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Made in 1999', '[[louise-bourgeois|Louise Bourgeois]] made Maman in 1999') WHERE "entityId"='cmqmnymtz004o4vsj0wtos3ox' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Francis Bacon nació', '[[francis-bacon|Francis Bacon]] nació') WHERE "entityId"='cmqmnymsr00464vsj35ef244h' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Duchamp nació', '[[marcel-duchamp|Marcel Duchamp]] nació') WHERE "entityId"='cmqmnymsu00474vsjen0o2yni' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Duchamp was born', '[[marcel-duchamp|Marcel Duchamp]] was born') WHERE "entityId"='cmqmnymsu00474vsjen0o2yni' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Bottle Rack está fechada', 'Bottle Rack, de [[marcel-duchamp|Marcel Duchamp]], está fechada') WHERE "entityId"='cmqmnymuu004z4vsjje52odxv' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Bottle Rack is dated', 'Bottle Rack, by [[marcel-duchamp|Marcel Duchamp]], is dated') WHERE "entityId"='cmqmnymuu004z4vsjje52odxv' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Fountain está fechada', 'Fountain, de [[marcel-duchamp|Marcel Duchamp]], está fechada') WHERE "entityId"='cmqmnymuo004x4vsjni2c67mr' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Fountain is dated', 'Fountain, by [[marcel-duchamp|Marcel Duchamp]], is dated') WHERE "entityId"='cmqmnymuo004x4vsjni2c67mr' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'La obra fue realizada', 'La obra de [[francisco-de-goya|Francisco de Goya]] fue realizada') WHERE "entityId"='cmqmnymt100494vsjefqf57vp' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'The work was made', 'The work by [[francisco-de-goya|Francisco de Goya]] was made') WHERE "entityId"='cmqmnymt100494vsjefqf57vp' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'La obra está fechada', 'La obra de [[katsushika-hokusai|Katsushika Hokusai]] está fechada') WHERE "entityId"='cmsvvxile00og85sjyt9ud6rp' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Sources from the Black Mountain College Museum', 'Sources from the [[black-mountain-college|Black Mountain College]] Museum') WHERE "entityId"='cmsvvxiy500w485sjaswn4h4o' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Judith Baca trabaja', '[[judith-baca|Judith Baca]] trabaja') WHERE "entityId"='cmtptpmi90002gxss42zn1ydw' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Picasso distribuye', '[[pablo-picasso|Picasso]] distribuye') WHERE "entityId"='cmsvvxiio00mv85sj920czcuo' AND locale='es';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Al explorar Guernica en JANO conviene no tomar sus conexiones como una lista de etiquetas.', 'Sus conexiones no forman una lista de etiquetas.') WHERE "entityId"='cmsvvxiio00mv85sj920czcuo' AND locale='es';
UPDATE "EntityTranslation" SET essay = replace(essay, 'La obra fue realizada', 'La obra de [[francisco-de-goya|Francisco de Goya]] fue realizada') WHERE "entityId"='cmqmnymt100494vsjefqf57vp' AND locale='es' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'The work is dated', 'The work by [[katsushika-hokusai|Katsushika Hokusai]] is dated') WHERE "entityId"='cmsvvxile00og85sjyt9ud6rp' AND locale='en' AND essay NOT LIKE '%[[%';
UPDATE "EntityTranslation" SET essay = replace(essay, 'Guernica.', '[[guernica|Guernica]].') WHERE "entityId"='cmsvvxi9700hc85sjjoidcq8a' AND locale='es' AND essay NOT LIKE '%[[%';

-- The original essays already carried a heading; avoid rendering it twice.
UPDATE "EntityTranslation" SET essay = regexp_replace(essay, '^## Contexto[[:space:]]+## Contexto[[:space:]]+', '## Contexto' || chr(10) || chr(10)) WHERE locale='es' AND essay LIKE '## Contexto%';
UPDATE "EntityTranslation" SET essay = regexp_replace(essay, '^## Context[[:space:]]+## Context[[:space:]]+', '## Context' || chr(10) || chr(10)) WHERE locale='en' AND essay LIKE '## Context%';
UPDATE "EntityTranslation" SET essay = replace(essay, '[[judith-baca|Judith Baca]]', '[[_wave002-397bedf198c65b9d|Judith Baca]]') WHERE "entityId"='cmtptpmi90002gxss42zn1ydw' AND essay LIKE '%[[judith-baca|Judith Baca]]%';

-- The public Spanish resolver reads Entity.content before the Spanish translation.
-- Synchronize only this editorial field for the exact Batch 001 population.
UPDATE "Entity" e
SET content = et.essay
FROM "EntityTranslation" et
WHERE et."entityId" = e.id
  AND et.locale = 'es'
  AND e.id IN ('cmsvvxi9700hc85sjjoidcq8a','cmsvvxhgm002r85sjdntcbn33','cmsvvxif800ku85sjmrawpu0e','cmqmnymtz004o4vsj0wtos3ox','cmqmnymu5004r4vsjrvya8fdp','cmqmnymt100494vsjefqf57vp','cmqmnymsu00474vsjen0o2yni','cmqmnymui004v4vsjjq7adr8c','cmqmnymsm00454vsjw8djfbo0','cmqmnymsr00464vsj35ef244h','cmqmnymuo004x4vsjni2c67mr','cmqmnymuu004z4vsjje52odxv','cmsvvxiio00mv85sj920czcuo','cmtptpmi90002gxss42zn1ydw','cmsvvxj8a012s85sjedihcwi5','cmsvvxiy500w485sjaswn4h4o','cmsvvxile00og85sjyt9ud6rp','cmsvvxidz00k385sjl9wykswf','cmsvvxihi00m785sje6zpfn92','cmsvvxigt00ls85sj3rcd1lec');

COMMIT;
