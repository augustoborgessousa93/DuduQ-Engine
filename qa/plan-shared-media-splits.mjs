#!/usr/bin/env node
/**
 * DUDUQ - read-only per-occurrence shared media-ID split planner.
 *
 * Never rewrites question contracts, answer keys, registry, built manifests
 * or runtime. It derives a deterministic proposed per-context media ID for
 * each fully explained conflicting reuse. A missing semanticTarget on any
 * occurrence blocks *the entire shared ID* rather than guessing.
 *
 * Usage: node qa/plan-shared-media-splits.mjs
 *        node qa/plan-shared-media-splits.mjs --root=dist-pages --output=qa/results/shared-media-split-plan.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const arg=(key,fallback)=>process.argv.find(s=>s.startsWith('--'+key+'='))?.slice(key.length+3)??fallback;
const root=path.resolve(arg('root','dist-pages'));
const output=path.resolve(arg('output','qa/results/shared-media-split-plan.json'));
const mediaFields=new Set(['assetId','mediaId','image_ref','imageRef']);
const normalized=s=>String(s??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const digest=s=>createHash('sha256').update(s).digest('hex');
function err(code){throw Error('DUDUQ_SHARED_MEDIA_SPLIT_PLAN_INVALID:'+code)}
const byId=new Map(),usedIds=new Set(),registryIds=new Set(),questionChecksums=[],questionIds=new Set();
let activityCount=0;
let registry;
try{
 registry=JSON.parse(await fs.readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
 if(!Array.isArray(registry.entries))err('MISSING_REGISTRY_ENTRIES');
 for(const e of registry.entries)if(e.mediaId){if(usedIds.has(e.mediaId))err('DUPLICATE_REGISTRY_ID:'+e.mediaId);usedIds.add(e.mediaId);registryIds.add(e.mediaId)}
}catch(e){if(e.message?.startsWith('DUDUQ_SHARED_MEDIA'))throw e;err('REGISTRY_UNAVAILABLE')}
function escapePointer(s){return String(s).replaceAll('~','~0').replaceAll('/','~1')}
for(let year=1;year<=5;year++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),moduleId='Y'+year+'M'+mm;
 const file='content/english/year-'+year+'/module-'+mm+'/questions.json';
 const bytes=await fs.readFile(path.join(root,file));
 questionChecksums.push({moduleId,path:file,sha256:digest(bytes)});
 const data=JSON.parse(bytes.toString('utf8'));
 if(data.moduleId!==moduleId||!Array.isArray(data.items)||data.items.length!==20)err('NOT_20_QUESTIONS:'+moduleId);
 for(let i=0;i<data.items.length;i++){
  const q=data.items[i],qid=q.item_id;
  if(!/^Y[1-5]M0[1-6]-Q\d{3}$/.test(qid||'')||!qid.startsWith(moduleId+'-')||questionIds.has(qid))err('BAD_QUESTION_ID:'+qid);
  questionIds.add(qid);activityCount++;
  function traverse(node,pointer){
   if(!node||typeof node!=='object')return;
   if(Array.isArray(node)){for(let k=0;k<node.length;k++)traverse(node[k],pointer+'/'+k);return}
   for(const [key,val] of Object.entries(node)){
    const childPath=pointer+'/'+escapePointer(key);
    // Track every registered visual asset, including legacy EMOJI and MEDIA-LETTER IDs.
    // Otherwise cross-module semantic collisions outside IMG-* evade the split gate.
    if(mediaFields.has(key)&&typeof val==='string'&&(val.startsWith('IMG-')||registryIds.has(val))){
     usedIds.add(val);
     const semanticTarget=typeof node.semanticTarget==='string'?node.semanticTarget:null;
     const record={moduleId,questionId:qid,file,path:childPath,sourceMediaId:val,
       semanticTarget,semanticKey:normalized(semanticTarget)};
     if(!byId.has(val))byId.set(val,[]);
     byId.get(val).push(record);
    }else if(val&&typeof val==='object')traverse(val,childPath);
   }
  }
  traverse(q,'/items/'+i);
 }
}
if(activityCount!==600||questionChecksums.length!==30)err('EXPECTED_30x600');
const proposed=[],blocked=[],unchanged=[],generated=new Set();
for(const mediaId of [...byId.keys()].sort()){
 const rows=byId.get(mediaId).sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.path.localeCompare(b.path));
 const moduleKeys=new Set(rows.map(r=>r.moduleId));
 const meaningKeys=new Set(rows.map(r=>r.semanticKey));
 if(moduleKeys.size<2&&meaningKeys.size<=1){unchanged.push({mediaId,occurrences:rows.length});continue}
 const reasons=[];
 if(moduleKeys.size>1)reasons.push('CROSS_MODULE_SHARED_ID');
 if(meaningKeys.size>1)reasons.push('DIVERGENT_SEMANTIC_TARGETS');
 if(rows.some(r=>!r.semanticKey)){
  blocked.push({mediaId,reasons:[...reasons,'MISSING_NODE_SEMANTIC_TARGET'],occurrences:rows.length,
    unresolved:rows.filter(r=>!r.semanticKey).map(r=>({moduleId:r.moduleId,questionId:r.questionId,path:r.path}))});
  continue;
 }
 // A dedicated ID per question and explicit semantic meaning; no global
 // replacement by mediaId. A single question may have different meanings
 // in distinct option nodes, in which case each meaning gets its own ID.
 const assignmentByContext=new Map();
 let collision=false;
 const changes=[];
 for(const row of rows){
  const key=row.questionId+'|'+row.semanticKey;
  let next=assignmentByContext.get(key);
  if(!next){
   next='IMG-'+row.questionId+'-CTX-'+digest(mediaId+'|'+key).slice(0,12).toUpperCase();
   if(usedIds.has(next)||generated.has(next)){collision=true;break}
   assignmentByContext.set(key,next);generated.add(next);
  }
  changes.push({...row,newMediaId:next});
 }
 if(collision){blocked.push({mediaId,reasons:[...reasons,'GENERATED_ID_COLLISION'],occurrences:rows.length});continue}
 proposed.push({mediaId,reasons,occurrences:rows.length,distinctQuestions:new Set(rows.map(r=>r.questionId)).size,
  createdIds:assignmentByContext.size,changes});
}
const result={
 schemaVersion:'DUDUQ_SHARED_MEDIA_SPLIT_PLAN_V1',mode:'READ_ONLY_NO_MUTATION',
 sourceRoot:root,modules:30,activities:600,
 registryEntries:registry.entries.length,
 referencedImgIds:[...byId.keys()].filter(id=>id.startsWith('IMG-')).length,
 referencedVisualMediaIds:byId.size,
 referencedNonImgMediaIds:[...byId.keys()].filter(id=>!id.startsWith('IMG-')).length,
 conflictsRequiringSplit:proposed.length,splitOccurrenceCount:proposed.reduce((n,p)=>n+p.occurrences,0),
 proposedNewMediaIds:proposed.reduce((n,p)=>n+p.createdIds,0),
 blockedSharedMediaIds:blocked.length,
 notConflictingImgIds:unchanged.length,
 evidence:{questionChecksums},proposed,blocked,unchanged,
 note:'These are proposed question-scoped IDs, NOT approved image matches. Codex must validate semantics, patch the authoritative source or a QA-only overlay with registry and integrity manifest, then run 30x600 QA. No new asset or official status is generated here.'
};
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:'READ_ONLY_SPLIT_PLAN',modules:30,activities:600,
 conflictsRequiringSplit:result.conflictsRequiringSplit,
 proposedNewMediaIds:result.proposedNewMediaIds,
 blockedSharedMediaIds:result.blockedSharedMediaIds,report:output}));
