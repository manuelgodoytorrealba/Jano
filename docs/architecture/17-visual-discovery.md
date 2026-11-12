# Búsqueda visual y capas de exploración

Estado: prototipo funcional local. Fecha: 2026-11-12.

## Decisión e invariantes

La búsqueda descubre entidades publicadas del Knowledge Core. No crea entidades, relaciones ni afirmaciones editoriales. Las descripciones y lecturas de cartelas son orientativas y nunca se convierten automáticamente en conocimiento verificado. Research conserva su proceso de revisión y publicación.

Se reutilizan Angular, Nest, Prisma/PostgreSQL, Sharp, los símbolos de entidad, los estilos y `AppLoadingComponent` existentes. Solo se añade Transformers.js en el servidor para CLIP (`Xenova/clip-vit-base-patch32`, q8, CPU). El navegador usa selección de archivos y captura nativa; no descarga modelos ni necesita acceso continuo a la cámara.

## Contratos

- `GET /api/discovery/facets`: once capas en orden estable. Parámetros `layers` (JSON), `q`, `type`, `kind`, `deck`, `locale` y `surface=catalog|search`. Los conteos se calculan antes de paginar, sobre entidades publicadas y relaciones hacia entidades publicadas. La superficie de búsqueda utiliza el mismo repositorio textual que el buscador global.
- `GET /api/entities`: admite `layers` además de los parámetros existentes. OR dentro de una capa, AND entre capas. La selección vive en la URL y se conserva al cambiar Explorer/lista.
- `POST /api/search/images`: multipart `image`, máximo 12 MB y 40 millones de píxeles decodificados. Reorienta EXIF, normaliza y elimina metadatos antes de inferencia. Admite los formatos que puede decodificar Sharp; HEIC depende del codec disponible.
- Devuelve una referencia aleatoria y una cookie HttpOnly/SameSite para su sesión. No escribe la foto en uploads ni en la base de datos. Guarda vector, paleta y lectura opcional en memoria durante 30 minutos, con un límite de 100 referencias y una inferencia CLIP simultánea. Seis subidas/minuto/IP. Reiniciar el backend invalida las referencias.
- `GET /api/search`: añade `image`, `colors` (uno o dos hex separados por coma), `layers` y `page`. La referencia solo funciona en su sesión; las respuestas no se cachean. `DELETE /api/search/images?image=…` elimina la referencia de esa sesión.

Cada capa se cuenta ignorando su propia restricción. Los valores seleccionados con cero coincidencias siguen visibles y se pueden quitar. Periodo, movimiento, autoría, institución, técnica y material proceden de metadatos o relaciones reales; no se infieren de la imagen. Una entidad se cuenta una sola vez aunque tenga varias imágenes.

## Índice y ranking

`Media.visualIndex` contiene versión del modelo/preprocesado, SHA-256 del archivo, vector de 512 valores y paleta ponderada. Solo se indexan archivos locales en directorios públicos revisados y vinculados a entidades publicadas. Se comprueba la ruta real y se rechazan escapes/symlinks fuera de ese directorio. No se descargan URLs arbitrarias. Los vectores no se incluyen en las respuestas de galería.

Las coincidencias visuales exigen coseno ≥ 0,70 antes de calcular facetas, totales y páginas. El umbral se contrastó con La danza y Bronces de Benín en el catálogo local; falta validarlo con fotos de sala etiquetadas y recalibrarlo si cambia el modelo. El texto añadido restringe los candidatos, y los empates de similitud priorizan obras frente a entidades que reutilizan su imagen. Se usa coseno para similitud visual, distancia OKLab para color y un refuerzo por la posición en los resultados textuales. Los dos colores solicitados deben aparecer en la misma imagen. La paleta es aproximada: el fondo o marco pueden influir. La similitud es una ordenación, no una probabilidad de identificación. La interfaz evita presentarla como identidad confirmada.

Se hace un escaneo exacto del catálogo actual; al crecer y medir una latencia insuficiente, migrar la comparación a un índice vectorial. La recuperación textual interna tiene un máximo de 10.000 candidatos. Se muestra cobertura explícita; entidades sin imágenes indexadas siguen disponibles en la búsqueda textual y en las capas ordinarias.

## Preparación local

Desde `backend/api`, con Node/npm en las versiones exigidas por el repositorio:

