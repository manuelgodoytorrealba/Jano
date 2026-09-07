const fs=require('node:fs'); const crypto=require('node:crypto'); const {PrismaClient}=require('@prisma/client'); const {PrismaPg}=require('@prisma/adapter-pg'); const {Pool}=require('pg');
const root=process.env.WAVE_ROOT||'/home/manuel/Desarrollos/Jano', projectId='cmtoojmz10000k9ss84uo6gl9', batch='W002-B02', actorId='55e0f530-5458-4067-8389-daad2a567b8b';
const review=JSON.parse(fs.readFileSync(`${root}/artifacts/feed-wave-002-review-summary.json`));
const b02=JSON.parse(fs.readFileSync(`${root}/artifacts/feed-wave-002-b02.json`));
const wanted={
'E003':['DEFER','Current evidence is rhetorical/contextual and does not document the concept with sufficient centered identity.'],
'E004':['REJECT','Generic descriptive phrase. Do not create a canonical node.'],
'E010':['APPROVE_NEW_ENTITY','Organization explicitly and independently identifiable; keep distinct from historical Black Mountain College. Final duplicate/alias check before later apply.'],
'E011':['APPROVE_NEW_ENTITY','Source explicitly identifies THINKING AHEAD as an exhibition. Preserve EVENT scope. Final duplicate/alias check before canonical apply.'],
'E015':['APPROVE_NEW_ENTITY','Identity is explicit and unambiguous. Do not infer additional biographical facts. Final duplicate/alias check before canonical apply.'],
'E020':['DEFER','Exact object/artwork identity is not unambiguous. Do not invent an artwork title.'],
'E021':['DEFER','Incidental mention does not establish independent node identity/type.'],
'E022':['DEFER','Support establishes Allora & Calzadilla but not complete individual identity. Do not infer missing identity.'],
'E023':['DEFER','Support establishes the collaborative name but not complete individual identity. Do not infer missing identity.'],
'E024':['APPROVE_NEW_ENTITY','Documentary identity is explicit and strong. Final duplicate/alias check before canonical apply.'],
'E026':['REJECT','Generic descriptive phrase rather than an independently identifiable cultural entity.'],
'E028':['APPROVE_NEW_ENTITY','Source explicitly identifies Six Years as a released text/publication. Preserve only supported identity; no invented edition metadata. Final duplicate/alias check before canonical apply.'],
'E029':['APPROVE_NEW_ENTITY','Historical event identity and dates are explicit. Final duplicate/alias check before canonical apply.'],
'R001':['ASSERTION_INSTEAD','LOCATED_IN is invalid. Preserve the supported proposition that Mario García Torres’s works often engage with or explore the history of Conceptual art.'],
'R003':['ASSERTION_INSTEAD','Evidence supports LeWitt as a pioneering voice in development of Conceptual Art, not merely movement membership.'],
'R006':['RESOLVE_AS_SEMANTIC_DUPLICATE','Same underlying semantic proposition as W002-R001 relation-derived assertion candidate; create neither relation nor duplicate assertion.'],
'R011':['REJECT_RELATION_MAPPING','Cubismo is MOVEMENT, not PERIOD; hard semantic/type violation.'],
'R012':['REJECT_RELATION_EVIDENCE','Page context is insufficient to assert canonical movement membership; do not infer from co-occurrence.'],
'R021':['ASSERTION_INSTEAD','Black Mountain College is not a PERIOD; preserve Albers’s central role proposition as private assertion candidate.'],
'R022':['ASSERTION_INSTEAD','Invalid predicate; preserve the supported Bauhaus-to-Black Mountain College proposition as private assertion candidate.'],
'R025':['ASSERTION_INSTEAD','Evidence supports hiring/role, not period membership; preserve atomic assertion that the college hired Albers as first art teacher.']};
const rawRelations={'R001':'cmtookvhc000gk9ssi67du98x','R003':'cmtoonmco001zk9sscv3a056l','R006':'cmtootwih003wk9sslgyrh6uk','R011':'cmtopalyf009uk9ssn2r1ehec','R012':'cmtopalyh009vk9ss0zz9rl3h','R021':'cmtoppvse00htk9ss5uepe0ja','R022':'cmtoppvsg00huk9ssudhaxd73','R025':'cmtopsvqf00jgk9ssn24yur4v'};
const fail=m=>{throw Error(m)};
(async()=>{const pool=new Pool({connectionString:process.env.DATABASE_URL});const db=new PrismaClient({adapter:new PrismaPg(pool)});try{
 const before={entities:await db.entity.count(),relations:await db.relation.count(),assertions:await db.canonicalAssertion.count()};
 if(JSON.stringify(before)!==JSON.stringify({entities:813,relations:1388,assertions:24})) fail('Unexpected canonical baseline '+JSON.stringify(before));
 const props=await db.researchFindingProposal.findMany({where:{projectId},select:{id:true,type:true}}); if(props.length!==97) fail('Unexpected proposal total '+props.length);
 const existing=await db.researchProposalDecision.findMany({where:{proposal:{projectId}},select:{payload:true}}); const existingIds=new Set(existing.map(x=>x.payload?.reviewId)); if(existing.length!==20) fail('Expected B01 only, found '+existing.length); for(const id of Object.keys(wanted)) if(existingIds.has('W002-'+id)) fail('Already persisted '+id);
 const admin=await db.user.findUnique({where:{id:actorId},select:{id:true,email:true,role:true,accountStatus:true,name:true}}); if(!admin||admin.role!=='ADMIN'||admin.accountStatus!=='ACTIVE') fail('Reviewer unavailable');
 const summaryItems=new Map(review.batches.flatMap(b=>b.items).map(x=>[x.id,x])); const artifactItems=new Map(b02.items.map(x=>[x.id,x]));
 const rows=[]; for(const [short,[action,reason]] of Object.entries(wanted)){const rid='W002-'+short; const item=summaryItems.get(rid)||artifactItems.get(rid); let proposalIds=item?.rawProposalIds||[]; if(!proposalIds.length&&rawRelations[short]) proposalIds=[rawRelations[short]]; if(!proposalIds.length) fail('Missing lineage '+rid); if(!proposalIds.every(id=>props.some(p=>p.id===id))) fail('Unknown lineage '+rid); const source=item?.supports?.[0]||item?.source||artifactItems.get(rid)?.source||null; const payload={wave:'002',batch,reviewId:rid,proposalIds,humanReason:reason,reviewerContract:'authenticated-admin',decisionScope:action.includes('RELATION')||action==='ASSERTION_INSTEAD'||action==='RESOLVE_AS_SEMANTIC_DUPLICATE'?'RELATION_MAPPING_REVIEW': 'ENTITY_IDENTITY', sourceLineage:source?{source:source.source||source.url,url:source.url,evidenceId:source.evidenceId,exactEvidence:source.exactEvidence||source.exactSupport}:null, privateAssertionCandidate:action==='ASSERTION_INSTEAD', canonicalApplyRequired:true}; if(action==='APPROVE_NEW_ENTITY') Object.assign(payload,{proposedType:artifactItems.get(rid)?.type||item?.proposedType||null,finalDuplicateCheckRequired:true}); const id=crypto.createHash('sha256').update(`${projectId}:${batch}:${rid}`).digest('hex').slice(0,24); await db.researchProposalDecision.create({data:{id,proposalId:proposalIds[0],action,actorId,payload}}); rows.push({reviewId:rid,proposalId:proposalIds[0],proposalIds,action,reason}); }
 const after={entities:await db.entity.count(),relations:await db.relation.count(),assertions:await db.canonicalAssertion.count()}; if(JSON.stringify(before)!==JSON.stringify(after)) fail('Canonical counts changed'); const all=await db.researchProposalDecision.findMany({where:{proposal:{projectId}},select:{payload:true,action:true}}); if(all.length!==41||new Set(all.map(x=>x.payload?.reviewId)).size!==41) fail('Decision verification failed');
 const out={projectId,batch,reviewer:admin,decisionsRequested:21,decisionsPersisted:21,duplicateDecisions:0,blockedDecisions:0,decisions:rows,before,after,safety:{canonicalEntityCreates:0,canonicalRelationCreates:0,canonicalAssertionCreates:0,proposalsConverted:0,autoPromotion:0,canonicalCountsUnchanged:true}}; fs.writeFileSync(`${root}/artifacts/feed-wave-002-b02-persistence.json`,JSON.stringify(out,null,2)+'\n'); console.log(JSON.stringify({before,after,totalDecisions:all.length,rows:rows.length}));
}finally{await db.$disconnect();await pool.end()}})().catch(e=>{console.error(e);process.exitCode=1});
