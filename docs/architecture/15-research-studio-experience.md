# 15 — Research Studio: experiencia editorial

Estado: **NORMATIVA**
Última consolidación: 2026-07-31

## Propósito y alcance

Research Studio es el entorno privado donde una investigadora transforma una pregunta editorial y un corpus documental en conocimiento revisable, trazable y apto para sostener escritura o derivaciones editoriales.

No es un gestor de archivos, una colección de formularios, un CMS público ni un visor de grafos. Es un flujo continuo de investigación: reunir, leer, seleccionar evidencia, formular interpretaciones, revisar conexiones y escribir con fundamento.

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

### Biblioteca documental

Es la mesa de trabajo del corpus asociado al Research. Organiza materiales, Sources, versiones, disponibilidad y uso como Evidence; no contiene Claims ni conocimiento interpretado.

### Lectura y evidencia

Es el contexto donde la investigadora examina contenido disponible y crea o revisa Evidence. Debe conservar locator, quote, Source y versión cuando estén disponibles.

### Revisión editorial

Es una cola de decisiones pendientes sobre documentos, Evidence, Claims, Entities, Relations y contradicciones. No es una lista de alertas ni una ejecución automática.

### Research Knowledge

Es la lectura estructurada del conocimiento privado actual: Entities, Relations, Claims, Evidence y contradicciones. No es una fuente de verdad adicional; sus invariantes viven en [Research Knowledge](./04-research-knowledge.md).

### Research Graph

Es una vista de exploración de Research Knowledge. Permite enfocar Entities y Relations y recorrer Claims, Evidence y trazabilidad documental. Nunca representa Claims, Evidence, Sources o extractos como nodos por defecto.

### Escritura y publicación

La escritura transforma conocimiento revisado en narrativa editorial. Publication es una derivación selectiva y explícita, nunca una vista viva de Research. Sus responsabilidades pertenecen a [Publication](./05-publication.md).

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

Todavía no existe una experiencia continua y completa de captura, revisión, escritura y publicación: la incorporación editorial permanece parcialmente separada de la ruta principal de Studio; PDF y URL se almacenan pero no disponen aún de procesamiento documental real; la escritura asistida y la publicación integrada no forman parte del flujo actual. Estas limitaciones deben comunicarse sin prometer capacidades inexistentes.

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
- [Publication](./05-publication.md)
- [Knowledge Core](./06-knowledge-core.md)
- [Contratos entre dominios](./07-contracts.md)
- [Editorial Pipeline](./16-editorial-pipeline.md)
