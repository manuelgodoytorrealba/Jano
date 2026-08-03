# JANO Architecture North Star

Estado: **NORMATIVA**
Última consolidación: 2026-07-27

Esta carpeta es la fuente de verdad arquitectónica para el Research Studio. Toda implementación debe respetar estos documentos. Un cambio de dominio exige actualizar primero esta documentación mediante una decisión arquitectónica explícita.

## Lectura recomendada

1. [Visión de producto](./00-product-vision.md)
2. [Visión general del dominio](./01-domain-overview.md)
3. [Research Studio: experiencia editorial](./15-research-studio-experience.md) y [Editorial Pipeline](./16-editorial-pipeline.md)
4. Dominios: [Research](./02-research.md), [Biblioteca](./03-library.md), [Research Knowledge](./04-research-knowledge.md), [Publication](./05-publication.md), [Knowledge Core](./06-knowledge-core.md) y [Drafts de Research](./11-research-drafts.md)
5. [Contratos](./07-contracts.md)
6. [Roadmap](./08-implementation-roadmap.md)
7. [Principios de ingeniería](./09-engineering-principles.md)
8. [Glosario](./10-glossary.md)

`15-research-studio-experience.md` es la fuente normativa de producto para el flujo editorial de Research Studio. `16-editorial-pipeline.md` es la fuente normativa funcional para el paso de corpus a conocimiento revisado y para Editorial Jobs. Los documentos de dominio conservan ownership e invariantes; no duplican esos flujos.

Los documentos previos `editorial-research-studio-adr.md` y `editorial-research-studio-boundaries.md` se conservan como contexto histórico. Cuando contradigan esta carpeta, la contradicción queda registrada en `01-domain-overview.md`; no son autoridad para nueva implementación.
