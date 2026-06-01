UPDATE "ArtworkDetailsTranslation"
SET
  "authorNation" = CASE trim(coalesce("authorNation", ''))
    WHEN 'Española' THEN 'Spanish'
    WHEN 'Español' THEN 'Spanish'
    WHEN 'Francesa' THEN 'French'
    WHEN 'Francés' THEN 'French'
    WHEN 'Italiana' THEN 'Italian'
    WHEN 'Neerlandesa' THEN 'Dutch'
    WHEN 'Neerlandés' THEN 'Dutch'
    WHEN 'Mexicana' THEN 'Mexican'
    WHEN 'Mexicano' THEN 'Mexican'
    WHEN 'Noruega' THEN 'Norwegian'
    WHEN 'Noruego' THEN 'Norwegian'
    WHEN 'Alemana' THEN 'German'
    WHEN 'Alemán' THEN 'German'
    ELSE "authorNation"
  END,
  "technique" = replace(replace(replace(replace(replace(replace(coalesce("technique", ''),
    'Óleo sobre lienzo', 'Oil on canvas'),
    'Óleo sobre tabla', 'Oil on panel'),
    'Témpera sobre tabla', 'Tempera on panel'),
    'Bronce fundido', 'Cast bronze'),
    'sobre papel', 'on paper'),
    'sobre lienzo', 'on canvas'),
  "materials" = replace(replace(replace(replace(coalesce("materials", ''),
    'Óleo', 'Oil'),
    'Bronce', 'Bronze'),
    'Mármol', 'Marble'),
    'Madera', 'Wood'),
  "location" = replace(replace(replace(replace(coalesce("location", ''),
    'Museo', 'Museum'),
    'París', 'Paris'),
    'Nueva York', 'New York'),
    'Ámsterdam', 'Amsterdam'),
  "collection" = replace(replace(coalesce("collection", ''),
    'Colección permanente', 'Permanent collection'),
    'Colección', 'Collection'),
  "state" = replace(replace(replace(coalesce("state", ''),
    'Conservada', 'Preserved'),
    'Restaurada', 'Restored'),
    'En depósito', 'On loan'),
  "updatedAt" = NOW()
WHERE "locale" = 'en';

UPDATE "ArtistDetailsTranslation"
SET
  "country" = CASE trim(coalesce("country", ''))
    WHEN 'España' THEN 'Spain'
    WHEN 'Francia' THEN 'France'
    WHEN 'Italia' THEN 'Italy'
    WHEN 'México' THEN 'Mexico'
    WHEN 'Países Bajos' THEN 'Netherlands'
    WHEN 'Noruega' THEN 'Norway'
    WHEN 'Alemania' THEN 'Germany'
    ELSE "country"
  END,
  "city" = replace(replace(replace(replace(coalesce("city", ''),
    'París', 'Paris'),
    'Nueva York', 'New York'),
    'Málaga', 'Malaga'),
    'Ámsterdam', 'Amsterdam'),
  "disciplines" = replace(replace(replace(replace(replace(coalesce("disciplines", ''),
    'Pintura', 'Painting'),
    'Escultura', 'Sculpture'),
    'Grabado', 'Printmaking'),
    'Fotografía', 'Photography'),
    'Arquitectura', 'Architecture'),
  "bioShort" = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(coalesce("bioShort", ''),
    'artista', 'artist'),
    'pintor', 'painter'),
    'pintora', 'painter'),
    'escultor', 'sculptor'),
    'escultora', 'sculptor'),
    'español', 'Spanish'),
    'española', 'Spanish'),
    'mexicana', 'Mexican'),
    'francés', 'French'),
    'francesa', 'French'),
  "updatedAt" = NOW()
WHERE "locale" = 'en';

UPDATE "ConceptDetailsTranslation"
SET
  "definition" = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(coalesce("definition", ''),
    'memoria', 'memory'),
    'Memoria', 'Memory'),
    'guerra', 'war'),
    'Guerra', 'War'),
    'violencia', 'violence'),
    'Violencia', 'Violence'),
    'tiempo', 'time'),
    'Tiempo', 'Time'),
    'cuerpo', 'body'),
    'Cuerpo', 'Body'),
    'dolor', 'pain'),
    'Dolor', 'Pain'),
  "updatedAt" = NOW()
WHERE "locale" = 'en';

UPDATE "PeriodDetailsTranslation"
SET
  "definition" = replace(replace(replace(replace(replace(replace(replace(replace(coalesce("definition", ''),
    'siglo', 'century'),
    'modernidad', 'modernity'),
    'industrialización', 'industrialization'),
    'vanguardia', 'avant-garde'),
    'arte', 'art'),
    'visual', 'visual'),
    'historia', 'history'),
    'cultura', 'culture'),
  "updatedAt" = NOW()
WHERE "locale" = 'en';
