# 16 — Editorial Pipeline

Estado: **NORMATIVA**
Última consolidación: 2026-07-31

## Propósito y resultado editorial

El Editorial Pipeline define cómo un documento o referencia documental se convierte, mediante preparación y revisión humana, en conocimiento privado trazable. Su resultado no es un documento procesado ni una salida de IA: es conocimiento revisable que puede explicar su relación con Evidence y corpus.

```text
Documento o Source
→ contenido disponible
→ Evidence revisada
→ Claim revisado
→ Entity y Relation privadas explicadas
→ Research Knowledge
```

Este documento define el comportamiento editorial del pipeline. Los owners de corpus, Knowledge, Publication y Core se mantienen en los documentos de dominio enlazados al final.

## Principios del pipeline

- Un documento entra como corpus, nunca como conocimiento.
- La procedencia se conserva antes que la interpretación.
- Toda salida automática es una propuesta revisable y trazable.
- La finalización de un trabajo automático no equivale a aceptación editorial.
- La investigadora puede aceptar, corregir, dividir, fusionar, retirar o mantener abierta una propuesta.
- Un Claim requiere Evidence; una Relation requiere Claims que expliquen su significado.
- La ausencia de `LibraryExcerpt` no invalida una Evidence bibliográfica válida.
- Contradicciones entre Claims se preservan como tensión editorial.
- Los procesos largos deben ser observables, recuperables y honestos respecto de sus límites.
- Reintentar o reanudar no debe duplicar documentos, propuestas, Evidence ni decisiones.
- La ausencia o sustitución de un proveedor de IA no bloquea el trabajo manual ni altera conocimiento ya revisado.

## Tipos de entrada y disponibilidad actual

| Entrada                     | Tratamiento editorial                                                     | Disponibilidad actual                                      |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Texto pegado                | Material textual con contexto y procedencia declarada.                    | Disponible.                                                |
| Source o artículo existente | Referencia bibliográfica asociada al Research; puede sostener Evidence.   | Disponible como asociación.                                |
| PDF                         | Archivo, versión y localización por páginas cuando puedan prepararse.     | Se admite y almacena; no hay extracción u OCR demostrados. |
| URL                         | Referencia web con fecha de consulta y versión recuperable cuando exista. | Se registra; no hay recuperación o parsing demostrados.    |
| Markdown                    | Texto con estructura preservable cuando se soporte.                       | Sólo como texto pegado.                                    |
| HTML                        | Contenido o URL con procedencia y versión.                                | Sólo como texto pegado; no hay parsing demostrado.         |
| Imagen                      | Material visual con procedencia, contexto y anotación humana.             | No soportado directamente.                                 |
| DOCX                        | Documento estructurado con contenido y referencias preservadas.           | No soportado directamente.                                 |
| EPUB                        | Publicación digital con capítulos y locators internos.                    | No soportado directamente.                                 |

Un material registrado no debe presentarse como disponible para evidencia hasta que su estado documental lo permita.

## Ciclo de vida del documento

```text
Incorporado
→ verificando procedencia
→ preparando contenido
→ disponible para lectura
→ en revisión documental
→ utilizado como evidencia
→ cerrado o archivado
```

- **Incorporado:** existe en el Research, pero aún no se ha comprobado su contexto o legibilidad.
- **Verificando procedencia:** se confirma Source, versión, origen y uso editorial posible.
- **Preparando contenido:** se obtiene una forma legible y localizable cuando el formato lo permite.
- **Disponible para lectura:** puede examinarse y citarse; no implica que haya sido leído o aceptado.
- **En revisión documental:** la investigadora lo utiliza activamente para responder preguntas.
- **Utilizado como evidencia:** ya sostiene una o más Evidence, sin quedar cerrado a nueva lectura.
- **Cerrado o archivado:** no requiere trabajo activo, pero conserva su trazabilidad.

Desde cualquier estado, un documento puede requerir intervención humana por procedencia incierta, acceso limitado, duplicidad o extracción incompleta.

## Procesamiento documental

