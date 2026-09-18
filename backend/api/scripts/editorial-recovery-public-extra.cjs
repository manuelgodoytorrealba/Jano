const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const sql=`BEGIN READ ONLY;
SELECT json_build_object(
'attributes',(SELECT json_agg(json_build_object('attribute',row_to_json(a),'definition',row_to_json(d))) FROM "EntityAttribute" a JOIN "AttributeDefinition" d ON d.id=a."definitionId" WHERE a.status='PUBLISHED'),
'concepts',(SELECT json_agg(row_to_json(d)) FROM "ConceptDetails" d),
'periods',(SELECT json_agg(row_to_json(d)) FROM "PeriodDetails" d),
'assertionRefs',(SELECT json_agg(row_to_json(d)) FROM "CanonicalAssertionSourceRef" d),
'translations',(SELECT json_agg(json_build_object('entityId',t."entityId",'locale',t.locale,'summary',t."shortDescription",'essay',t.essay,'excerpt',t.excerpt)) FROM "EntityTranslation" t WHERE t.locale IN ('es','en')),
'citations',(SELECT json_agg(json_build_object('id',c.id,'entityId',c."entityId",'relationId',c."relationId",'attributeId',c."entityAttributeId",'assertionId',c."canonicalAssertionId",'quote',c.quote,'note',c.note,'stance',c.stance,'locator',c.locator,'source',json_build_object('id',s.id,'title',s.title,'url',s.url))) FROM "Citation" c JOIN "Source" s ON s.id=c."sourceId")
); ROLLBACK;`;
const data=JSON.parse(execFileSync('docker',['exec','-i','infra-db-1','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','jano','-d','jano'],{input:sql,encoding:'utf8',maxBuffer:25*1024*1024}));
fs.writeFileSync('artifacts/editorial-recovery/public-extra.json',JSON.stringify(data,null,2)+'\n',{flag:'wx'});
console.log('Public supplement saved; no private tables read.');
