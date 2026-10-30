#!/usr/bin/env node
// DUDUQ English media-closure inventory. Read-only: never deploys or alters questions.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.resolve(process.argv[2] || 'dist-pages');
const out=process.argv.find(x=>x.startsWith('--output='))?.slice(9) || 'qa/results/media-closure-inventory.json';
const requireComplete=process.argv.includes('--require-complete');
const get=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const inside=p=>typeof p==='string' && p && !p.startsWith('/') && !p.includes('\\') && p.split('/').every(x=>x && x!=='.' && x!=='..');
const registry=await get('content/english/media/media-registry.json');
if(!Array.isArray(registry.entries))throw Error('INVALID_REGISTRY');
const index=new Map();
for(const e of registry.entries){if(!e.mediaId || index.has(e.mediaId))throw Error('DUPLICATE_MEDIA_ID:'+e.mediaId);index.set(e.mediaId,e);}
const references=new Map();
function scan(node,qid,moduleId,field='item'){
 if(!node || typeof node!=='object')return;
 for(const [k,v] of Object.entries(node)){
  if(['assetId','mediaId','image_ref','imageRef'].includes(k) && typeof v==='string' && (index.has(v) || v.startsWith('IMG-') || /-EMOJI-/.test(v))){
   if(!references.has(v))references.set(v,{id:v,items:new Set(),modules:new Set(),examples:[]});
   const r=references.get(v);r.items.add(qid);r.modules.add(moduleId);
   if(r.examples.length<4)r.examples.push({question:qid,field:field+'.'+k,semantic:node.semanticTarget||node.answerKey||node.label||null});
  }else if(v && typeof v==='object')scan(v,qid,moduleId,field+'.'+k);
 }
}
let modules=0,activities=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),moduleId='Y'+y+'M'+mm;
 const data=await get('content/english/year-'+y+'/module-'+mm+'/questions.json');
 if(data.moduleId!==moduleId || data.items?.length!==20)throw Error('INVALID_MODULE:'+moduleId);
 const qids=new Set();
 for(const q of data.items){
  if(!q.item_id?.startsWith(moduleId+'-')||qids.has(q.item_id))throw Error('INVALID_QUESTION:'+moduleId);
  qids.add(q.item_id);activities++;scan(q,q.item_id,moduleId);
 }
 modules++;
}
const tempPath=/(?:^|\/)(?:temporary|provisional[^/]*|placeholder[^/]*|generated-inbox|draft[^/]*)(?:\/|$)/i;
const pending=/PENDING|PROVISIONAL|TEMPORARY|PLACEHOLDER|REPLACE_LATER/i;
const evidenceCache=new Map();
async function officialEvidence(entry,mediaId,modules){
 const verification=entry?.verification,pathRel=verification?.evidencePath;
 if(entry?.temporary!==false||entry?.status!=='APPROVED'||entry?.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH'||
    entry?.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED'||verification?.schemaVersion!=='DUDUQ_MEDIA_OFFICIAL_QA_V1'||
    !inside(pathRel)||!/^content\/english\/media\/qa-evidence\/[A-Za-z0-9_.\/-]+\.json$/.test(pathRel)||
    !/^[a-f0-9]{64}$/.test(verification?.evidenceSha256||''))return {pass:false,reason:'OFFICIAL_METADATA_INCOMPLETE'};
 try{
  if(!evidenceCache.has(pathRel)){
   const bytes=await readFile(path.join(root,pathRel)),actual=createHash('sha256').update(bytes).digest('hex');
   evidenceCache.set(pathRel,{bytes,actual,json:JSON.parse(bytes.toString('utf8'))});
  }
  const cached=evidenceCache.get(pathRel),proof=cached.json;
  if(cached.actual!==verification.evidenceSha256||proof.schemaVersion!=='DUDUQ_MEDIA_OFFICIAL_QA_V1'||proof.status!=='PASS'||
     proof.pedagogicalQaApproved!==true||proof.visualQaApproved!==true||proof.browserQaApproved!==true||
     proof.browserQa?.status!=='PASS'||proof.semanticQa?.status!=='PASS'||proof.buildQa?.status!=='PASS'||
     !proof.mediaIds?.includes(mediaId)||modules.some(moduleId=>moduleId!==proof.moduleId)||
     !proof.assets?.some(asset=>asset.sha256===entry.sha256))return {pass:false,reason:'OFFICIAL_EVIDENCE_STALE_OR_INCOMPLETE'};
  for(const asset of entry.assets||[]){const bytes=await readFile(path.join(root,asset.path));
   if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256||asset.sha256!==entry.sha256)return {pass:false,reason:'OFFICIAL_ASSET_HASH_MISMATCH'};}
  return {pass:true,evidencePath:pathRel,evidenceSha256:cached.actual,reviewAuthority:proof.reviewAuthority};
 }catch(error){return {pass:false,reason:'OFFICIAL_EVIDENCE_UNREADABLE:'+String(error?.code||error?.message||error)};}
}
const listed=[];
for(const ref of references.values()){
 const e=index.get(ref.id), p=e?.assets?.map(a=>a.path).filter(Boolean)||[];
 if(!p.length && e?.urlOrPath)p.push(e.urlOrPath);
 const states=[e?.integrationStatus,e?.refinementStatus,e?.backlogStatus,e?.humanReview].filter(Boolean).join('|');
 const flagged=e?.temporary===true || p.some(x=>tempPath.test(x)) || pending.test(states);
 const badPaths=[];
 if(e)for(const asset of e.assets||[]){
  if(!inside(asset.path)){badPaths.push('UNSAFE:'+asset.path);continue;}
  try{const info=await stat(path.join(root,asset.path));if(!info.isFile()||!info.size)badPaths.push('EMPTY:'+asset.path);}
  catch{badPaths.push('MISSING:'+asset.path);}
 }
 const verification=await officialEvidence(e,ref.id,[...ref.modules]);
 let category=!e?'MISSING_REGISTRY':badPaths.length?'BROKEN_ASSET':e.status!=='APPROVED'?'NOT_APPROVED':
   flagged?'PROVISIONAL':e.temporary!==false?'REVIEW_REQUIRED':verification.pass?'OFFICIAL_PEDAGOGICALLY_VERIFIED':'NON_TEMPORARY_UNVERIFIED';
 listed.push({mediaId:ref.id,status:category,questions:[...ref.items].sort(),modules:[...ref.modules].sort(),usage:ref.items.size,semantic:e?.semantic||e?.altText||ref.examples.find(x=>x.semantic)?.semantic||ref.id.replace(/^IMG-(?:Y\dM\d\d-)?Q\d{3}-/,'').replaceAll('-',' ').toLowerCase(),temporary:e?.temporary??null,path:e?.urlOrPath||p[0]||null,badPaths,verification,evidence:ref.examples});
}
// Both provisional/broken references and apparently non-temporary but unverified
// references block closure. Never equate absence of placeholders with QA approval.
const incomplete=listed.filter(x=>!['NON_TEMPORARY_UNVERIFIED','OFFICIAL_PEDAGOGICALLY_VERIFIED'].includes(x.status));
const unverified=listed.filter(x=>x.status==='NON_TEMPORARY_UNVERIFIED');
const closureBlockers=[...incomplete,...unverified];
const groups=new Map();
for(const x of incomplete){
 const k=(x.modules[0]?.slice(0,2)||'SHARED')+'|'+String(x.semantic||'').trim().toLowerCase();
 if(!groups.has(k))groups.set(k,{concept:String(x.semantic||'').trim(),scope:x.modules[0]?.slice(0,2)||'SHARED',mediaIds:[],questions:0});
 const g=groups.get(k);g.mediaIds.push(x.mediaId);g.questions+=x.usage;
}
const queue=[...groups.values()].sort((a,b)=>b.questions-a.questions||a.concept.localeCompare(b.concept));
const byStatus={};for(const x of listed)byStatus[x.status]=(byStatus[x.status]||0)+1;
const report={schemaVersion:'DUDUQ_MEDIA_COMPLETION_V1',generatedAt:new Date().toISOString(),modules,activities,registryEntries:index.size,referencedMediaIds:listed.length,byStatus,incompleteReferencedIds:closureBlockers.length,provisionalOrBlockedReferencedIds:incomplete.length,nonTemporaryUnverifiedReferencedIds:unverified.length,metadataClosurePassed:closureBlockers.length===0&&modules===30&&activities===600, finalPedagogicalQaApproved:false,finalCompletionPassed:false,queue,items:listed.sort((a,b)=>a.mediaId.localeCompare(b.mediaId))};
await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({modules,activities,registryEntries:index.size,referencedIds:listed.length,byStatus,incomplete:closureBlockers.length,provisionalOrBlocked:incomplete.length,nonTemporaryUnverified:unverified.length,queueGroups:queue.length,metadataClosurePassed:report.metadataClosurePassed,finalPedagogicalQaApproved:report.finalPedagogicalQaApproved,report:out}));
if(requireComplete&&!report.finalCompletionPassed)process.exitCode=2;
