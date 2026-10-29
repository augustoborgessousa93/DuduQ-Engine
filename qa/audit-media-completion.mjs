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
const listed=[];
for(const ref of references.values()){
 const e=index.get(ref.id), p=e?.assets?.map(a=>a.path).filter(Boolean)||[];
 if(!p.length && e?.urlOrPath)p.push(e.urlOrPath);
 const states=[e?.integrationStatus,e?.refinementStatus,e?.backlogStatus,e?.humanReview].filter(Boolean).join('|');
 const flagged=e?.temporary===true || p.some(x=>tempPath.test(x)) || pending.test(states);
 let category=!e?'MISSING_REGISTRY':e.status!=='APPROVED'?'NOT_APPROVED':flagged?'PROVISIONAL':e.temporary!==false?'REVIEW_REQUIRED':'NON_TEMPORARY_UNVERIFIED';
 const badPaths=[];
 if(e)for(const asset of e.assets||[]){
  if(!inside(asset.path)){badPaths.push('UNSAFE:'+asset.path);continue;}
  try{const info=await stat(path.join(root,asset.path));if(!info.isFile()||!info.size)badPaths.push('EMPTY:'+asset.path);}
  catch{badPaths.push('MISSING:'+asset.path);}
 }
 if(badPaths.length)category='BROKEN_ASSET';
 listed.push({mediaId:ref.id,status:category,questions:[...ref.items].sort(),modules:[...ref.modules].sort(),usage:ref.items.size,semantic:e?.semantic||e?.altText||ref.examples.find(x=>x.semantic)?.semantic||ref.id.replace(/^IMG-(?:Y\dM\d\d-)?Q\d{3}-/,'').replaceAll('-',' ').toLowerCase(),temporary:e?.temporary??null,path:e?.urlOrPath||p[0]||null,badPaths,evidence:ref.examples});
}
const incomplete=listed.filter(x=>x.status!=='NON_TEMPORARY_UNVERIFIED');
const groups=new Map();
for(const x of incomplete){
 const k=(x.modules[0]?.slice(0,2)||'SHARED')+'|'+String(x.semantic||'').trim().toLowerCase();
 if(!groups.has(k))groups.set(k,{concept:String(x.semantic||'').trim(),scope:x.modules[0]?.slice(0,2)||'SHARED',mediaIds:[],questions:0});
 const g=groups.get(k);g.mediaIds.push(x.mediaId);g.questions+=x.usage;
}
const queue=[...groups.values()].sort((a,b)=>b.questions-a.questions||a.concept.localeCompare(b.concept));
const byStatus={};for(const x of listed)byStatus[x.status]=(byStatus[x.status]||0)+1;
const report={schemaVersion:'DUDUQ_MEDIA_COMPLETION_V1',generatedAt:new Date().toISOString(),modules,activities,registryEntries:index.size,referencedMediaIds:listed.length,byStatus,incompleteReferencedIds:incomplete.length,metadataClosurePassed:incomplete.length===0&&modules===30&&activities===600, finalPedagogicalQaApproved:false,finalCompletionPassed:false,queue,items:listed.sort((a,b)=>a.mediaId.localeCompare(b.mediaId))};
await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({modules,activities,registryEntries:index.size,referencedIds:listed.length,byStatus,incomplete:incomplete.length,queueGroups:queue.length,metadataClosurePassed:report.metadataClosurePassed,finalPedagogicalQaApproved:report.finalPedagogicalQaApproved,report:out}));
if(requireComplete&&!report.finalCompletionPassed)process.exitCode=2;
