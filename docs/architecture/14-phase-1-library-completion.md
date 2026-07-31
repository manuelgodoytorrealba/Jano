# 14 — Cierre de Fase 1: Library

## Objetivo de la Fase

Resolver la contradicción de ownership documental: el corpus no podía seguir siendo propiedad de Research. La Fase 1 trasladó materiales, versiones, representaciones PDF y extractos a Library, manteniendo Research como contexto privado de uso.

## Estado inicial

Research almacenaba directamente texto, URL y PDF en `ResearchMaterial`. El modelo mezclaba corpus documental, asociación al Research y flujo visible de producto. No existían materiales versionados en Library ni extractos localizables vinculables a Evidence.

## Cambios realizados

La fase introdujo el agregado mínimo de Library, la asociación idempotente Research → Library, writers únicos para TEXT, URL y PDF, versiones y representación física de PDF, Extractos localizables y Evidence compatible.

El flujo público de Research se mantuvo estable mientras el writer se desplazaba a Library. Se añadió una capa temporal de lectura durante la migración, se ejecutó y verificó un backfill idempotente, y finalmente se retiraron el adaptador, `ResearchMaterial`, sus enums y sus contratos internos legacy.

## Arquitectura resultante

```
Library
  ↓
LibraryMaterial
  ↓
LibraryMaterialVersion
  ↓
LibraryExcerpt
  ↓
ResearchLibraryMaterial
  ↓
ResearchEvidence
```

Library conserva el corpus y su trazabilidad. Research conserva la asociación privada al Material, la Evidence y el contexto de investigación. Evidence puede referenciar un Extracto concreto de una versión asociada al mismo Research.

## Cambios importantes

- Library es el único propietario del corpus documental.
- Research ya no almacena materiales.
- TEXT, URL y PDF tienen writers únicos en Library.
- Todo Material nuevo nace con su primera versión.
- La representación PDF conserva `storageKey`, nombre original, MIME y tamaño.
- La procedencia es verificable mediante Extractos localizables por versión.
- `ResearchMaterial` fue eliminado completamente mediante un Contract separado.

## Invariantes

- Un Material pertenece a Library y una versión pertenece a un único Material.
- Un Extracto pertenece a una única MaterialVersion y es idempotente por fingerprint.
- Una asociación Research → Material es única por `projectId + materialId`.
- Evidence sólo puede usar Extractos de Materiales asociados a su propio Research.
- Research no copia contenido ni metadatos documentales.
- Los writers de corpus no escriben `ResearchMaterial`.
- El contrato público de materiales de Research no expone el almacenamiento interno.

## Riesgos abiertos

- En cualquier entorno que aún conserve datos legacy fuera del entorno local auditado, el backfill debe ejecutarse y verificarse junto con el snapshot de PostgreSQL y uploads antes de aplicar el Contract.
- El build frontend mantiene un incumplimiento preexistente del presupuesto SCSS del POC aislado; no afecta a ownership ni al contrato Library.

## Preparación para la Fase 2

Research Knowledge puede construirse sobre una base documental única, versionada y trazable. Claims, Evidence, entidades privadas, relaciones y contradicciones podrán referenciar el corpus Library sin reintroducir ownership documental en Research.

## Estado oficial

**PHASE 1 — LIBRARY**

Status: **COMPLETED**

Fecha de cierre: **2026-07-29**
