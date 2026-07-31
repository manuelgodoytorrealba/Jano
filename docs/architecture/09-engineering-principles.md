# 09 — Engineering Principles

## Principios obligatorios

1. Backend conserva reglas de negocio, integridad, ownership, autorización y trazabilidad.
2. Frontend conserva presentación, interacción local y previews; no duplica reglas de dominio.
3. Cada agregado tiene una responsabilidad y una frontera explícita.
4. Cada objeto tiene un único propietario.
5. Un contrato entre dominios es unidireccional, explícito y trazable.
6. El estado publicado es inmutable; los borradores evolucionan mediante versiones explícitas.
7. La IA y procesos automáticos proponen; nunca publican ni promueven por sí solos.
8. No introducir event bus, CQRS, store global, repositorio genérico o abstracción de proveedor sin una necesidad medida.
9. Procesamiento prolongado es asíncrono, observable e idempotente; decisiones editoriales no se delegan.
10. Toda excepción a esta documentación requiere una decisión arquitectónica registrada antes de implementarse.

## Tests que protegen el dominio

- ownership exclusivo por Research;
- privacidad y autorización;
- procedencia desde evidencia a extracto;
- inmutabilidad de versiones publicadas;
- ausencia de sincronización Research ↔ Publication;
- trazabilidad Publication → Version → Edition;
- promoción explícita, idempotente y reversible mediante nueva decisión;
- imposibilidad de que una aprobación modifique el objeto privado de origen.

## Decisiones irreversibles

Ownership, identidad, privacidad, procedencia, inmutabilidad publicada, separación Research/Core y contratos de derivación deben implementarse correctamente desde el primer slice. El layout, componentes, filtros, animaciones y presentación son decisiones reversibles.
