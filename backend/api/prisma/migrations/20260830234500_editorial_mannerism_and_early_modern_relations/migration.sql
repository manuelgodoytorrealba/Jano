DO $$
DECLARE
  mannerism_id TEXT;
  early_modern_id TEXT;
  baroque_id TEXT;
  rococo_id TEXT;
  belongs_to_period_id TEXT;
  met_source_id TEXT;
  smarthistory_source_id TEXT;
BEGIN
  SELECT id INTO mannerism_id FROM "Entity" WHERE slug = 'manierismo';
  SELECT id INTO early_modern_id FROM "Entity" WHERE slug = 'edad-moderna';
  SELECT id INTO baroque_id FROM "Entity" WHERE slug = 'barroco';
  SELECT id INTO rococo_id FROM "Entity" WHERE slug = 'rococo';
  SELECT id INTO belongs_to_period_id FROM "RelationType" WHERE key = 'BELONGS_TO_PERIOD';

  IF mannerism_id IS NULL OR early_modern_id IS NULL OR belongs_to_period_id IS NULL THEN
    RAISE EXCEPTION 'Canonical Mannerism / Early Modern entities or relation type are missing';
  END IF;

  UPDATE "Relation"
  SET justification = CASE
    WHEN "fromId" = mannerism_id THEN 'El Manierismo se desarrolló principalmente en la Italia del siglo XVI y se difundió por cortes europeas entre el Renacimiento tardío y el Barroco; por cronología y contexto pertenece a la Edad Moderna (1500–1800).'
    WHEN "fromId" = baroque_id THEN 'El Barroco se desarrolló principalmente durante los siglos XVII y comienzos del XVIII, en contextos cortesanos, religiosos y urbanos propios de la Edad Moderna; su cronología queda dentro de 1500–1800.'
    WHEN "fromId" = rococo_id THEN 'El Rococó floreció durante el siglo XVIII, especialmente en Francia y otros centros europeos, por lo que constituye una corriente artística situada dentro de la Edad Moderna (1500–1800).'
    ELSE justification
  END
  WHERE "toId" = early_modern_id
    AND "relationTypeId" = belongs_to_period_id
    AND "fromId" IN (mannerism_id, baroque_id, rococo_id);

  UPDATE "EntityTranslation"
  SET "shortDescription" = 'El Manierismo fue una corriente artística desarrollada sobre todo en Italia durante el siglo XVI y difundida después por distintas cortes europeas. Sus artistas conocían profundamente el legado de Rafael y Miguel Ángel, pero buscaron apartarse del equilibrio clásico mediante figuras alargadas, poses difíciles, espacios inestables, colores tensos y una sofisticación deliberadamente artificial. Más que una simple fase entre Renacimiento y Barroco, permite estudiar cómo una tradición se transforma cuando sus convenciones se vuelven conscientes y discutibles.',
      essay = $mannerism$## Cuando la armonía se vuelve un problema

El Manierismo no fue una ruptura absoluta con el Renacimiento. Nació de una relación intensa con sus logros: la anatomía estudiada, la composición equilibrada, la perspectiva y la autoridad de los grandes maestros. Precisamente porque esas soluciones habían alcanzado un alto grado de dominio, algunos artistas del siglo XVI comenzaron a tratarlas como un repertorio que podía tensarse, citarse y transformarse. La obra ya no tenía que parecer naturalmente equilibrada; podía mostrar el artificio de su construcción.

En pintura y escultura, esa tensión aparece en cuerpos alargados, torsiones difíciles y gestos que parecen continuar más allá del marco. La elegancia deja de coincidir con la facilidad. Una figura puede ser bella y, al mismo tiempo, incómoda de mirar; puede ocupar un espacio que no termina de obedecer a la perspectiva; puede parecer suspendida entre la presencia física y la invención. El resultado no es una receta formal única, sino una familia de estrategias que hacen visible la distancia entre naturaleza, modelo y estilo.

### El cuerpo como invención

El cuerpo manierista no funciona sólo como anatomía ideal. Es también una demostración de la capacidad del artista para reorganizarla. Cuellos demasiado largos, manos expresivas, piernas cruzadas y posturas serpentinatas convierten el conocimiento del cuerpo en una forma de lenguaje. Esta artificialidad no debe confundirse con falta de rigor: muchas de estas obras exigen un control extraordinario del dibujo y de la composición.

Esa dimensión explica la importancia de artistas como Pontormo, Parmigianino, Bronzino, Giambologna y El Greco, cuyas trayectorias no caben en un único centro italiano ni en una definición cerrada. El Manierismo circuló entre talleres, ciudades y cortes; también se adaptó a encargos religiosos, retratos, mitologías y programas dinásticos. La etiqueta es útil cuando permite seguir esas operaciones, pero se vuelve pobre si convierte toda rareza formal en manierista.

