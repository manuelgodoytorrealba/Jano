DO $do$
DECLARE
  artwork_id TEXT;
  tate_source_id TEXT;
  artist_source_id TEXT;
BEGIN
  SELECT id INTO artwork_id FROM "Entity" WHERE slug = 'semillas-de-girasol';
  IF artwork_id IS NULL THEN
    RAISE EXCEPTION 'Canonical artwork semillas-de-girasol is missing';
  END IF;

  UPDATE "Entity"
  SET summary = 'Instalación de Ai Weiwei presentada en la Turbine Hall de Tate Modern en 2010: un campo de más de cien millones de semillas de girasol modeladas, pintadas y cocidas a mano en porcelana por artesanos de Jingdezhen. La obra convierte una multitud de objetos aparentemente idénticos en una reflexión sobre individualidad, trabajo, producción industrial, memoria política y la relación entre China y Occidente.',
      content = $seeds$## Un campo de individuos

*Semillas de girasol* (*Sunflower Seeds*) fue concebida por Ai Weiwei para la Turbine Hall de Tate Modern como la undécima comisión de la serie Unilever. La instalación se presentó entre el 12 de octubre de 2010 y el 2 de mayo de 2011. En lugar de llenar el espacio con una forma monumental, Ai lo cubrió con un campo de diminutos objetos: más de cien millones de semillas de girasol de porcelana.

La escala sólo se entiende al recorrer mentalmente la obra. Cada semilla parece un fragmento gris, ligero y cotidiano, pero el conjunto alcanza una dimensión arquitectónica. Desde lejos se percibe como una superficie uniforme; de cerca, cada pieza revela variaciones de forma, textura y pintura. La instalación hace que el espectador oscile entre la masa y el individuo.

### Porcelana, trabajo y producción

Las semillas fueron realizadas en talleres de Jingdezhen, ciudad china históricamente asociada a la producción de porcelana. La Tate describe un proceso artesanal desarrollado durante aproximadamente dos años y en el que participaron alrededor de 1.600 artesanos. Las piezas no fueron fabricadas como una serie industrial idéntica: fueron modeladas, pintadas y cocidas individualmente mediante un procedimiento manual de múltiples etapas.

Esta tensión entre apariencia industrial y fabricación artesanal es central. La obra parece hablar el lenguaje de la producción en masa —una cantidad casi inimaginable de unidades—, pero cada unidad contiene tiempo, habilidad y trabajo humano. Ai utiliza una imagen asociada a lo común para hacer visible aquello que los sistemas de producción suelen ocultar: quién fabrica, bajo qué condiciones y qué significa que un objeto sea realmente idéntico a otro.

### La semilla y la imagen política

El girasol tiene una carga específica en la historia visual de la China maoísta. En la propaganda, Mao Zedong aparecía como un sol rojo hacia el que se orientaban multitudes representadas como girasoles. Ai recupera esa imagen reconocible y la desplaza: ya no vemos una multitud que mira a un único centro político, sino una multitud de semillas que sólo puede entenderse observando sus diferencias.

La obra no funciona como una ilustración literal de esa historia. Su fuerza está en mantener abiertas varias lecturas. Puede hablar de propaganda, de obediencia y de colectividad, pero también de la capacidad de los individuos para formar un cuerpo común sin desaparecer por completo en él. La semilla es simultáneamente alimento, mercancía, recuerdo cultural y unidad mínima de una masa.

### Participación, escala y distancia

La instalación fue pensada para que el público caminara sobre ella, aunque la Tate restringió posteriormente ese acceso por motivos relacionados con el polvo de porcelana. Ese cambio modificó la experiencia corporal de la obra: de una superficie que podía recorrerse pasó a contemplarse desde sus bordes y desde plataformas. La diferencia importa porque *Semillas de girasol* no es sólo una imagen; es una situación espacial que organiza la distancia, la mirada y el movimiento del público.

La obra también pone en relación dos escalas de tiempo. La visita puede producir una impresión inmediata de repetición, mientras que imaginar la fabricación de cada semilla introduce una duración lenta y acumulativa. El campo parece anónimo, pero está compuesto por miles de decisiones y gestos. La contemplación se convierte así en una forma de contar: contar objetos, personas, horas de trabajo y posibilidades de diferencia.

### Una obra situada en el presente

Presentada en Londres en 2010, la instalación conecta la tradición cerámica china con la economía global contemporánea. El título y el material remiten a China, pero el contexto de Tate la coloca dentro de una institución artística occidental y de una red internacional de circulación. La obra hace productiva esa fricción: no ofrece una imagen simple de China ni una denuncia separada de la experiencia estética, sino una estructura visual en la que cultura, trabajo, mercado, memoria y política se interrogan mutuamente.