El procesamiento convierte un material incorporado en una forma editorialmente utilizable sin convertirlo en una afirmación.

1. **Registro:** conserva original, Source disponible, versión, fecha y motivo de incorporación.
2. **Validación:** comprueba formato, accesibilidad y contexto mínimo.
3. **Normalización:** obtiene una forma legible y localizable: páginas, secciones, capítulos o bloques.
4. **Control de calidad:** comunica OCR deficiente, URL bloqueada, contenido incompleto o posible duplicidad.
5. **Segmentación para lectura:** ofrece unidades útiles sin perder contexto documental.
6. **Disponibilidad editorial:** el material queda listo para lectura humana, preparación de Evidence o propuestas asistidas.

Un PDF sin OCR, una URL inaccesible o una extracción parcial deben producir estados limitados y recuperables, no un falso éxito.

## Editorial Jobs: trabajo largo, observable y recuperable

Un Editorial Job es una unidad de trabajo acotada que prepara material o genera propuestas editoriales. Hace visible qué está ocurriendo, sobre qué documento y con qué resultado, pero no toma decisiones editoriales ni se convierte en conocimiento por sí mismo.

No es una Evidence, Claim, Entity, Relation, decisión humana, publicación, snapshot ni actualización persistente del Graph.

### Familias de trabajo

El producto debe agrupar trabajos por resultado editorial comprensible, no por cada paso interno:

| Familia                    | Resultado                                    | Ejemplos                                                |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Preparar documento         | Contenido disponible o limitación explícita. | OCR, extracción de texto, normalización y segmentación. |
| Analizar documento         | Propuestas trazables para revisión.          | Evidence, Entities, Claims y Relations candidatas.      |
| Diagnosticar investigación | Señales que orientan revisión.               | Contradicciones posibles o cobertura insuficiente.      |

Registrar un documento es una acción inmediata, no un Job por defecto. Normalización y segmentación no deben aparecer como Jobs independientes para la investigadora: forman parte de preparar documento. Embeddings no forman parte del MVP ni son requisito para investigar; sólo podrían incorporarse en el futuro como enriquecimiento opcional ante una necesidad medida.

Actualizar Research Graph nunca es un Job: el Graph es una lectura efímera de Research Knowledge. La cobertura también debe derivarse del conocimiento actual; sólo podría requerir trabajo diferido si un cálculo futuro demuestra ser costoso.

### Inicio y finalización

Un Job empieza cuando existe un Research propietario, un documento y versión identificables, una operación elegible y un iniciador claro. La preparación documental puede iniciarse tras incorporar material; el análisis con IA debe surgir de una acción editorial explícita o de una política visible.

Un Job termina como completado, completado con limitaciones, requiere intervención, fallido o cancelado. Ninguno de estos resultados acepta automáticamente sus propuestas.

### Estados

```text
Solicitado
→ elegible
→ en curso
→ en espera de intervención
→ completado | completado con limitaciones | fallido | cancelado
```

- **Solicitado:** existe intención de realizar trabajo.
- **Elegible:** documento, versión y contexto permiten comenzar.
- **En curso:** se prepara, analiza o diagnostica.
- **En espera de intervención:** falta una decisión humana o existe un límite documental.
- **Completado:** produjo el resultado declarado.
- **Completado con limitaciones:** produjo resultado usable pero incompleto o condicionado.
- **Fallido:** no produjo un resultado válido; preserva el estado anterior.
- **Cancelado:** se detuvo explícitamente sin borrar documento ni decisiones previas.

### Trazabilidad, reanudación y cancelación

Todo Job debe conservar operación, Research, documento y versión, pregunta o contexto cuando exista, iniciador, estado, tiempos, resultado, advertencias, errores, intentos y resultados producidos.

Reanudar significa continuar o repetir desde el último resultado confirmado sin duplicar materiales, propuestas, Evidence ni decisiones. Si cambia materialmente la versión documental, se inicia un Job nuevo con una nueva base documental.

