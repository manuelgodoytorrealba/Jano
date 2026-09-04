DO $do$
DECLARE
  artwork_id TEXT;
  santo_tome_source_id TEXT;
  prado_source_id TEXT;
BEGIN
  SELECT id INTO artwork_id FROM "Entity" WHERE slug = 'entierro-del-conde-de-orgaz';
  IF artwork_id IS NULL THEN
    RAISE EXCEPTION 'Canonical artwork entierro-del-conde-de-orgaz is missing';
  END IF;

  UPDATE "Entity"
  SET summary = 'Obra maestra de El Greco, pintada entre 1586 y 1588 para la iglesia de Santo Tomé de Toledo. El enorme lienzo representa el milagro del entierro de Gonzalo Ruiz de Toledo, señor de Orgaz: según la tradición, san Agustín y san Esteban descendieron para depositar su cuerpo en la sepultura como reconocimiento a su caridad. La composición une el cortejo terrestre y la gloria celestial, y convierte una memoria local en una meditación sobre muerte, fe, comunidad e imagen.',
      content = $orgaz$## Un entierro entre la tierra y el cielo

El cuadro que conocemos habitualmente como *El entierro del conde de Orgaz* se titula con mayor precisión *El entierro del señor de Orgaz*. Gonzalo Ruiz de Toledo murió en 1323 como señor de Orgaz; el condado fue concedido a sus descendientes siglos más tarde. La denominación popular se impuso, pero la diferencia importa porque la obra no representa una ceremonia nobiliaria genérica: recuerda a una persona concreta, vinculada a la historia social y religiosa de Toledo.

El Greco pintó el lienzo entre 1586 y 1588 por encargo de Andrés Núñez de Madrid, párroco de Santo Tomé, para la capilla de la Concepción. La iglesia estaba ligada a la memoria del señor de Orgaz y a sus obras de caridad. El programa pictórico convertía la capilla y su sepulcro en un lugar de memoria: el pasado de la comunidad aparecía legitimado por una intervención milagrosa y por la presencia de los santos.

### El milagro como memoria local

La escena se basa en una tradición según la cual san Agustín y san Esteban aparecieron durante el entierro de Gonzalo Ruiz de Toledo y colocaron personalmente su cuerpo en la sepultura. En la zona inferior, san Agustín —con vestiduras episcopales— y san Esteban —con hábito de diácono— sostienen el cuerpo amortajado y armado del difunto. No es sólo una imagen de muerte. Es una demostración visual de que la caridad del personaje ha sido reconocida por la comunidad celestial.

El espectador se sitúa ante una ceremonia en la que participan clérigos, nobles y ciudadanos. El cortejo no se presenta como una multitud anónima: muchos rostros tienen una presencia individualizada, como si la memoria del acontecimiento exigiera hacer visible a quienes la sostienen. La tradición local, el encargo parroquial y la imagen de los contemporáneos forman una misma política de la memoria.

### Dos registros, una pintura

La composición se organiza en dos grandes ámbitos. Abajo está la tierra: el cuerpo, la armadura, los asistentes, los cirios y el espacio material del entierro. Arriba aparece la gloria: Cristo, la Virgen, san Juan Bautista, ángeles y almas que ascienden. La división no funciona como una separación rígida. La línea vertical formada por el cuerpo y los santos enlaza ambos registros, mientras el alma del difunto asciende hacia la zona celestial.

Esta estructura permite que la obra sea simultáneamente narrativa, litúrgica y teológica. El cuadro no ilustra una muerte individual desde fuera; construye una continuidad entre la comunidad visible y el orden invisible que la comunidad cree reconocer. La escala monumental y la colocación sobre la sepultura hacen que la imagen participe del ritual del lugar.

### Retrato, presencia y autoría

La obra también es una galería de presencias. En el grupo inferior se han propuesto identificaciones de personajes toledanos de la época, pero no todas tienen el mismo grado de certeza. El propio El Greco introdujo un niño en primer plano que dirige la mirada del espectador hacia el milagro y que suele identificarse con su hijo Jorge Manuel; esa lectura debe entenderse como una atribución tradicional, no como una inscripción inequívoca.

La firma y la presencia del pintor convierten la pintura en una afirmación de autoría dentro de un espacio religioso y comunitario. El Greco no desaparece detrás del relato: organiza el modo en que el relato puede ser visto. Las armaduras, los tejidos, las luces y los rostros no son detalles aislados; producen una experiencia de densidad material que contrasta con la apertura luminosa de la gloria.

### Toledo como escenario y como archivo

El interés de la obra está inseparablemente ligado a su emplazamiento. No fue concebida para una colección privada ni para una sala neutra, sino para Santo Tomé, en el centro histórico de Toledo. Verla allí significa estar ante una pintura que conserva su relación con la capilla, la sepultura y la memoria de la ciudad. La obra convierte un episodio del siglo XIV en una imagen de finales del XVI y, al mismo tiempo, hace que el Toledo de El Greco se proyecte sobre el presente.

