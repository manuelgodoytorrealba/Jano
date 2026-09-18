const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../../../artifacts/editorial-recovery');
fs.mkdirSync(out,{recursive:true});
const sql=`BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object('database',current_database(),'total',(SELECT count(*) FROM "Entity"),'published',(SELECT count(*) FROM "Entity" WHERE status='PUBLISHED'),
'entities',(SELECT json_agg(row_to_json(q) ORDER BY q.id) FROM (
SELECT e.*,t."shortDescription" summary_en,t.essay essay_en,
(SELECT row_to_json(a) FROM "ArtistDetails" a WHERE a."entityId"=e.id) artist,
(SELECT row_to_json(a) FROM "ArtworkDetails" a WHERE a."entityId"=e.id) artwork,
(SELECT json_agg(row_to_json(a)) FROM "CanonicalAssertion" a WHERE a."entityId"=e.id AND a.status='PUBLISHED') assertions,
(SELECT json_agg(json_build_object('id',sr.id,'quote',sr.quote,'note',sr.note,'page',sr.page,'source',json_build_object('id',s.id,'title',s.title,'url',s.url,'author',s.author))) FROM "SourceRef" sr JOIN "Source" s ON s.id=sr."sourceId" WHERE sr."entityId"=e.id) refs,
(SELECT json_agg(json_build_object('id',c.id,'quote',c.quote,'note',c.note,'stance',c.stance,'locator',c.locator,'assertionId',c."canonicalAssertionId",'sourceId',c."sourceId")) FROM "Citation" c WHERE c."entityId"=e.id) citations,
(SELECT json_agg(json_build_object('id',r.id,'fromId',r."fromId",'toId',r."toId",'key',rt.key,'justification',r.justification,'confidence',r.confidence,'validFromYear',r."validFromYear",'validToYear',r."validToYear",'target',json_build_object('id',x.id,'slug',x.slug,'title',x.title,'status',x.status),'citations',(SELECT json_agg(json_build_object('id',c.id,'quote',c.quote,'note',c.note,'stance',c.stance,'sourceId',c."sourceId")) FROM "Citation" c WHERE c."relationId"=r.id))) FROM "Relation" r JOIN "RelationType" rt ON rt.id=r."relationTypeId" JOIN "Entity" x ON x.id=CASE WHEN r."fromId"=e.id THEN r."toId" ELSE r."fromId" END WHERE (r."fromId"=e.id OR r."toId"=e.id) AND r.status='PUBLISHED') relations
FROM "Entity" e JOIN "EntityTranslation" t ON t."entityId"=e.id AND t.locale='en'
WHERE coalesce(e.summary,'')<>'' AND coalesce(e.content,'')<>'' AND coalesce(t."shortDescription",'')<>'' AND coalesce(t.essay,'')<>''
) q),'catalog',(SELECT json_agg(json_build_object('id',id,'slug',slug,'status',status)) FROM "Entity"));
ROLLBACK;`;
const result=execFileSync('docker',['exec','-i','infra-db-1','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','jano','-d','jano'],{input:sql,encoding:'utf8',maxBuffer:30*1024*1024});
const data=JSON.parse(result);
assert.equal(data.database,'jano');
assert.equal(data.entities.length,138);
const dest=path.join(out,'public-snapshot.json');
fs.writeFileSync(dest,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({total:data.total,published:data.published,coverage:data.entities.length,path:dest}));
