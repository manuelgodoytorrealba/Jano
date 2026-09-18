const {execFileSync}=require('node:child_process');
const q=v=>`'${String(v).replaceAll("'","''")}'`;
const db=sql=>execFileSync('docker',['exec','-i','infra-db-1','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','jano','-d','jano'],{input:sql,encoding:'utf8'});
const rows={
 'flagelacion-de-cristo':['Flagellation of Christ','Piero della Francesca','Italian Renaissance'],
 'gran-mezquita-de-djenne':['Great Mosque of Djenné','Artists of Djenné','African Art'],
 'hipomenes-y-atlanta':['Hippomenes and Atalanta','Guido Reni','Baroque'],
 'hombre-en-la-encrucijada':['Man at the Crossroads','Diego Rivera','Mexican Muralism'],
 'homenaje-al-cuadrado':['Homage to the Square','Josef Albers','Bauhaus'],
 'hot-spot':['Hot Spot','Mona Hatoum','Conceptual Art'],
 'icono-de-cristo-pantocrator':['Christ Pantocrator','Byzantine Art','Byzantine Art'],
 'infinity-mirrored-room':['Infinity Mirrored Room','Yayoi Kusama','Conceptual Art'],
 'inmaculada-de-soult':['Soult Immaculate','Bartolomé Esteban Murillo','Baroque'],
 'insertion-into-circuit':['Insertions into Ideological Circuits','Cildo Meireles','Conceptual Art']
};
const slugs=Object.keys(rows),list=slugs.map(q).join(','),data=JSON.parse(db(`SELECT json_agg(json_build_object('slug',e.slug,'essay',t.essay)) FROM "Entity" e JOIN "EntityTranslation" t ON t."entityId"=e.id AND t.locale='en' WHERE e.slug IN (${list})`));
let sql='BEGIN;';
for(const r of data){const [title,artist,movement]=rows[r.slug];const essay=r.essay.replace(/^(## Form and context\n\n)[^ ]+(?: [^ ]+)* was made by \[\[[^|]+\|[^\]]+\]\]/,`$1${title} was made by [[${slugForArtist(r.slug)}|${artist}]]`).replace(/(related to \[\[[^|]+\|)[^\]]+\]\]/,`$1${movement}]]`);sql+=`UPDATE "EntityTranslation" SET essay=${q(essay)},"shortDescription"=${q(`${title} is a work by ${artist} dated ${yearFor(r.slug)}. ${summaryTail(r.slug)}`)},excerpt=${q(`${title} is a work by ${artist} dated ${yearFor(r.slug)}. ${summaryTail(r.slug)}`)} WHERE "entityId"=(SELECT id FROM "Entity" WHERE slug=${q(r.slug)}) AND locale='en';`;}
sql+='COMMIT;';db(sql);
function slugForArtist(s){return {'flagelacion-de-cristo':'piero-della-francesca','gran-mezquita-de-djenne':'djenne-artists','hipomenes-y-atlanta':'guido-reni','hombre-en-la-encrucijada':'diego-rivera','homenaje-al-cuadrado':'josef-albers','hot-spot':'mona-hatoum','icono-de-cristo-pantocrator':'','infinity-mirrored-room':'yayoi-kusama','inmaculada-de-soult':'bartolome-esteban-murillo','insertion-into-circuit':'cildo-meireles'}[s]}
function yearFor(s){return {'flagelacion-de-cristo':1455,'gran-mezquita-de-djenne':1907,'hipomenes-y-atlanta':1618,'hombre-en-la-encrucijada':1934,'homenaje-al-cuadrado':1950,'hot-spot':2006,'icono-de-cristo-pantocrator':1100,'infinity-mirrored-room':1965,'inmaculada-de-soult':1678,'insertion-into-circuit':1970}[s]}
function summaryTail(s){return {'flagelacion-de-cristo':'The religious scene is organised with geometric stillness, making space and waiting part of the experience.','gran-mezquita-de-djenne':'The mosque shows how architecture can unite material, communal use, heritage, and public space.','hipomenes-y-atlanta':'The mythological episode condenses pursuit, speed, and fate into a composition of moving bodies.','hombre-en-la-encrucijada':'The mural turns a figure placed between paths into an image about labour, conflict, and historical choices.','homenaje-al-cuadrado':'The superimposition of squares makes colour appear to advance or recede through the relation between surfaces.','hot-spot':'The map turned into an incandescent surface connects territory, political tension, and vulnerability.','icono-de-cristo-pantocrator':'The frontal image of Christ organises the gaze through symmetry, solemnity, and spiritual authority.','infinity-mirrored-room':'Mirrors multiply lights and reflections until the visitor’s perception becomes part of the installation.','inmaculada-de-soult':'The Virgin rises in a luminous composition joining devotion, elegance, and Baroque theatricality.','insertion-into-circuit':'The work inserts political messages into everyday circulation and moves art toward social circuits.'}[s]}
console.log('English labels corrected for Batch 013.');