En JANO, *Semillas de girasol* abre recorridos hacia Ai Weiwei, el arte conceptual, la materialidad, el ensamblaje, la comunidad, la producción industrial y las relaciones entre individuo y masa. Su importancia no depende únicamente del récord numérico de sus semillas. Depende de haber convertido la repetición en una pregunta sobre la singularidad y de haber hecho que un espacio monumental pudiera percibirse a través de una cantidad inmensa de pequeños cuerpos.$seeds$
  WHERE id = artwork_id;

  INSERT INTO "ArtworkDetails" ("entityId", "authorNation", technique, materials, dimensions, location, collection, state)
  VALUES (artwork_id, 'China', 'Instalación; modelado, pintura y cocción artesanal', 'Porcelana', '152 × 23 m (instalación en la Turbine Hall)', 'Tate Modern, Turbine Hall, Londres', 'The Unilever Series; comisión de Tate Modern', 'Presentada del 12 de octubre de 2010 al 2 de mayo de 2011')
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
    ('semillas-girasol-details-es', artwork_id, 'es', 'China', 'Instalación; modelado, pintura y cocción artesanal', 'Porcelana', '152 × 23 m (instalación en la Turbine Hall)', 'Tate Modern, Turbine Hall, Londres', 'The Unilever Series; comisión de Tate Modern', 'Presentada del 12 de octubre de 2010 al 2 de mayo de 2011', NOW()),
    ('semillas-girasol-details-en', artwork_id, 'en', 'China', 'Installation; hand modelling, painting and firing', 'Porcelain', '152 × 23 m (installation in the Turbine Hall)', 'Tate Modern, Turbine Hall, London', 'The Unilever Series; Tate Modern commission', 'Presented 12 October 2010 to 2 May 2011', NOW())
  ON CONFLICT ("entityId", locale) DO UPDATE SET
    "authorNation" = EXCLUDED."authorNation",
    technique = EXCLUDED.technique,
    materials = EXCLUDED.materials,
    dimensions = EXCLUDED.dimensions,
    location = EXCLUDED.location,
    collection = EXCLUDED.collection,
    state = EXCLUDED.state;

  UPDATE "EntityTranslation"
  SET "shortDescription" = 'Instalación de Ai Weiwei presentada en la Turbine Hall de Tate Modern en 2010: más de cien millones de semillas de girasol de porcelana, realizadas artesanalmente en Jingdezhen. La obra convierte la repetición y la escala en una reflexión sobre individualidad, trabajo, producción industrial y memoria política.',
      essay = $seeds$## Un campo de individuos

*Semillas de girasol* (*Sunflower Seeds*) fue concebida por Ai Weiwei para la Turbine Hall de Tate Modern como la undécima comisión de la serie Unilever. La instalación se presentó entre el 12 de octubre de 2010 y el 2 de mayo de 2011. En lugar de llenar el espacio con una forma monumental, Ai lo cubrió con un campo de diminutos objetos: más de cien millones de semillas de girasol de porcelana.

La escala sólo se entiende al recorrer mentalmente la obra. Cada semilla parece un fragmento gris, ligero y cotidiano, pero el conjunto alcanza una dimensión arquitectónica. Desde lejos se percibe como una superficie uniforme; de cerca, cada pieza revela variaciones de forma, textura y pintura. La instalación hace que el espectador oscile entre la masa y el individuo.

### Porcelana, trabajo y producción

Las semillas fueron realizadas en talleres de Jingdezhen, ciudad china históricamente asociada a la producción de porcelana. La Tate describe un proceso artesanal desarrollado durante aproximadamente dos años y en el que participaron alrededor de 1.600 artesanos. Las piezas no fueron fabricadas como una serie industrial idéntica: fueron modeladas, pintadas y cocidas individualmente mediante un procedimiento manual de múltiples etapas.

Esta tensión entre apariencia industrial y fabricación artesanal es central. La obra parece hablar el lenguaje de la producción en masa —una cantidad casi inimaginable de unidades—, pero cada unidad contiene tiempo, habilidad y trabajo humano. Ai utiliza una imagen asociada a lo común para hacer visible aquello que los sistemas de producción suelen ocultar: quién fabrica, bajo qué condiciones y qué significa que un objeto sea realmente idéntico a otro.

### La semilla y la imagen política

El girasol tiene una carga específica en la historia visual de la China maoísta. En la propaganda, Mao Zedong aparecía como un sol rojo hacia el que se orientaban multitudes representadas como girasoles. Ai recupera esa imagen reconocible y la desplaza: ya no vemos una multitud que mira a un único centro político, sino una multitud de semillas que sólo puede entenderse observando sus diferencias.

La obra no funciona como una ilustración literal de esa historia. Su fuerza está en mantener abiertas varias lecturas. Puede hablar de propaganda, de obediencia y de colectividad, pero también de la capacidad de los individuos para formar un cuerpo común sin desaparecer por completo en él. La semilla es simultáneamente alimento, mercancía, recuerdo cultural y unidad mínima de una masa.

### Participación, escala y distancia

La instalación fue pensada para que el público caminara sobre ella, aunque la Tate restringió posteriormente ese acceso por motivos relacionados con el polvo de porcelana. Ese cambio modificó la experiencia corporal de la obra: de una superficie que podía recorrerse pasó a contemplarse desde sus bordes y desde plataformas. La diferencia importa porque *Semillas de girasol* no es sólo una imagen; es una situación espacial que organiza la distancia, la mirada y el movimiento del público.

