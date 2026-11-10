# Despliegue de las mejoras de rendimiento

Las pruebas locales y comparaciones de búsquedas, tarjetas y filtros deben pasar antes del despliegue. La migración `20261107160000_media_variants` añade un campo JSON nullable: no sustituye medios ni modifica entidades. Mantener la copia coordinada de PostgreSQL y uploads que crea el procedimiento oficial.

## Aplicación

Usar exclusivamente `infra/scripts/prod.sh` según `deployment.md`: imágenes construidas antes de detener escrituras, copia verificada, migración, recreación y comprobaciones de salud. No copiar la base local a producción. Las imágenes antiguas siguen sirviéndose si todavía no tienen variantes.

La nueva protección de uploads privados debe comprobarse con archivos inocuos: las rutas directas y codificadas de `research` deben devolver 404. No realizar pruebas sobre documentos privados reales.

## Preparación de medios existentes

Después de completar el despliegue y comprobar la salud, desde el checkout de esa misma release:

```bash
JANO_RELEASE="$(git rev-parse --short=12 HEAD)" docker compose \
  --env-file infra/.env.production -f infra/docker-compose.prod.yml \
  run --rm --no-deps media-prepare
```

El servicio es una tarea explícita, no arranca con la aplicación. Utiliza la misma imagen y volumen de uploads, sin puertos, sin privilegios adicionales y con un máximo de un núcleo y 1 GiB de memoria. El código exige `--apply-production` en producción; el servicio ya lo declara. Nunca desactivar el control cambiando `NODE_ENV`.

La tarea conserva los originales, genera archivos con nombres derivados del contenido y actualiza únicamente las variantes y la referencia del fondo optimizado. Emite progreso cada cien elementos; si falla algún medio, termina con error y conserva su original. Puede repetirse: reutiliza derivados existentes. Los archivos antiguos y sus copias no se eliminan.

Antes y durante la tarea comprobar espacio, uso de memoria, errores y tiempos de respuesta. Suspender la tarea si perjudica la aplicación; no es necesario detener la web para preparar estos derivados. Los recursos deben medirse en el servidor: los tiempos de conversión locales no predicen su duración allí.

## Verificación y vuelta atrás

- Revisar salud de backend, frontend y proxy, migraciones y conteos de datos.
- Verificar primeras imágenes, detalle a resolución original, filtros y búsquedas en ambos idiomas.
- Comprobar tamaño y cabecera de caché de las variantes; solo medios públicos deben ser accesibles por uploads.
- Repetir una muestra limitada de latencia en producción, sin pruebas de saturación en vivo.
- Conservar la release anterior y la copia coordinada. El rollback de imágenes no elimina la columna nullable añadida, compatible con los clientes anteriores. No restaurar una base antigua sobre nuevas escrituras para revertir solo el código.

Quedan fuera de esta fase el índice persistente para búsquedas complejas, una migración de proveedor y la eliminación de copias antiguas. El crecimiento del disco debe seguir vigilándose después de ampliar su capacidad.
