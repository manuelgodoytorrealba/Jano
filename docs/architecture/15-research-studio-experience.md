# 15 — Research Studio: experiencia editorial

Estado: **NORMATIVA**
Última consolidación: 2026-08-05

## Propósito y alcance

Research Studio es el entorno privado donde una investigadora transforma una pregunta editorial y un corpus documental en conocimiento revisable, trazable y apto para sostener escritura o derivaciones editoriales.

No es un gestor de archivos, una colección de formularios, un CMS público ni un visor de grafos. Es un flujo continuo de investigación: reunir, leer, seleccionar evidencia, formular interpretaciones, revisar conexiones y escribir con fundamento.

Research conserva el trabajo completo, pero el punto de trabajo diario es la **Research Section** activa. La Section orienta el objetivo, las preguntas, las notas, el estado, el trabajo pendiente y su dossier editorial; no adquiere ownership de corpus ni de conocimiento. La investigadora organiza el conocimiento necesario para responder una pregunta sin copiarlo ni convertirlo en una segunda fuente de verdad.

Los límites de ownership y los contratos de dominio viven en [Research](./02-research.md), [Biblioteca](./03-library.md), [Research Knowledge](./04-research-knowledge.md), [Publication](./05-publication.md) y [Knowledge Core](./06-knowledge-core.md). El procesamiento que alimenta este flujo vive en el [Editorial Pipeline](./16-editorial-pipeline.md).

## Qué problema resuelve

La investigación editorial suele quedar fragmentada entre documentos, notas, citas, hipótesis y borradores. Research Studio mantiene esos elementos conectados sin confundirlos:

```text
Pregunta editorial
→ corpus documental
→ Evidence
→ Claims, Entities y Relations privadas
→ conocimiento investigado
→ escritura y derivación editorial
```

El valor de JANO no es acumular información ni dibujar conexiones. Es permitir responder en cualquier punto qué se afirma, por qué, qué la sostiene, qué permanece abierto y qué puede expresarse editorialmente.

## Principios de experiencia editorial

- La investigación comienza en una pregunta, no en una tabla vacía.
- Corpus y conocimiento son distintos: un documento puede ser útil sin constituir una afirmación.
- Toda afirmación debe conservar una ruta hacia su soporte documental disponible.
- Una Evidence bibliográfica sin `LibraryExcerpt` sigue siendo válida y se muestra honestamente como fragmento no disponible.
- La interpretación pertenece a la investigadora; la automatización prepara propuestas, no decide conocimiento.
- Las contradicciones son materia editorial: se hacen visibles, no se promedian ni se eliminan.
- El Graph revela estructura existente; no crea conocimiento, evidencia ni relaciones.
- La complejidad aparece progresivamente: pregunta, lectura, revisión, conocimiento, exploración y escritura.
- Publicar o promover exige una decisión explícita; nunca ocurre por acumulación de actividad privada.
- El Studio debe orientar el siguiente trabajo útil sin ocultar incertidumbre ni procedencia.

## La investigadora y su contexto de trabajo

La investigadora alterna lectura, comparación, hipótesis y comprobación. Necesita conservar una pregunta central y preguntas secundarias visibles, saber qué materiales están disponibles o pendientes, distinguir una cita de su propia interpretación y volver desde una relación a la evidencia que la explica.

En investigaciones largas necesita detectar Claims insuficientemente sostenidos, Entities ambiguas, Relations que requieren explicación y tensiones entre fuentes. No necesita ver todo a la vez: el Studio reduce carga cognitiva mediante contexto, progresión y revisión priorizada.

## El ciclo continuo de investigación

### Enmarcar

La investigadora define título, propósito y preguntas. El resultado es una intención editorial explícita que orienta la selección posterior del corpus.

### Reunir y preparar corpus

Asocia Sources y materiales documentales. El corpus se prepara para lectura según su disponibilidad real; su presencia nunca equivale a conocimiento. El detalle de este ciclo pertenece al [Editorial Pipeline](./16-editorial-pipeline.md).

### Leer y evidenciar

Durante la lectura, los pasajes o referencias relevantes se convierten en Evidence con su procedencia, contexto y localización disponibles.

### Formular y revisar

La investigadora formula Claims, identifica Entities privadas y explica Relations. Puede aceptar, corregir, dividir, fusionar, retirar o mantener en tensión elementos de conocimiento.

