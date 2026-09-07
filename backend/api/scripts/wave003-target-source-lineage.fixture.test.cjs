const assert=require('node:assert/strict');
const pairKey=(source,target,version)=>`${source}:${target}:${version}`;
function recover(source,version){return [...new Map((source.refs||[]).map(r=>[r.entityId,{sourceId:source.id,targetEntityId:r.entityId,version}])).values()];}
const a=recover({id:'source-x',refs:[{entityId:'target-a'}]},'v1');assert.deepEqual(a,[{sourceId:'source-x',targetEntityId:'target-a',version:'v1'}]);
const multi=recover({id:'source-x',refs:[{entityId:'target-a'},{entityId:'target-b'},{entityId:'target-a'}]},'v1');assert.equal(multi.length,2);assert(!multi.some(x=>x.targetEntityId==='unrelated'));
assert.equal(recover({id:'source-y',refs:[]},'v1').length,0);
const seen=new Set([pairKey('source-x','target-a','v1')]);assert.equal(multi.filter(x=>!seen.has(pairKey(x.sourceId,x.targetEntityId,x.version))).length,1);
console.log('wave003 target-source lineage fixture: PASS');
