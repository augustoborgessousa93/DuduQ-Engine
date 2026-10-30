#!/usr/bin/env node
/**
 * Fail-closed 30-module media completion gate. Consume the canonical
 * qa/audit-media-completion.mjs inventory, not guessed image filenames.
 * In normal mode this only writes a QA report. --require-complete fails
 * until all referenced media AND final QA attestations are proven.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const arg=(name,def)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)??def;
const input=path.resolve(arg('input','qa/results/media-closure-inventory.json'));
const output=path.resolve(arg('output','qa/results/media-module-closure.json'));
const mustFinish=process.argv.includes('--require-complete');
const inventory=JSON.parse(await readFile(input,'utf8'));
const fail=(why)=>{throw Error('DUDUQ_MODULE_CLOSURE_INVALID:'+why)};
if(inventory.modules!==30||inventory.activities!==600||!Array.isArray(inventory.items))
 fail('CANONICAL_30x600_REQUIRED');
if(inventory.referencedMediaIds!==inventory.items.length)fail('MEDIA_REFERENCE_COUNT_MISMATCH');
const validIds=Array.from({length:5},(_,i)=>i+1).flatMap(y=>
 Array.from({length:6},(_,m)=>'Y'+y+'M'+String(m+1).padStart(2,'0')));
const modules=new Map(validIds.map(id=>[id,{moduleId:id,expectedActivities:20,referencedMediaIds:0,
 provisionalOrBlockedReferencedIds:0,unverifiedReferencedIds:0,
 verifiedReferencedIds:0,brokenReferencedIds:0,blockers:[]}]));
const seen=new Set();
const verifiedStatuses=new Set(['OFFICIAL_PEDAGOGICALLY_VERIFIED']);
let uniqueVerified=0,uniquePending=0;
for(const item of inventory.items){
 if(typeof item.mediaId!=='string'||!item.mediaId||seen.has(item.mediaId))fail('DUPLICATE_MEDIA_ID');
 seen.add(item.mediaId);
 if(!Array.isArray(item.modules)||!item.modules.length)fail('MISSING_MODULE_USE:'+item.mediaId);
 const uniqueModules=new Set(item.modules);
 if(uniqueModules.size!==item.modules.length)fail('DUPLICATED_MODULE_USE:'+item.mediaId);
 const verified=verifiedStatuses.has(item.status);
 if(verified)uniqueVerified++; else uniquePending++;
 for(const id of uniqueModules){
  const mod=modules.get(id);
  if(!mod)fail('UNKNOWN_MODULE:'+id);
  mod.referencedMediaIds++;
  if(verified)mod.verifiedReferencedIds++;
  else {
   mod.blockers.push({mediaId:item.mediaId,status:item.status});
   if(item.status==='NON_TEMPORARY_UNVERIFIED')mod.unverifiedReferencedIds++;
   else mod.provisionalOrBlockedReferencedIds++;
  }
  if(item.status==='BROKEN_ASSET'||item.status==='MISSING_REGISTRY')mod.brokenReferencedIds++;
 }
}
if(seen.size!==inventory.referencedMediaIds)fail('DISTINCT_MEDIA_IDS_MISMATCH');
const detail=[...modules.values()].map(m=>({...m,
 complete:m.provisionalOrBlockedReferencedIds===0&&m.unverifiedReferencedIds===0,
 blockers:m.blockers.sort((a,b)=>a.mediaId.localeCompare(b.mediaId))}));
const modulesReady=detail.filter(m=>m.complete).length;
const noMediaBlockers=uniquePending===0 && modulesReady===30;
const pedagogicalQAApproved=inventory.finalPedagogicalQaApproved===true;
const finalCompletionPassed=inventory.finalCompletionPassed===true;
const globalPass=noMediaBlockers&&pedagogicalQAApproved&&finalCompletionPassed;
const report={
 schemaVersion:'DUDUQ_30_MODULE_MEDIA_CLOSURE_V1',
 source:input,modules:30,activities:600,
 referencedMediaIds:inventory.referencedMediaIds,
 distinctPendingMediaIds:uniquePending,
 distinctVerifiedMediaIds:uniqueVerified,
 completedModules:modulesReady,pendingModules:30-modulesReady,
 allImagesReplacedAndVerified:noMediaBlockers,
 pedagogicalQAApproved,finalCompletionPassed,
 status:globalPass?'PROJECT_COMPLETE':'INCOMPLETE',
 note:'Project completion requires module-by-module closure and evidence-backed final QA; generation alone never closes a module.',
 modulesDetail:detail
};
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,modules:30,activities:600,completedModules:modulesReady,
 pendingModules:30-modulesReady,distinctPendingMediaIds:uniquePending,
 allImagesReplacedAndVerified:noMediaBlockers,finalQaPassed:globalPass,report:output}));
if(mustFinish&&!globalPass)process.exitCode=2;