### Explorar y comprobar

Research Knowledge y Research Graph permiten localizar huecos, conexiones débiles, contradicciones y zonas que requieren volver al corpus.

### Escribir y derivar

Cuando existe conocimiento revisado suficiente, la investigadora lo convierte en un Draft o en una futura derivación editorial. Esta transición no publica ni promueve conocimiento automáticamente.

## Espacios editoriales del Studio

### Research Desk

Es el punto de retorno de una investigación: muestra propósito, preguntas, estado, trabajo pendiente y accesos contextuales. Debe orientar, no sustituir la lectura ni la revisión.

### Section y dossier editorial

Una Section es la unidad cotidiana de trabajo editorial: concentra una pregunta y el contexto para resolverla. Su dossier organiza referencias ya existentes a corpus y conocimiento privado —sin poseerlas ni duplicarlas— para que la investigadora pueda leer, evidenciar, formular, revisar y posteriormente escribir desde una cuestión concreta.

El dossier no es un agregado, una copia de Library ni un segundo Research Knowledge. Sources, Materials y LibraryExcerpt siguen en Biblioteca; Evidence, Claims, Entities y Relations siguen en Research Knowledge. Una misma referencia puede aparecer en varios dossiers y el Graph continúa siendo una lectura global derivada del conocimiento privado.

#### Diseño objetivo del workspace de Section

Al abrir una Section, la escritura debe ocupar el centro de la experiencia. El workspace objetivo evita convertir contexto, lectura, métricas y formularios en una única página vertical:

```text
Section y estado
┌──────────────────────────────┬──────────────────────┬──────────────────────┐
│ Draft activo                 │ Dossier contextual   │ Asistencia editorial │
│ escritura y revisiones       │ preguntas            │ sugerencias trazables│
│ referencias seleccionadas    │ Materials y Extractos│ acciones explícitas  │
│                              │ Evidence y Claims     │ aceptación humana    │
└──────────────────────────────┴──────────────────────┴──────────────────────┘
```

- El **Draft activo** es la superficie principal. Objetivo y notas orientan la escritura, pero nunca sustituyen ni almacenan su contenido.
- El **dossier contextual** reúne preguntas abiertas y referencias seleccionadas a Materials, LibraryExcerpt, Evidence y Claims del mismo Research. Permite abrir el lector sin desplazar permanentemente el Draft.
- La **asistencia editorial** trabaja sólo con el contexto visible de la Section y conserva procedencia. Sugiere preguntas, estructura, contrastes o continuaciones; nunca modifica el Draft ni acepta conocimiento sin una acción humana.
- El resumen editorial se presenta como orientación compacta, no como una sucesión de bloques que antecede a la escritura.
- Research Graph permanece como exploración bajo demanda; no comparte el plano principal con el editor salvo cuando una decisión exige comprobar una conexión.
- Entre 1100 y 1500 px se priorizan Draft y dossier; la asistencia aparece como panel conmutable. En anchuras mayores puede mantenerse visible como tercera columna.

Este diseño es objetivo de experiencia, no disponibilidad actual. Su implementación exige primero el contrato real de Draft y sus revisiones; un editor visual sin persistencia autoral no satisface este diseño.

### Biblioteca documental

Es la mesa de trabajo del corpus asociado al Research. Organiza materiales, Sources, versiones, disponibilidad y uso como Evidence; no contiene Claims ni conocimiento interpretado.

### Lectura y evidencia

Es el contexto donde la investigadora examina contenido disponible y crea o revisa Evidence. Debe conservar locator, quote, Source y versión cuando estén disponibles.

### Revisión editorial

Es una cola de decisiones pendientes sobre documentos, Evidence, Claims, Entities, Relations y contradicciones. No es una lista de alertas ni una ejecución automática.

### Research Knowledge

Es la lectura estructurada del conocimiento privado actual: Entities, Relations, Claims, Evidence y contradicciones. No es una fuente de verdad adicional; sus invariantes viven en [Research Knowledge](./04-research-knowledge.md).

El modo Entities contiene dos vistas internas con propósitos distintos: **Revisión** decide qué propuestas de Entity y Relation deben materializarse como conocimiento privado; **Mapa** explora la topología privada actual y puede superponer propuestas pendientes con estados inequívocos. Ambas pertenecen a la misma fase del Studio y el Mapa conserva un único renderer y una única topología derivada.

