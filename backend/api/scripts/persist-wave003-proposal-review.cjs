const fs=require('node:fs');
const {PrismaService}=require('../src/prisma/prisma.service');
const {ResearchService}=require('../src/research/research.service');
const projectId='cmtpuhs8o0000uwsscb5k3u69';
const reviewerId='55e0f530-5458-4067-8389-daad2a567b8b';
const items=[
 ['W003-B01-020','cmtrfzh8f0002ggss3l8fbimr','Edificio Bauhaus de Dessau','After the Bauhaus moved from Weimar to Dessau, an opportunity arose to build a new school building expressing Bauhaus ideas architecturally.'],
 ['W003-B01-024','cmtrfzh8l0005ggssxy59x3dq','Romanticismo','By the early nineteenth century, Romanticism was used for an art and literature movement focused on psychology, personal feeling and the natural world.'],
 ['W003-B01-028','cmtrfzh8o0008ggssj8967dxg','Detrás de la estación Saint-Lazare','Behind the Gare Saint-Lazare, Paris is by Henri Cartier-Bresson and was created in 1932.'],
 ['W003-B01-030','cmtrfzh8q000bggssmtkw478h','Divisor','The Source characterizes Divisor, dated 1968, as an emblematic work in Lygia Pape\'s practice.'],
 ['W003-B01-032','cmtrfzh8s000eggsst7avyesy','Faces and Phases','The Walther Collection presents Faces and Phases by Zanele Muholi, dated 2007–2013, as 15 gelatin-silver prints.'],
];
(async()=>{const db=new PrismaService(); try{
 const counts=async()=>({entities:await db.entity.count(),relations:await db.relation.count(),assertions:await db.canonicalAssertion.count(),sourceRefs:await db.sourceRef.count(),citations:await db.citation.count()});
 const before=await counts();
 const mig=await db.$queryRawUnsafe(`select count(*)::int as n from "_prisma_migrations" where migration_name='20260907120000_evidence_review_decisions'`);
 const project=await db.researchProject.findUnique({where:{id:projectId},select:{id:true}});
 const proposals=await db.researchFindingProposal.findMany({where:{id:{in:items.map(x=>x[1])},projectId},select:{id:true,proposalKey:true,title:true,type:true,reviewState:true,evidence:{select:{evidenceId:true}}}});
 const decisions=await db.researchEvidenceDecision.findMany({where:{projectId,logicalReviewId:{in:items.map(x=>x[0])}},select:{logicalReviewId:true,decision:true,id:true,evidenceId:true,payload:true}});
 const guard={before,migration: Number(mig[0].n)>0,project:!!project,proposals:proposals.length,evidenceDecisions:decisions.length};
 if(before.entities!==824||before.relations!==1388||before.assertions!==40||before.sourceRefs!==866||before.citations!==1427||!guard.migration||!guard.project||proposals.length!==5||decisions.length!==5) throw Error('DATABASE_GUARD_FAIL '+JSON.stringify(guard));
 const svc=new ResearchService(db,null,null,null,null);
 const run=async()=>{const out=[]; for(const [logical,id,title,prop] of items){out.push(await svc.recordProposalReviewDecision(projectId,id,reviewerId,logical,(decisions.find(d=>d.logicalReviewId===logical)||{}).id||'',prop));} return out;};
 const first=await run(); const second=await run(); const after=await counts();
 const decisionRows=await db.researchProposalDecision.findMany({where:{proposalId:{in:items.map(x=>x[1])}},orderBy:{createdAt:'asc'},select:{id:true,proposalId:true,action:true,actorId:true,payload:true}});
 if(first.filter(x=>x.created).length>5||second.some(x=>x.created)||decisionRows.length!==5) throw Error('IDEMPOTENCY_FAIL');
 if(JSON.stringify(before)!==JSON.stringify(after)) throw Error('CANONICAL_MUTATION');
 const artifact={projectId,wave:'003',attempt:'RETRY_01',operation:'PROPOSAL_REVIEW_DECISIONS',reviewerId,requested:5,persisted:decisionRows.length,newlyCreated:first.filter(x=>x.created).length,approved:5,blocked:0,duplicates:0,secondRunCreates:second.filter(x=>x.created).length,idempotency:'PASS',guard,proposals:items.map(([logical,id,title,proposition])=>({logicalReviewId:logical,proposalId:id,target:title,decision:'APPROVE_CLAIM',approvedProposition:proposition,decisionId:decisionRows.find(d=>d.proposalId===id)?.id})),before,after,canonicalMutations:0};
 fs.writeFileSync('/app/artifacts/feed-wave-003-proposal-review-decision-result.json',JSON.stringify(artifact,null,2)); console.log(JSON.stringify({guard,firstCreated:first.filter(x=>x.created).length,secondCreated:second.filter(x=>x.created).length,decisionRows:decisionRows.length,before,after}));
 } finally {await db.onModuleDestroy();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
