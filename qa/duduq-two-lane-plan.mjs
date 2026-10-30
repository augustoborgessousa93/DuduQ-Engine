#!/usr/bin/env node
/**
 * DUDUQ TWO-LANE QUEUE PLANNER (read only apart from its JSON report)
 * Produce safely without letting pending Linux gameplay QA block generation.
 * This NEVER integrates an image, changes an answer, certifies QA or publishes.
 * Usage: node qa/duduq-two-lane-plan.mjs [--root=.] [--output=qa/results/media-two-lane-plan.json]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateDuduqRgbaPng} from './validate-duduq-png.mjs';
const param=(k,d)=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3)??d;
const root=path.resolve(param('root','.'));
const output=path.resolve(root,param('output','qa/results/media-two-lane-plan.json'));
const all=Array.from({length:5},(_,i)=>i+1).flatMap(y=>Array.from({length:6},(_,j)=>'Y'+y+'M'+String(j+1).padStart(2,'0')));
const priority=['Y1M04','Y1M05','Y1M06',...all.filter(x=>!['Y1M04','Y1M05','Y1M06'].includes(x))];
const priorityRank=new Map(priority.map((x,i)=>[x,i]));
const hash=b=>createHash('sha256').update(b).digest('hex');
function fail(code){throw Error('DUDUQ_TWO_LANE_INVALID:'+code)}
const ledgerFile=path.join(root,'qa/results/media-module-closure.json');
let ledger;
try{ledger=JSON.parse(await fs.readFile(ledgerFile,'utf8'))}catch{fail('CANONICAL_CLOSURE_UNAVAILABLE')}
if(ledger.modules!==30||ledger.activities!==600||!Array.isArray(ledger.modulesDetail)||ledger.modulesDetail.length!==30)fail('NEEDS_30x600_CANONICAL_INVENTORY');
const byModule=new Map(ledger.modulesDetail.map(x=>[x.moduleId,x]));
if(byModule.size!==30||all.some(x=>!byModule.has(x)))fail('BAD_MODULE_LEDGER');
// Only a current canonical inventory can prove exact question/media coverage.
// Missing or stale inventory leaves image generation open, not falsely complete.
const canonicalPath=path.join(root,'qa/results/media-closure-inventory.json');
let canonical=null,canonicalSha256=null;
try {
 const raw=await fs.readFile(canonicalPath);
 const parsed=JSON.parse(raw.toString('utf8'));
 if(parsed.modules===30&&parsed.activities===600&&Array.isArray(parsed.items)&&
    parsed.referencedMediaIds===parsed.items.length&&
    parsed.items.every(x=>typeof x.mediaId==='string'&&Array.isArray(x.questions)&&Array.isArray(x.modules))) {
  canonical=parsed;canonicalSha256=hash(raw);
 }
} catch(e) {if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e}
const canonicalPairs=new Set();
let canonicalSourceTrusted=Boolean(canonical);
if(canonical){
 const perModule=new Map(all.map(id=>[id,[]]));
 for(const item of canonical.items)for(const id of item.modules){
  if(!perModule.has(id)){canonicalSourceTrusted=false;continue}
  perModule.get(id).push(item);
  for(const qid of item.questions){
   if(typeof qid!=='string'||!/^Y[1-5]M0[1-6]-Q(?:00[1-9]|01[0-9]|020)$/.test(qid)){
    canonicalSourceTrusted=false;continue;
   }
   if(qid.startsWith(id+'-'))canonicalPairs.add(qid+'|'+item.mediaId);
  }
 }
 for(const id of all){
  const m=byModule.get(id),items=perModule.get(id);
  const blocked=items.filter(x=>x.status!=='OFFICIAL_PEDAGOGICALLY_VERIFIED');
  const unverified=blocked.filter(x=>x.status==='NON_TEMPORARY_UNVERIFIED');
  const actualIds=blocked.map(x=>x.mediaId).sort();
  const ledgerIds=(m.blockers||[]).map(x=>x.mediaId).sort();
  if(items.length!==m.referencedMediaIds||
     items.length-blocked.length!==m.verifiedReferencedIds||
     blocked.length-unverified.length!==m.provisionalOrBlockedReferencedIds||
     unverified.length!==m.unverifiedReferencedIds||
     actualIds.length!==ledgerIds.length||
     actualIds.some((v,i)=>v!==ledgerIds[i]))canonicalSourceTrusted=false;
 }
 if(canonical.referencedMediaIds!==ledger.referencedMediaIds)canonicalSourceTrusted=false;
}
if(!canonicalSourceTrusted)canonicalPairs.clear();
const candidates=new Map();
const candidateRoot=path.join(root,'qa/media-candidates');
let dirs=[];
try{dirs=await fs.readdir(candidateRoot,{withFileTypes:true})}catch(e){if(e.code!=='ENOENT')throw e}
for(const d of dirs.filter(x=>x.isDirectory())){
 const base=path.join(candidateRoot,d.name);
 const manifestPath=path.join(base,'batch-manifest.json');
 let raw;
 try{raw=await fs.readFile(manifestPath)}catch(e){if(e.code==='ENOENT')continue;throw e}
 let m;try{m=JSON.parse(raw.toString('utf8'))}catch{fail('INVALID_CANDIDATE_MANIFEST:'+d.name)}
 if(!all.includes(m.moduleId))continue; // unrelated batches do not become official module evidence
 if(!Array.isArray(m.assets)||!m.assets.length)continue;
 const checked=[],validBindingIds=new Set(),sourceBindingProblems=[],sourceAssignments=new Map(),conflictingIds=new Set();
 for(const asset of m.assets){
  let verdict='VALID';
  if(typeof asset.file!=='string'||!/^images\/[a-zA-Z0-9_.-]+\.png$/i.test(asset.file))verdict='UNSAFE_FILENAME';
  if(!/^[a-f0-9]{64}$/i.test(asset.sha256||''))verdict='MISSING_SHA256';
  let bytes;
  if(verdict==='VALID')try{bytes=await fs.readFile(path.join(base,asset.file))}catch{verdict='MISSING_FILE'}
  if(bytes&&verdict==='VALID'){
   if(hash(bytes)!==asset.sha256.toLowerCase())verdict='PNG_HASH_MISMATCH';
   else try{
    const decoded=validateDuduqRgbaPng(bytes);
    if(decoded.width<1024||decoded.height<1024)verdict='PNG_RESOLUTION_BELOW_MINIMUM';
    else if(asset.pixelWidth&&Number(asset.pixelWidth)!==decoded.width||
       asset.pixelHeight&&Number(asset.pixelHeight)!==decoded.height)verdict='MANIFEST_DIMENSIONS_MISMATCH';
   }catch(e){verdict='PNG_DECODE_FAILED:'+String(e.message).slice(0,90)}
  }
  if(verdict==='VALID'&&(!Array.isArray(asset.bindings)||asset.bindings.length===0))verdict='NO_QUESTION_BINDINGS';
  if(verdict==='VALID'&&asset.bindings.some(b=>
   typeof b.questionId!=='string'||
   !new RegExp('^'+m.moduleId+'-Q(?:00[1-9]|01[0-9]|020)$').test(b.questionId)||
   typeof b.mediaId!=='string'||!b.mediaId))verdict='INVALID_BINDING_SCOPE';
  if(verdict==='VALID'&&/REJECTED|PENDING_REGEN/i.test(String(asset.review||'')))verdict='REQUIRES_REGENERATION';
  if(verdict==='VALID')for(const bind of asset.bindings){
   if(!canonicalSourceTrusted||!canonicalPairs.has(bind.questionId+'|'+bind.mediaId)){
    sourceBindingProblems.push({questionId:bind.questionId,mediaId:bind.mediaId,
     reason:canonicalSourceTrusted?'NOT_IN_CANONICAL_QUESTION':'CANONICAL_INVENTORY_MISSING_OR_STALE'});
    continue;
   }
   const old=sourceAssignments.get(bind.mediaId);
   if(old&&old!==asset.sha256.toLowerCase()){
    conflictingIds.add(bind.mediaId);
    sourceBindingProblems.push({questionId:bind.questionId,mediaId:bind.mediaId,reason:'CONFLICTING_PNG_SHA256'});
   } else {sourceAssignments.set(bind.mediaId,asset.sha256.toLowerCase());validBindingIds.add(bind.mediaId)}
  }
  checked.push({assetKey:asset.assetKey||asset.file,sha256:asset.sha256||null,verdict});
 }
 for(const id of conflictingIds)validBindingIds.delete(id);
 const validPngHashes=[...new Set(checked.filter(x=>x.verdict==='VALID').map(x=>x.sha256.toLowerCase()))].sort();
 const record={moduleId:m.moduleId,manifest:path.relative(root,manifestPath).replaceAll('\\','/'),
  manifestSha256:hash(raw),
  assetFingerprintSha256:hash(validPngHashes.join('|')),
  validPngHashes,validUniquePngCount:validPngHashes.length,
  assetCount:m.assets.length,validAssetCount:checked.filter(x=>x.verdict==='VALID').length,
  verifiedBindingIds:validBindingIds.size,sourceBindingsTrusted:canonicalSourceTrusted,sourceBindingProblemCount:sourceBindingProblems.length,sourceBindingProblems:sourceBindingProblems.slice(0,50),
  invalidAssets:checked.filter(x=>x.verdict!=='VALID'),questionContractsReviewed:m.questionContractsReviewed||0,
  productionApproved:m.productionApproved===true,generatedEvidenceOnly:true};
 const prev=candidates.get(m.moduleId);
 if(prev){
  // Multiple candidate batches may exist, but never treat arbitrary combinations
  // as one complete module: choose one individually hash-bound manifest.
  if(record.validAssetCount>prev.validAssetCount ||
    record.validAssetCount===prev.validAssetCount && record.assetCount>prev.assetCount)
   candidates.set(m.moduleId,record);
 }else candidates.set(m.moduleId,record);
}
const records=all.map(moduleId=>{
 const m=byModule.get(moduleId),cand=candidates.get(moduleId)||null;
 const pending=Number(m.provisionalOrBlockedReferencedIds||0)+Number(m.unverifiedReferencedIds||0);
 const localComplete=m.complete===true&&pending===0;
 // A green local closure is not independent Chromium Linux proof.
 // Until independently replayed with fresh source and hash-pinned overlays,
 // ready media requires integration/QA work, never auto-promotion.
 const hasBundle=Boolean(cand);
 const candidateComplete=hasBundle&&cand.validAssetCount===cand.assetCount&&cand.questionContractsReviewed===20&&
  cand.sourceBindingsTrusted&&(pending===0||cand.verifiedBindingIds>=pending);
 const generatorNeeded=!localComplete && !candidateComplete;
 const integratorNeeded=hasBundle && cand.validAssetCount>0;
 const stage=integratorNeeded?(candidateComplete?'CANDIDATES_READY_NEED_INDEPENDENT_INTEGRATION_QA':'PARTIAL_CANDIDATES_QA'):
   localComplete?'LOCAL_CLOSURE_WITHOUT_INDEPENDENT_REPLAY':'NEEDS_IMAGES';
 return {moduleId,pendingMediaReferences:pending,localComplete,
  candidate: cand,needsGeneration:generatorNeeded,needsIntegrationOrQA:integratorNeeded,stage};
});
const pick=xs=>xs.sort((a,b)=>(priorityRank.get(a.moduleId)??99)-(priorityRank.get(b.moduleId)??99))[0]?.moduleId||null;
// Gating criteria for generation: ignore an independent QA failure in another
// module. Prefer moving beyond prepared Y1M04/Y1M05 to Y1M06.
const producerNext=pick(records.filter(m=>m.needsGeneration));
const integratorNext=pick(records.filter(m=>m.needsIntegrationOrQA));
const candidateAssetCount=new Set(records.flatMap(x=>x.candidate?.validPngHashes||[])).size;
const candidateManifestEntriesCount=records.reduce((n,x)=>n+(x.candidate?.validAssetCount||0),0);
const payload={
 schemaVersion:'DUDUQ_MEDIA_TWO_LANE_PLAN_V1',mode:'READ_ONLY_PLANNING_NO_AUTOMATIC_APPROVAL',
 moduleCount:30,activityCount:600,
 sourceLedger:path.relative(root,ledgerFile).replaceAll('\\','/'),
 canonicalInventorySha256:canonicalSourceTrusted?canonicalSha256:null,canonicalSourceTrusted,
 localClosureModules:ledger.completedModules,
 globallyPendingMediaIds:ledger.distinctPendingMediaIds,
 producer:{nextModule:producerNext,queuedModules:records.filter(x=>x.needsGeneration).length,
  role:'ONLY_GENERATE_VALIDATE_STAGE_HASH_BOUND_PNG_CANDIDATES',
  mustNeverEdit:['answers','question contracts','Gold Masters','runtime','production','approval flags']},
 integrator:{nextModule:integratorNext,queuedModules:records.filter(x=>x.needsIntegrationOrQA).length,
  role:'ONLY_REVIEW_INTEGRATE_QA_CANDIDATES_IN_ISOLATED_REVIEW',
  deployAllowed:false,independentLinuxQARequired:true},
 candidateAssetCount,candidateManifestEntriesCount,
 independentQaGreen:false, // Never infer from locally written counters or CI of untouched V26.
 finished:false,
 caveat:'Separate persistent queues; a single Codex runner may interleave roles without simultaneous shared-worktree writes. A QA failure must not block the generator.',
 modules:records
};
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({status:'TWO_LANES_READY_FOR_ORCHESTRATION',
 producerNext,integratorNext,producerQueued:payload.producer.queuedModules,
 integrationQueued:payload.integrator.queuedModules,candidateAssets:payload.candidateAssetCount,
 candidateManifestEntries:payload.candidateManifestEntriesCount,
 moduleCount:30,activityCount:600,pendingIds:payload.globallyPendingMediaIds,
 releaseApproved:false,output}));