Por eso este cuadro abre varias rutas en JANO: la pintura manierista y sus cuerpos tensos; la religión y la imagen devocional; la memoria de una comunidad; el retrato como presencia pública; la historia de Toledo; y la relación entre obra, arquitectura y ritual. Su fuerza no depende sólo de representar un milagro. Depende de haber hecho visible quién recuerda, desde qué lugar recuerda y cómo una pintura puede transformar una sepultura local en una escena de alcance universal.$orgaz$
  WHERE id = artwork_id;

  INSERT INTO "EntityAlias" (id, "entityId", locale, value, kind, source, "updatedAt")
  SELECT 'entierro-orgaz-senor-alias', artwork_id, 'es', 'El entierro del señor de Orgaz', 'COMMON_NAME', 'IGLESIA_SANTO_TOME', NOW()
  WHERE NOT EXISTS (SELECT 1 FROM "EntityAlias" WHERE id = 'entierro-orgaz-senor-alias');

  INSERT INTO "ArtworkDetails" ("entityId", "authorNation", technique, materials, dimensions, location, collection, state)
  VALUES (artwork_id, 'Creta / España', 'Pintura al óleo', 'Óleo sobre lienzo', '480 × 360 cm', 'Iglesia de Santo Tomé, Toledo', 'Capilla de la Concepción; parroquia de Santo Tomé', 'Conservada in situ')
  ON CONFLICT ("entityId") DO UPDATE SET
    "authorNation" = EXCLUDED."authorNation",
    technique = EXCLUDED.technique,
    materials = EXCLUDED.materials,
    dimensions = EXCLUDED.dimensions,
    location = EXCLUDED.location,
    collection = EXCLUDED.collection,
    state = EXCLUDED.state;

  INSERT INTO "ArtworkDetailsTranslation" (id, "entityId", locale, "authorNation", technique, materials, dimensions, location, collection, state, "updatedAt")
  VALUES
    ('entierro-orgaz-details-es', artwork_id, 'es', 'Creta / España', 'Pintura al óleo', 'Óleo sobre lienzo', '480 × 360 cm', 'Iglesia de Santo Tomé, Toledo', 'Capilla de la Concepción; parroquia de Santo Tomé', 'Conservada in situ', NOW()),
    ('entierro-orgaz-details-en', artwork_id, 'en', 'Crete / Spain', 'Oil painting', 'Oil on canvas', '480 × 360 cm', 'Church of Santo Tomé, Toledo', 'Chapel of the Conception; parish of Santo Tomé', 'Preserved in situ', NOW())
  ON CONFLICT ("entityId", locale) DO UPDATE SET
    "authorNation" = EXCLUDED."authorNation",
    technique = EXCLUDED.technique,
    materials = EXCLUDED.materials,
    dimensions = EXCLUDED.dimensions,
    location = EXCLUDED.location,
    collection = EXCLUDED.collection,
    state = EXCLUDED.state;

  UPDATE "EntityTranslation"
  SET "shortDescription" = 'Obra maestra de El Greco, pintada entre 1586 y 1588 para Santo Tomé de Toledo. Representa el milagro del entierro de Gonzalo Ruiz de Toledo, señor de Orgaz, y une el cortejo terrestre con la gloria celestial para convertir una memoria local en una meditación sobre muerte, fe, comunidad e imagen.',
      essay = $orgaz$## Un entierro entre la tierra y el cielo

El cuadro que conocemos habitualmente como *El entierro del conde de Orgaz* se titula con mayor precisión *El entierro del señor de Orgaz*. Gonzalo Ruiz de Toledo murió en 1323 como señor de Orgaz; el condado fue concedido a sus descendientes siglos más tarde. La denominación popular se impuso, pero la diferencia importa porque la obra no representa una ceremonia nobiliaria genérica: recuerda a una persona concreta, vinculada a la historia social y religiosa de Toledo.

El Greco pintó el lienzo entre 1586 y 1588 por encargo de Andrés Núñez de Madrid, párroco de Santo Tomé, para la capilla de la Concepción. La iglesia estaba ligada a la memoria del señor de Orgaz y a sus obras de caridad. El programa pictórico convertía la capilla y su sepulcro en un lugar de memoria: el pasado de la comunidad aparecía legitimado por una intervención milagrosa y por la presencia de los santos.

### El milagro como memoria local

La escena se basa en una tradición según la cual san Agustín y san Esteban aparecieron durante el entierro de Gonzalo Ruiz de Toledo y colocaron personalmente su cuerpo en la sepultura. En la zona inferior, san Agustín —con vestiduras episcopales— y san Esteban —con hábito de diácono— sostienen el cuerpo amortajado y armado del difunto. No es sólo una imagen de muerte. Es una demostración visual de que la caridad del personaje ha sido reconocida por la comunidad celestial.

