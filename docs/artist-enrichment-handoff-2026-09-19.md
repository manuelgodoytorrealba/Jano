# JANO — traspaso del enriquecimiento de artistas

Estado dejado el **19 de septiembre de 2026**, en la rama `develop`.

## Punto exacto de partida

- Artistas totales: **209**.
- Artistas completos en español e inglés: **138**.
- Artistas pendientes: **71**.
- Artistas publicados pendientes: **69**.
- Último lote aplicado: **020**.
- Próximo lote seleccionado: `peter-paul-rubens`, `jose-de-ribera`, `william-blake`, `john-constable`, `rosa-bonheur`.

Los lotes 001–020 contienen los cuatro campos públicos de cada artista:
`summary_es`, `essay_es`, `summary_en` y `essay_en`.

## Preparar el entorno

```bash
git clone <URL_DEL_REPOSITORIO> Jano
cd Jano
nvm install
nvm use
cp .env.example .env
cp backend/api/.env.example backend/api/.env
npm run setup:local
npm run db:up
npm run prisma:deploy
npm run seed:system
npm run seed:foundational
```

Para levantar la aplicación:

```bash
npm run backend:dev
npm run frontend:dev
```

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Adminer: `http://localhost:8080`

## Aplicar el punto de partida editorial

Los artefactos de los lotes están versionados en
`artifacts/editorial-recovery/artists-batch-001-draft.json` hasta
`artists-batch-020-draft.json`.

Con la base de datos local levantada:

```bash
node scripts/apply-artist-editorial-batches.cjs \
  | docker exec -i infra-db-1 psql -U jano -d jano -v ON_ERROR_STOP=1
```

El script es idempotente para el contenido editorial y valida atómicamente que
los 100 artistas de los lotes tengan resumen y ensayo en ambos idiomas. No
modifica relaciones, fuentes, assertions ni datos privados.

## Continuar el flujo

1. Seleccionar sólo artistas `PUBLISHED` con algún campo editorial bilingüe pendiente.
2. Investigar con fuentes institucionales públicas.
3. Crear un nuevo `artists-batch-NNN-draft.json` con los cuatro campos y claims.
4. Validar enlaces Rich Text, ausencia de self-links y paridad ES/EN.
5. Aplicar mediante transacción.
6. Verificar la ruta en ambos idiomas.
7. Actualizar el recuento y marcar el artefacto como `APPLIED_VERIFIED`.

No considerar “campo no vacío” como certificación semántica automática. La
política editorial vigente está en `docs/editorial-bilingual-policy.md`.

## Comprobaciones rápidas

```bash
npm run check
git status --short --branch
```

La consola puede mostrar un `401 /api/auth/me` al visitar el frontend sin
iniciar sesión; es esperado en esta verificación pública.
