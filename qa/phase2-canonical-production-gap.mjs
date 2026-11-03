#!/usr/bin/env node
// Read-only QA: 600 canonical compiled questions vs current Orange production media.
// No runtime, images, registry, answers, or production changes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const root=process.cwd(),dist=path.join(root,'dist-pages');
const source=await json('qa/results/assets-duduq-source-inventory.json');
const crosswalk=await json('qa/results/assets-duduq-question-crosswalk.json');
const sourceCommit='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
assert.equal(source.sourceCommit,sourceCommit);
assert.equal(crosswalk.sourceCommit,sourceCommit);
assert.equal(source.fileCount,420);
assert.equal(crosswalk.questionCount,600);
const manifestLines=(await readFile(path.join(dist,'.duduq-pages-manifest'),'utf8')).trim().split(/\r?\n/);
assert.equal(manifestLines.length,2891,'WRONG_CURRENT_ORANGE_RELEASE');
const hashes=new Map();
for(const line of manifestLines){const p=line.lastIndexOf(' '),f=line.slice(0,p),digest=line.slice(p+1);
 assert(p>0&&/^[0-9a-f]{64}$/.test(digest)&&!hashes.has(f),'BAD_MANIFEST');hashes.set(f,digest);
}
async function loadVerified(f){assert(hashes.has(f),'FILE_NOT_IN_MANIFEST:'+f);
 const b=await readFile(path.join(dist,f));assert.equal(sha(b),hashes.get(f),'HASH_MISMATCH:'+f);
 return JSON.parse(b.toString('utf8'));
}
const reg=await loadVerified('content/english/media/media-registry.json');
assert(Array.isArray(reg.entries)&&reg.entries.length>=1000);
const entries=new Map();
for(const e of reg.entries){assert(typeof e.mediaId==='string'&&!entries.has(e.mediaId));entries.set(e.mediaId,e);}
const use=new Map(),questionIds=new Set();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const id='Y'+y+'M'+String(m).padStart(2,'0');
 const p='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const mod=await loadVerified(p);assert.equal(mod.moduleId,id);assert.equal(mod.items?.length,20);
 for(const q of mod.items){
  const qid=q.item_id;assert(qid?.startsWith(id+'-')&&!questionIds.has(qid),'INVALID_QUESTION:'+qid);
  questionIds.add(qid);
  const add=(mediaId,slot,concept)=>{if(typeof mediaId!=='string'||!mediaId.startsWith('IMG-'))return;
   const found=use.get(mediaId)||[];found.push({questionId:qid,moduleId:id,slot,semanticTarget:typeof concept==='string'?concept:null});use.set(mediaId,found);
  };
  const visit=(node,p='question')=>{
   if(!node||typeof node!=='object')return;
   if(Array.isArray(node)){node.forEach((v,i)=>visit(v,p+'['+i+']'));return;}
   for(const [k,v]of Object.entries(node)){
    if(['mediaId','assetId','imageRef','image_ref','imageId'].includes(k))add(v,p+'.'+k,node.semanticTarget);
    if(['mediaIds','imageIds'].includes(k)&&Array.isArray(v))v.forEach((z,i)=>add(z,p+'.'+k+'['+i+']',node.semanticTarget));
    if(v&&typeof v==='object'&&!['mediaIds','imageIds'].includes(k))visit(v,p+'.'+k);
   }
  };
  visit(q);
 }
}
assert.equal(questionIds.size,600);
const previous=new Map(crosswalk.mediaBindingIndex.map(x=>[x.mediaId,x]));
const allSource=new Set(source.files.map(x=>x.path));
const ids=[],byModule=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const k='Y'+y+'M'+String(m).padStart(2,'0');
 byModule.set(k,{moduleId:k,referencedIds:0,alreadyImageOrNonSvg:0,pendingSvg:0,readyForImageReview:0,blockedOrUnclear:0,missingRegistry:0});
}
for(const [mediaId,uses]of use){
 const current=entries.get(mediaId),history=previous.get(mediaId);
 const distinct=[...new Set(uses.map(x=>x.questionId))].sort();
 const modules=[...new Set(uses.map(x=>x.moduleId))].sort();
 const candidates=(history?.candidatePaths||[]).filter(x=>allSource.has(x));
 const semantic=norm(current?.semantic),explicit=[...new Set(uses.map(x=>norm(x.semanticTarget)).filter(Boolean))];
 const risks=[];
 if(!current)risks.push('MISSING_REGISTRY');
 if(!semantic)risks.push('NO_REGISTRY_SEMANTIC');
 if(!candidates.length)risks.push('NO_SOURCE_LEAD');
 if(candidates.length>1)risks.push('MULTIPLE_SOURCE_VARIANTS');
 if(uses.some(x=>!x.semanticTarget))risks.push('IMPLICIT_LEAF_SEMANTICS');
 if(explicit.some(x=>x!==semantic))risks.push('EXPLICIT_SEMANTIC_CONFLICT');
 if(history&&JSON.stringify(history.questions)!==JSON.stringify(distinct))risks.push('HISTORICAL_USAGE_DIFF');
 if(/orange/i.test(mediaId+' '+semantic))risks.push('ORANGE_FRUIT_COLOR_CONTEXT');
 if(/white/i.test(mediaId+' '+semantic))risks.push('WHITE_CONTRAST_BLOCK');
 if(/banana/i.test(mediaId+' '+semantic))risks.push('BANANA_TEMPORARY_AUDIT');
 if(current?.temporary!==true)risks.push('TEMPORARY_NOT_TRUE');
 const currentPath=String(current?.urlOrPath||'');
 const provisionalSvg=currentPath.toLowerCase().endsWith('.svg');
 if(!provisionalSvg)risks.push('NOT_PROVISIONAL_SVG');
 if(current?.humanResolutionStatus==='PEDAGOGICAL_QA_APPROVED')risks.push('ALREADY_PEDAGOGICALLY_APPROVED');
 const state=!current?'MISSING_REGISTRY':!provisionalSvg?'ALREADY_IMAGE_OR_NON_SVG':
   risks.length===0?'READY_FOR_IMAGE_AND_PEDAGOGICAL_QA':'REVIEW_OR_BLOCK';
 for(const k of modules){
  const m=byModule.get(k);m.referencedIds++;
  if(state==='MISSING_REGISTRY')m.missingRegistry++;
  else if(state==='ALREADY_IMAGE_OR_NON_SVG')m.alreadyImageOrNonSvg++;
  else{m.pendingSvg++;if(state==='READY_FOR_IMAGE_AND_PEDAGOGICAL_QA')m.readyForImageReview++;else m.blockedOrUnclear++;}
 }
 ids.push({mediaId,semantic:current?.semantic??null,currentPath,currentTemporary:current?.temporary??null,
  candidateSourcePaths:candidates,currentDistinctQuestions:distinct,modules,
  occurrenceCount:uses.length,implicitLeafCount:uses.filter(x=>!x.semanticTarget).length,
  explicitSemantics:explicit,risks,state});
}
const ready=ids.filter(x=>x.state==='READY_FOR_IMAGE_AND_PEDAGOGICAL_QA')
 .sort((a,b)=>b.currentDistinctQuestions.length-a.currentDistinctQuestions.length||a.mediaId.localeCompare(b.mediaId));
