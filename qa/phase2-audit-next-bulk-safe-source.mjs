#!/usr/bin/env node
// QA-only: current 600 contracts + registry vs pinned source Git Tree.
// Discover a WIDE batch of exact source names; DO NOT modify images or game.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
if(process.env.DUDUQ_QA_ONLY!=='1')throw Error('QA_ONLY');
const dist=path.resolve('dist-pages'),source=JSON.parse(await readFile('qa/results/assets-duduq-source-inventory.json','utf8'));
const historical=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8'));
assert.equal(source.sourceCommit,'a62c07c075a4a744f81dee2eea3a6b93108f9d08');
assert.equal(source.fileCount,420);assert.equal(historical.queue.length,1115);
const manifestBytes=await readFile(path.join(dist,'.duduq-pages-manifest'));
const lines=manifestBytes.toString('utf8').trim().split(/\r?\n/);assert.equal(lines.length,2891);
const verified=new Map(lines.map(l=>{const k=l.lastIndexOf(' ');return[l.slice(0,k),l.slice(k+1)];}));
const registryRel='content/english/media/media-registry.json';
const bytes=await readFile(path.join(dist,registryRel));
assert.equal(hash(bytes),verified.get(registryRel),'WRONG_PRODUCTION_BASE');
const reg=JSON.parse(bytes);assert.equal(reg.entries.length,1166);
const media=new Map(reg.entries.map(x=>[x.mediaId,x]));
const oldQueue=new Map(historical.queue.map(x=>[x.mediaId,x]));
const qaAlready=new Set(JSON.parse(await readFile('qa/results/consolidated/evidence.json','utf8')).mediaBindings.map(x=>x.mediaId));
const alias=(source.files||[]).filter(x=>x.detectedType==='PNG'&&x.path.startsWith('Imagens Ilustrativa/')).map(x=>{
 const raw=path.posix.basename(x.path).replace(/\.[^.]+$/,'');
 const stem=norm(raw.split(/\s+[—-]\s+/)[0]);
 return{sourcePath:x.path,gitBlobSha:x.gitBlobSha,stem,raw};
});
const stemIndex=new Map();
for(const im of alias){if(!stemIndex.has(im.stem))stemIndex.set(im.stem,[]);stemIndex.get(im.stem).push(im);}
const usage=new Map(),questionIds=new Set(),questionHashes=[];
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mid='Y'+y+'M'+String(m).padStart(2,'0');
 const f='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const file=await readFile(path.join(dist,f));assert.equal(hash(file),verified.get(f),'BAD_CONTRACT_HASH');
 questionHashes.push({moduleId:mid,file,sha256:hash(file)});
 const mod=JSON.parse(file);assert.equal(mod.moduleId,mid);assert.equal(mod.items.length,20);
 for(const q of mod.items){
  assert(!questionIds.has(q.item_id),'DUP_QUESTION');questionIds.add(q.item_id);
  const visit=(node,p='question')=>{
   if(!node||typeof node!=='object')return;
   if(Array.isArray(node)){node.forEach((v,i)=>visit(v,p+'['+i+']'));return;}
   for(const [key,value]of Object.entries(node)){
    if(['mediaId','assetId','imageRef','image_ref','imageId'].includes(key)&&typeof value==='string'&&value.startsWith('IMG-')){
     const list=usage.get(value)||[];
     list.push({qid:q.item_id,field:p+'.'+key,semantic:typeof node.semanticTarget==='string'?norm(node.semanticTarget):null});
     usage.set(value,list);
    }else if(['mediaIds','imageIds'].includes(key)&&Array.isArray(value)){
     value.forEach((id,i)=>{if(typeof id!=='string'||!id.startsWith('IMG-'))return;
      const list=usage.get(id)||[];list.push({qid:q.item_id,field:p+'.'+key+'['+i+']',semantic:typeof node.semanticTarget==='string'?norm(node.semanticTarget):null});
      usage.set(id,list);
     });
    }else if(value&&typeof value==='object')visit(value,p+'.'+key);
   }
  };
  visit(q);
 }
}
assert.equal(questionIds.size,600);
const forbidden=new Set(['white','orange','banana','pencil case','pencil','hands','feet','one','two','three','four','five','six','seven','eight','nine','ten']);
const classes={eligible:[],requiresReview:[],alreadyOfficial:[],noSource:[],notInCurrentRegistry:[]};
let currentReferenced=0, SVGCount=0;
for(const [id,occ] of usage){
 currentReferenced++;
 const current=media.get(id),historic=oldQueue.get(id);
 if(!current){classes.notInCurrentRegistry.push({mediaId:id,occurrences:occ.length});continue;}
 const svg=typeof current.urlOrPath==='string'&&current.urlOrPath.toLowerCase().endsWith('.svg');
 if(!svg){classes.alreadyOfficial.push({mediaId:id,semantic:current.semantic,currentPath:current.urlOrPath});continue;}
 SVGCount++;
 const semantic=norm(current.semantic||historic?.semantic||'');
 const imgs=stemIndex.get(semantic)||[];
 const errs=[];
 if(!semantic)errs.push('NO_SEMANTIC_TARGET');
 if(qaAlready.has(id))errs.push('ALREADY_IN_SUCCESSFUL_5PNG_10ID_QA_CANDIDATE');
 if(forbidden.has(semantic))errs.push('POLYSEMY_OR_NUMERAL_REVIEW');
 if(current.humanResolutionStatus==='PEDAGOGICAL_QA_APPROVED'||current.integrationStatus==='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH')errs.push('ALREADY_APPROVED');
 if(current.temporary!==true&&current.temporary!==null&&current.temporary!==undefined)errs.push('TEMPORARY_FIELD_CONFLICT');
 if(current.semantic&&norm(current.semantic)!==semantic)errs.push('CURRENT_REGISTRY_CONCEPT_MISMATCH');
 if(historic?.semanticConflict)errs.push('HISTORICAL_CONCEPT_CONFLICT');
 if(!occ.length)errs.push('MISSING_ALL_OCCURRENCES');
 if(occ.some(x=>!x.semantic))errs.push('IMPLICIT_OPTION_SEMANTIC');
 if(occ.some(x=>x.semantic&&x.semantic!==semantic))errs.push('EXPLICIT_Q_SEMANTIC_CONFLICT');
 const blobs=[...new Set(imgs.map(x=>x.gitBlobSha))];
 if(imgs.length===0)errs.push('NO_EXACT_SOURCE');
 if(blobs.length>1)errs.push('MULTIPLE_DISTINCT_SOURCE_VARIANTS');
 if(errs.length){
  const item={mediaId:id,semantic,occurrences:occ.length,questions:[...new Set(occ.map(x=>x.qid))].sort(),
   sources:imgs.map(x=>({path:x.sourcePath,gitBlobSha:x.gitBlobSha})),reasons:errs};
  (errs.length===1&&errs[0]==='NO_EXACT_SOURCE'?classes.noSource:classes.requiresReview).push(item);
 }else{
  classes.eligible.push({mediaId:id,semantic,occurrences:occ.length,
   questionIds:[...new Set(occ.map(x=>x.qid))].sort(),
   originalSvg:current.urlOrPath,originalTemporary:current.temporary??null,
   sourcePath:imgs[0].sourcePath,sourceGitBlob:imgs[0].gitBlobSha,
   allSourceFileAliases:imgs.map(x=>x.sourcePath),currentRegistrySemantic:current.semantic});
 }
}
classes.eligible.sort((a,b)=>b.occurrences-a.occurrences||a.mediaId.localeCompare(b.mediaId));
const sourceGroups=new Map();
for(const row of classes.eligible){
 const key=row.sourceGitBlob;
 let entry=sourceGroups.get(key);
 if(!entry){entry={gitBlobSha:key,sourcePath:row.sourcePath,semantic:row.semantic,mediaIds:[],questionIds:new Set(),totalOccurrences:0};sourceGroups.set(key,entry);}
 entry.mediaIds.push(row.mediaId);for(const q of row.questionIds)entry.questionIds.add(q);entry.totalOccurrences+=row.occurrences;
}
const groups=[...sourceGroups.values()].map(x=>({...x,questionIds:[...x.questionIds].sort()}))
 .sort((a,b)=>b.questionIds.length-a.questionIds.length||b.mediaIds.length-a.mediaIds.length);
