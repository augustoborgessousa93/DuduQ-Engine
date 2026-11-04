#!/usr/bin/env node
// DUDUQ Y1M01-Q001: precise editorial change to visual options ONLY.
// Expected before: A=Farewell, B=Sleep, C=Hello (correct), D=Snack.
// Expected after:  A=Reading, B=Sleep, C=Focused Hello (correct), D=Snack.
// The two new mediaIds are unique to Q001 so 16 other Goodbye users are safe.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const ROOT=path.resolve('qa/fast-bilingual-immutable-candidate');
const questionsRel='content/english/year-1/module-01/questions.json';
const registryRel='content/english/media/media-registry.json';
const manifestRel='.duduq-pages-manifest';
const sourceCommit='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const read=async rel=>await readFile(path.join(ROOT,rel));
const initial={questions:await read(questionsRel),registry:await read(registryRel),manifest:await read(manifestRel)};
const docs=JSON.parse(initial.questions),registry=JSON.parse(initial.registry);
const q=docs.items.find(x=>x.item_id==='Y1M01-Q001');
assert(q,'Q001_MISSING');
const snapshot=JSON.parse(JSON.stringify(q));
assert.equal(q.resposta,'C','CORRECT_LETTER_CHANGED');
assert.equal(q.answerKey,'hello','CORRECT_KEY_CHANGED');
assert.equal(q.correctAnswerContract?.answerKey,'hello','CORRECT_CONTRACT_CHANGED');
assert.equal(q.audio_transcript,'Hello!','AUDIO_TARGET_CHANGED');
assert.equal(q.targetPolicy?.correctOptionId,'hello','CORRECT_TARGET_CHANGED');
assert.equal(q.options?.length,4,'NOT_FOUR_OPTIONS');
assert.equal(q.optionContract?.choices?.length,4,'NOT_FOUR_CONTRACT_CHOICES');
const exactIds=['farewell','sleep','hello','snack'];
assert.deepEqual(q.options.map(x=>x.optionId),exactIds,'OPTION_ORDER_DRIFT');
assert.deepEqual(q.optionContract.choices.map(x=>x.optionId),exactIds,'CONTRACT_ORDER_DRIFT');
assert.deepEqual(q.mediaBindings.map(x=>x.role),['option_a','option_b','option_c','option_d']);
assert.equal(q.options[0].mediaId,'IMG-Y1M01-FAREWELL-GENERIC-001');
assert.equal(q.options[2].mediaId,'IMG-Y1M01-GREETING-GENERIC-001');

const sources=[
 {newId:'IMG-Y1M01-Q001-READING-DISTRACTOR-20261104',
  src:'Imagens Ilustrativa/Reading — Lendo.png',
  git:'52019f75341009c2e3900e1581e7da1baac2c036',concept:'reading'},
 {newId:'IMG-Y1M01-Q001-HELLO-FOCUSED-20261104',
  src:'Imagens Ilustrativa/Hello - oi.png',
  git:'70e74ce5db1853ee0da7a93ab1f96da7bf457ab0',concept:'hello'}
];
const byId=new Map(registry.entries.map(x=>[x.mediaId,x]));
for(const item of sources)assert(!byId.has(item.newId),'MEDIA_ID_ALREADY_IN_REGISTRY:'+item.newId);
const lines=initial.manifest.toString('utf8').trimEnd().split(/\r?\n/);
const manifest=new Map(lines.map(line=>{
 const cut=line.lastIndexOf(' ');
 assert(cut>0,'BAD_MANIFEST_LINE');
 const rel=line.slice(0,cut),digest=line.slice(cut+1);
 assert(/^[a-f0-9]{64}$/.test(digest),'BAD_MANIFEST_HASH');
 return [rel,digest];
}));
const entries=[];
for(const item of sources){
 const url='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+
  sourceCommit+'/'+item.src.split('/').map(encodeURIComponent).join('/');
 let bytes=null,error=null;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
   assert(response.ok,'SOURCE_HTTP_'+response.status);
   const data=Buffer.from(await response.arrayBuffer());
   assert.equal(gitBlob(data),item.git,'ORIGINAL_GIT_BLOB_MISMATCH:'+item.src);
   assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG');
   assert(data.readUInt32BE(16)>=512&&data.readUInt32BE(20)>=512,'PNG_TOO_SMALL');
   assert([2,6].includes(data[25]),'PNG_COLOR_UNSUPPORTED');
   bytes=data;error=null;break;
  }catch(e){error=e;if(/MISMATCH|NOT_PNG|TOO_SMALL|UNSUPPORTED/.test(String(e)))break;}
 }
 if(error)throw error;
 const digest=sha256(bytes);
 const dest='content/english/assets/images/assets-duduq/y1m01-q001-'+item.concept+'-'+item.git.slice(0,12)+'-'+digest.slice(0,12)+'.png';
 if(manifest.has(dest)){
  assert.equal(manifest.get(dest),digest,'EXISTING_PATH_WRONG_HASH');
  assert.equal(sha256(await read(dest)),digest,'EXISTING_SOURCE_WRONG_BYTES');
 }
 entries.push({...item,dest,digest,bytes,alreadyExists:manifest.has(dest)});
}

