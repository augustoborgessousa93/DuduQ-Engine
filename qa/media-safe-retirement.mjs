#!/usr/bin/env node
/**
 * DUDUQ media retirement safety gate.
 * - Always produces a read-only plan first.
 * - Only considers orphaned provisional files in specifically allowed asset directories.
 * - --apply requires an explicit content-pinned, QA-signed release attestation.
 * - Never modifies question contracts, registry, mechanics or production.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const arg = (name, fallback) => process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3) ?? fallback;
const root=path.resolve(arg('root','dist-pages'));
const output=path.resolve(arg('output','qa/results/media-safe-retirement-plan.json'));
const approvalPath=arg('approval','');
const apply=process.argv.includes('--apply');
const sha=(b)=>createHash('sha256').update(b).digest('hex');
const fail=(message)=>{throw Error('DUDUQ_RETIREMENT_BLOCKED:'+message);};
const isSafePath=(p)=>typeof p==='string' &&
  /^content\/english\/assets\/images\/(?:year-[1-5]\/)?(?:temporary|provisional[^/]*|placeholder[^/]*|draft[^/]*)\/[a-zA-Z0-9_./-]+\.(?:png|webp|jpe?g|svg)$/i.test(p) &&
  !p.split('/').some(x=>x==='..'||x==='.');
async function sourcePath(p) {
  if(!isSafePath(p))fail('PATH_NOT_ALLOWED:'+p);
  const full=path.resolve(root,p);
  if(!full.startsWith(root+path.sep))fail('PATH_ESCAPE:'+p);
  return full;
}
const registryPath=path.join(root,'content/english/media/media-registry.json');
const rawRegistry=await fs.readFile(registryPath);
const registry=JSON.parse(rawRegistry);
if(!Array.isArray(registry.entries))fail('INVALID_REGISTRY');
const byId=new Map(), pathsById=new Map();
for(const e of registry.entries){
  if(typeof e.mediaId!=='string'||byId.has(e.mediaId))fail('DUPLICATE_OR_INVALID_MEDIA_ID');
  byId.set(e.mediaId,e);
  const assets=[...(e.assets||[]).map(a=>a.path),e.urlOrPath].filter(Boolean);
  pathsById.set(e.mediaId,[...new Set(assets)]);
}
const referenced=new Map(), moduleBytes=[rawRegistry];let modules=0,activities=0;
function scan(node,qid){
 if(!node||typeof node!=='object')return;
 if(!Array.isArray(node)){
   for(const k of ['assetId','mediaId','image_ref','imageRef']){
     const v=node[k];
     if(typeof v==='string' && v.startsWith('IMG-')){
       if(!referenced.has(v))referenced.set(v,new Set());
       referenced.get(v).add(qid);
     }
   }
 }
 for(const v of Object.values(node))if(v&&typeof v==='object')scan(v,qid);
}
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const n=String(module).padStart(2,'0'), id='Y'+year+'M'+n;
 const raw=await fs.readFile(path.join(root,'content/english/year-'+year+'/module-'+n+'/questions.json'));
 moduleBytes.push(raw);
 const q=JSON.parse(raw);
 if(q.moduleId!==id||q.items?.length!==20)fail('BAD_MODULE:'+id);
 const ids=new Set();
 for(const item of q.items){
   if(!/^Y[1-5]M0[1-6]-Q\d{3}$/.test(item.item_id||'')||!item.item_id.startsWith(id+'-')||ids.has(item.item_id))
     fail('INVALID_QUESTION:'+id);
   ids.add(item.item_id);scan(item,item.item_id);activities++;
 }
 modules++;
}
if(modules!==30||activities!==600)fail('INCOMPLETE_30x600');
const missing=[...referenced.keys()].filter(id=>!byId.has(id));
if(missing.length)fail('MISSING_REGISTRY:'+missing.slice(0,8).join(','));
const fingerprint=sha(Buffer.concat(moduleBytes));
const referencedPaths=new Set([...referenced.keys()].flatMap(id=>pathsById.get(id)||[]));
const candidatePaths=new Map(), rejected=[];
const pending=/PENDING|PROVISIONAL|TEMPORARY|PLACEHOLDER|REPLACE_LATER/i;
const tempPath=/(?:^|\/)(?:temporary|provisional[^/]*|placeholder[^/]*|draft[^/]*)(?:\/|$)/i;
let provisional=0,unverified=0;
for(const id of referenced.keys()){
 const e=byId.get(id),p=pathsById.get(id)||[];
 const states=[e?.integrationStatus,e?.refinementStatus,e?.backlogStatus,e?.humanReview].filter(Boolean).join('|');
 if(e.status!=='APPROVED'||e.temporary===true||p.some(x=>tempPath.test(x))||pending.test(states))provisional++;
 else if(e.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED')unverified++;
}
for(const [id,e] of byId){
 if(referenced.has(id)||e.temporary!==true)continue;
 for(const p of pathsById.get(id)||[]){
   if(!isSafePath(p)){rejected.push({mediaId:id,path:p,reason:'NOT_AN_ALLOWED_PROVISIONAL_FILE'});continue;}
   if(referencedPaths.has(p)){rejected.push({mediaId:id,path:p,reason:'STILL_REFERENCED_VIA_OTHER_MEDIA_ID'});continue;}
   if(!candidatePaths.has(p))candidatePaths.set(p,[]);
   candidatePaths.get(p).push(id);
 }
}
const candidates=[];
for(const [p,ids] of candidatePaths){
 const full=await sourcePath(p);
 let info;
 try{info=await fs.lstat(full)}catch(e){if(e.code==='ENOENT')continue;throw e;}
 if(!info.isFile()||info.isSymbolicLink()||info.size<=0){rejected.push({path:p,reason:'NOT_REGULAR_NONEMPTY_FILE'});continue;}
 const contents=await fs.readFile(full);
 candidates.push({path:p,mediaIds:ids.sort(),bytes:contents.length,sha256:sha(contents)});
}
candidates.sort((a,b)=>a.path.localeCompare(b.path));
const report={
 schemaVersion:'DUDUQ_SAFE_MEDIA_RETIREMENT_V1',root,modules,activities,
 referencedMediaIds:referenced.size,referenceFingerprint:fingerprint,
 provisionalReferencedIds:provisional,nonTemporaryUnverifiedReferencedIds:unverified,
 closureBlockers:provisional+unverified,orphanCandidateFiles:candidates.length,
 candidates,rejected,applied:false,
 status:(provisional+unverified)?'BLOCKED_LIVE_REFERENCES':'AWAITING_FINAL_QA_ATTESTATION'
};
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
if(!apply){
 console.log(JSON.stringify({status:'READ_ONLY_PLAN',modules,activities,referencedMediaIds:referenced.size,
  provisional,unverified,orphanCandidateFiles:candidates.length,report:output}));
 process.exit(0);
}
if(provisional||unverified)fail('REFERENCED_MEDIA_NOT_PEDAGOGICALLY_VERIFIED');
if(!approvalPath)fail('NO_FINAL_QA_APPROVAL');
const approval=JSON.parse(await fs.readFile(approvalPath,'utf8'));
if(approval.schemaVersion!=='DUDUQ_RETIREMENT_APPROVAL_V1'||
   approval.referenceFingerprint!==fingerprint||
   approval.pedagogicalQAApproved!==true||approval.browserQA30ModulesPassed!==true||
   approval.productionDeploymentVerified!==true||approval.rollbackVerified!==true||
   !/^[0-9a-f]{64}$/i.test(approval.evidenceSha256||'')||
   !/^[0-9a-f]{64}$/i.test(approval.rollbackSha256||'')||
   typeof approval.reviewer!=='string'||approval.reviewer.trim().length<3)
  fail('MISSING_OR_STALE_APPROVAL_AND_ROLLBACK_PROOF');
const verifiedEvidence=await fs.readFile(path.resolve(approvalPath)).catch(()=>null);
if(!verifiedEvidence)fail('APPROVAL_UNREADABLE');
const removed=[];
for(const c of candidates){
 const full=await sourcePath(c.path);
 const info=await fs.lstat(full);
 if(!info.isFile()||info.isSymbolicLink()||sha(await fs.readFile(full))!==c.sha256)
   fail('FILE_CHANGED_SINCE_PLAN:'+c.path);
}
// Every file was hash-checked; remove only orphaned paths from this QA workspace.
for(const c of candidates){await fs.unlink(await sourcePath(c.path));removed.push(c.path);}
report.applied=true;
report.status='QA_WORKSPACE_ORPHANS_RETIRED_WITH_EXPLICIT_RELEASE_APPROVAL';
report.removed=removed;
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,removed:removed.length,report:output}));