const report={schemaVersion:'DUDUQ_BULK_EXACT_SOURCE_CURRENT_600_CONTRACTS_V1',
 sourceCommit:source.sourceCommit,canonicalProductionDeployment:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 contracts:600,registryEntries:reg.entries.length,sourceFiles:source.fileCount,
 referencedIMGIds:currentReferenced,svgMediaIds:SVGCount,
 sourceSHA256NotYetComputed:true,pngByteQARequired:true,pedagogicalApproval:'PENDING',
 phase2AlreadyIntegratedIds:qaAlready.size,eligibleUniqueSourceBlobs:groups.length,eligibleMediaIds:classes.eligible.length,
 eligibleAffectedQuestionCount:new Set(classes.eligible.flatMap(x=>x.questionIds)).size,
 summary:{eligible:classes.eligible.length,review:classes.requiresReview.length,
  noSource:classes.noSource.length,alreadyOfficial:classes.alreadyOfficial.length,
  missingRegistry:classes.notInCurrentRegistry.length},
 sourceGroups:groups,mediaIdEvidence:classes,productionDeployAuthorizedByQA:false};
await mkdir('qa/results/bulk',{recursive:true});
await writeFile('qa/results/bulk/current-exact-source-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'BULK_EXACT_SOURCE_DISCOVERY_QA_ONLY',summary:report.summary,
 eligibleMediaIds:report.eligibleMediaIds,uniqueSourceBlobs:report.eligibleUniqueSourceBlobs,
 affectedQuestions:report.eligibleAffectedQuestionCount,
 top:groups.slice(0,10).map(x=>({semantic:x.semantic,mediaIds:x.mediaIds.length,questions:x.questionIds.length}))}));
