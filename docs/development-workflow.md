# Development Workflow

## Estrategia recomendada

La mejor DX para este repo sigue siendo híbrida:

- PostgreSQL y Adminer en Docker
- Backend y frontend corriendo en host

Motivo:

- Angular y Nest tienen hot reload más estable y rápido fuera de Docker, sobre todo en macOS con bind mounts.
- Prisma funciona mejor con menos capas cuando iteras en migraciones.
- Sigues teniendo base de datos consistente y portable porque el estado vive en Docker.

El stack completo en Docker también está preparado y es útil para:

- arrancar el proyecto en una máquina nueva con pocos comandos
- validar que el repo no depende de tu host
- reproducir incidencias de entorno

## Linux ↔ macOS

### Primera vez en una máquina nueva

1. Clona el repositorio.
2. Copia `.env.example` a `.env`.
3. Si vas a trabajar en modo híbrido, copia `backend/api/.env.example` a `backend/api/.env`.
4. Instala Node 22.14.0 y npm 10.9.4 con Volta o `nvm`.
5. Arranca Docker Desktop en macOS o Docker Engine en Linux.
6. Ejecuta `npm run setup:local`.
7. Ejecuta `npm run db:up`.
8. Ejecuta `npm run prisma:migrate`.
9. Ejecuta `npm run prisma:seed` si necesitas datos.
10. Levanta backend y frontend con `npm run backend:dev` y `npm run frontend:dev`.

### Cambio de equipo

1. Haz commit y push desde el equipo actual.
2. En el otro equipo, haz `git pull`.
3. Recupera tus secretos desde el gestor de contraseñas.
4. Reinstala dependencias con `npm run setup:local` si cambió el lockfile o la versión de Node.
5. Levanta la base con `npm run db:up`.
6. Corre `npm run prisma:generate` y `npm run prisma:migrate`.
7. Continúa trabajando.

### Beta testing en otra computadora

Para que otra persona pruebe el producto sin tocar desarrollo, usa la opcion
full Docker:

```bash
git clone <repo-url>
cd Jano
cp .env.example .env
npm run docker:up
```

El tester puede abrir `http://localhost:4200`.

Si necesita datos iniciales:

```bash
npm run prisma:seed
```

Guia completa: [beta-tester-setup.md](beta-tester-setup.md).

## Variables de entorno

### `.env` en la raíz

Se usa para Docker Compose y para puertos compartidos del stack.

### `backend/api/.env`

Se usa solo cuando el backend corre fuera de Docker.

No subas ninguno de los dos archivos reales. Sube solo los `.example` y guarda secretos reales en un gestor de contraseñas.
