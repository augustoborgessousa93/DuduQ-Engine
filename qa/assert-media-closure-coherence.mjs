#!/usr/bin/env node
// Fail closed if module checkpoint and canonical inventory describe different
// builds. QA consistency only: NEVER signals pedagogical approval or deploy.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const arg=(name,def)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3)||def;
const input=path.resolve(arg('inventory','qa/results/media-closure-inventory.json'));
const summaryPath=path.resolve(arg('modules','qa/results/media-module-closure.json'));
const manifestPath=path.resolve(arg('manifest','dist-pages/.duduq-pages-manifest'));
const output=path.resolve(arg('output','qa/results/media-closure-consistency.json'));
const inventoryBytes=await readFile(input),summaryBytes=await readFile(summaryPath),manifestBytes=await readFile(manifestPath);
const inventory=JSON.parse(inventoryBytes),summary=JSON.parse(summaryBytes);
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(inventory.schemaVersion,'DUDUQ_MEDIA_COMPLETION_V1');
assert.equal(summary.schemaVersion,'DUDUQ_30_MODULE_MEDIA_CLOSURE_V1');
assert.equal(inventory.modules,30);assert.equal(summary.modules,30);
assert.equal(inventory.activities,600);assert.equal(summary.activities,600);
assert.equal(inventory.referencedMediaIds,inventory.items?.length);
assert.equal(summary.referencedMediaIds,inventory.referencedMediaIds,
 'STALENESS: module report uses a different inventory');
assert.equal(summary.distinctPendingMediaIds+summary.distinctVerifiedMediaIds,summary.referencedMediaIds);
const pending=inventory.items.filter(x=>x.status!=='OFFICIAL_PEDAGOGICALLY_VERIFIED');
assert.equal(summary.distinctPendingMediaIds,pending.length,'STALENESS: pending differs from inventory');
assert.equal(summary.distinctVerifiedMediaIds,inventory.items.length-pending.length);
assert.equal(summary.modulesDetail?.length,30);
assert.equal(summary.completedModules+summary.pendingModules,30);
assert.equal(summary.pedagogicalQAApproved,inventory.finalPedagogicalQaApproved===true);
assert.equal(summary.finalCompletionPassed,inventory.finalCompletionPassed===true);
const allModules=new Set(Array.from({length:5},(_,y)=>y+1).flatMap(y=>
 Array.from({length:6},(_,m)=>'Y'+y+'M'+String(m+1).padStart(2,'0'))));
const expected=new Map([...allModules].map(id=>[id,{total:0,verified:0,unverified:0,blocked:0,broken:0}]));
const uniqueIds=new Set();
for(const item of inventory.items){
 assert.ok(typeof item.mediaId==='string'&&item.mediaId&&!uniqueIds.has(item.mediaId),'DUPLICATE_MEDIA_ID');
 uniqueIds.add(item.mediaId);
 assert.ok(Array.isArray(item.modules)&&item.modules.length>0);
 assert.equal(new Set(item.modules).size,item.modules.length);
 for(const moduleId of item.modules){
  const m=expected.get(moduleId);assert.ok(m,'UNKNOWN_MODULE:'+moduleId);
  m.total++;
  if(item.status==='OFFICIAL_PEDAGOGICALLY_VERIFIED')m.verified++;
  else if(item.status==='NON_TEMPORARY_UNVERIFIED')m.unverified++;
  else m.blocked++;
  if(['BROKEN_ASSET','MISSING_REGISTRY'].includes(item.status))m.broken++;
 }
}
let done=0;
for(const m of summary.modulesDetail){
 assert.ok(allModules.delete(m.moduleId),'INVALID_OR_DUPLICATE_MODULE:'+m.moduleId);
 const x=expected.get(m.moduleId);
 assert.equal(m.expectedActivities,20);
 assert.equal(m.referencedMediaIds,x.total,'STALE_MODULE:'+m.moduleId);
 assert.equal(m.verifiedReferencedIds,x.verified,'STALE_MODULE_VERIFIED:'+m.moduleId);
 assert.equal(m.unverifiedReferencedIds,x.unverified,'STALE_MODULE_UNVERIFIED:'+m.moduleId);
 assert.equal(m.provisionalOrBlockedReferencedIds,x.blocked,'STALE_MODULE_BLOCKED:'+m.moduleId);
 assert.equal(m.brokenReferencedIds,x.broken,'STALE_MODULE_BROKEN:'+m.moduleId);
 const complete=x.blocked===0&&x.unverified===0;
 assert.equal(m.complete,complete);
 if(complete)done++;
}
assert.equal(allModules.size,0);
assert.equal(summary.completedModules,done);
const complete=done===30&&summary.distinctPendingMediaIds===0&&
 summary.pedagogicalQAApproved===true&&summary.finalCompletionPassed===true;
assert.equal(summary.status,complete?'PROJECT_COMPLETE':'INCOMPLETE');
const report={schemaVersion:'DUDUQ_MEDIA_CHECKPOINT_COHERENCE_V1',
 status:'PASS_INTERNAL_COHERENCE_NOT_RELEASE_APPROVAL',modules:30,activities:600,
 manifestSha256:sha(manifestBytes),inventorySha256:sha(inventoryBytes),
 moduleReportSha256:sha(summaryBytes),referencedMediaIds:summary.referencedMediaIds,
 pendingReferencedMediaIds:summary.distinctPendingMediaIds,
 completedModules:done,pedagogicalQAApproved:summary.pedagogicalQAApproved,productionDeployed:false};
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
