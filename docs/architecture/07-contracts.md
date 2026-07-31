# 07 — Contratos entre dominios

## Regla común

Todo contrato declara ownership, iniciador, trazabilidad e idempotencia. Ninguno introduce sincronización bidireccional.

| Contrato                        | Qué cruza                                                | Iniciador                         | Prohibido                            |
| ------------------------------- | -------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| Research → Biblioteca           | asociaciones a materiales, fuentes y extractos           | investigador                      | copiar corpus o formular Claims      |
| Biblioteca → Research Knowledge | extractos y procedencia para evidencia                   | investigador o proceso controlado | crear conocimiento canónico          |
| Research Knowledge → Graph      | entidades y Claims relacionales                          | proyección derivada               | ownership adicional                  |
| Research → Section              | referencias a corpus y conocimiento                      | investigador                      | copiar referencias                   |
| Research → Publication          | selección editorial, procedencia y contenido importado   | investigador/editor               | notas privadas y sincronización viva |
| Publication → Edition           | referencia a una Publication Version                     | editor                            | texto o estado compartido mutable    |
| Research Knowledge → Proposal   | objetos privados, evidencia y razonamiento seleccionados | investigador/editor               | promoción implícita                  |
| Proposal → Core                 | operación canónica aprobada y procedencia                | revisor Core                      | mutar Research                       |

## Reglas de ejecución

- Las decisiones humanas de ownership, derivación, promoción y publicación son explícitas y verificables.
- Procesamiento documental e IA pueden ser asíncronos; deben producir propuestas idempotentes y trazables. Su contrato funcional, incluidos Editorial Jobs, reanudación y proveedor, vive en el [Editorial Pipeline](./16-editorial-pipeline.md).
- Las operaciones que puedan reintentarse no duplican asociaciones, incorporaciones, propuestas ni cambios canónicos.
- Publication y Edition sólo consumen referencias estables o representaciones editoriales preservadas; nunca objetos privados mutables como dependencia operativa.