```sh
npm run prisma:deploy
npm run prisma:generate
npm run media:prepare-visual-search
```

Hacer primero una copia conjunta de base de datos y uploads. El indexador es reanudable: omite hash/versión ya procesados y conserva los originales ante errores. Volver a ejecutarlo después de incorporar o cambiar imágenes. La indexación automática al publicar no forma parte de esta primera entrega.

El modelo se descarga al primer uso en `VISUAL_SEARCH_CACHE` (por defecto `.cache/visual-search`), fuera de uploads. Prepararlo antes de la exposición. Docker dispone de un directorio con permisos de escritura y, en producción, un volumen específico para esta caché.

La lectura opcional de imágenes/cartelas usa `VISUAL_SEARCH_VISION_MODEL` y `OLLAMA_BASE_URL`. Está desactivada por defecto. Requiere un modelo con visión, por ejemplo el `gemma4:12b` instalado localmente. Un fallo o timeout de lectura conserva la búsqueda por similitud y color. El texto generado se limita y valida; se muestra como orientativo.

En la imagen runtime, el indexador compilado es `node dist/scripts/prepare-visual-search.js --apply-production`, con la misma base de datos, uploads y caché del backend. Desplegar únicamente mediante `infra/scripts/prod.sh`; esta entrega no se ha desplegado en producción.

## Verificación de esta entrega

- Migración aditiva aplicada solo a la base de desarrollo, con backups de la base y ambas copias de uploads.
- 2.113 imágenes públicas locales indexadas, correspondientes a 938 de 989 entidades publicadas; las 51 restantes no tienen una imagen local indexable en esta preparación.
- Consulta de la imagen de «La danza»: primer resultado correcto. Color, filtros, páginas, referencia ajena, caducidad y borrado comprobados.
- Modelo CLIP ejecutado también dentro del contenedor: 512 dimensiones.
- Compilaciones de backend y frontend y pruebas específicas satisfactorias. El aviso de presupuesto CSS de `entity-detail-view` ya existía y no procede de esta feature.
- Pendiente: validar captura real en Safari/iOS y Android, ensayar fotos de sala (luz, perspectiva y reflejos), activar y medir la lectura de cartelas con el modelo elegido. No se ha hecho una prueba de carga con varios usuarios ni validado despliegue de producción.

## Alineación con el diseño aprobado

La composición de resultados usa todo el ancho disponible, una obra protagonista en dos columnas y resultados secundarios en rejilla editorial. Las pestañas subrayadas solo muestran categorías con coincidencias. Los filtros se despliegan bajo la barra de pestañas; no hay una barra lateral permanente. El panel de capas comparte cabecera, iconos, contadores, selección y controles con Explorer/listas. El símbolo de añadir imagen reutiliza WORK con un «+» separado, con el mismo trazo del prototipo.

La preparación vive en un diálogo nativo global: `mode=image|color` lo abre sobre la pantalla actual; cerrar conserva la exploración y confirmar navega a `/search`. No hay formulario permanente encima de resultados. La referencia y los colores activos se muestran en la fila superior de criterios, desde donde se abren sus diálogos. El estado compartido de previsualización es exclusivamente de presentación en el navegador; la sesión y los criterios siguen siendo propiedad de los contratos existentes.

### Corrección de relevancia y desktop (12 de noviembre)

El escaneo anterior ordenaba todas las entidades indexadas sin descartar similitudes bajas. La selección visual se realiza ahora antes de facetas y paginación, y el contexto textual añadido actúa como restricción. Una subida real de La danza devolvió 37 coincidencias, con la obra en primer lugar; seleccionar la capa Obra redujo tanto resultados como pestañas a 23. Las pestañas vacías permanecen ocultas.

Verificado en navegador a 1440 y 1920 px: sin desbordamiento horizontal ni barra lateral permanente. El panel desplegable ocupa el ancho de resultados y distribuye las capas en cuatro columnas. Cabecera original conservada; criterios de referencia y color en fila superior; pestañas subrayadas; acciones Explorar y Buscar similares, que reabre el diálogo de imagen.

Pruebas de regresión de búsqueda/discovery: 20 casos; frontend relacionado: 16 casos. Compilación frontend y comprobación TypeScript backend satisfactorias. La calibración con fotografías tomadas en sala sigue pendiente.

### Páginas de resultados del diseño aprobado

