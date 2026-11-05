#!/usr/bin/env node
/**
 * Y1M01 Q003: four OFFICIAL, concept-aligned scenes. Q004 intentionally
 * retains its original official daypart scenes, so correct and distractor
 * pictures do NOT repeat across neighboring questions.
 * QA PREVIEW ONLY. No answer key, text instruction or runtime modification.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const rq='content/english/year-1/module-01/questions.json';
const rr='content/english/media/media-registry.json';
const rm='.duduq-pages-manifest';
const sourceCommit='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const read=rel=>readFile(path.join(root,rel));
const [qBefore,rBefore,mBefore]=await Promise.all([read(rq),read(rr),read(rm)]);
const doc=JSON.parse(qBefore),registry=JSON.parse(rBefore);
assert.equal(doc.moduleId,'Y1M01');assert.equal(doc.items.length,20);
const original=new Map(doc.items.map(q=>[q.item_id,structuredClone(q)]));
const q=doc.items.find(q=>q.item_id==='Y1M01-Q003');
const q4=doc.items.find(q=>q.item_id==='Y1M01-Q004');
assert(q&&q4,'DAYPART_QUESTIONS_MISSING');
assert.equal(q.answerKey,'morning');assert.equal(q.resposta,'D');
assert.equal(q.audio_transcript,'Good morning!');
assert.equal(q.targetPolicy?.correctOptionId,'morning');
assert.equal(q.optionContract?.correctOptionId,'morning');
assert.deepEqual(q.options.map(o=>o.optionId),['afternoon','night','farewell','morning']);
assert.deepEqual(q.options.map(o=>o.correct),[false,false,false,true]);
const q4Original=structuredClone(q4);
const mLines=mBefore.toString().trimEnd().split(/\r?\n/);
const manifest=new Map(mLines.map(line=>{
 const at=line.lastIndexOf(' ');
 assert(at>0,'BAD_MANIFEST_ROW');
 return [line.slice(0,at),line.slice(at+1)];
}));
assert.equal(manifest.get(rq),sha(qBefore),'QUESTION_MANIFEST_DRIFT');
assert.equal(manifest.get(rr),sha(rBefore),'REGISTRY_MANIFEST_DRIFT');
const entries=new Map(registry.entries.map(e=>[e.mediaId,e]));
const sources=[
 {optionId:'afternoon',role:'option_a',legacy:'opcao_a',semantic:'afternoon',
  old:'IMG-Y1M01-Q003-Q004-AFTERNOON-OFFICIAL-20261104',
  name:'boy_tarde_afternoon_periodo_da_tarde.png',
  sha:'914f7cb080fef15e0ae376673f4ad0f1ff2b9f31',
  label:'Criança em um cenário de tarde'},
 {optionId:'night',role:'option_b',legacy:'opcao_b',semantic:'night',
  old:'IMG-Y1M01-Q003-Q004-NIGHT-OFFICIAL-20261104',
  name:'boy_noite_night_bedtime_rotina_de_sono.png',
  sha:'b06361382e3ecbe0d49927f9a9ea4665396',
  label:'Criança em rotina noturna'},
 {optionId:'farewell',role:'option_c',legacy:'opcao_c',semantic:'sleep',
  old:'IMG-Y1M01-VARIETY-BOOKCASE-20261104',
  name:'routine-go-to-sleep-ir-dormir.png',
  sha:'24bcf6f5758bec268eceaedb50a1b890d07151dc',
  label:'Criança se preparando para dormir'},
 {optionId:'morning',role:'option_d',legacy:'opcao_d',semantic:'morning',
  old:'IMG-Y1M01-Q003-Q004-MORNING-OFFICIAL-20261104',
  name:'boy_manha_morning_sunrise_sol_nascendo.png',
  sha:'3c8c9b65700d93f5648deab9f008f441e7923f9f',
  label:'Criança ao nascer do sol'}
];
const added=[],processed=[];
for(const x of sources){
 const o=q.options.find(o=>o.optionId===x.optionId),c=q.optionContract.choices.find(o=>o.optionId===x.optionId);
 const binding=q.mediaBindings.find(e=>e.role===x.role);
 assert(o&&c&&binding,'MISSING_Q003_OPTION:'+x.optionId);
 assert.equal(o.mediaId,x.old,'OPTION_DRIFT:'+x.optionId);
 assert.equal(c.mediaId,x.old,'OPTION_CONTRACT_DRIFT:'+x.optionId);
 assert.equal(binding.mediaId,x.old,'BINDING_DRIFT:'+x.optionId);
 assert.equal(Boolean(o.correct),x.optionId==='morning');
 assert.equal(Boolean(c.correct),x.optionId==='morning');
 const pathInRepo='Imagens Ilustrativa/'+x.name;
 const url='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+sourceCommit+'/'+
   pathInRepo.split('/').map(encodeURIComponent).join('/');
 let bytes=null,last=null;
 for(let attempt=1;attempt<=4;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
   assert(response.ok,'SOURCE_HTTP_'+response.status);
   const data=Buffer.from(await response.arrayBuffer());
   assert.equal(blob(data),x.sha,'GIT_BLOB_MISMATCH:'+x.name);
   assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','SOURCE_IS_NOT_PNG');
   assert(data.readUInt32BE(16)>=512&&data.readUInt32BE(20)>=512,'PNG_TOO_SMALL');
   bytes=data;last=null;break;
  }catch(err){last=err;if(/MISMATCH|NOT_PNG|TOO_SMALL/.test(String(err)))break}
 }
 if(last)throw last;
 const digest=sha(bytes);
 const mediaId='IMG-Y1M01-Q003-ALTERNATE-'+x.semantic.toUpperCase()+'-'+x.optionId.toUpperCase()+'-20261105';
 assert(!entries.has(mediaId),'MEDIA_ID_EXISTS');
 const dest='content/english/assets/images/assets-duduq/y1m01-q003-'+
  x.semantic+'-'+x.sha.slice(0,12)+'-'+digest.slice(0,12)+'.png';
 if(manifest.has(dest)){
   assert.equal(manifest.get(dest),digest,'DESTINATION_HASH_COLLISION');
   assert.equal(sha(await read(dest)),digest,'DESTINATION_BYTES_MISMATCH');
 }else{added.push({dest,bytes});manifest.set(dest,digest)}
 o.mediaId=mediaId;c.mediaId=mediaId;binding.mediaId=mediaId;
 o.label=x.label;c.label=x.label;q[x.legacy]=x.label;
 o.semanticReview='NEEDS_HUMAN_REVIEW';c.semanticReview='NEEDS_HUMAN_REVIEW';
 if(x.optionId==='morning')assert.equal(q.image_ref,x.old),
  q.image_ref=mediaId;
 registry.entries.push({
  mediaId,kind:'image',status:'APPROVED',temporary:false,
  semantic:x.semantic,description:'Y1M01 Q003 alternate daypart scene — '+x.label,
  urlOrPath:dest,sha256:digest,
  assets:[{path:dest,sha256:digest,mediaType:'image/png',temporary:false}],
  provenance:{provider:'Assets-DuduQ',sourceCommit,sourcePath:pathInRepo,
   sourceGitBlob:x.sha,sha256:digest},
  usedByItems:['Y1M01-Q003'],
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  integrationStatus:'QA_PREVIEW_ONLY',
  reviewNotes:'Avoid memorization of repeated images across Q003 and Q004; correct answer stays morning.'
 });
 processed.push({optionId:x.optionId,concept:x.semantic,source:pathInRepo,
  newMediaId:mediaId,oldMediaId:x.old,sha256:digest});
}
assert.equal(new Set(registry.entries.map(e=>e.mediaId)).size,registry.entries.length);
assert.deepEqual(q4,q4Original,'Q004_WAS_MODIFIED');
for(const item of doc.items)if(item.item_id!=='Y1M01-Q003')
 assert.deepEqual(item,original.get(item.item_id),'OTHER_QUESTION_CHANGED:'+item.item_id);
for(const item of doc.items){
 const before=original.get(item.item_id);
 assert.equal(item.answerKey,before.answerKey,'ANSWER_KEY_CHANGED');
 assert.equal(item.resposta,before.resposta,'CORRECT_LETTER_CHANGED');
 assert.deepEqual(item.correctAnswerContract,before.correctAnswerContract,'ANSWER_CONTRACT_CHANGED');
 assert.deepEqual(item.stimulusContract,before.stimulusContract,'STIMULUS_CHANGED');
 assert.deepEqual(item.targetPolicy,before.targetPolicy,'TARGET_POLICY_CHANGED');
 assert.equal(item.audio_transcript,before.audio_transcript,'AUDIO_CHANGED');
}
assert.deepEqual(q.options.map(o=>o.correct),[false,false,false,true]);
const overlap=q.options.map(o=>o.mediaId).filter(id=>q4.options.some(o=>o.mediaId===id));
assert.equal(overlap.length,0,'NEIGHBOR_QUESTIONS_REUSE_VISUAL_IDS');
const sourceOverlap=processed.map(x=>x.sha256).filter(d=>q4.options.some(o=>entries.get(o.mediaId)?.sha256===d));
assert.equal(sourceOverlap.length,0,'NEIGHBOR_QUESTIONS_REUSE_IMAGE_BYTES');
const qBytes=Buffer.from(JSON.stringify(doc,null,2)+'\n');
const rBytes=Buffer.from(JSON.stringify(registry,null,2)+'\n');
manifest.set(rq,sha(qBytes));manifest.set(rr,sha(rBytes));
const nextLines=mLines.map(l=>{const at=l.lastIndexOf(' '),p=l.slice(0,at);return p+' '+manifest.get(p)});
for(const a of added)nextLines.push(a.dest+' '+sha(a.bytes));
const write=async(rel,bytes)=>{
 const p=path.resolve(root,rel);assert(p.startsWith(root+path.sep),'UNSAFE_WRITE');
 await mkdir(path.dirname(p),{recursive:true});
 await writeFile(p,bytes);
};
for(const a of added)await write(a.dest,a.bytes);
await write(rq,qBytes);await write(rr,rBytes);await write(rm,Buffer.from(nextLines.join('\n')+'\n'));
for(const a of added)assert.equal(sha(await read(a.dest)),manifest.get(a.dest),'POST_WRITE_HASH_DRIFT');
assert.equal(sha(await read(rq)),manifest.get(rq));
assert.equal(sha(await read(rr)),manifest.get(rr));
const result={
 schema:'Y1M01_Q003_ALTERNATE_DAYPART_SCENES_V1',
 question:'Y1M01-Q003',pairedWithUnchanged:'Y1M01-Q004',
 visualAssetsReplaced:4,newOfficialPngFiles:added.length,
 overlappingImagesWithQ004:0,correctAnswer:'D — morning',answerUnchanged:true,
 all20QuestionAnswersUnchanged:true,helloQ001Unchanged:true,
 humanPedagogicalReview:'PENDING',realSessionBrowserVerification:'PENDING',
 productionDeployed:false,
 choices:processed
};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/y1m01-q003-varied-dayparts.json',JSON.stringify(result,null,2)+'\n');
console.log('DUDUQ_Q003_DAYPART_VARIETY_PASS='+JSON.stringify(result));
