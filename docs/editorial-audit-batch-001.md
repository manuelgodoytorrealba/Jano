# Global Editorial Audit

Fecha: 2026-09-07  
Entorno: `infra-db-1` / PostgreSQL `jano` / `infra/docker-compose.yml`  
Idioma auditado: contenido público efectivo `es` (`Entity` + `EntityTranslation`).

## Global Editorial Audit

| Métrica | Resultado |
|---|---:|
| TOTAL_ENTITIES | 824 |
| PUBLIC_ENTITIES | 812 |
| ALREADY_GOOD | 2 |
| NEED_IMPROVEMENT | 822 |
| PERCENT_NEEDING_IMPROVEMENT | 99,8% |
| ENTITIES_WITH_SUMMARY | 805 |
| ENTITIES_WITH_ESSAY | 805 |
| SUMMARY_NEEDS_IMPROVEMENT | 243 |
| ESSAY_NEEDS_IMPROVEMENT | 818 |
| META_JANO_LANGUAGE | 736 resúmenes; 780 ensayos |
| INSUFFICIENT_GROUNDED_KNOWLEDGE | 9 total; 5 publicadas |
| ENTITIES_WITH_RELATION_JUSTIFICATIONS | 688 |
| RELATION_JUSTIFICATIONS_NEEDS_IMPROVEMENT | 662 entidades / 1.048 relaciones |

`NEEDS_IMPROVEMENT` usa una heurística conservadora: ausencia, longitud vacía o baja, plantillas genéricas y patrones meta-JANO. `ALREADY_GOOD` exige superar esos controles tanto en resumen como en ensayo; no incluye una valoración literaria humana.

## By Entity Type

| Tipo | Total | Publicadas | Con resumen | Con ensayo | Meta-JANO | Resumen débil | Ensayo débil | Necesitan mejora |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ARTICLE | 5 | 5 | 5 | 5 | 0 | 4 | 4 | 4 |
| ARTIST | 209 | 207 | 204 | 204 | 200 | 9 | 208 | 209 |
| ARTWORK | 235 | 232 | 235 | 235 | 227 | 6 | 233 | 235 |
| CONCEPT | 210 | 208 | 209 | 209 | 208 | 197 | 209 | 209 |
| EVENT | 11 | 11 | 7 | 7 | 6 | 4 | 11 | 11 |
| MOVEMENT | 53 | 53 | 53 | 53 | 52 | 1 | 52 | 53 |
| ORGANIZATION | 20 | 20 | 19 | 19 | 18 | 2 | 20 | 20 |
| PERIOD | 12 | 12 | 12 | 12 | 10 | 11 | 12 | 12 |
| PERSON | 12 | 8 | 6 | 6 | 6 | 6 | 12 | 12 |
| PLACE | 55 | 54 | 54 | 54 | 54 | 1 | 55 | 55 |
| TEXT | 2 | 2 | 1 | 1 | 0 | 2 | 2 | 2 |

## Main Editorial Problems

- Plantillas que explican el sistema: “se presenta en JANO”, “la ficha”, “Relaciones de lectura”, “Cómo continuar” y “evidencia atribuible”.
- Resúmenes de una sola categoría: “es un artista”, “es una obra cultural” o “es un movimiento cultural”.
- Ensayos que enumeran relaciones en vez de explicar la entidad.
- Relaciones publicadas con fórmulas mecánicas: “permite una lectura editorial relevante”, “se sitúa historiográficamente” y equivalentes.
- Capa bilingüe desalineada: el batch actualiza español; el inglés conserva contenido previo y requiere un batch separado.
- La mayor parte de las relaciones justificadas pertenece directamente a `Relation`/`RelationTranslation`, no a una capa editorial separada.

## Batch 001

SELECTED: 20 entidades representativas: 12 ARTWORK, 6 ARTIST, 1 MOVEMENT y 1 ORGANIZATION, con cobertura documental/relacional amplia.  
REFRESHED: 20/20 en español.  
BLOCKED: justificaciones de relaciones; 1.388 relaciones publicadas y 662 entidades afectadas quedan sin modificar por pertenecer al conocimiento canónico.

