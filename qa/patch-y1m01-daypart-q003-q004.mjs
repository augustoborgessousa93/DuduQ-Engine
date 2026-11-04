#!/usr/bin/env node
/**
 * DUDUQ - targeted time-of-day scenes for Y1M01 Q003/Q004 (QA ONLY).
 * Never replace shared morning/afternoon/night mediaIDs across all 30 modules.
 * Duplicate official sources into three isolated IDs and redirect references
 * solely inside these two question objects, preserving all correct choices.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const relQ='content/english/year-1/module-01/questions.json';
const relR='content/english/media/media-registry.json';
const relM='.duduq-pages-manifest';
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.concat([
 Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const load=rel=>readFile(path.join(root,rel));
const qBefore=await load(relQ),rBefore=await load(relR),mBefore=await load(relM);
const questions=JSON.parse(qBefore),registry=JSON.parse(rBefore);
assert.equal(questions.moduleId,'Y1M01');
assert.equal(questions.items.length,20,'NOT_20_QUESTIONS');
const originalQuestions=JSON.parse(JSON.stringify(questions.items));
const byQuestion=new Map(questions.items.map(q=>[q.item_id,q]));
const protectedQ=byQuestion.get('Y1M01-Q001');
assert.equal(protectedQ?.answerKey,'hello','OWNER_APPROVED_Q001_INVALID');
assert.equal(protectedQ?.resposta,'C','OWNER_APPROVED_Q001_LETTER_INVALID');
assert.deepEqual(protectedQ.options?.map(x=>x.optionId),['reading','sleep','hello','snack'],
 'OWNER_APPROVED_Q001_OPTIONS_DRIFT');
const reportId='DUDUQ_Y1M01_TIME_OF_DAY_Q003_Q004_V1';
const sourceSHA='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
const scenes=[
 {concept:'morning',oldId:'IMG-Y1M01-GREETING-MORNING-001',
  newId:'IMG-Y1M01-Q003-Q004-MORNING-OFFICIAL-20261104',
  filename:'Imagens Ilustrativa/Good Morning.png',
  git:'c17fc4fef70d9251d45a6f44d649126aa852c8d2'},
 {concept:'afternoon',oldId:'IMG-Y1M01-GREETING-AFTERNOON-001',
  newId:'IMG-Y1M01-Q003-Q004-AFTERNOON-OFFICIAL-20261104',
  filename:'Imagens Ilustrativa/Good Afternoon.png',
  git:'74b90da1925c289da672945d9a7def6df1ca9e00'},
 {concept:'night',oldId:'Y1M01-EMOJI-NIGHT-001',
  newId:'IMG-Y1M01-Q003-Q004-NIGHT-OFFICIAL-20261104',
  filename:'Imagens Ilustrativa/Good Night.png',
  git:'3f4ffba44955ebd37f2da378e8d14a9ea4665396'}
];
const existing=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(existing.size,registry.entries.length,'DUPLICATE_REGISTRY_IDS');
for(const s of scenes){
 assert(existing.has(s.oldId),'BASE_DAYPART_ID_MISSING:'+s.oldId);
 assert(!existing.has(s.newId),'NEW_ID_ALREADY_USED:'+s.newId);
}
const expected={
 'Y1M01-Q003':{letter:'D',answer:'good morning',prompt:'Good morning!'},
 'Y1M01-Q004':{letter:'B',answer:'good afternoon',prompt:'Good afternoon!'}
};
for(const [qid,e] of Object.entries(expected)){
 const q=byQuestion.get(qid);assert(q,'QUESTION_MISSING:'+qid);
 assert.equal(q.resposta,e.letter,'ANSWER_LETTER_DRIFT:'+qid);
 assert(q.audio_transcript===e.prompt,'TARGET_AUDIO_DRIFT:'+qid);
 assert(q.answerKey===e.answer||q.answerKey?.replaceAll('-',' ')===e.answer,
  'ANSWER_KEY_DRIFT:'+qid);
}
const mLines=mBefore.toString('utf8').trimEnd().split(/\r?\n/);
const index=new Map(mLines.map((line,i)=>{
 const at=line.lastIndexOf(' ');
 assert(at>0,'BAD_MANIFEST_LINE');
 const rel=line.slice(0,at),digest=line.slice(at+1);
 assert(/^[0-9a-f]{64}$/.test(digest),'BAD_SHA256:'+rel);
 return [rel,{i,digest}];
}));
assert.equal(index.size,mLines.length,'DUPLICATE_MANIFEST_LINES');
assert.equal(index.get(relQ)?.digest,sha256(qBefore),'QUESTION_PREVIOUS_MANIFEST_DRIFT');
assert.equal(index.get(relR)?.digest,sha256(rBefore),'REGISTRY_PREVIOUS_MANIFEST_DRIFT');
const originals=[];
for(const scene of scenes){
 const url='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+
  sourceSHA+'/'+scene.filename.split('/').map(encodeURIComponent).join('/');
 let binary=null,lastError=null;
 for(let attempt=1;attempt<=4;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
   assert(response.ok,'SOURCE_HTTP_'+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());
   assert.equal(gitBlob(bytes),scene.git,'ORIGINAL_GIT_SHA_MISMATCH:'+scene.concept);
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG');
   assert(bytes.readUInt32BE(16)>=512&&bytes.readUInt32BE(20)>=512,'IMAGE_TOO_SMALL');
   assert([2,6].includes(bytes[25]),'UNSUPPORTED_PNG_COLOR');
   binary=bytes;lastError=null;break;
  }catch(err){
   lastError=err;
   if(/SHA_MISMATCH|NOT_PNG|IMAGE_TOO_SMALL|UNSUPPORTED_PNG_COLOR/.test(String(err)))break;
   if(attempt<4)await new Promise(resolve=>setTimeout(resolve,400*attempt));
  }
 }
 if(lastError)throw lastError;
 const digest=sha256(binary);
 const dest='content/english/assets/images/assets-duduq/daypart-'+
  scene.concept+'-'+scene.git.slice(0,12)+'-'+digest.slice(0,12)+'.png';
 const prior=index.get(dest);
 if(prior)assert.equal(prior.digest,digest,'DESTINATION_IMAGE_COLLISION');
 originals.push({...scene,binary,dest,digest,alreadyExists:Boolean(prior)});
}
const mapping=new Map(scenes.map(s=>[s.oldId,s.newId]));
const replaceMedia=(node,counter)=>{
 if(!node||typeof node!=='object')return;
 if(Array.isArray(node)){for(const v of node)replaceMedia(v,counter);return;}
 for(const [key,value] of Object.entries(node)){
  if(['mediaId','assetId','image_ref','imageRef'].includes(key)&&
    typeof value==='string'&&mapping.has(value)){
    node[key]=mapping.get(value);
    counter[value]=(counter[value]||0)+1;
   }else if(value&&typeof value==='object')replaceMedia(value,counter);
 }
};
const counters={};
for(const qid of Object.keys(expected)){
 const q=byQuestion.get(qid);
 const old=JSON.stringify(q);
 replaceMedia(q,counters);
 // Compare exact original JSON after restoring ONLY changed media references.
 let restored=JSON.stringify(q);
 for(const [oldId,newId] of mapping)restored=restored.replaceAll(newId,oldId);
 assert.equal(restored,old,'Q003_Q004_NON_MEDIA_CONTRACT_CHANGED:'+qid);
 const actual=[...JSON.stringify(q).matchAll(/IMG-Y1M01-Q003-Q004-[A-Z]+-OFFICIAL-20261104/g)];
 assert(actual.length>=3,'SCENES_MISSING_FROM_QUESTION:'+qid);
}
for(const [oldId,newId] of mapping){
 assert((counters[oldId]||0)>=2,'MISSING_REAL_USAGE:'+oldId);
}
assert.deepEqual(questions.items.filter(q=>!expected[q.item_id]),
 originalQuestions.filter(q=>!expected[q.item_id]),
 'SOME_OTHER_QUESTION_CHANGED');
for(const s of originals){
 const old=existing.get(s.oldId);
 registry.entries.push({
  ...structuredClone(old),
  mediaId:s.newId,
  semantic:s.concept==='morning'?'good morning':
    s.concept==='afternoon'?'good afternoon':'good night',
  description:'Official '+s.concept+' visual — scoped Y1M01 Q003/Q004; pedagogical QA pending',
  kind:'image',status:'APPROVED',temporary:false,urlOrPath:s.dest,sha256:s.digest,
  assets:[{path:s.dest,sha256:s.digest,temporary:false,mediaType:'image/png'}],
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  integrationStatus:'ISOLATED_Q003_Q004_DAYPART_QA_ONLY',
  provenance:{provider:'Assets-DuduQ',sourceCommit:sourceSHA,
   sourcePath:s.filename,sourceGitBlob:s.git,sha256:s.digest},
  usedByItems:['Y1M01-Q003','Y1M01-Q004'],
  replacementAudit:{qaOnly:true,previousMediaId:s.oldId,
   sourceSHA,usageScope:['Y1M01-Q003','Y1M01-Q004'],
   decision:'OFFICIAL_DAYPART_SCENE_PEDAGOGICAL_REVIEW_PENDING'}
 });
}
assert.equal(new Set(registry.entries.map(e=>e.mediaId)).size,registry.entries.length);
const qNew=Buffer.from(JSON.stringify(questions,null,2)+'\n');
const rNew=Buffer.from(JSON.stringify(registry,null,2)+'\n');
mLines[index.get(relQ).i]=relQ+' '+sha256(qNew);
mLines[index.get(relR).i]=relR+' '+sha256(rNew);
for(const s of originals.filter(x=>!x.alreadyExists))mLines.push(s.dest+' '+s.digest);
const manifest=Buffer.from(mLines.join('\n')+'\n');
const write=async(rel,bytes)=>{
 const dest=path.resolve(root,rel);
 assert(dest.startsWith(root+path.sep),'UNSAFE_DESTINATION');
 await mkdir(path.dirname(dest),{recursive:true});
 await writeFile(dest,bytes);
};
for(const s of originals){
 if(s.alreadyExists){
  assert.equal(sha256(await load(s.dest)),s.digest,'EXISTING_PNG_BYTES_DRIFT');
 }else await write(s.dest,s.binary);
}
await write(relQ,qNew);
await write(relR,rNew);
await write(relM,manifest);
const mMap=new Map(mLines.map(line=>{
 const cut=line.lastIndexOf(' ');
 return [line.slice(0,cut),line.slice(cut+1)];
}));
for(const [rel,digest] of mMap){
 const current=sha256(await load(rel));
 assert.equal(current,digest,'POST_PATCH_SHA256_MISMATCH:'+rel);
}
const after=JSON.parse(await load(relQ));
assert.equal(after.items.length,20);
assert.deepEqual(after.items.find(x=>x.item_id==='Y1M01-Q001'),protectedQ,
 'OWNER_APPROVED_Q001_CHANGED');
const report={
 schemaVersion:reportId,status:'PREVIEW_PATCH_COMPLETE_PEDAGOGICAL_REVIEW_PENDING',
 questionIds:['Y1M01-Q003','Y1M01-Q004'],
 answerKeysPreserved:true,ownerApprovedHelloQ001Preserved:true,
 unchangedOtherModuleQuestions:18,sourceCommit:sourceSHA,
 sources:originals.map(x=>({concept:x.concept,source:x.filename,mediaId:x.newId,
  sha256:x.digest,sourceGitBlob:x.git,publishedPath:x.dest})),
 realMediaReferencesChanged:counters,addedPngFiles:originals.filter(x=>!x.alreadyExists).length,
 contractsTotal:600,questionFilesChanged:1,productionDeployed:false,
 humanPedagogicalReview:'PENDING'};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/y1m01-daypart-q003-q004.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_DAYPART_Q003_Q004_PATCH_PASS='+JSON.stringify(report));
