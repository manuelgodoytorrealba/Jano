# 05 — Publication

## Propósito

Publication es la identidad duradera de una obra editorial derivada de un único Research de origen. Publication Version es una composición concreta y preservable de esa obra. Editorial Edition es una expresión editorial propia de una versión concreta.

## Relaciones

```mermaid
flowchart LR
  R[Research] -->|derivación explícita| P[Publication]
  P --> PV[Publication Version]
  PV --> EE[Editorial Edition]
```

## Invariantes

- Una Publication tiene exactamente un Research de origen inmutable.
- Una investigación puede originar varias Publications.
- Publication nunca es una vista viva de Research.
- No existe sincronización automática o bidireccional.
- Una versión publicada es inmutable.
- Una Edition se inicializa con referencia a una Publication Version y posee después texto, decisiones, estado y versionado propios.

## Derivación e incorporación

Crear Publication produce una derivación editorial selectiva: procedencia conocida, selección de contenido y composición editorial autónoma. Puede importarse explícitamente un Draft o fragmento de Research para inicializar contenido de una versión; desde entonces es contenido propio de Publication.

Research puede alimentar de nuevo una versión no publicada mediante incorporaciones editoriales manuales, selectivas y trazables. Nunca altera una versión publicada ni devuelve cambios a Research.

## Versiones frente a nueva obra

| Cambio                                                               | Resultado                 |
| -------------------------------------------------------------------- | ------------------------- |
| Revisión, ampliación o nueva evidencia para la misma obra            | Nueva Publication Version |
| Cambio de tesis, finalidad, formato, audiencia o identidad editorial | Nueva Publication         |

## Ownership

Publication posee identidad de obra, estructura pública, composición, versiones y Review editorial. Research conserva Outline, notas, dossier, Draft investigador y Review investigador. Biblioteca conserva los materiales; Publication posee únicamente su selección, placement y presentación editorial.
