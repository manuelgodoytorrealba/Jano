# Imágenes públicas de informalismo

Paquete: `informalismo-media-transfer.cjs`, `informalismo-media.json` y `assets/<sha256>.<jpg|jpeg|png|webp>`. Los nombres se basan en el SHA-256 de los bytes originales. El manifiesto identifica cada imagen, su crédito documentado y sus asignaciones a fichas públicas.

Contiene **36 imágenes para 31 fichas públicas**, con **186 asignaciones**: 15 reproducciones seleccionadas de la carpeta aportada y 21 imágenes de fuentes públicas documentadas. Hay 46 asignaciones de galería y 28 de cada uno de los roles HERO, CARD, DETAIL, THUMBNAIL y EXPLORER_3D. Las 28 nuevas primarias corresponden a asignaciones HERO; los tres medios anteriores de la ficha Informalismo se conservan.

Son fotografías o reproducciones raster. El importador no genera imágenes ni modifica sus píxeles. El artículo de lectura rápida incorpora además cuatro de ellas en sus textos ES/EN mediante el formato de imágenes ya admitido por el lector; esos textos pertenecen al paquete de contenido público. Este paquete de medios aporta los archivos y sus asignaciones, sin editar el artículo ni necesitar cambios de interfaz.

## Créditos y licencias

La procedencia pública de una imagen no establece una licencia abierta. El manifiesto conserva la página de origen, la URL documental, los créditos conocidos y la situación documentada de cada archivo:

- **15 imágenes aportadas:** `license: null`; no se ha documentado una licencia de reutilización. Una de ellas está identificada como fotografía del archivo del MoMA, IN668.12; las otras conservan la indicación de fotógrafo no documentado cuando corresponde.
- **16 imágenes de internet:** derechos reservados; el manifiesto registra que no se ha identificado licencia abierta ni obtenido autorización de reproducción. Se preservan los créditos institucionales y de autoría documentados.
- **2 imágenes de internet:** CC BY-SA 3.0; en una se indica que el recorte ya estaba presente en el archivo de origen.
- **3 imágenes de internet:** identificadas como dominio público en la fuente. Una lleva la cautela expresa de que esa identificación corresponde a Estados Unidos y no se ha comprobado su vigencia en otros países, además del crédito de la versión retocada.

No debe inventarse una licencia Creative Commons, eliminar esas cautelas ni atribuir una fotografía a una persona desconocida. La atribución o el permiso que falten siguen pendientes; la incorporación local no los resuelve.

## Antes de importar

1. Aplicar primero el paquete de contenido público de informalismo: las fichas deben existir y estar publicadas.
2. Usar el flujo de producción `infra/scripts/prod.sh deploy <release>`, con la copia coordinada de PostgreSQL y uploads y sus migraciones. Conservar y comprobar el backup antes de cualquier aplicación de datos.
3. Revisar las fotos y el manifiesto: identificación, pies, autoría/licencia, fuente pública, encuadres y roles. Conservar su suma SHA-256. El importador comprueba bytes, formato, dimensiones y destinos; la identificación histórica depende de esta revisión.

## Probar y aplicar en producción

Desde la raíz del repositorio, seleccionar la misma versión que ya está desplegada y el directorio absoluto del paquete revisado:

```bash
export JANO_RELEASE='<release ya desplegada>'
JANO_PHOTO_PACKAGE='/ruta/absoluta/al/paquete-revisado'

docker compose --env-file infra/.env.production -f infra/docker-compose.prod.yml \
  run --rm --no-deps \
  --volume "$JANO_PHOTO_PACKAGE:/app/backend/api/prisma/editorial-data/informalismo-photos:ro" \
  backend node /app/backend/api/prisma/editorial-data/informalismo-photos/informalismo-media-transfer.cjs
```

El servicio **backend**, cuyo directorio de trabajo es `/app/backend/api`, monta el volumen persistente de uploads y dispone de `pg` y `sharp`. No usar `migrate` para este paquete: ese servicio no monta uploads. La prueba comprueba también los archivos existentes, simula las escrituras en una transacción y termina en **ROLLBACK** sin copiar archivos ni crear directorios.

Si se ejecuta una copia del script situada en `/tmp`, en lugar del montaje bajo el árbol de la API, definir `NODE_PATH=/app/backend/api/node_modules:/app/node_modules` para resolver ambas dependencias.

Si el resultado es correcto y el paquete permanece idéntico:

```bash
docker compose --env-file infra/.env.production -f infra/docker-compose.prod.yml \
  run --rm --no-deps \
  --volume "$JANO_PHOTO_PACKAGE:/app/backend/api/prisma/editorial-data/informalismo-photos:ro" \
  backend node /app/backend/api/prisma/editorial-data/informalismo-photos/informalismo-media-transfer.cjs --apply
```

Repetir la prueba: no deben quedar medios/asignaciones nuevos ni archivos faltantes. Abrir las fichas en ES/EN y comprobar tarjeta, cabecera, detalle y crédito de las imágenes. No se ha ejecutado aquí ningún comando de producción.

## Comportamiento y límites

