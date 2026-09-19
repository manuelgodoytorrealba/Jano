# Prompt para Codex en el MacBook

Estoy continuando JANO desde el estado exacto dejado en la rama `develop`.

La carpeta `backups/jano-handoff-20260919/` debe estar copiada dentro de la raíz del repositorio clonado. Debe contener `jano.dump`, `uploads.tar.gz`, `SHA256SUMS` y `README.md`.

Trabaja con cuidado. No borres datos, no hagas resets destructivos, no modifiques producción y no hagas push.

```text
Clona la rama develop:

git clone -b develop git@github.com:manuelgodoytorrealba/Jano.git Jano
cd Jano

Usa Node 22.14.0:

nvm install
nvm use

Prepara el entorno:

cp .env.example .env
cp backend/api/.env.example backend/api/.env
npm run setup:local

Comprueba la integridad del backup desde la raíz:

sha256sum -c backups/jano-handoff-20260919/SHA256SUMS

Arranca sólo PostgreSQL:

npm run db:up

Si la base ya contiene datos de otra instalación, no los borres: detente y explica el estado. Si está vacía, restaura:

cat backups/jano-handoff-20260919/jano.dump | \
  docker compose -f infra/docker-compose.yml exec -T db \
  pg_restore -U jano -d jano --clean --if-exists --no-owner

Restaura los uploads:

docker compose -f infra/docker-compose.yml run --rm --build -T backend \
  sh -c 'rm -rf /app/backend/api/uploads/* && tar -xzf - -C /app/backend/api/uploads' \
  < backups/jano-handoff-20260919/uploads.tar.gz

No ejecutes prisma:deploy ni seeds antes de restaurar el dump: el dump ya contiene la base completa. Tampoco vuelvas a aplicar los lotes editoriales si la restauración funciona.

Arranca la aplicación:

npm run backend:dev

En otra terminal:

npm run frontend:dev

Verifica:

- Frontend: http://localhost:4200
- Backend: http://localhost:3000
- Adminer: http://localhost:8082
- fichas de artistas en ES y EN
- cambio de idioma
- imágenes y uploads
- relaciones y justificaciones

Comprueba como referencia:

- ARTIST totales: 209
- artistas bilingües completos: 138
- artistas pendientes: 71
- artistas publicados pendientes: 69

Revisa docs/artist-enrichment-handoff-2026-09-19.md y entrega un informe con checksums, conteos, uploads, URLs, problemas y comandos de arranque. No hagas push ni borres una base existente sin confirmación.
```