El cambio reproducible está en [editorial-batch-001.sql](editorial-batch-001.sql). El SQL sólo actualiza `Entity.summary`, `Entity.content` y la traducción `es` (`shortDescription`, `essay`, `excerpt`).

| Entity ID | Título | Tipo | Antes | Después / conocimiento usado |
|---|---|---|---|---|
| `cmsvvxi9700hc85sjjoidcq8a` | Pablo Picasso | ARTIST | “Pablo Picasso es un artista.” Ensayo factual pero en plantilla. | Biografía canónica: Málaga 1881, muerte 1973, academia, Barcelona, París 1904, encargo de 1937, mitología y máscaras africanas. Sources: Reina Sofía, Tate. |
| `cmsvvxhgm002r85sjdntcbn33` | Cubismo | MOVEMENT | “El cubismo es un movimiento cultural.” Ensayo en plantilla. | Assertions: inicio hacia 1907, Vauxcelles/1908, influencia posterior. SourceRefs: Tate. |
| `cmsvvxif800ku85sjmrawpu0e` | El nacimiento de Venus | ARTWORK | “...es una obra cultural.” Ensayo enumerativo. | Assertion de composición; fecha, temple, lienzo, medidas y Uffizi; SourceRefs Uffizi. |
| `cmqmnymtz004o4vsj0wtos3ox` | Maman | ARTWORK | Texto con `[[...]]` y explicación breve. | Atributos: 1999, bronce/acero/mármol, dimensiones, Guggenheim Bilbao; relations: Bourgeois, maternidad, cuidado, monumento. |
| `cmqmnymu5004r4vsjrvya8fdp` | Las Meninas | ARTWORK | Resumen válido pero ensayo de una frase genérica. | Atributos Prado: 1656, óleo/lienzo, 318 × 276 cm; relations: Velázquez, Barroco, mirada, representación. |
| `cmqmnymt100494vsjefqf57vp` | Saturno devorando a su hijo | ARTWORK | Resumen correcto, ensayo interpretativo sin contexto material suficiente. | Atributos Prado: 1820–1823, Pinturas negras, óleo trasladado a lienzo; relations: violencia, tiempo, dolor. |
| `cmqmnymsu00474vsjen0o2yni` | Marcel Duchamp | ARTIST | Resumen y ensayo breves, sin trayectoria. | Atributos biográficos y disciplines; relations: objeto, autoría, juego, Fountain, Bottle Rack. |
| `cmqmnymui004v4vsjjq7adr8c` | Nighthawks | ARTWORK | Resumen y ensayo de lista. | Atributos Art Institute of Chicago: 1942, óleo, 84,1 × 152,4 cm; relations: Hopper, ciudad, realismo. |
| `cmqmnymsm00454vsjw8djfbo0` | Edward Hopper | ARTIST | Resumen con “se asocia en JANO”; ensayo breve. | Atributos: Nyack 1882, muerte 1967, pintura/grabado; relation con ciudad y Nighthawks. |
| `cmqmnymsr00464vsj35ef244h` | Francis Bacon | ARTIST | Resumen correcto, ensayo reducido. | Atributos: Dublín 1909–1992, Irlanda/Reino Unido, pintura; relaciones con cuerpo, violencia y representación. |
| `cmqmnymuo004x4vsjni2c67mr` | Fountain | ARTWORK | Resumen conceptual corto. | Atributos: 1917, ready-made, porcelana, réplicas; relation CREATED_BY Marcel Duchamp. |
| `cmqmnymuu004z4vsjje52odxv` | Bottle Rack | ARTWORK | Resumen conceptual corto. | Atributos: 1914, ready-made, metal, réplicas; relation CREATED_BY Marcel Duchamp. |
| `cmsvvxiio00mv85sj920czcuo` | Guernica | ARTWORK | No había contenido efectivo en `Entity`; el texto visible era inglés/meta en fallback. | Atributos Reina Sofía: 1937, óleo/lienzo, medidas; relations: Picasso, Guerra Civil española, guerra, violencia, memoria. Sources: MoMA, Reina Sofía. |
| `cmtptpmi90002gxss42zn1ydw` | Judith Baca | ARTIST | Sin contenido público efectivo. | Assertions/SourceRefs Smithsonian: muralismo colaborativo, lugares de memoria pública y comunidades históricamente marginadas. |
| `cmsvvxj8a012s85sjedihcwi5` | Josef Albers | ARTIST | Sin contenido público efectivo. | Assertions/SourceRefs Black Mountain College Museum: 1933–1949, primer profesor de arte, práctica antes que teoría. |
| `cmsvvxiy500w485sjaswn4h4o` | Black Mountain College | ORGANIZATION | Sin contenido público efectivo. | Assertions/SourceRefs institucionales: prácticas colectivas, fiestas, dadaísmo y exilio por el fascismo europeo. |
| `cmsvvxile00og85sjyt9ud6rp` | La gran ola de Kanagawa | ARTWORK | Sin contenido público efectivo. | Atributos: Hokusai, ca. 1831, xilografía, papel, MET; relations: ukiyo-e, paisaje, naturaleza, xilografía. |
| `cmsvvxidz00k385sjl9wykswf` | Busto de Nefertiti | ARTWORK | Sin contenido público efectivo. | Atributos: piedra caliza/estuco, 47 cm; relations: arte egipcio, retrato, pigmento, tradición e instituciones. |
| `cmsvvxihi00m785sje6zpfn92` | Olympia | ARTWORK | Sin contenido público efectivo. | Atributos: Manet, 1863, óleo/lienzo, Musée d’Orsay; relations: realismo, desnudo, deseo, género y mirada. |
| `cmsvvxigt00ls85sj3rcd1lec` | El 3 de mayo de 1808 | ARTWORK | Sin contenido público efectivo. | Atributos Prado: Goya, 1814, óleo/lienzo, medidas; relations: guerra, muerte, violencia y Romanticismo. |