Cancelar detiene trabajo futuro; conserva el original, resultados ya disponibles, propuestas creadas y decisiones humanas previas. Nunca retira automáticamente conocimiento revisado.

### Relación con IA y proveedores

Un Job puede no utilizar IA. Un Job de análisis puede contener cero o más ejecuciones de IA: cada ejecución conserva proveedor, modelo, versión, capacidades solicitadas, estado y relación con el segmento documental de origen.

El Job posee el sentido editorial; la ejecución de IA conserva la huella de proveedor. Esta separación garantiza que el conocimiento revisado no dependa de la disponibilidad futura de un modelo.

### Jobs y revisión humana no son la misma cola

La lista de Jobs informa progreso, límites y recuperación del procesamiento. La cola editorial reúne decisiones humanas pendientes. Un Job completado puede añadir propuestas a la cola editorial, pero no resolverla.

## Propuestas asistidas por IA

La IA trabaja sólo sobre contenido disponible y contextualizado. Puede proponer segmentos relevantes, Evidence candidatas, Entities, aliases, Claims, Relations, contradicciones posibles, resúmenes documentales y cobertura insuficiente.

No puede aceptar Claims, consolidar Relations, decidir identidad definitiva, resolver contradicciones, inventar quotes o locators, publicar ni promover al Knowledge Core.

Toda propuesta debe conservar documento, versión, segmento o Evidence de origen, pregunta relacionada, Job de procedencia y ejecución de IA cuando exista.

## Política de Ollama y neutralidad de proveedor

Ollama es el proveedor local preferente para generar propuestas editoriales cuando esté disponible. No es propietario del pipeline ni requisito para el trabajo manual.

El pipeline solicita capacidades editoriales —por ejemplo, proponer Evidence o señalar tensión— y el proveedor ejecuta una tarea concreta. Un proveedor distinto puede producir propuestas separadas sin alterar Evidence revisadas, Claims aceptados, Relations consolidadas o el significado del Graph.

Si dos modelos discrepan, sus resultados coexisten como propuestas revisables. La divergencia es información editorial, no una orden para elegir automáticamente una salida.

La disponibilidad real de una integración Ollama activa no queda demostrada sólo por el código actual; este documento define su contrato funcional cuando se use.

## Revisión editorial humana

La revisión avanza de menor a mayor interpretación:

1. Verificar documento, procedencia y disponibilidad.
2. Verificar Evidence: quote, locator, Source, versión y contexto.
3. Revisar Claims: formulación, soporte, alcance y tensión.
4. Revisar Entities: identidad privada, aliases, tipo y evidencia de identificación.
5. Revisar Relations: extremos, predicado y Claims explicativos.
6. Revisar contradicciones: mantener, contextualizar, reforzar o retirar afirmaciones insuficientes.

La investigadora puede volver desde una Relation a sus Claims, desde un Claim a Evidence y desde Evidence al documento o referencia disponible. Finalizar un Job no sustituye ninguno de estos actos.

## Estados del conocimiento

```text
Evidence candidata
→ Evidence verificada
→ Claim propuesto
→ Claim revisado
→ Entity identificada
→ Relation explicada
→ conocimiento consolidado
```

Estos estados describen madurez editorial; no crean una segunda fuente de verdad. Las contradicciones son una condición visible de Claims coexistentes, no un error que deba eliminarse.

## Cola editorial unificada

La cola editorial reúne decisiones pendientes sobre Evidence, Claims, Entities, Relations, contradicciones, documentos limitados y propuestas asistidas. Se prioriza por impacto editorial, riesgo de trazabilidad, trabajo bloqueado, frescura de contexto e incertidumbre.

No obliga a cerrar toda la investigación: permite trabajar por pregunta, documento o zona de conocimiento manteniendo visibles los asuntos que comprometen el rigor.

## Integración con Research Knowledge

El pipeline alimenta Research Knowledge sólo con Evidence revisadas, Claims en estado editorial explícito, Entities privadas identificadas, Relations explicadas por Claims y trazabilidad disponible.

