# Transferencia pública de informalismo

Paquete: `informalismo-public.json` y `informalismo-public-transfer.cjs`, en la misma carpeta. El JSON revisado contiene únicamente entidades públicas, sus traducciones, fuentes públicas, afirmaciones y relaciones. No transporta cuentas, investigaciones privadas, documentos de la biblioteca ni archivos subidos. El código del despliegue por sí solo no transporta estos datos.

El importador usa `DATABASE_URL` y el paquete `pg` ya instalado en la imagen de migraciones de Jano. Su modo predeterminado prueba la transacción completa y hace **ROLLBACK**; solo `--apply` confirma los cambios. No borra registros. `--file /ruta/archivo.json` permite seleccionar otra ubicación. No se ha ejecutado aquí ninguna operación de producción.

## Ejecución en el servidor

1. Conservar el paquete junto con su suma SHA-256. Revisar el JSON antes de usarlo.
2. Desplegar la versión aprobada mediante `infra/scripts/prod.sh deploy <release>`. Ese flujo realiza la copia coordinada de PostgreSQL y uploads, valida la copia y aplica las migraciones. Confirmar su finalización y conservar la referencia de esa copia.
3. Desde la raíz del repositorio, usar la misma configuración y la misma versión ya desplegada. El siguiente montaje de solo lectura pone el paquete dentro del árbol de la API para reutilizar sus dependencias:

```bash
export JANO_RELEASE='<release ya desplegada>'
JANO_IMPORT_DIR='/ruta/absoluta/al/paquete-revisado'

docker compose --env-file infra/.env.production -f infra/docker-compose.prod.yml \
  run --rm --no-deps \
  --volume "$JANO_IMPORT_DIR:/app/backend/api/prisma/editorial-data/informalismo:ro" \
  migrate node /app/backend/api/prisma/editorial-data/informalismo/informalismo-public-transfer.cjs
```

El resultado debe indicar `DRY RUN — rolled back`. Revisar sus contadores; un conflicto aborta toda la operación. Si la prueba termina correctamente y el JSON sigue siendo el mismo, confirmar:

```bash
docker compose --env-file infra/.env.production -f infra/docker-compose.prod.yml \
  run --rm --no-deps \
  --volume "$JANO_IMPORT_DIR:/app/backend/api/prisma/editorial-data/informalismo:ro" \
  migrate node /app/backend/api/prisma/editorial-data/informalismo/informalismo-public-transfer.cjs --apply
```

4. Repetir el modo de prueba: no deben quedar creaciones ni actualizaciones pendientes. Abrir el artículo y las fichas en ES/EN, probar los cambios de idioma y sus enlaces públicos. Las relaciones ya publicadas con otra justificación se preservan; el contador `relationPreserved` identifica ese caso y no se les añaden fuentes del texto entrante.

## Guardas y conflictos

- Las referencias deben resolver por slug y tipo a entidades publicadas con tipo activo. Las entidades entrantes requieren tipo activo, `kind` compatible, seis campos editoriales completos y los atributos obligatorios ya publicados; este paquete no crea atributos.
- Una ficha publicada idéntica se reutiliza. Un borrador solo puede publicarse si coincide con su ID en el JSON. Otra ficha existente aborta la operación.
- La renovación pública de Informalismo admite `expectedBefore` con los seis campos anteriores exactos. Solo se aplica si la versión actual coincide; una edición divergente de producción exige revisión y conciliación manual del contenido, nunca forzar el importador.
- Las fuentes se reutilizan por URL exacta; varias coincidencias abortan por ambigüedad. Las afirmaciones y las citas preservan su fuente pública, localizador, versión inglesa, atribución y calificadores. No se escriben vínculos a evidencia privada.
- La transacción es indivisible. Un error, un enlace roto o un conflicto provoca rollback. No hay opciones de borrado ni de sobrescritura forzada.

Comprobación del script sin base de datos: `node informalismo-public-transfer.cjs --self-test`.

El artículo contiene cuatro ilustraciones referenciadas en `/uploads/media/informalismo-20261026/`. Después de importar el contenido, aplicar el paquete `informalismo-photos` según su README para que esos archivos estén disponibles. Conservar ambos paquetes juntos.