- `--file /ruta/manifiesto.json` selecciona un manifiesto alternativo. `--uploads-dir /directorio/existente` permite probar en el host con una carpeta independiente. El destino predeterminado es `process.cwd()/uploads`.
- Solo escribe `Media` y `EntityMedia`. No altera fichas, fuentes, investigaciones, usuarios ni otros enlaces de medios. `originType` es `UPLOAD`: representa una incorporación manual de archivos, conservando las URLs documentales y los créditos reales de las imágenes obtenidas de internet.
- Solo acepta JPEG, PNG y WebP estáticos de hasta 15 MiB. SHA, firma, decodificación, formato y dimensiones deben concordar. No admite SVG ni el rol obsoleto `PRIMARY_LEGACY`.
- Reutiliza los archivos y medios del mismo `storageKey`. Si encuentra bytes o metadatos incompatibles, aborta. Las asignaciones se resuelven por ficha, medio y rol; solo actualiza los valores expresamente incluidos en el manifiesto.
- No elimina ni desmarca otros medios. Una nueva asignación primaria aborta si ya existe otra imagen primaria. La elección explícita de roles y orden determina qué imagen aparece en cada espacio de la interfaz.
- Publica cada temporal completo mediante un enlace duro atómico que no sustituye archivos existentes. En fallos anteriores a COMMIT elimina exclusivamente sus archivos nuevos que conserven el mismo inode y SHA. Puede dejar directorios vacíos.
- Si COMMIT pierde su confirmación, conserva los archivos para no romper referencias que pudieran haberse guardado. Revisar el resultado antes de reintentar; no eliminar esos archivos manualmente sin contrastar la base de datos.

Pruebas internas sin base de datos: `node informalismo-media-transfer.cjs --self-test`.

## Verificación inicial local del 26 de octubre de 2026

- Las 31 imágenes superaron firma, SHA-256, dimensiones y decodificación real de JPEG, PNG o WebP.
- La prueba predeterminada simuló 31 medios y 150 asignaciones, con rollback y sin escrituras en uploads. Un conflicto real de primaria en Informalismo también produjo rollback completo; los hashes de las tablas comprobadas y del árbol de uploads permanecieron idénticos.
- Las pruebas de archivos cubrieron reutilización, colisión sin sobrescritura, rechazo de symlinks externos y limpieza de archivos nuevos tras un fallo de copia, conservando los archivos preexistentes y los reemplazos ajenos.
- La aplicación local incorporó los 31 medios y 150 asignaciones. Su repetición en modo de prueba dejó cero creaciones o actualizaciones pendientes y ningún archivo faltante.
- La comprobación posterior verificó los bytes por HTTP de las 31 imágenes, las 50 respuestas públicas ES/EN de las 25 fichas y la conservación de los tres medios anteriores de Informalismo. La investigación privada siguió exigiendo sesión.

Estas comprobaciones corresponden al entorno local. No se ha desplegado ni importado este paquete en producción. El montaje, los permisos del volumen y el estado previo de las fichas deben verificarse también allí.

## Comprobación de integración en una copia desechable

Usar exclusivamente una base de datos temporal clonada después de importar las fichas y una carpeta de uploads independiente. Nunca aplicar estas pruebas destructivas a la base o al volumen reales. Conservar un snapshot ordenado de todas las filas de `Media` y `EntityMedia`, y de los archivos iniciales; comparar datos completos, no solo sus recuentos.

| Caso                             | Acción en la copia temporal                                                                  | Resultado exigido                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Prueba predeterminada            | Ejecutar el manifiesto real sin `--apply`, con `--uploads-dir` temporal                      | Rollback; filas y archivos iniciales idénticos; ninguna carpeta nueva.                                      |
| Conflicto de primaria            | Preparar en la copia una primaria de otro medio y probar una asignación primaria entrante    | Aborta; rollback total; snapshot posterior idéntico al tomado después de preparar el conflicto.             |
| Copia fallida                    | Mediante `transfer()` y el cliente de prueba, hacer fallar la segunda publicación de archivo | Rollback de todas las filas; se limpia el primer archivo nuevo; se conserva cualquier archivo preexistente. |
| Aplicación e idempotencia        | Aplicar en la copia con uploads temporal, repetir la aplicación y comparar snapshots         | La segunda aplicación crea y actualiza cero filas, copia cero archivos y mantiene bytes y datos idénticos.  |
| Colisión de archivo              | Poner otros bytes en un destino previsto y ejecutar la prueba                                | Rechazo antes de abrir la transacción; el archivo ajeno permanece idéntico.                                 |
| Protección del resto del sistema | Comparar también `Entity`, `Source` y las tablas privadas antes y después                    | Ningún cambio.                                                                                              |

La lectura real del paquete se puede comprobar sin base de datos con las funciones exportadas `validate()` y `prepare()`: esta última recibe el manifiesto, su directorio y el `sharp` instalado. `transfer()` admite un cliente PostgreSQL de la copia temporal. Los escenarios que alteran deliberadamente datos o archivos para provocar fallos pertenecen exclusivamente a esa copia.

## Segunda iteración: cobertura completa

Se incorporaron cinco imágenes oficiales y se reutilizó una fotografía de contexto para cubrir las seis fichas que carecían de imagen. Las 35 fichas relacionadas y el artículo (36 páginas públicas) tienen ahora imagen real en HERO, CARD, DETAIL, THUMBNAIL y EXPLORER_3D. Se verificaron 72 respuestas ES/EN, 360 espacios de imagen y la apertura de 36 páginas en navegador: cero imágenes ausentes, rotas o sustituidas por portadas generadas. El artículo conserva cuatro ilustraciones en el texto.

La fotografía de El Paso representa a su cofundador Rafael Canogar, no al colectivo completo. La imagen de Avance cultural es una vista contextual del MoMA de 1960, no una medida de progreso cultural. Arte Otro utiliza la vista previa pública del documento de Club 49 conservado en MACBA; no se accedió al fichero restringido de biblioteca. El retrato de Bodhidharma procede del acceso abierto del Met. Las cautelas sobre reproducción permanecen en los créditos.
