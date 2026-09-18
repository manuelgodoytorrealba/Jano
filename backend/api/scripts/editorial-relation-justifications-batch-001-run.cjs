const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const q=v=>`'${String(v).replaceAll("'","''")}'`;
const n=String.fromCharCode(10);
const db=s=>execFileSync('docker',['exec','-i','infra-db-1','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','jano','-d','jano'],{input:s,encoding:'utf8'});
const source=fs.readFileSync('backend/api/scripts/editorial-relation-justifications-batch-001-apply.cjs','utf8');
const start=source.indexOf('const t=')+8;
const end=source.indexOf(';\nconst path',start);
const texts=Function(`return (${source.slice(start,end)})`)();
const path='artifacts/editorial-recovery/editorial-relation-justifications-batch-001-reviewed.json';
const doc=JSON.parse(fs.readFileSync(path,'utf8'));
assert.equal(doc.rows.length,20);
for(const r of doc.rows){const x=texts[`${r.artworkSlug}|${r.targetSlug}`];assert(x,`${r.artworkSlug}|${r.targetSlug}`);r.localeTexts=x;r.status='IN_REVIEW';}
fs.writeFileSync(path,JSON.stringify(doc,null,2)+n);
let sql='BEGIN;';
for(const r of doc.rows){const claims=JSON.stringify(r.claimsUsed),sources=JSON.stringify(r.sourcesUsed);for(const locale of ['es','en']){sql+=`INSERT INTO "EditorialRelationJustification" ("id","relationId","locale","text","status","claimsUsed","sourcesUsed","reviewNote") VALUES (md5(${q(r.relationId+locale)}),${q(r.relationId)},${q(locale)},${q(r.localeTexts[locale])},'IN_REVIEW',${q(claims)}::jsonb,${q(sources)}::jsonb,${q(r.reviewNote)}) ON CONFLICT ("relationId","locale") DO UPDATE SET "text"=EXCLUDED."text","status"=EXCLUDED."status","claimsUsed"=EXCLUDED."claimsUsed","sourcesUsed"=EXCLUDED."sourcesUsed","reviewNote"=EXCLUDED."reviewNote";`;}}
sql=sql.replaceAll(',"reviewNote") VALUES', ',"reviewNote","createdAt","updatedAt") VALUES').replaceAll(') ON CONFLICT', ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT');
db(sql+'COMMIT;');
fs.writeFileSync('artifacts/editorial-recovery/editorial-relation-justifications-batch-001-applied.sql',sql+'COMMIT;');
console.log('Applied 20 bilingual editorial relation justifications in review.');
