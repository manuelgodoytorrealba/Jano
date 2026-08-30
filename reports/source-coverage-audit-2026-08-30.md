# Source Coverage Audit — 2026-08-30

Auditoría de sólo lectura. No se solicitaron URLs, no se descargaron fuentes, no se crearon excerpts ni
Evidence y no se modificaron registros.

## Source Inventory Summary

| Métrica          | Resultado |
| ---------------- | --------: |
| Sources          |       590 |
| SourceRefs       |       831 |
| Citations        |     1.388 |
| LibraryMaterials |         1 |
| LibraryExcerpts  |        12 |
| ResearchEvidence |        10 |

## Source Accessibility Distribution

| Categoría                   |                                    Sources |
| --------------------------- | -----------------------------------------: |
| PUBLIC_WEB_SOURCE           |                                        565 |
| PUBLIC_DOCUMENT             |                                          1 |
| EXISTING_LIBRARY_MATERIAL   |                                          1 |
| BIBLIOGRAPHIC_ONLY          |                                         23 |
| BROKEN_OR_INVALID           |                                          0 |
| DUPLICATE_OR_NEAR_DUPLICATE | 0 detectados con la clave exacta title+url |

No se hicieron requests HTTP. “Pública” significa URL con formato HTTP(S) válido, no accesibilidad comprobada.

## Source Quality Distribution

| Calidad                    | Sources |
| -------------------------- | ------: |
| PRIMARY_AUTHORITATIVE      |     104 |
| SCHOLARLY_STRONG_SECONDARY |       7 |
| GENERAL_REFERENCE          |      25 |
| UNKNOWN                    |     454 |

La clasificación usa únicamente metadata real; no presupone autoridad cuando no hay publisher/dominio suficiente.

## Global Entity Coverage

Se auditaron 805 entidades (la seed actual contiene 805, no aproximadamente 795).

| Estado                               | Entidades |
| ------------------------------------ | --------: |
| Sin Source                           |         0 |
| Sólo bibliografía                    |       803 |
| Con Source potencialmente procesable |       791 |
| Con Evidence/fragmento real          |         2 |

## Bibliography vs Actual Evidence

Los 831 SourceRefs no tienen quote. Las 1.388 Citations tampoco tienen quote. Hay Evidence con texto en
Research, pero no está enlazada a las 24 entidades del benchmark.

## Existing Source → Material Pipeline

El flujo existente es:

```text
Source
→ LibraryMaterial
→ LibraryMaterialVersion
→ LibraryMaterialPreparationService.prepare()
→ LibraryExcerpt (manual desde Research)
→ ResearchEvidence
```

`LibraryMaterialPreparationService` ya prepara PDF mediante `pdftotext`/OCR y URLs mediante HTML/texto,
con límites, validación de URLs privadas y estados `READY`/`FAILED`. Research ya expone endpoints para
crear excerpts, crear Evidence desde excerpts y ejecutar extracción de propuestas. No hace falta otro
pipeline de ingestion.

## Evidence Model Review

La ausencia de quote no invalida automáticamente una afirmación estructurada canónica. Debe distinguirse:

- `STRUCTURED_FACT_WITH_PROVENANCE`: metadata canónica y provenance asociada;
- `DIRECT_DOCUMENTARY_EVIDENCE`: fragmento con source y locator;
- `ATTRIBUTED_INTERPRETATION`: interpretación documentada y atribuida;
- `PARAPHRASED_DOCUMENTARY_SUPPORT`: paráfrasis anclada a un fragmento;
- `RELATION_EVIDENCE`: relación con justificación/evidencia factual;
- `SUPPORTED_SYNTHESIS`: combinación de premisas proporcionadas.

El generador actual necesita recibir estas capas por separado; quote es evidencia directa, no el único tipo
posible de soporte.

## Processable Knowledge Potential

| Potencial                                            | Sources |
| ---------------------------------------------------- | ------: |
| AUTOMATICALLY_PROCESSABLE por URL/material existente |     566 |
| SEMI_AUTOMATIC por PDF público                       |       1 |
| MANUAL                                               |      23 |
| NOT_PROCESSABLE                                      |       0 |

Son estimaciones por metadata/formato. No garantizan que una URL responda, sea legible o tenga valor editorial.

## High-Leverage Sources

El JSON contiene las primeras 30 combinando centralidad de entidades, calidad editorial, procesabilidad y
ausencia de Evidence. Las primeras son “Academia — procedencia visual” (91 entidades), “Art Terms and
Collection” (22), “Collection” (17), “The Met Collection” (11) y “Art & Architecture Thesaurus” (9).

## Benchmark 24 Source Audit

El campo `benchmark24` del JSON contiene para cada entidad: depth actual, Sources, calidad, fuentes
procesables, fragments documentales, gap principal y camino de enriquecimiento.

## Expected Impact From Existing Sources

Procesar las URLs existentes podría convertir bibliografía en fragments para muchas entidades, pero no se
puede afirmar todavía cuántas subirán de nivel: la auditoría no descargó contenido ni evaluó su relevancia.

## Architecture Gaps

El gap concreto no es de almacenamiento: es que Sources públicas no han pasado por Material preparation,
fragmentación y Evidence linking. El siguiente trabajo debe reutilizar `LibraryMaterialPreparationService`,
`LibraryExcerpt` y `ResearchEvidence`, no crear tablas paralelas.

## Recommendation

**A. PROCESS_EXISTING_SOURCES**, en lotes controlados y posteriores a esta auditoría, priorizando las
Sources de mayor centralidad y autoridad. La ejecución todavía no se realiza en este encargo.

Datos completos: `artifacts/source-coverage-audit.json`.