function setOption(opt,optionId,answerKey,label,mediaId,correct){
 assert(opt&&typeof opt==='object','OPTION_MISSING');
 opt.optionId=optionId;
 opt.answerKey=answerKey;
 opt.label=label;
 opt.mediaId=mediaId;
 opt.correct=correct;
 opt.semanticReview='NEEDS_HUMAN_REVIEW';
}
const reading=entries.find(x=>x.concept==='reading'),hello=entries.find(x=>x.concept==='hello');
setOption(q.options[0],'reading','reading','Criança lendo',reading.newId,false);
setOption(q.optionContract.choices[0],'reading','reading','Criança lendo',reading.newId,false);
setOption(q.options[2],'hello','hello','Criança cumprimentando com um aceno',hello.newId,true);
setOption(q.optionContract.choices[2],'hello','hello','Criança cumprimentando com um aceno',hello.newId,true);
q.opcao_a='Criança lendo';
q.opcao_c='Criança cumprimentando com um aceno';
q.mediaBindings[0].mediaId=reading.newId;
q.mediaBindings[2].mediaId=hello.newId;
q.image_ref=hello.newId;
q.distractorOptionIds=['reading','sleep','snack'];
q.optionContract.distractorOptionIds=['reading','sleep','snack'];
q.distractorContract.optionIds=['reading','sleep','snack'];
q.distractorContract.source='Q001 targeted editorial improvement; requires visual QA';
q.visual_requirement='scene:greeting; close-up_waving_hello; no_text; requires_visual_review';
assert.equal(q.answerKey,snapshot.answerKey);
assert.equal(q.resposta,snapshot.resposta);
assert.deepEqual(q.correctAnswerContract,snapshot.correctAnswerContract);
assert.deepEqual(q.targetPolicy,snapshot.targetPolicy);
assert.deepEqual(q.instruction,snapshot.instruction);
assert.deepEqual(q.stimulusContract,snapshot.stimulusContract);
assert.equal(q.audio_ref,snapshot.audio_ref);
assert.equal(q.contentAudioId,snapshot.contentAudioId);
assert.equal(q.options.filter(x=>x.correct).length,1);
assert.equal(q.options.find(x=>x.correct).optionId,'hello');
assert.equal(q.options.some(x=>x.optionId==='farewell'),false);
assert.deepEqual(docs.items.filter(x=>x.item_id!=='Y1M01-Q001'),
 JSON.parse(initial.questions).items.filter(x=>x.item_id!=='Y1M01-Q001'),
 'OTHER_Y1M01_ITEMS_CHANGED');
for(const item of entries){
 registry.entries.push({
  mediaId:item.newId,requirementId:'Y1M01-Q001-SCOPED-VISUAL-20261104',
  kind:'image',status:'APPROVED',semantic:item.concept,
  description:item.concept==='hello'?'Hello visual close-up':'Reading, unambiguous non-greeting distractor',
  urlOrPath:item.dest,sha256:item.digest,temporary:false,
  assets:[{path:item.dest,sha256:item.digest,temporary:false,mediaType:'image/png'}],
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  integrationStatus:'ISOLATED_Q001_PREVIEW_NOT_PRODUCTION',
  provenance:{provider:'Assets-DuduQ',sourceCommit,sourcePath:item.src,
   sourceGitBlob:item.git,sha256:item.digest},
  usedByItems:['Y1M01-Q001']
 });
}
assert.equal(new Set(registry.entries.map(x=>x.mediaId)).size,registry.entries.length);
const qBytes=Buffer.from(JSON.stringify(docs,null,2)+'\n');
const registryBytes=Buffer.from(JSON.stringify(registry,null,2)+'\n');
const changed=new Map([[questionsRel,sha256(qBytes)],[registryRel,sha256(registryBytes)]]);
for(const [rel,digest] of changed){
 assert(manifest.has(rel),'MANIFEST_ENTRY_MISSING:'+rel);
 manifest.set(rel,digest);
}
for(const item of entries)manifest.set(item.dest,item.digest);
const revised=lines.map(line=>{
 const cut=line.lastIndexOf(' '),rel=line.slice(0,cut);
 return rel+' '+(changed.get(rel)||manifest.get(rel));
});
for(const item of entries.filter(x=>!x.alreadyExists))revised.push(item.dest+' '+item.digest);
const manifestBytes=Buffer.from(revised.join('\n')+'\n');
const staged=[
 {p:questionsRel,b:qBytes},{p:registryRel,b:registryBytes},
 ...entries.filter(x=>!x.alreadyExists).map(x=>({p:x.dest,b:x.bytes})),
 {p:manifestRel,b:manifestBytes}
];
for(const {p,b} of staged){
 const dest=path.resolve(ROOT,p);
 assert(dest.startsWith(ROOT+path.sep),'UNSAFE_ASSET_PATH');
 await mkdir(path.dirname(dest),{recursive:true});
 await writeFile(dest,b);
}
for(const [rel,digest] of manifest){
 assert.equal(sha256(await read(rel)),digest,'POSTBUILD_MANIFEST_MISMATCH:'+rel);
}
const report={schemaVersion:'DUDUQ_Y1M01_Q001_FOCUSED_PREVIEW_V1',
 qaOnly:true,productionDeployed:false,visualApprovalPending:true,
 questionId:'Y1M01-Q001',answerKeyBefore:snapshot.answerKey,answerKeyAfter:q.answerKey,
 answerLetterBefore:snapshot.resposta,answerLetterAfter:q.resposta,
 correctOptionBefore:snapshot.targetPolicy.correctOptionId,
 correctOptionAfter:q.targetPolicy.correctOptionId,
 distractorRemoved:'farewell',distractorAdded:'reading',
 newHelloSource:hello.src,newHelloMediaId:hello.newId,
 newDistractorSource:reading.src,newDistractorMediaId:reading.newId,
 sourceCommit,newPngs:entries.filter(x=>!x.alreadyExists).length,
 preservedOtherQuestionsInModule:19,verifiedManifestEntries:manifest.size};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/y1m01-q001-focused-preview.json',JSON.stringify(report,null,2)+'\n');
console.log('Y1M01_Q001_FOCUSED_CHANGE_PASS='+JSON.stringify(report));