### Espacios que no descansan

La inestabilidad manierista afecta también al espacio. Las figuras pueden comprimirse en primer plano, los fondos pueden perder profundidad convincente y los objetos pueden relacionarse mediante ritmos más ornamentales que narrativos. El espectador recibe suficientes indicios para reconstruir la escena, pero no siempre una posición estable desde la que dominarla. Mirar implica ajustar continuamente la percepción.

Este problema enlaza el movimiento con la cultura de las cortes y con la circulación de modelos. En un contexto donde la imagen podía expresar rango, educación y acceso a códigos refinados, la dificultad se convertía en una forma de distinción. La obra no sólo mostraba un tema: mostraba que sabía construir una superficie compleja para un público capaz de reconocer sus referencias.

### Entre el Renacimiento y el Barroco

Situar el Manierismo dentro de la Edad Moderna no significa reducirlo a una casilla cronológica. La relación con el Barroco es real, pero no lineal. Algunas soluciones manieristas —la intensidad gestual, la tensión espacial y la teatralidad— fueron retomadas y reorganizadas por artistas barrocos; otras pertenecen a problemas propios de las cortes y de la cultura visual del siglo XVI. Del mismo modo, “Manierismo” es una categoría histórica construida con posterioridad y aplicada de manera desigual a obras y regiones distintas.

En JANO, este nodo funciona mejor como una puerta de exploración: desde Pontormo y Giambologna hacia El Greco, desde el cuerpo y la perspectiva hacia el poder cortesano, y desde el Renacimiento italiano hacia las transformaciones que desembocan en el Barroco. La pregunta central no es si una obra cumple una lista de rasgos, sino qué ocurre cuando la tradición clásica se convierte en material consciente de experimentación. $mannerism$
  WHERE "entityId" = mannerism_id AND locale = 'es';

  INSERT INTO "EntityTranslation" (id, "entityId", locale, title, "shortDescription")
  SELECT 'mannerism-en-editorial', mannerism_id, 'en', 'Mannerism', 'Mannerism was an artistic current that developed chiefly in Italy during the sixteenth century and later spread through European courts. Its artists knew the legacy of Raphael and Michelangelo intimately, yet sought to move away from classical balance through elongated figures, difficult poses, unstable spaces, tense colours, and deliberately artificial sophistication. Rather than a simple phase between the Renaissance and Baroque, it helps us study how a tradition changes when its conventions become conscious and debatable.'
  WHERE NOT EXISTS (SELECT 1 FROM "EntityTranslation" WHERE "entityId" = mannerism_id AND locale = 'en');

  INSERT INTO "Source" (id, type, title, publisher, url)
  SELECT 'mannerism-met-source', 'WEBSITE', 'Mannerism: Bronzino (1503–1572) and His Contemporaries', 'The Metropolitan Museum of Art', 'https://www.metmuseum.org/toah/hd/zino/hd_zino.htm'
  WHERE NOT EXISTS (SELECT 1 FROM "Source" WHERE url = 'https://www.metmuseum.org/toah/hd/zino/hd_zino.htm');
  SELECT id INTO met_source_id FROM "Source" WHERE url = 'https://www.metmuseum.org/toah/hd/zino/hd_zino.htm';

  INSERT INTO "Source" (id, type, title, publisher, url)
  SELECT 'mannerism-smarthistory-source', 'WEBSITE', 'Mannerism, an introduction', 'Smarthistory', 'https://smarthistory.org/mannerism-introduction/'
  WHERE NOT EXISTS (SELECT 1 FROM "Source" WHERE url = 'https://smarthistory.org/mannerism-introduction/');
  SELECT id INTO smarthistory_source_id FROM "Source" WHERE url = 'https://smarthistory.org/mannerism-introduction/';

  INSERT INTO "SourceRef" (id, "entityId", "sourceId", note)
  SELECT 'mannerism-met-source-ref', mannerism_id, met_source_id, 'Institutional reference for sixteenth-century Mannerism and Bronzino.'
  WHERE NOT EXISTS (SELECT 1 FROM "SourceRef" WHERE "entityId" = mannerism_id AND "sourceId" = met_source_id);
  INSERT INTO "SourceRef" (id, "entityId", "sourceId", note)
  SELECT 'mannerism-smarthistory-source-ref', mannerism_id, smarthistory_source_id, 'Academic introduction to chronology, formal strategies, circulation and historiography.'
  WHERE NOT EXISTS (SELECT 1 FROM "SourceRef" WHERE "entityId" = mannerism_id AND "sourceId" = smarthistory_source_id);
END $$;
