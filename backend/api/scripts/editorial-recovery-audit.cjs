// Conservative inventory: unmatched sentences never pass a semantic gate.
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const base='artifacts/editorial-recovery/';
const data=JSON.parse(fs.readFileSync(base+'public-snapshot.json'));
const extra=JSON.parse(fs.readFileSync(base+'public-extra.json'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const meta=/\bJANO\b|la ficha|el registro|the record|la fuente caracteriza|with the knowledge available|con el conocimiento disponible|biograf[ií]a no documentada|undocumented biography|se han contrastado|this wording remains|la descripción se mantiene|relaciones de lectura|reading relations/i;
const generic=/estas conexiones|these connections|la relación importa|the relationship matters|la importancia de (?:esta|la) relación|la obra importa porque|the work matters because|el interés de (?:esta|la) conexión/i;
const known=['bronces-de-benin','agnes-martin','alberto-giacometti'];
const rows=data.entities.map(e=>{
 const claims=[];
 const add=(type,proposition,origin,use,qualifiers=null,attribution=null)=>claims.push({claim_id:hash([e.id,type,origin,proposition]),target_entity:e.id,claim_type:type,proposition,provenance:origin,qualifiers,attribution,certainty:'Preserve source wording; no inferred precision',allowed_editorial_use:use});
 for(const a of e.assertions||[])add('CANONICAL_ASSERTION',a.proposition,{table:'CanonicalAssertion',id:a.id,refs:(extra.assertionRefs||[]).filter(x=>x.assertionId===a.id)},'Qualified paraphrase only; resolve conflicts before use',a.qualifiers);
 for(const r of e.refs||[])add(r.quote?'PUBLIC_SOURCE_QUOTE':'BIBLIOGRAPHIC_REFERENCE',r.quote||r.source.title,{table:'SourceRef',id:r.id,source:r.source,locator:r.page},r.quote?'Only propositions entailed by this passage':'Reference only; unread URL does not support prose',null,r.source.author||r.source.title);
 for(const [table,obj] of [['ArtistDetails',e.artist],['ArtworkDetails',e.artwork],['ConceptDetails',(extra.concepts||[]).find(x=>x.entityId===e.id)],['PeriodDetails',(extra.periods||[]).find(x=>x.entityId===e.id)]])for(const [field,value] of Object.entries(obj||{}))if(value!=null&&field!=='entityId')add('STRUCTURED_FACT',`${field}: ${value}`,{table,entityId:e.id,field},meta.test(String(value))?'BLOCKED: contaminated editorial text':'Exact field semantics only; no inferred dates, causes, intentions');
 for(const field of ['startYear','endYear'])if(e[field]!=null)add('UNQUALIFIED_CHRONOLOGY',String(e[field]),{table:'Entity',id:e.id,field},'NO event-date prose without explicit semantics or public corroboration');
 for(const a of extra.attributes||[])if(a.attribute.entityId===e.id)add('TYPED_ATTRIBUTE',JSON.stringify(a.attribute),{table:'EntityAttribute',id:a.attribute.id,definition:a.definition},'Use declared definition and preserve confidence/validity only');
 const relations=(e.relations||[]).map(r=>{
  const quotes=(r.citations||[]).filter(c=>c.quote&&c.stance==='SUPPORTS');
  const decision=quotes.length?'BLOCKED_PENDING_SEMANTIC_REVIEW':'RELATION_NAVIGATIONAL_ONLY';
  add('RELATION',r.justification||r.key,{table:'Relation',id:r.id,fromId:r.fromId,toId:r.toId,citations:r.citations},decision==='RELATION_NAVIGATIONAL_ONLY'?'Navigation only; mechanical justification or MENTIONS is not historical support':'Review quotation entailment before use',{confidence:r.confidence,from:r.validFromYear,to:r.validToYear});
  return {id:r.id,classification:decision,reason:quotes.length?'A support quote exists; semantic relevance still needs approval':'No substantive SUPPORTS quotation; no strong interpretation authorized'};
 });
 const defects=[];
 const fields={SUMMARY_ES:e.summary,ESSAY_ES:e.content,SUMMARY_EN:e.summary_en,ESSAY_EN:e.essay_en};
 const sentences=[];
 for(const [field,text] of Object.entries(fields)){
  for(const paragraph of text.split(/\n\s*\n/).filter(x=>x.trim()&&!x.startsWith('#'))){
   const id=hash([e.id,field,paragraph]);
   sentences.push({id,field,text:paragraph,claim_mapping:[],status:'BLOCKED_PENDING_ENTAILMENT_REVIEW'});
   if(meta.test(paragraph))defects.push({category:'META_JANO',field,text:paragraph,reason:'Explicit system, record or editorial-process wording'});
   if(generic.test(paragraph))defects.push({category:'GENERIC_FILLER',field,text:paragraph,reason:'Mechanical explanation of a relation rather than the subject'});
  }
  for(const m of text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)){
   const target=data.catalog.find(x=>x.slug===m[1]);
   if(!target||target.status!=='PUBLISHED'||target.id===e.id)defects.push({category:'RICH_TEXT_ERROR',field,text:m[0],reason:!target?'Missing target':target.id===e.id?'Self-link':'Unpublished target'});
  }
  if(/\\[nrt1]/.test(text))defects.push({category:'RICH_TEXT_ERROR',field,text,reason:'Literal escape'});
 }
 const chronology=[];
 for(const [field,text] of Object.entries(fields))for(const m of text.matchAll(/(?:naci[oó]|nacid[oa]|born|pintad[oa]|painted|construid[oa]|built|realizad[oa]|made|tallad[oa]|carved|cread[oa]|created)[^.\n]{0,100}?\b(\d{3,4})\b/gi)){
  const birth=/naci|born/i.test(m[0]);
  const direct=birth&&e.artist?.birthYear===Number(m[1]);
  chronology.push({field,text:m[0],value:Number(m[1]),classification:direct?'TYPED_BIRTH_YEAR':'REQUIRES_EVENT_SEMANTICS',origin:direct?'ArtistDetails.birthYear':null});
 }
 if(e.slug==='bronces-de-benin')defects.push({category:'CONTRADICTION',code:'CANONICAL_INPUT_CONFLICT',fields:['ArtworkDetails.technique','ArtworkDetails.materials'],text:'Xilografía / Papel; Bronces de Benín / Bronce',reason:'Conflicting identity/material inputs; exclude entire contested proposition, not select a winner'});
 // Exact coverage is not exact verification: unresolved entailment remains blocked.
 const classification=known.includes(e.slug)?(e.slug==='bronces-de-benin'?'BLOCKED':'INSUFFICIENT_GROUNDED_KNOWLEDGE'):defects.length?'NEEDS_REPAIR':'BLOCKED';
 return {entity_id:e.id,title:e.title,slug:e.slug,status:e.status,classification,reason:known.includes(e.slug)?'Known defect; available admissible knowledge cannot sustain a replacement essay without new claims':'Full semantic approval is outstanding; flags are evidence, not a quality score',defects,chronology,relations,PUBLIC_EDITORIAL_CLAIM_SET:claims,paragraph_review:sentences};
});
assert.equal(rows.length,138);assert.equal(new Set(rows.map(x=>x.entity_id)).size,138);
const count=key=>rows.filter(x=>x.classification===key).length;
const metrics={TOTAL_ENTITIES:data.total,PUBLISHED:data.published,BILINGUAL_FIELD_COVERAGE:rows.length,FIELD_COVERAGE_BACKLOG:data.total-rows.length,EDITORIAL_VERIFIED_BILINGUAL:count('VERIFIED_EDITORIAL'),NEEDS_REPAIR:count('NEEDS_REPAIR'),BLOCKED:count('BLOCKED'),INSUFFICIENT_GROUNDED_KNOWLEDGE:count('INSUFFICIENT_GROUNDED_KNOWLEDGE'),TRUE_EDITORIAL_BACKLOG:data.total-count('VERIFIED_EDITORIAL'),audit_complete:false,reason:'Inventory and deterministic checks complete; paragraph entailment review remains outstanding. Do not report as a completed semantic audit.'};
fs.writeFileSync(base+'audit.json',JSON.stringify({snapshot_sha256:hash(data),metrics,entities:rows},null,2)+'\n');
console.log(JSON.stringify(metrics,null,2));