### Relation justifications

`OLD_RELATION_JUSTIFICATIONS`: fórmulas mecánicas existentes.  
`NEW_RELATION_JUSTIFICATIONS`: sin cambio.  
Motivo: la justificación está almacenada en el modelo canónico `Relation`/`RelationTranslation`; no existe una capa editorial pública independiente que permita editarla sin modificar conocimiento canónico. No se modificaron `Relation`, `CanonicalAssertion`, `ResearchEvidence`, `Source`, `SourceRef`, `Citation`, identity resolution, Semantic Evidence V3, Relation Mapping V2 ni Target Router.

## Visual Verification

PLAYWRIGHT: PASS para Guernica, Cubismo, Pablo Picasso y Las Meninas en `localhost:4200`; se comprobaron resumen, ensayo, ficha cuando existía, relaciones y layout sin secciones vacías. La ruta pública devolvió `200` y el contenido nuevo fue visible en la página.

META_JANO_LANGUAGE_AFTER: 0/20 en español.  
UNSUPPORTED_SENTENCES: 0 detectadas por el control de patrón/provenance del batch; la validación semántica completa de cada oración requiere revisión editorial humana.  
Console: el único error repetido fue `401 /api/auth/me` por sesión anónima; no está causado por este batch. También apareció un `403` de una imagen externa en el flujo de Pablo Picasso, sin impacto en texto ni layout.

## Remaining

ENTITIES_STILL_NEEDING_IMPROVEMENT: 790 publicadas después del batch según la heurística efectiva en español.  
Relaciones pendientes: 1.048 justificaciones mecánicas, bloqueadas por ownership canónico.  
Inglés: pendiente de un batch paralelo; la UI por defecto en inglés todavía muestra contenido editorial anterior.

## Recommendation

Siguiente batch seguro: **20**, hasta separar formalmente una capa editorial para justificaciones de relaciones y hasta decidir si el programa bilingüe debe actualizar `es` y `en` en el mismo batch. Después de dos batches con 0 meta-JANO y verificación visual estable, subir a 50.
