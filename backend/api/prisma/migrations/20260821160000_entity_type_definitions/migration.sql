CREATE TYPE "EntityTypeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

CREATE TABLE "EntityTypeDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "singularName" TEXT NOT NULL,
  "pluralName" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT NOT NULL DEFAULT '•',
  "colorToken" TEXT NOT NULL DEFAULT 'slate',
  "baseKind" "KnowledgeEntityKind" NOT NULL,
  "status" "EntityTypeStatus" NOT NULL DEFAULT 'DRAFT',
  "systemType" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EntityTypeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EntityTypeDefinition_key_key" ON "EntityTypeDefinition"("key");
CREATE INDEX "EntityTypeDefinition_status_systemType_idx" ON "EntityTypeDefinition"("status", "systemType");
CREATE INDEX "EntityTypeDefinition_baseKind_idx" ON "EntityTypeDefinition"("baseKind");

INSERT INTO "EntityTypeDefinition" ("id", "key", "singularName", "pluralName", "description", "icon", "colorToken", "baseKind", "status", "systemType", "updatedAt") VALUES
  ('system-artwork', 'ARTWORK', 'Obra', 'Obras', 'Una obra y su contexto material, histórico y visual.', 'O', 'blue', 'WORK', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-artist', 'ARTIST', 'Artista', 'Artistas', 'Una trayectoria, práctica y red de influencias.', 'A', 'coral', 'PERSON', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-article', 'ARTICLE', 'Artículo', 'Artículos', 'Una pieza editorial que interpreta y conecta conocimiento.', 'R', 'orange', 'WORK', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-concept', 'CONCEPT', 'Concepto', 'Conceptos', 'Una idea crítica presente en obras, épocas y discursos.', 'C', 'green', 'ABSTRACTION', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-movement', 'MOVEMENT', 'Movimiento', 'Movimientos', 'Una corriente artística y las conexiones que la definen.', 'M', 'violet', 'ABSTRACTION', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-period', 'PERIOD', 'Periodo', 'Periodos', 'Un marco temporal para organizar la biblioteca.', 'P', 'gold', 'ABSTRACTION', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-text', 'TEXT', 'Texto', 'Textos', 'Un documento, manifiesto o referencia escrita.', 'T', 'rose', 'WORK', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-place', 'PLACE', 'Lugar', 'Lugares', 'Un lugar cultural, geográfico o institucional.', 'L', 'teal', 'PLACE', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-event', 'EVENT', 'Evento', 'Eventos', 'Un acontecimiento que sitúa y conecta la cultura.', 'E', 'gold', 'EVENT', 'ACTIVE', true, CURRENT_TIMESTAMP),
  ('system-organization', 'ORGANIZATION', 'Organización', 'Organizaciones', 'Una institución, colectivo o agente cultural.', 'O', 'violet', 'ORGANIZATION', 'ACTIVE', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "Entity" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_type_fkey" FOREIGN KEY ("type") REFERENCES "EntityTypeDefinition"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