Nunca le transfiere documentos completos como afirmaciones, outputs crudos de Jobs, similitudes automáticas sin Claim, posiciones visuales, rankings o decisiones inexistentes. Los invariantes del read model viven en [Research Knowledge](./04-research-knowledge.md).

## Integración con Research Graph

El Graph aparece cuando existe estructura suficiente de Entities y Relations. Permite recorrer:

```text
Entity privada
→ Relation privada
→ Claim
→ Evidence
→ LibraryExcerpt opcional o referencia bibliográfica disponible
```

Representa Entities, Relations y señales editoriales de soporte o tensión. No representa documentos, Evidence, Sources, extractos, proximidad visual ni conclusiones automáticas como nodos de conocimiento. No tiene Jobs propios ni guarda resultados de procesamiento.

## Casos especiales

- **PDF sin OCR:** queda limitado; puede revisarse manualmente o prepararse de nuevo sin inventar texto.
- **URL inaccesible:** conserva URL, fecha y motivo; puede reintentarse o quedar como referencia limitada.
- **Duplicado posible:** se señala para decisión humana; no se elimina automáticamente.
- **Modelos con resultados distintos:** producen propuestas separadas y trazables.
- **Contradicción entre fuentes:** se expresa mediante Claims y Evidence coexistentes; nunca por una fuente ganadora automática.
- **Documento grande:** se prepara por unidades localizables y reanudables sin impedir empezar a investigar.
- **Extracción incompleta:** conserva lo obtenido, muestra el límite y no confunde ausencia de extracción con ausencia documental.

## Errores, reintentos y recuperación

Fallos transitorios de acceso, procesamiento o proveedor pueden reintentarse sin duplicar resultados. Procedencia incierta, contenido ilegible, cambios materiales de URL, quotes no verificables, duplicidad ambigua o resultados sin soporte requieren intervención humana.

La recuperación preserva documento original, último estado válido, propuestas, decisiones humanas, motivo de fallo y posibilidad de retomar desde un punto seguro. Ningún fallo posterior borra conocimiento ya revisado.

## Alcance MVP

El MVP editorial debe permitir un recorrido completo y verificable:

```text
Documento legible
→ Evidence
→ Claim revisado
→ Entity y Relation privadas
→ Research Knowledge y Graph trazables
```

Es imprescindible: incorporar texto y Sources, procesar al menos PDF con texto extraíble, crear Evidence verificable, revisar Claims, construir Entities y Relations, mostrar trazabilidad y operar una cola editorial única. La IA, si existe, sólo aporta propuestas revisables.

Pueden esperar OCR avanzado, ingestión completa de DOCX/EPUB/imágenes, colaboración compleja, automatización sofisticada de contradicciones, escritura asistida completa y publicación integrada.

## Roadmap funcional

1. **Contrato de propuestas:** toda salida automatizada entra en revisión, nunca como conocimiento aceptado.
2. **Flujo continuo de corpus a Evidence:** incorporar, leer y evidenciar dentro del Studio.
3. **Procesamiento documental real:** primer recorrido completo para PDF con texto extraíble.
4. **Cola editorial unificada:** decisiones pendientes visibles y priorizadas.
5. **Asistencia local con Ollama:** propuestas trazables de análisis documental.
6. **Consolidación de Knowledge y Graph:** cobertura, huecos y tensiones a partir de conocimiento revisado.
7. **Ampliación documental y asistencia a la escritura:** URL procesable, formatos adicionales y asistencia fundamentada. La narrativa privada básica, sus revisiones y sus referencias editoriales pertenecen a [Drafts de Research](./11-research-drafts.md) y no dependen de esta ampliación.

## Referencias normativas

- [Research Studio: experiencia editorial](./15-research-studio-experience.md)
- [Research](./02-research.md)
- [Biblioteca](./03-library.md)
- [Research Knowledge y Research Graph](./04-research-knowledge.md)
- [Contratos entre dominios](./07-contracts.md)
- [Principios de ingeniería](./09-engineering-principles.md)