### Research Graph

Es una vista de exploración de Research Knowledge. Permite enfocar Entities y Relations y recorrer Claims, Evidence y trazabilidad documental. Nunca representa Claims, Evidence, Sources o extractos como nodos por defecto.

### Escritura y publicación

La escritura transforma conocimiento revisado en narrativa editorial privada situada en una Section. El Draft conserva el texto propio y referencias selectivas a su soporte; no copia el dossier ni adquiere ownership de conocimiento. Publication es una derivación selectiva y explícita desde una revisión identificable, nunca una vista viva de Research. Sus responsabilidades pertenecen a [Drafts de Research](./11-research-drafts.md) y [Publication](./05-publication.md).

## Estados editoriales de una investigación

Los siguientes estados describen madurez editorial; no crean un nuevo owner ni sustituyen los estados de objetos privados.

| Estado                | Significado                                                        | Trabajo permitido                             |
| --------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Enmarcada             | Tiene propósito y preguntas comprensibles.                         | Reunir corpus y ajustar alcance.              |
| En documentación      | Se forma y revisa el corpus.                                       | Incorporar, preparar, leer y evidenciar.      |
| En interpretación     | Existen Claims, Entities o Relations en revisión.                  | Formular, revisar, retirar y contrastar.      |
| En consolidación      | Se comprueba cobertura, trazabilidad y tensión.                    | Reabrir evidencia, reforzar o matizar.        |
| En escritura          | Hay conocimiento suficiente para articular narrativa.              | Redactar y detectar huecos.                   |
| En revisión final     | Se revisa la derivación editorial prevista.                        | Corregir o devolver a investigación.          |
| Publicada o archivada | La investigación se derivó explícitamente o se cerró como privada. | Consultar, reutilizar o reabrir con contexto. |

## Momentos críticos de experiencia

- **Entrada:** el Studio debe mostrar qué se investiga, qué ha cambiado y cuál es el siguiente trabajo útil.
- **Carga:** debe distinguir material incorporado, preparado, limitado o fallido; nunca fingir procesamiento inexistente.
- **Lectura:** debe facilitar Evidence sin convertir la lectura en una pantalla de formularios.
- **Revisión:** debe aportar contexto suficiente para decidir sin perder la relación con el documento.
- **Descubrimiento:** el Graph debe revelar preguntas para una segunda lectura, no actuar como decoración.
- **Incertidumbre:** falta de evidencia, contradicción y límites documentales deben explicarse con precisión y una acción posible.
- **Escritura:** debe conservar acceso a soporte y dudas sin convertir el borrador en una base de datos.

## Límites de producto actuales

El código actual ya permite crear Research, definir Outline y preguntas, asociar corpus, crear Evidence, construir conocimiento privado y explorar su Graph trazable. La lectura progresiva evita cargar más detalle del necesario para esa exploración.

Todavía no existe una experiencia continua y completa de captura, revisión, escritura y publicación: la incorporación editorial permanece parcialmente separada de la ruta principal de Studio; los PDF con texto y las URL públicas estáticas se preparan de forma asíncrona; OCR, contenido protegido y páginas dependientes de JavaScript siguen fuera del flujo actual; la escritura asistida y la publicación integrada no forman parte del flujo actual. Estas limitaciones deben comunicarse sin prometer capacidades inexistentes.

## Decisiones descartadas

- Tratar Research Studio como un segundo CMS o un conjunto de herramientas aisladas.
- Convertir documentos, resultados de IA o proximidad visual en conocimiento aceptado.
- Usar el Graph como editor de verdad, inventario documental o sustituto de lectura.
- Hacer que Publication o Knowledge Core reciban cambios automáticos desde Research.
- Obligar a la investigación a depender de IA para poder avanzar.

## Referencias normativas

- [Research](./02-research.md)
- [Biblioteca](./03-library.md)
- [Research Knowledge y Research Graph](./04-research-knowledge.md)
- [Drafts de Research](./11-research-drafts.md)
- [Publication](./05-publication.md)
- [Knowledge Core](./06-knowledge-core.md)
- [Contratos entre dominios](./07-contracts.md)
- [Editorial Pipeline](./16-editorial-pipeline.md)
