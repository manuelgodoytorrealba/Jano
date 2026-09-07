# Batch 004 — resumen y ensayo bilingües

## Alcance

Se actualizaron 20 obras publicadas con datos estructurados de fecha, técnica o materiales, ubicación y relaciones editoriales publicadas. Se actualizaron únicamente los campos editoriales públicos:

- `Entity.summary` y `Entity.content` en español.
- `EntityTranslation(locale='es').shortDescription` y `essay`.
- `EntityTranslation(locale='en').shortDescription` y `essay`.

No se modificaron entidades canónicas, relaciones, assertions, fuentes, citas ni conocimiento de investigación.

## Regla Rich Text

Los ensayos enlazan sólo otras entidades publicadas mediante `[[slug|label]]`. La entidad que se está leyendo nunca se enlaza a sí misma. Se mantienen saltos de línea reales y no se publican secuencias literales `\\n`.

## Entidades

Abaporu; Casa de la Cascada; Cut Piece; David; El grito; La Libertad guiando al pueblo; La persistencia de la memoria; Las dos Fridas; Latas de sopa Campbell; La última cena; La vocación de san Mateo; Lluvia repentina sobre el puente Ohashi; Los girasoles; Madre migrante; Mezquita de Córdoba; Mont Sainte-Victoire; Panteón de Roma; Piedra del Sol; Psique reanimada por el beso; Santa Sofía.

## Validación

- 20/20 resúmenes ES presentes.
- 20/20 ensayos ES presentes.
- 20/20 resúmenes EN presentes.
- 20/20 ensayos EN presentes.
- 71 enlaces Rich Text comprobados; 0 rotos.
- 0 autoenlaces.
- 0 secuencias literales `\\n`.
- 0 patrones de meta-lenguaje detectados en el batch.
- Playwright: 20/20 rutas comprobadas.
- Toggle ES → EN → ES comprobado visualmente en Abaporu.

## Nota editorial

La justificación de relaciones sigue bloqueada como conocimiento canónico de `Relation` / `RelationTranslation` y no forma parte de este batch.
