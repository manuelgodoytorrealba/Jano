# 12 — Backlog MVP y progreso de Research Studio

## Método de estimación

El MVP se estima en 48 Stories y 100 unidades de esfuerzo. Las unidades representan riesgo de dominio, migración e integración; no horas ni número de archivos. El progreso se calcula sólo con Stories cerradas y sus unidades asignadas.

## Backlog

| Fase                      | Peso | Stories estimadas | Resultado                                                                       |
| ------------------------- | ---: | ----------------: | ------------------------------------------------------------------------------- |
| 0. Límites y trazabilidad |   10 |                 6 | ownership, privacidad, autoría, archivado y pruebas de invariantes              |
| 1. Biblioteca / Corpus    |   15 |                10 | contrato aditivo, material, versión, extracto y migración de `ResearchMaterial` |
| 2. Research Knowledge     |   16 |                 7 | entidades privadas, Claims, Evidence, relaciones y contradicciones              |
| 3. Research Graph         |   10 |                 5 | contrato, trazabilidad, lectura progresiva y exploración conectada              |
| 4. Outline y dossier      |    9 |                 4 | secciones, contexto editorial y dossier verificable                             |
| 5. Writing y Review       |   13 |                 4 | Draft investigador, revisión humana y decisiones                                |
| 6. Publication            |   12 |                 4 | identidad, versiones inmutables y derivación selectiva                          |
| 7. Promotion y Core       |    7 |                 3 | Promotion Proposal, Knowledge Review y aplicación canónica                      |
| 8. Editions               |    4 |                 2 | Edition autónoma desde Publication Version                                      |
| 9. Perspectives           |    2 |                 1 | proyecciones derivadas de Publication/Edition                                   |
| 10. Estabilización        |    2 |                 2 | UX de exploración, observabilidad y hardening MVP                               |

### Desglose de Fase 0

- 0.1 Fronteras de dominio — cerrada.
- 0.2 POC aislado — cerrada.
- 0.3 Inventario técnico — cerrada.
- 0.4 Ownership y archivado — cerrada.
- 0.5 Tests de invariantes — cerrada.
- 0.6 Preparar migración Biblioteca — cerrada.

### Desglose restante por fase

- Fase 1: 1.1 contrato aditivo de Library — cerrada; 1.2 asociación Research → Library — cerrada; 1.3 writer texto/URL — cerrada; 1.4 writer PDF/representación — cerrada; 1.5 Extractos y Evidence — cerrada; 1.6 adaptador de lectura — cerrada; 1.7 cutover frontend/escrituras — cerrada; 1.8 backfill/verificación — cerrada; 1.9 contract legacy — cerrada; 1.10 cierre oficial — cerrada.
- Fase 2: 2.1 baseline de Research Evidence — cerrada; 2.2 Research Entity — cerrada; 2.3 Research Claim — cerrada; 2.4 Research Relation — cerrada; 2.5 Research Knowledge Projection — cerrada; 2.5.1 ResearchFinding Contract — cerrada; 2.6 cierre oficial — cerrada; contradicciones, revisión y proyección de lectura.
- Fase 3: 3.1 contrato e invariantes del Graph — cerrada; 3.2 trazabilidad de Knowledge — cerrada; 3.3 lectura progresiva — cerrada; 3.4 adaptador visual privado — cerrada; 3.5 explorador integrado en Research Studio — cerrada.
- Fase 4: Section, dossier, referencias estables, flujo de contexto.
- Fase 5: Draft, Review investigador, decisiones y trazabilidad.
- Fase 6: Publication, Publication Version, derivación y congelación publicada.
- Fase 7: Proposal, Review, operación idempotente y reversión por decisión nueva.
- Fase 8–10: Edition, perspectives y estabilización sin nuevos ownerships.

## Línea base

Stories cerradas: 28/48. Unidades cerradas: 51/100 (Fase 0.1=2, 0.2=1, 0.3=1, 0.4=4, 0.5=1, 0.6=1, Fase 1.1=2, 1.2=1, 1.3=2, 1.4=2, 1.5=2, 1.6=1, 1.7=1, 1.8=2, 1.9=1, 1.10=1, Fase 2.1=2, 2.2=3, 2.3=3, 2.4=3, 2.5=3, 2.5.1=2, Fase 3=10).

Progreso estimado: **51%**. Restante: **49%**, 20 Stories estimadas. La cifra cambiará sólo al cerrar Stories o si una contradicción objetiva obliga a dividir una Story. El roadmap funcional del siguiente bloque editorial vive en el [Editorial Pipeline](./16-editorial-pipeline.md); este archivo conserva el ledger de entrega.
