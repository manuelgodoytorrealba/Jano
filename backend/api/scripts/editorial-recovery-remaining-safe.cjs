const fs=require('node:fs'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const base='artifacts/editorial-recovery/';
const q=x=>"'"+String(x).replaceAll("'","''")+"'";
const s=JSON.parse(fs.readFileSync(base+'public-snapshot.json'));
const picked=['giambattista-tiepolo','campbells-soup-cans'];
const proposals={
  'giambattista-tiepolo':{
    summary_es:'Giambattista Tiepolo (1696–1770) fue un pintor y grabador veneciano cuya trayectoria se sitúa en el siglo XVIII.',
    essay_es:'## Una trayectoria del siglo XVIII\n\nGiambattista Tiepolo nació en 1696 y murió en 1770. El registro público lo identifica como pintor y grabador veneciano.\n\nSu relación publicada con el [[rococo|Rococó]] sitúa su trayectoria en el contexto artístico de la Europa del siglo XVIII.',
    summary_en:'Giambattista Tiepolo (1696–1770) was a Venetian painter and printmaker whose career belongs to the eighteenth century.',
    essay_en:'## An eighteenth-century career\n\nGiambattista Tiepolo was born in 1696 and died in 1770. The public record identifies him as a Venetian painter and printmaker.\n\nHis published relationship with [[rococo|Rococo]] places his career within the artistic context of eighteenth-century Europe.',
    claims:['ArtistDetails.birthYear=1696','ArtistDetails.deathYear=1770','public identity/discipline record','eligible BELONGS_TO_MOVEMENT relation: Rococo'],
    sources:['Autorretrato de Giambattista Tiepolo — Wikimedia Commons','published relation citation for Rococo'],
    rejected:'Removed source-checking/process prose and unsupported claims about artistic importance, frescos, luminosity and practice.'
  },
  'campbells-soup-cans':{
    summary_es:'Latas de sopa Campbell es una serie de pinturas asociada a Andy Warhol y situada en 1962. Cada lienzo mide 50,8 × 40,6 cm y la serie se conserva en el Museum of Modern Art de Nueva York.',
    essay_es:'## Serie y registro material\n\nLatas de sopa Campbell es una serie de pinturas asociada a [[andy-warhol|Andy Warhol]] y situada en 1962. El registro técnico indica pintura al óleo y polímero sintético sobre lienzo.\n\nCada lienzo mide 50,8 × 40,6 cm y la serie se conserva en el [[moma|Museum of Modern Art]] de Nueva York. La relación publicada con el [[pop-art|Pop Art]] aporta su marco artístico inmediato.',
    summary_en:'Campbell’s Soup Cans is a series of paintings associated with Andy Warhol and placed in 1962. Each canvas measures 50.8 × 40.6 cm, and the series is held by the Museum of Modern Art in New York.',
    essay_en:'## Series and material record\n\nCampbell’s Soup Cans is a series of paintings associated with [[andy-warhol|Andy Warhol]] and placed in 1962. The technical record identifies synthetic polymer on canvas and oil painting.\n\nEach canvas measures 50.8 × 40.6 cm, and the series is held by the [[moma|Museum of Modern Art]] in New York. Its published relationship with [[pop-art|Pop Art]] provides its immediate artistic framework.',
    claims:['structured chronology=1962, expressed as placement not exact completion','ArtworkDetails.technique=Pintura al óleo','ArtworkDetails.materials=Polímero sintético sobre lienzo','ArtworkDetails.dimensions=Cada lienzo: 50,8 × 40,6 cm','ArtworkDetails.location=Museum of Modern Art, Nueva York','eligible CREATED_BY relation: Andy Warhol','eligible LOCATED_IN relation: MoMA','eligible BELONGS_TO_MOVEMENT relation: Pop Art'],
    sources:['Campbell’s Soup Cans — MoMA','published relation citations for Andy Warhol, MoMA and Pop Art'],
    rejected:'Removed unsupported interpretation about advertising, consumption and mass media; retained only structured facts and eligible factual relations.'
  }
};
const db=x=>execFileSync('docker',['exec','-i','infra-db-1','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','jano','-d','jano'],{input:x,encoding:'utf8'});
const rows=picked.map(slug=>{const e=s.entities.find(x=>x.slug===slug);assert(e&&e.status==='PUBLISHED');const n=proposals[slug];return {id:e.id,slug,title:e.title,type:e.type,before:{summary_es:e.summary,essay_es:e.content,summary_en:e.summary_en,essay_en:e.essay_en},after:n,public_claims_used:n.claims,sources_used:n.sources,relations_used:n.claims.filter(x=>x.startsWith('eligible')),rejected_unsupported_sentences:n.rejected};});
const ids=rows.map(x=>q(x.id)).join(',');
const current=JSON.parse(db(`BEGIN READ ONLY; SELECT json_build_object('database',current_database(),'total',(SELECT count(*) FROM "Entity"),'rows',(SELECT json_agg(json_build_object('id',e.id,'summary_es',e.summary,'essay_es',e.content,'summary_en',t."shortDescription",'essay_en',t.essay)) FROM "Entity" e JOIN "EntityTranslation" t ON t."entityId"=e.id AND t.locale='en' WHERE e.id IN (${ids}))); ROLLBACK;`));
assert.equal(current.database,'jano');assert.equal(current.total,824);
for(const r of rows){const x=current.rows.find(x=>x.id===r.id);assert.deepEqual({summary_es:x.summary_es,essay_es:x.essay_es,summary_en:x.summary_en,essay_en:x.essay_en},r.before,'Concurrent editorial change; abort');}
fs.writeFileSync(base+'remaining-safe-reviewed.json',JSON.stringify(rows,null,2)+'\n');
if(!process.argv.includes('--apply'))process.exit(console.log('Preview written; no writes.'));
let sql='BEGIN;';for(const r of rows){const n=r.after;sql+=`UPDATE "Entity" SET summary=${q(n.summary_es)},content=${q(n.essay_es)} WHERE id=${q(r.id)};`;for(const l of ['es','en'])sql+=`UPDATE "EntityTranslation" SET "shortDescription"=${q(n['summary_'+l])},essay=${q(n['essay_'+l])},excerpt=${q(n['summary_'+l])} WHERE "entityId"=${q(r.id)} AND locale=${q(l)};`;}sql+='COMMIT;';
fs.writeFileSync(base+'remaining-safe-applied.sql',sql);db(sql);console.log('Applied remaining safe bilingual repairs.');
