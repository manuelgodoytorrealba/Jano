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

## Renderizado público y presupuesto de carga

Cloudflare Tunnel añade `X-Forwarded-For`. Angular degradaba esas peticiones a
renderizado en el navegador, aunque el acceso directo al contenedor sí devolvía
HTML completo. El frontend de producción declara únicamente los tres encabezados
que utiliza este proxy: `x-forwarded-host`, `x-forwarded-proto` y `x-forwarded-for`.
Se conserva la lista explícita de hosts y el puerto enlazado a loopback; no usar
`trustProxyHeaders: true` ni permitir todos los hosts para resolverlo.

`node infra/scripts/check-ssr.mjs http://127.0.0.1:14200` comprueba una instancia
aislada con esa configuración: HTML completo con y sin proxy, rechazo de host y
protocolo inválidos y ausencia de confianza en encabezados adicionales. El smoke
público del despliegue exige ahora HTML con `ng-server-context="ssr"` en `/home`;
un estado HTTP 200 por sí solo no garantiza que el renderizado esté funcionando.

El logotipo compartido usa una variante WebP de 256 píxeles (13.140 bytes frente
a 471.187 del PNG). El original se conserva; la nueva URL evita depender de una
copia antigua en la caché del navegador.
Las imágenes marcadas con prioridad alta se muestran desde el HTML del servidor,
sin esperar a la hidratación ni a la animación de revelado; el resto conserva su
transición habitual. Comprobar el detalle también con JavaScript desactivado.
La imagen móvil se incluye en el HTML de ambas plataformas y se selecciona con
CSS, en lugar de esperar a conocer el ancho en el navegador. Las traducciones
SSR se obtienen por el puerto interno del frontend, evitando llamadas al dominio
público y al WAF durante el renderizado.

Repetir las medidas antes y después en la URL pública, con caché del navegador
vacía y los mismos límites de red y CPU. Separar medianas de laboratorio de los
percentiles de usuarios reales. El LCP no incluye imágenes dibujadas en el canvas
del explorador: medir además preparación de la escena, imágenes e ida y vuelta a
la entidad. No presentar la pintura del texto de carga como carga de la escena.

Referencias: [cabeceras de proxy y seguridad de Angular](https://angular.dev/best-practices/security#configuring-trusted-proxy-headers)
y [Core Web Vitals](https://web.dev/articles/vitals).

La clase de diseño inicial se obtiene de la URL del documento mientras el router
todavía no ha completado su primera navegación. Evita pasar transitoriamente del
diseño inmersivo al genérico y desplazar toda la pantalla durante la hidratación.
El idioma SSR respeta `Accept-Language` para coincidir con una primera visita
sin preferencia guardada. Verificar CLS en Inicio y detalle con carga fría.