const review=ids.filter(x=>x.state==='REVIEW_OR_BLOCK')
 .sort((a,b)=>b.currentDistinctQuestions.length-a.currentDistinctQuestions.length||a.mediaId.localeCompare(b.mediaId));
const plan=ready.slice(0,100).map(x=>({mediaId:x.mediaId,sourcePath:x.candidateSourcePaths[0],semantic:x.semantic,
 questionIds:x.currentDistinctQuestions,sourceGitBlob:source.files.find(f=>f.path===x.candidateSourcePaths[0])?.gitBlobSha,
 status:'CANDIDATE_ONLY_SOURCE_BYTES_AND_VISUAL_QA_PENDING'}));
const output={
 schemaVersion:'DUDUQ_PRODUCTION_ORANGE_SAFE_CROSSWALK_V1',
 status:'READ_ONLY_PRODUCTION_CONTRACT_GAP_QA_NO_APPROVAL',
 productionDeployment:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 productionCommit:'acccef36c8a3029d98e5efef1923b0b6fdad36e1',
 distributionRelease:'duduq-phase2-orange-fruit-color-corrected-20261103',
 releaseTarSha256:'cf049f8c7a5f3d02696f7997b6dd1e31ec7b28942f6c77b96af656e72b5a1800',
 assetSourceCommit:sourceCommit,assets:source.fileCount,assetsUniqueGitBlobs:source.uniqueGitBlobShas,
 manifestFiles:hashes.size,registryEntries:entries.size,questions:questionIds.size,
 referencedMediaIds:use.size,sharedMediaIds:ids.filter(x=>x.currentDistinctQuestions.length>1).length,
 alreadyImageOrNonSvg:ids.filter(x=>x.state==='ALREADY_IMAGE_OR_NON_SVG').length,
 missingRegistry:ids.filter(x=>x.state==='MISSING_REGISTRY').length,
 pendingSvg:ids.filter(x=>['READY_FOR_IMAGE_AND_PEDAGOGICAL_QA','REVIEW_OR_BLOCK'].includes(x.state)).length,
 readyForImageReview:ready.length,needsFurtherReview:review.length,
 historicalCandidatesFromSource:ids.filter(x=>x.candidateSourcePaths.length>0).length,
 byModule:[...byModule.values()],nextPixelQaCandidates:plan,reviewQueue:review,mediaIdAudit:ids,
 protection:{approved:false,questionsChanged:0,registryChanged:0,deployPerformed:false}
};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-production-gap.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:output.status,production:output.productionDeployment,contracts:output.questions,
 registry:output.registryEntries,referenced:output.referencedMediaIds,pendingSvg:output.pendingSvg,
 readyForImageReview:ready.length,needsReview:review.length,
 topCandidates:plan.slice(0,15).map(x=>({mediaId:x.mediaId,source:x.sourcePath,questions:x.questionIds.length}))}));
