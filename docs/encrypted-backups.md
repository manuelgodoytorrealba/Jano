# Copia externa cifrada de las copias completas

El PC de Manuel descarga cada día la última copia coordinada completada en el
servidor y la guarda en un repositorio restic cifrado. No detiene la web ni crea
una copia nueva de la base de datos: conserva fuera del servidor los puntos
creados por el procedimiento oficial de despliegue.

## Componentes

- `infra/scripts/export-backup.sh`: exporta solo los seis archivos permitidos de
  `.deploy/last-backup`, después de verificar ruta, ausencia de enlaces simbólicos
  y SHA-256. Usa el bloqueo oficial para no coincidir con un despliegue. Su salida
  estándar contiene exclusivamente el archivo tar; los mensajes van a stderr.
- Una clave SSH dedicada tiene `restrict` y un comando forzado hacia ese script.
  No permite una sesión general, escritura, terminal ni reenvío de puertos. La
  clave privada permanece en el PC, no en el servidor ni en el repositorio Git.
- `infra/scripts/pull-encrypted-backup.sh`: lee la configuración privada del PC y
  usa `restic backup --stdin-from-command`. Si SSH o el exportador fallan, restic
  no crea un snapshot. Después comprueba los datos cifrados con `check --read-data`.
- Las unidades de `infra/systemd` se instalan como servicio y temporizador de
  usuario. Se ejecutan a las 03:30, con hasta diez minutos de retraso aleatorio;
  `Persistent=true` recupera una ejecución pendiente cuando vuelve a iniciarse
  el gestor de usuario. El PC debe estar encendido y tener acceso a la red del
  servidor. Los fallos quedan en el registro del servicio.

## Configuración de esta instalación

Configuración y contraseña de restic: `~/.config/jano-backup/`, accesible solo por
el usuario. Repositorio cifrado: `~/Backups/Jano/restic`. Clave SSH dedicada:
`~/.ssh/jano_backup_readonly`. Copia instalada del cliente:
`~/.local/lib/jano-backup/pull-encrypted-backup.sh`.

El servicio no elimina snapshots ni copias originales. La contraseña debe
conservarse además en un gestor de contraseñas o soporte independiente antes de
depender de otras réplicas del repositorio. No registrar su contenido en Git,
informes ni registros. La clave SSH dedicada se puede retirar del archivo
`authorized_keys` del servidor para revocar exclusivamente este acceso.

## Comprobación y recuperación

`python3 infra/scripts/test-export-backup.py` comprueba exportación válida,
corrupción, ruta externa, enlace simbólico, bloqueo concurrente y una integración
restic con recuperación cifrada y rechazo de una fuente fallida.

Estado de la programación: `systemctl --user list-timers jano-backup.timer`.
Última ejecución: `journalctl --user -u jano-backup.service`.

Para consultar o recuperar, cargar la configuración privada sin imprimirla:

```bash
set -a
source ~/.config/jano-backup/settings
set +a
restic snapshots
restic check --read-data
restic dump latest jano-backup.tar > /ruta/privada/recuperacion.tar
```

Extraer únicamente en un directorio privado vacío y verificar los dos SHA-256
antes de seguir el procedimiento de restauración de `deployment.md`. No restaurar
sobre producción para ensayar la recuperación.

Esta instalación protege frente a la pérdida del servidor, pero no frente a la
pérdida simultánea de ambos equipos en la misma ubicación. Queda pendiente un
tercer destino permanente.

## Copias coordinadas periódicas

El temporizador `jano-periodic-backup.timer` del servidor crea un punto diario a
las 02:00. Primero copia los uploads a una zona temporal privada con JANO activo.
Después detiene frontend y backend, vuelca PostgreSQL y sincroniza los cambios
finales por checksum; a continuación reanuda ambos servicios y verifica su salud
antes de cifrar y verificar el snapshot incremental. No se borran snapshots ni copias
anteriores. El proceso rechaza otro escritor del volumen, un bloqueo de despliegue
existente y menos de 4 GiB libres en el repositorio. La copia usa rsync y su
biblioteca del host dentro del contenedor de PostgreSQL; si faltan o son
incompatibles, la preparación falla antes de detener la aplicación. La pausa depende del tamaño
de los datos y las peticiones en curso.

El repositorio y su contraseña se configuran en el servidor mediante
`~/.config/jano-periodic/settings`. El directorio configurado contiene `repo`,
se recomienda en `/srv/media/jano-periodic` y debe ser privado (0700). La
contraseña debe tener una copia independiente. El espacio seguirá creciendo con
los datos nuevos: el control de espacio no sustituye la vigilancia de capacidad.

El exportador elige el punto verificado más reciente entre el periódico y el de
despliegue, reconstruye el formato existente y verifica las sumas antes de enviarlo
al PC. Si el PC está apagado, el snapshot permanece en el servidor y la copia
externa espera la siguiente ejecución; sigue siendo necesaria la alerta de edad.

`jano-periodic-recover.service` y `ExecStopPost` intentan reanudar la aplicación
si el proceso se interrumpe durante la captura. Si no lo consiguen, permanecen el
marcador y el bloqueo para evitar operaciones inseguras. Revisar los registros de
ambos servicios antes de intervenir. Una carpeta temporal sin el marcador de
propiedad del proceso no se elimina automáticamente. Las pruebas aisladas son
`python3 infra/scripts/test-periodic-backup.py` y
`python3 infra/scripts/test-export-backup.py`.
