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
  /^content\/english\/assets\/images\/(?:year-[1-5]\/(?:module-0[1-6]\/)?)?(?:temporary|provisional[^/]*|placeholder[^/]*|draft[^/]*)\/[a-zA-Z0-9_./-]+\.(?:png|webp|jpe?g|svg)$/i.test(p) &&
  !p.split('/').some(x=>x==='..'||x==='.');
async function sourcePath(p) {
  if(!isSafePath(p))fail('PATH_NOT_ALLOWED:'+p);
  const full=path.resolve(root,p);
  if(!full.startsWith(root+path.sep))fail('PATH_ESCAPE:'+p);
  // lstat of the leaf alone does not detect a symlink in an ancestor directory.
  // Never follow an orphan candidate through a directory alias, even if the
  // final file looks regular. This also protects the backup/unlink paths.
  let directory=root;
  for(const component of p.split('/').slice(0,-1)){
    directory=path.join(directory,component);
    let info;
    try{info=await fs.lstat(directory)}
    catch(e){if(e.code==='ENOENT')break;throw e;}
    if(info.isSymbolicLink())fail('SYMLINK_DIRECTORY:'+p);
  }
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
     if(typeof v==='string' && (byId.has(v)||v.startsWith('IMG-')||/-EMOJI-/.test(v))){
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
 if(referenced.has(id))continue;
 for(const p of pathsById.get(id)||[]){
   if(!isSafePath(p)){rejected.push({mediaId:id,path:p,reason:'NOT_AN_ALLOWED_PROVISIONAL_FILE'});continue;}
   if(referencedPaths.has(p)){rejected.push({mediaId:id,path:p,reason:'STILL_REFERENCED_VIA_OTHER_MEDIA_ID'});continue;}
   if(!candidatePaths.has(p))candidatePaths.set(p,[]);
   candidatePaths.get(p).push(id);
 }
}
// The existing canonical audit remains authoritative, including legacy/emoji IDs.
// A disagreement blocks deletion rather than falsely reporting zero references.
const officialAuditPath=path.resolve(arg('official-audit','qa/results/media-closure-inventory.json'));
let officialAudit=null;
try{officialAudit=JSON.parse(await fs.readFile(officialAuditPath,'utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;}
if(officialAudit){
 if(officialAudit.modules!==30||officialAudit.activities!==600||
    officialAudit.referencedMediaIds!==referenced.size)
   fail('REFERENCE_DISAGREEMENT_WITH_CANONICAL_AUDIT');
 if(!Number.isInteger(officialAudit.incompleteReferencedIds)||
    !Number.isInteger(officialAudit.provisionalOrBlockedReferencedIds)||
    !Number.isInteger(officialAudit.nonTemporaryUnverifiedReferencedIds))
   fail('INVALID_CANONICAL_AUDIT_COUNTS');
 provisional=officialAudit.provisionalOrBlockedReferencedIds;
 unverified=officialAudit.nonTemporaryUnverifiedReferencedIds;
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
 referencedMediaIds:referenced.size,referenceFingerprint:fingerprint,canonicalAuditPresent:Boolean(officialAudit),
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
if(typeof approval.evidencePath!=='string'||!/^qa\/(?:results|evidence)\/[a-zA-Z0-9_.\/-]+\.json$/.test(approval.evidencePath)||
   approval.evidencePath.includes('..'))fail('INVALID_QA_EVIDENCE_PATH');
const evidence=await fs.readFile(path.resolve(approval.evidencePath));
if(sha(evidence)!==approval.evidenceSha256)fail('QA_EVIDENCE_HASH_MISMATCH');
if(typeof approval.rollbackPath!=='string'||!/^qa\/(?:results|backups)\/[a-zA-Z0-9_.\/-]+$/.test(approval.rollbackPath)||
   approval.rollbackPath.includes('..'))fail('INVALID_ROLLBACK_PATH');
const rollback=await fs.readFile(path.resolve(approval.rollbackPath));
if(sha(rollback)!==approval.rollbackSha256)fail('ROLLBACK_HASH_MISMATCH');
const removed=[];
for(const c of candidates){
 const full=await sourcePath(c.path);
 const info=await fs.lstat(full);
 if(!info.isFile()||info.isSymbolicLink()||sha(await fs.readFile(full))!==c.sha256)
   fail('FILE_CHANGED_SINCE_PLAN:'+c.path);
}
// Preserve an exact-byte backup inside the QA workspace before any removal.
const backupDir=path.resolve(arg('backup-dir','qa/results/duduq-media-retirement-backup'));
if(backupDir.startsWith(root+path.sep))fail('BACKUP_MUST_BE_OUTSIDE_ASSET_ROOT');
for(const c of candidates){
 const dest=path.resolve(backupDir,c.path);
 if(!dest.startsWith(backupDir+path.sep))fail('BACKUP_PATH_ESCAPE');
 await fs.mkdir(path.dirname(dest),{recursive:true});
 await fs.copyFile(await sourcePath(c.path),dest);
 if(sha(await fs.readFile(dest))!==c.sha256)fail('BACKUP_HASH_MISMATCH:'+c.path);
}
// Every original has a verified backup and was hash-checked immediately above.
for(const c of candidates){await fs.unlink(await sourcePath(c.path));removed.push(c.path);}
report.applied=true;
report.status='QA_WORKSPACE_ORPHANS_RETIRED_WITH_EXPLICIT_RELEASE_APPROVAL';
report.removed=removed;
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,removed:removed.length,report:output}));
