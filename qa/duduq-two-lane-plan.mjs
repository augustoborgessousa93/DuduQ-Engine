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
 const checked=[],validBindingIds=new Set();
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
  if(verdict==='VALID'&&asset.bindings.some(b=>typeof b.questionId!=='string'||!b.questionId.startsWith(m.moduleId+'-Q')||typeof b.mediaId!=='string'||!b.mediaId))verdict='INVALID_BINDING_SCOPE';
  if(verdict==='VALID'&&/REJECTED|PENDING_REGEN/i.test(String(asset.review||'')))verdict='REQUIRES_REGENERATION';
  if(verdict==='VALID')for(const bind of asset.bindings)validBindingIds.add(bind.mediaId);
  checked.push({assetKey:asset.assetKey||asset.file,sha256:asset.sha256||null,verdict});
 }
 const validPngHashes=[...new Set(checked.filter(x=>x.verdict==='VALID').map(x=>x.sha256.toLowerCase()))].sort();
 const record={moduleId:m.moduleId,manifest:path.relative(root,manifestPath).replaceAll('\\','/'),
  manifestSha256:hash(raw),
  assetFingerprintSha256:hash(validPngHashes.join('|')),
  validPngHashes,validUniquePngCount:validPngHashes.length,
  assetCount:m.assets.length,validAssetCount:checked.filter(x=>x.verdict==='VALID').length,
  verifiedBindingIds:validBindingIds.size,
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
  (pending===0||cand.verifiedBindingIds>=pending);
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
