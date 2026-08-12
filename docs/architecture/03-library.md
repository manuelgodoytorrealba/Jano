# 03 — Biblioteca

## Propósito

Biblioteca organiza el corpus documental privado y preserva su procedencia. Es la fuente única de verdad para materiales, fuentes y extractos localizables.

## Responsabilidades

- Conservar materiales: PDF, libro, URL, imagen, nota, mapa o archivo.
- Representar fuentes intelectuales o bibliográficas.
- Localizar extractos en una versión concreta de una fuente o material.
- Mantener versiones, procedencia y acceso al corpus.

## Invariantes

- Un material mantiene identidad y procedencia.
- Una fuente no se duplica por cada Research, sección o Publication que la usa.
- Un extracto es localizable en una versión concreta.
- Biblioteca no formula Claims, relaciones ni decisiones editoriales.

## Relaciones

Research, contexto editorial y Publication referencian el corpus según su uso. Una Evidence no copia el extracto: declara cómo lo sostiene, cuestiona o contextualiza respecto de un Claim.

### Citas desde Research

Corpus es el lugar de lectura: incorpora Materials y conserva `LibraryExcerpt` localizables. Un highlight es una selección explícita de la investigadora; los extractos preparados automáticamente conservan trazabilidad, pero no se presentan como highlights. No obliga a clasificar un documento como fuente durante la lectura.

La selección editorial de qué se cita pertenece a Research. Convertir explícitamente un `LibraryExcerpt` en Evidence reutiliza su `Source` bibliográfica si existe o crea una referencia bibliográfica mínima vinculada al Material. Eliminar una Evidence no elimina su extracto; un extracto sólo se elimina cuando no sostiene Evidence ni referencias de Section. La Publication deriva sólo las Sources citadas explícitamente; no publica automáticamente todo el Corpus.

El ciclo editorial de disponibilidad, preparación y revisión de documentos se define en el [Editorial Pipeline](./16-editorial-pipeline.md). Biblioteca conserva corpus y procedencia; no decide cuándo una interpretación se acepta.

## Decisiones descartadas

- Hacer de Biblioteca un editor de conocimiento.
- Copiar fuentes o imágenes dentro de una sección.
- Tratar una nota editorial como evidencia documental.
