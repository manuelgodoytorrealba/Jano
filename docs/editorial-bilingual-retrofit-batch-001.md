# JANO Editorial Bilingual Parity — Batch 001 Retrofit

Fecha: 2026-09-07  
Entorno: `infra-db-1` / PostgreSQL `jano` / `infra/docker-compose.yml`  
Población: exactamente los 20 IDs de `docs/editorial-batch-001.sql`.

## Metric Audit

### Definiciones

`SUMMARY_NEEDS_IMPROVEMENT_OLD = 243` era una métrica estrecha: medía resumen ausente, corto o genérico, pero no incluía de forma consistente el lenguaje meta-JANO.

La métrica maestra actual es la unión deduplicada de:

- meta-JANO;
- campo ausente;
- plantilla genérica;
- cobertura grounded insuficientemente reflejada cuando existe una señal determinista.

La cobertura semántica completa no se puede deducir sólo de longitud. Por eso las señales de “grounded content not reflected” se reportan aparte y no sustituyen la revisión de claims.

| Métrica pública en español | Entidades publicadas |
|---|---:|
| SUMMARY_META_LANGUAGE | 732 |
| SUMMARY_MISSING | 1 |
| SUMMARY_TOO_GENERIC | incluida en la unión; no hay una cifra adicional separable sin doble conteo |
| SUMMARY_GROUNDED_CONTENT_NOT_REFLECTED | señal separada; requiere revisión de claims |
| SUMMARY_NEEDS_IMPROVEMENT_UNION | 773 |
| ESSAY_META_LANGUAGE | 769 |
| ESSAY_MISSING | 10 |
| ESSAY_GROUNDED_CONTENT_NOT_REFLECTED | señal separada; requiere revisión de claims |
| ESSAY_NEEDS_IMPROVEMENT_UNION | 789 |

En la población completa de 824 entidades, las uniones equivalentes son 777 para resumen español, 802 para ensayo español, 451 para resumen inglés y 801 para ensayo inglés.

## Batch 001 Bilingual Retrofit

- ENTITIES: 20
- ES_ALREADY_REFRESHED: 20/20
- EN_REFRESHED: 20/20
- BILINGUAL_COMPLETE: 20/20
- BLOCKED: justificaciones de relaciones canónicas; 662 entidades / 1.048 relaciones.

El inglés se generó de nuevo a partir del mismo conjunto de assertions, structured facts, relaciones elegibles y SourceRefs usado para español. No se tradujo el contenido inglés anterior.

La aplicación reproducible está en [editorial-batch-001-en.sql](editorial-batch-001-en.sql). Sólo modifica o crea `EntityTranslation.locale='en'` para esos 20 IDs.

## Language Parity

- FACT_MISMATCHES: 0 en fechas y hechos estructurados revisados.
- QUALIFIER_MISMATCHES: 0 detectados.
- ATTRIBUTION_MISMATCHES: 0 detectados.
- UNSUPPORTED_ENGLISH_CLAIMS: 0 detectados en revisión grounded del batch.
- MIXED_LANGUAGE: 0 en prosa editorial; nombres propios e instituciones conservan su denominación oficial.
- Los 20 resúmenes y 20 ensayos tienen contenido en ambos idiomas.

## Meta Language

- SPANISH_META_OCCURRENCES: 0/20.
- ENGLISH_META_OCCURRENCES: 0/20.

Se comprobaron ambos idiomas contra patrones explícitos y sus equivalentes funcionales, incluyendo JANO, ficha/entry, datos/information preserved, revisión/editorial review y continuidad del recorrido/continue exploring.

## Playwright

- ENTITIES_CHECKED: 20/20.
- ES: PASS.
- EN: PASS.
- TOGGLE: PASS.
- Representative visual checks: Guernica, Cubismo, Pablo Picasso y Las Meninas.
- En cada ruta el contenido cambió al alternar idioma, permaneció visible y no produjo secciones vacías ni regresiones de layout.
- No hubo metadata privada en los textos editoriales.

El `401 /api/auth/me` observado corresponde a la sesión anónima de desarrollo. No está relacionado con este retrofit.

## Global Progress

La métrica global determinista, sobre las 812 entidades publicadas, queda así:

| Métrica | Resultado |
|---|---:|
| TOTAL_ENTITIES | 824 |
| EDITORIAL_COMPLETE_ES | 32 |
| EDITORIAL_COMPLETE_EN | 38 |
| EDITORIAL_COMPLETE_BILINGUAL | 29 |
| NEED_IMPROVEMENT_BILINGUAL | 783 |
| RELATION_JUSTIFICATION_BLOCKED_ENTITIES | 662 |

`EDITORIAL_COMPLETE_BILINGUAL` sólo cuenta summary y essay en ambos idiomas, sin meta-JANO, ausencia o plantilla genérica. No cuenta como completitud total mientras las justificaciones canónicas estén bloqueadas; ese backlog se sigue por separado.

## Rich Text retrofit

Los mismos 20 ensayos se normalizaron después como Rich Text. Cada versión en español e inglés usa saltos de línea reales, un encabezado de contexto y al menos una referencia compatible a otra entidad publicada cuando el conocimiento grounded lo permite. No se permiten secuencias literales de barra invertida en el contenido almacenado.

La operación reproducible está en [editorial-batch-001-richtext-fix.sql](editorial-batch-001-richtext-fix.sql). Es idempotente para enlaces y encabezados y no modifica entidades canónicas, relaciones, assertions, fuentes, citas ni ResearchEvidence.

Esta comprobación Rich Text es obligatoria para los batches futuros: un batch no puede marcarse como `BILINGUAL_REFRESHED` hasta que ambos idiomas la superen.

## Next Step

- READY_FOR_BATCH_002_BILINGUAL: **YES**, sólo después de este retrofit validado.
- RECOMMENDED_BATCH_SIZE: **20**.
- Batch 002 debe nacer bilingüe y pasar parity, groundedness, meta-language y Playwright antes de marcarse como completado.
- No se inicia Batch 002 en esta ejecución.
