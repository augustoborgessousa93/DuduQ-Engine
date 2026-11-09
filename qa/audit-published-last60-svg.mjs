#!/usr/bin/env node
/** READ ONLY: audit deployed DUDUQ English SVGs. Never writes to production. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const arg=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{
 const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)];
}));
const deployment='c84a66a2-d311-4d2b-96ce-90165db4171c';
const releaseCommit='c250b1a942ecce5c27670411906550b7f06ec362';
const sourceCommit='5d8a2e243eefaefaf403a0be838c529c6fe6ed64';
const registryUrl='https://c84a66a2.duduq-engine-13a.pages.dev/content/english/media/media-registry.json';
const sourceFile=arg.source||'qa/fixtures/phase2-source-tree-558-20261107.json';
const output=arg.output||'qa/results/production-last60-audit-20261109.json';
const jsonFile=async p=>JSON.parse(await readFile(p,'utf8'));
async function getRegistry(){
 if(arg.registry)return jsonFile(arg.registry);
 const resp=await fetch(registryUrl,{signal:AbortSignal.timeout(30000)});
 assert(resp.ok,'PRODUCTION_REGISTRY_DOWNLOAD_FAILED:'+resp.status);
 return resp.json();
}
const registry=await getRegistry();
assert.equal(registry.schemaVersion,'1.0','REGISTRY_SCHEMA_DRIFT');
assert.equal(registry.entries?.length,1166,'REGISTRY_SIZE_DRIFT');
const index=new Map();
for(const e of registry.entries){
 assert(typeof e.mediaId==='string'&&!index.has(e.mediaId),'DUPLICATE_MEDIA_ID');
 index.set(e.mediaId,e);
}
const pending=registry.entries.filter(e=>/\.svg(?:[?#].*)?$/i.test(e.urlOrPath||''));
assert.equal(pending.length,60,'EXPECTED_60_SVG_IN_PINNED_DEPLOYMENT');
const tree=await jsonFile(sourceFile);
assert.equal(tree.sha,sourceCommit,'SOURCE_COMMIT_CHANGED');
assert.equal(tree.truncated,false,'SOURCE_TREE_TRUNCATED');
const files=tree.tree.filter(x=>x.type==='blob'&&x.path.startsWith('Imagens Ilustrativa/')&&/\.png$/i.test(x.path));
assert.equal(files.length,558,'SOURCE_PNG_COUNT_CHANGED');
assert.equal(new Set(files.map(x=>x.path)).size,558,'DUPLICATE_SOURCE_PATH');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const group=new Map();
for(const e of pending){const key=e.semantic||'<SEMANTIC_MISSING>';if(!group.has(key))group.set(key,[]);group.get(key).push(e);}
assert.equal(group.size,25,'EXPECTED_25_CONCEPTS');
const usage=new Map();
let contractsChecked=null;
if(arg['questions-root']){
 let count=0;
 function scan(obj,qid){
  if(!obj||typeof obj!=='object')return;
  if(Array.isArray(obj)){for(const x of obj)scan(x,qid);return;}
  for(const [k,v] of Object.entries(obj)){
   if(['mediaId','assetId','image_ref','imageRef'].includes(k)&&typeof v==='string'&&index.has(v)){
    if(!usage.has(v))usage.set(v,new Set());usage.get(v).add(qid);
   }
   if(v&&typeof v==='object')scan(v,qid);
  }
 }
 for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
  const mm=String(m).padStart(2,'0'),mod='Y'+y+'M'+mm;
  const p=path.join(arg['questions-root'],'content/english/year-'+y+'/module-'+mm+'/questions.json');
  const q=await jsonFile(p);
  assert.equal(q.moduleId,mod,'QUESTION_MODULE_MISMATCH');
  assert.equal(q.items?.length,20,'QUESTION_COUNT_MISMATCH');
  const seen=new Set();
  for(const item of q.items){
   assert(typeof item.item_id==='string'&&!seen.has(item.item_id),'INVALID_QUESTION_ID');
   seen.add(item.item_id);scan(item,item.item_id);count++;
  }
 }
 assert.equal(count,600,'EXPECTED_600_QUESTIONS');contractsChecked=count;
}
function risk(s){
 if(s==='big'||s==='small')return 'SUBJECT_AND_SIZE_MUST_MATCH';
 if(s==='wardrobe'||s==='shoe store')return 'COMPETING_OBJECT_DISTRACTOR_RISK';
 if(['plus','minus','equals','50','52','six minus two equals four'].includes(s))return 'EXACT_SYMBOL_OR_EQUATION_REQUIRED';
 if(/^(yellow|green|red|blue) (fish|rabbit|bird|turtle|hamster|spider|dog)$/.test(s))return 'COLOR_AND_ANIMAL_MUST_MATCH';
 return 'VISUAL_AND_ALL_CONSUMERS_REVIEW_REQUIRED';
}
const groups=[...group.entries()].map(([semantic,items])=>{
 const term=norm(semantic);
 const exact=files.filter(f=>norm(path.basename(f.path,'.png'))===term);
 const related=files.filter(f=>!exact.includes(f)&&(' '+norm(path.basename(f.path,'.png'))+' ').includes(' '+term+' ')).slice(0,15);
 const questions=[...new Set(items.flatMap(e=>[...(usage.get(e.mediaId)||[])]))].sort();
 return {
  semantic,count:items.length,mediaIds:items.map(e=>e.mediaId).sort(),
  activeQuestionCount:contractsChecked===null?null:questions.length,
  questions:contractsChecked===null?null:questions,
  exactFilenameCandidates:exact.map(f=>({path:f.path,blobSha:f.sha})),
  relatedFilenamesForReview:related.map(f=>({path:f.path,blobSha:f.sha})),
  risk:risk(semantic),approved:false,requiresVisualAndDistractorReview:true
 };
}).sort((a,b)=>b.count-a.count||a.semantic.localeCompare(b.semantic));
assert.equal(groups.reduce((n,g)=>n+g.count,0),60,'GROUP_TOTAL_INVALID');
const report={
 schema:'DUDUQ_LAST60_PINNED_READ_ONLY_V1',date:'2026-11-09',
 releaseDeploymentId:deployment,releaseCommit,registryUrl,sourceCommit,
 registryEntries:1166,pendingSvgMediaIds:60,pendingConcepts:25,sourcePngCount:558,
 contractsChecked,groups,approvedReplacementCount:0,
 productionModified:false,releaseAllowed:false,
 note:'A filename candidate is never semantic or visual proof. Check every consumer and answer/distractor in real Chromium. No merge or production deploy.'
};
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'AUDIT_CREATED_RELEASE_BLOCKED',registryEntries:1166,pending:60,concepts:25,sourcePngs:558,contractsChecked,output}));