El espectador se sitúa ante una ceremonia en la que participan clérigos, nobles y ciudadanos. El cortejo no se presenta como una multitud anónima: muchos rostros tienen una presencia individualizada, como si la memoria del acontecimiento exigiera hacer visible a quienes la sostienen. La tradición local, el encargo parroquial y la imagen de los contemporáneos forman una misma política de la memoria.

### Dos registros, una pintura

La composición se organiza en dos grandes ámbitos. Abajo está la tierra: el cuerpo, la armadura, los asistentes, los cirios y el espacio material del entierro. Arriba aparece la gloria: Cristo, la Virgen, san Juan Bautista, ángeles y almas que ascienden. La división no funciona como una separación rígida. La línea vertical formada por el cuerpo y los santos enlaza ambos registros, mientras el alma del difunto asciende hacia la zona celestial.

Esta estructura permite que la obra sea simultáneamente narrativa, litúrgica y teológica. El cuadro no ilustra una muerte individual desde fuera; construye una continuidad entre la comunidad visible y el orden invisible que la comunidad cree reconocer. La escala monumental y la colocación sobre la sepultura hacen que la imagen participe del ritual del lugar.

### Toledo como escenario y como archivo

El interés de la obra está inseparablemente ligado a su emplazamiento. No fue concebida para una colección privada ni para una sala neutra, sino para Santo Tomé, en el centro histórico de Toledo. Verla allí significa estar ante una pintura que conserva su relación con la capilla, la sepultura y la memoria de la ciudad. La obra convierte un episodio del siglo XIV en una imagen de finales del XVI y, al mismo tiempo, hace que el Toledo de El Greco se proyecte sobre el presente.

Por eso este cuadro abre varias rutas en JANO: la pintura manierista y sus cuerpos tensos; la religión y la imagen devocional; la memoria de una comunidad; el retrato como presencia pública; la historia de Toledo; y la relación entre obra, arquitectura y ritual. Su fuerza no depende sólo de representar un milagro. Depende de haber hecho visible quién recuerda, desde qué lugar recuerda y cómo una pintura puede transformar una sepultura local en una escena de alcance universal.$orgaz$
  WHERE "entityId" = artwork_id AND locale = 'es';
  UPDATE "EntityTranslation"
  SET "shortDescription" = 'El Greco’s masterpiece, painted between 1586 and 1588 for Santo Tomé in Toledo. It depicts the miracle at the burial of Gonzalo Ruiz de Toledo, lord of Orgaz, joining the earthly funeral procession to the celestial glory and turning local memory into a meditation on death, faith, community, and images.'
  WHERE "entityId" = artwork_id AND locale = 'en';

  INSERT INTO "Source" (id, type, title, publisher, url)
  SELECT 'entierro-orgaz-santo-tome-source', 'WEBSITE', 'El entierro del señor de Orgaz', 'Iglesia de Santo Tomé de Toledo', 'https://santotome.org/la-iglesia/'
  WHERE NOT EXISTS (SELECT 1 FROM "Source" WHERE url = 'https://santotome.org/la-iglesia/');
  SELECT id INTO santo_tome_source_id FROM "Source" WHERE url = 'https://santotome.org/la-iglesia/';

  INSERT INTO "Source" (id, type, title, publisher, url)
  SELECT 'entierro-orgaz-prado-source', 'WEBSITE', 'El entierro del señor de Orgaz — ficha de colección', 'Museo Nacional del Prado', 'https://www.museodelprado.es/coleccion/obra-de-arte/el-entierro-del-seor-de-orgaz/46a8d08b-00ec-48c9-930c-92d517269fb8'
  WHERE NOT EXISTS (SELECT 1 FROM "Source" WHERE url = 'https://www.museodelprado.es/coleccion/obra-de-arte/el-entierro-del-seor-de-orgaz/46a8d08b-00ec-48c9-930c-92d517269fb8');
  SELECT id INTO prado_source_id FROM "Source" WHERE url = 'https://www.museodelprado.es/coleccion/obra-de-arte/el-entierro-del-seor-de-orgaz/46a8d08b-00ec-48c9-930c-92d517269fb8';

  INSERT INTO "SourceRef" (id, "entityId", "sourceId", note)
  SELECT 'entierro-orgaz-santo-tome-ref', artwork_id, santo_tome_source_id, 'Fuente institucional del templo para el encargo, la tradición del milagro, la memoria de Gonzalo Ruiz de Toledo y el emplazamiento de la obra.'
  WHERE NOT EXISTS (SELECT 1 FROM "SourceRef" WHERE "entityId" = artwork_id AND "sourceId" = santo_tome_source_id);
  INSERT INTO "SourceRef" (id, "entityId", "sourceId", note)
  SELECT 'entierro-orgaz-prado-ref', artwork_id, prado_source_id, 'Catálogo institucional del Prado para distinguir la obra original de copias y derivados de su composición.'
  WHERE NOT EXISTS (SELECT 1 FROM "SourceRef" WHERE "entityId" = artwork_id AND "sourceId" = prado_source_id);
END $do$;
