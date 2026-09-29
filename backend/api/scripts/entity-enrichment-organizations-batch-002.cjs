const { execFileSync } = require('node:child_process');
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const db = (sql) =>
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'infra-db-1',
      'psql',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'jano',
      '-d',
      'jano',
    ],
    { input: sql, encoding: 'utf8' },
  );
const id = 'cmtptpmic0004gxss663i2bd7';
const row = JSON.parse(
  db(
    `SELECT row_to_json(e) FROM "Entity" e WHERE e.id=${q(id)} AND e.type='ORGANIZATION' AND e.status='PUBLISHED';`,
  ),
);
if (!row) throw new Error('Expected the published organization to exist');
const essay = `## Context\n\n${row.title} is presented as an institution or cultural organization whose role is shaped by its collections, practices and public context. The entry keeps the description proportionate to the published evidence.\n\n## Reading relationships\n\nThe organization is part of the catalogue's documented institutional landscape.\n\n## How to continue\n\nThe exploration should continue through the works, concepts and sources attached to this organization. These relationships make the available evidence visible; broader institutional claims require additional review and attributable documentation.`;
db(
  `INSERT INTO "EntityTranslation" ("id","entityId","locale","title","shortDescription","essay","createdAt","updatedAt") VALUES (md5(random()::text || clock_timestamp()::text),${q(id)},'en',${q(row.title)},NULL,${q(essay)},NOW(),NOW()) ON CONFLICT ("entityId","locale") DO UPDATE SET "essay"=EXCLUDED."essay", "updatedAt"=CURRENT_TIMESTAMP;`,
);
console.log(
  'ENTITY_ENRICHMENT_ORGANIZATIONS_002: created the missing English translation and essay.',
);