Las pestañas sustituyen el contenido del mismo panel: Resultado principal muestra la obra y dos continuaciones (otras obras cuando el principal es ARTWORK); Entidades muestra todos los elementos de su página, incluida la obra principal; Investigaciones y Conexiones muestran solo su sección. Las categorías sin coincidencias permanecen ocultas. Cambiar la página de resultados conserva la pestaña; cambiar la búsqueda vuelve al resultado principal. Si una categoría desaparece, se selecciona una página disponible.

Se implementan roles tablist/tab/tabpanel, selección y foco con flechas, Inicio y Fin. Las capas siguen compartidas con Explorer/listas y se abren bajo la barra de pestañas. No se alteran ni las reglas de relevancia ni la cabecera de la aplicación.

Validación en navegador: La danza muestra obra y dos continuaciones antes de 900 px de alto a 1440 px de ancho; Dante también deja visible el contexto plegado. A 1366 × 768 las continuaciones terminan antes de 749 px; a 390 px no aparece desbordamiento horizontal. La página Entidades muestra las 23 obras de la consulta visual y Conexiones las 26 relaciones de Dante, sin duplicar la tarjeta principal. Las 16 pruebas frontend relacionadas y el build completo pasan, con el aviso CSS preexistente de entity-detail-view. Falta comprobar navegadores móviles físicos.

### Capas verticales compartidas y legibilidad

Se sustituye la variante horizontal de filtros por el mismo panel vertical Capas utilizado en Explorer/listas. En búsqueda, el botón Filtros abre una columna izquierda de 280 px junto a los resultados; al cerrar se recupera el ancho completo. A 800 px o menos se apila sobre el contenido. El panel limita su altura con desplazamiento interno y conserva los conteos y selección del backend. Se elimina el modo horizontal del componente compartido.

El texto de resultados aumenta a 16 px; pestañas y acciones a 15 px, títulos principales a 32 px. Las capas usan encabezados de 28 px, categorías de 15 px, opciones de 14 px y contadores de 13 px. Explorer también amplía su panel a 280 px y sus controles internos. Referencia y colores permanecen en el buscador global y en la fila de criterios, sin duplicarlos dentro de las capas.

Verificación: Explorer y resultados usan las mismas categorías verticales a 15 px y panel de 280 px, sin desbordamiento horizontal a 1440 px. La obra y continuaciones siguen visibles dentro de 900 px de alto con texto principal de 16 px. Build frontend y las 16 pruebas relacionadas correctos; se conserva el aviso previo de presupuesto CSS de entity-detail-view.

Con las fuentes ampliadas, también comprobado a 1366 × 768: las continuaciones terminan antes de 757 px. La vista de 390 px conserva su ancho sin desbordamiento horizontal.

### Volver al inicio y espacio superior de la aplicación

Una búsqueda sin texto, imagen, colores ni capas vuelve a /home, sustituyendo la entrada vacía del historial para que Atrás recupere la búsqueda anterior. No se solicita la búsqueda vacía al backend. Las capas con arrays vacíos no mantienen artificialmente la pantalla; los criterios inválidos permanecen para que la API informe del error. También se respetan los filtros heredados type/kind/tag. Si hay un diálogo de imagen o color en curso se conserva su modo en Inicio. Cero coincidencias con criterios activos mantiene la pantalla de resultados. El campo de texto solo pregunta por la imagen cuando existe una referencia.

El contrato compartido de disposición añade app-page-top, app-menu-height y app-page-gap: la cabecera completa y la hamburguesa reservan alturas diferentes. Se consume en el shell, Archivo y las coordenadas de Explorer/listas/investigaciones. Las páginas de búsqueda, perfil, ajustes, espacio personal y operaciones usan el mismo margen superior de 12 px. Las fichas y publicaciones con disposición junto al menú mantienen sus excepciones compactas existentes.

Comprobado en navegador: eliminar el último texto navega a Inicio y Atrás vuelve a la consulta; en búsqueda móvil el contenido comienza 24 px después del botón. Archivo, Inicio/Explorer, investigaciones y ficha pública contrastados en tamaños desktop y móvil. Pantallas protegidas revisadas por sus estilos, sin validación visual con sesión autenticada. Pruebas frontend relacionadas: 17 correctas; build completo correcto, con el aviso CSS preexistente de entity-detail-view.
