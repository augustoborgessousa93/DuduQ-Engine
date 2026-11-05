#!/usr/bin/env node
/** Read-only media triage. Never authorizes replacement, approval or deletion. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const arg=(k,d)=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3)??d;
const inv=JSON.parse(await readFile(path.resolve(arg('inventory','qa/results/media-closure-inventory.json')),'utf8'));
const split=JSON.parse(await readFile(path.resolve(arg('split','qa/results/shared-media-split-plan.json')),'utf8'));
const out=path.resolve(arg('output','qa/results/media-safe-priority-plan.json'));
const fail=s=>{throw Error('DUDUQ_SAFE_PRIORITY_BLOCKED:'+s)};
if(inv.schemaVersion!=='DUDUQ_MEDIA_COMPLETION_V1'||split.schemaVersion!=='DUDUQ_SHARED_MEDIA_SPLIT_PLAN_V1')fail('INVALID_SCHEMA');
if(inv.modules!==30||inv.activities!==600||split.modules!==30||split.activities!==600)fail('EXPECTED_30_MODULES_600_ACTIVITIES');
if(split.mode!=='READ_ONLY_NO_MUTATION'||!Array.isArray(inv.items)||!Array.isArray(inv.queue))fail('INVALID_SOURCE');
const entries=new Map();
for(const item of inv.items){
 if(!item.mediaId||entries.has(item.mediaId)||!Array.isArray(item.questions)||!Array.isArray(item.modules))fail('INVALID_INVENTORY_ID');
 entries.set(item.mediaId,item);
}
if(entries.size!==inv.referencedMediaIds)fail('INVENTORY_COUNT_MISMATCH');
const categories=new Map();
for(const [category,key] of [['REVIEW_ONLY','unchanged'],['REQUIRES_SPLIT','proposed'],['BLOCKED_AMBIGUOUS','blocked']]){
 if(!Array.isArray(split[key]))fail('MISSING_SPLIT_CATEGORY:'+key);
 for(const item of split[key]){
  if(!entries.has(item.mediaId))fail('SPLIT_ID_NOT_IN_INVENTORY:'+item.mediaId);
  if(categories.has(item.mediaId))fail('DUPLICATE_SPLIT_CATEGORY:'+item.mediaId);
  categories.set(item.mediaId,category);
 }
}
if(categories.size!==entries.size)fail('UNCATEGORIZED_MEDIA_IDS');
if(split.notConflictingImgIds!==split.unchanged.length||split.conflictsRequiringSplit!==split.proposed.length||split.blockedSharedMediaIds!==split.blocked.length)fail('SPLIT_COUNT_MISMATCH');
const pending=[...entries.values()].filter(x=>x.status!=='OFFICIAL_PEDAGOGICALLY_VERIFIED');
const toRow=x=>({mediaId:x.mediaId,status:x.status,semantic:x.semantic,modules:x.modules,questions:x.questions,usage:x.usage,badPaths:x.badPaths||[],requiresPedagogicalReview:true});
const sort=(a,b)=>b.usage-a.usage||a.mediaId.localeCompare(b.mediaId);
const reviewOnly=[],requiresSplit=[],blockedAmbiguous=[];
for(const item of pending){
 const row=toRow(item);
 switch(categories.get(item.mediaId)){
  case 'REVIEW_ONLY':reviewOnly.push(row);break;
  case 'REQUIRES_SPLIT':requiresSplit.push(row);break;
  case 'BLOCKED_AMBIGUOUS':blockedAmbiguous.push(row);break;
  default:fail('UNKNOWN_CATEGORY');
 }
}
reviewOnly.sort(sort);requiresSplit.sort(sort);blockedAmbiguous.sort(sort);
const blockedIds=new Set(split.blocked.map(x=>x.mediaId));
const unsafeIds=new Set([...blockedIds,...split.proposed.map(x=>x.mediaId)]);
const report={
 schemaVersion:'DUDUQ_MEDIA_SAFE_PRIORITY_V1',mode:'READ_ONLY_QA_TRIAGE',modules:30,activities:600,
 referencedMediaIds:entries.size,pendingMediaIds:pending.length,
 counts:{reviewOnly:reviewOnly.length,requiresSplit:requiresSplit.length,blockedAmbiguous:blockedAmbiguous.length,
  queueGroups:inv.queue.length,
  queueGroupsWithBlocked:inv.queue.filter(g=>g.mediaIds.some(id=>blockedIds.has(id))).length,
  queueGroupsWithUnsafe:inv.queue.filter(g=>g.mediaIds.some(id=>unsafeIds.has(id))).length,
  top20QueueGroupsWithBlocked:inv.queue.slice(0,20).filter(g=>g.mediaIds.some(id=>blockedIds.has(id))).length,
  top20QueueGroupsWithUnsafe:inv.queue.slice(0,20).filter(g=>g.mediaIds.some(id=>unsafeIds.has(id))).length},
 reviewOnly,requiresSplit,blockedAmbiguous,
 note:'REVIEW_ONLY is a semantic review candidate, not approval for global replacement. All candidates require per-question semantic proof, image bytes/hashes, pedagogical and browser QA. REQUIRES_SPLIT and BLOCKED_AMBIGUOUS must not be directly replaced. No content or registry is modified.'
};
await mkdir(path.dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'READ_ONLY_QA_TRIAGE',pending:pending.length,...report.counts,output:out}));