La obra también pone en relación dos escalas de tiempo. La visita puede producir una impresión inmediata de repetición, mientras que imaginar la fabricación de cada semilla introduce una duración lenta y acumulativa. El campo parece anónimo, pero está compuesto por miles de decisiones y gestos. La contemplación se convierte así en una forma de contar: contar objetos, personas, horas de trabajo y posibilidades de diferencia.

### Una obra situada en el presente

Presentada en Londres en 2010, la instalación conecta la tradición cerámica china con la economía global contemporánea. El título y el material remiten a China, pero el contexto de Tate la coloca dentro de una institución artística occidental y de una red internacional de circulación. La obra hace productiva esa fricción: no ofrece una imagen simple de China ni una denuncia separada de la experiencia estética, sino una estructura visual en la que cultura, trabajo, mercado, memoria y política se interrogan mutuamente.

En JANO, *Semillas de girasol* abre recorridos hacia Ai Weiwei, el arte conceptual, la materialidad, el ensamblaje, la comunidad, la producción industrial y las relaciones entre individuo y masa. Su importancia no depende únicamente del récord numérico de sus semillas. Depende de haber convertido la repetición en una pregunta sobre la singularidad y de haber hecho que un espacio monumental pudiera percibirse a través de una cantidad inmensa de pequeños cuerpos.$seeds$
  WHERE "entityId" = artwork_id AND locale = 'es';

  UPDATE "EntityTranslation"
  SET "shortDescription" = 'Ai Weiwei’s installation presented in Tate Modern’s Turbine Hall in 2010: more than one hundred million porcelain sunflower seeds handcrafted in Jingdezhen. The work turns repetition and scale into a meditation on individuality, labour, industrial production and political memory.',
      essay = '## A field of individuals\n\n*Sunflower Seeds* was conceived by Ai Weiwei for Tate Modern’s Turbine Hall as the eleventh commission in the Unilever Series. Presented from 12 October 2010 to 2 May 2011, it covered the monumental space with more than one hundred million porcelain sunflower seeds. Each apparently identical unit was handcrafted, painted and fired in Jingdezhen, making the installation a tension between mass production and individual labour.\n\nThe sunflower also carries political associations in Maoist visual culture, where the people were often represented as sunflowers turning toward Mao as a red sun. Ai transforms that image into a field whose apparent uniformity dissolves when viewed closely. The work connects Chinese ceramic tradition, global production, memory and the relation between the individual and the collective.'
  WHERE "entityId" = artwork_id AND locale = 'en';

  INSERT INTO "Source" (id, type, title, publisher, url)
  SELECT 'semillas-girasol-tate-source', 'WEBSITE', 'The Unilever Series: Ai Weiwei: Sunflower Seeds', 'Tate', 'https://www.tate.org.uk/whats-on/tate-modern/exhibition/unilever-series-ai-weiwei-sunflower-seeds'
  WHERE NOT EXISTS (SELECT 1 FROM "Source" WHERE url = 'https://www.tate.org.uk/whats-on/tate-modern/exhibition/unilever-series-ai-weiwei-sunflower-seeds');
  SELECT id INTO tate_source_id FROM "Source" WHERE url = 'https://www.tate.org.uk/whats-on/tate-modern/exhibition/unilever-series-ai-weiwei-sunflower-seeds';

  INSERT INTO "Source" (id, type, title, publisher, url)
  SELECT 'semillas-girasol-aiweiwei-source', 'WEBSITE', '1000 Years of Joys and Sorrows — Sunflower Seeds', 'Ai Weiwei', 'https://www.aiweiwei.com/1000years-2'
  WHERE NOT EXISTS (SELECT 1 FROM "Source" WHERE url = 'https://www.aiweiwei.com/1000years-2');
  SELECT id INTO artist_source_id FROM "Source" WHERE url = 'https://www.aiweiwei.com/1000years-2';

  INSERT INTO "SourceRef" (id, "entityId", "sourceId", note)
  SELECT 'semillas-girasol-tate-ref', artwork_id, tate_source_id, 'Fuente institucional de Tate para la comisión, fechas de exhibición, escala, material, proceso artesanal y contexto de la instalación.'
  WHERE NOT EXISTS (SELECT 1 FROM "SourceRef" WHERE "entityId" = artwork_id AND "sourceId" = tate_source_id);
  INSERT INTO "SourceRef" (id, "entityId", "sourceId", note)
  SELECT 'semillas-girasol-aiweiwei-ref', artwork_id, artist_source_id, 'Fuente del artista para la intención, la relación entre cultura, historia, memoria e identidad y el proyecto de la instalación.'
  WHERE NOT EXISTS (SELECT 1 FROM "SourceRef" WHERE "entityId" = artwork_id AND "sourceId" = artist_source_id);
END $do$;
