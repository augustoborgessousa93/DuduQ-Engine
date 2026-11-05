#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const read=p=>readFile(path.join(root,p));
const plan=JSON.parse(await readFile('qa/y1m01-curated-variety-plan.json'));
const qp='content/english/year-1/module-01/questions.json';
const rp='content/english/media/media-registry.json';
const mp='.duduq-pages-manifest';
const orig={q:await read(qp),r:await read(rp),m:await read(mp)};
const qDoc=JSON.parse(orig.q),rDoc=JSON.parse(orig.r);
assert.equal(qDoc.items.length,20);
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const ml=orig.m.toString().trimEnd().split(/\r?\n/);
const manifest=new Map(ml.map(x=>{const i=x.lastIndexOf(' ');return [x.slice(0,i),x.slice(i+1)]}));
assert.equal(manifest.get(qp),sha(orig.q));assert.equal(manifest.get(rp),sha(orig.r));
const before=new Map(qDoc.items.map(q=>[q.item_id,structuredClone(q)]));
const qMap=new Map(qDoc.items.map(q=>[q.item_id,q]));
const registry=new Map(rDoc.entries.map(e=>[e.mediaId,e]));
const bank=new Map();
const added=[];
for(const [concept,name,git] of plan.sources){
 const id='IMG-Y1M01-VARIETY-'+concept.toUpperCase()+'-20261104';
 assert(!registry.has(id),'DUPLICATE_MEDIA_ID');
 const sourcePath='Imagens Ilustrativa/'+name;
 const original=rDoc.entries.find(e=>e.provenance?.sourceCommit===plan.srcCommit&&
  e.provenance?.sourceGitBlob===git&&manifest.has(e.urlOrPath));
 let bytes,rel;
 if(original){rel=original.urlOrPath;bytes=await read(rel);}
 else{
  const url='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+plan.srcCommit+
   '/'+sourcePath.split('/').map(encodeURIComponent).join('/');
  let err;
  for(let i=0;i<4;i++)try{
   const res=await fetch(url,{signal:AbortSignal.timeout(90000)});
   assert(res.ok,'HTTP_'+res.status);
   bytes=Buffer.from(await res.arrayBuffer());err=null;break;
  }catch(e){err=e}
  if(err)throw err;
  rel='content/english/assets/images/assets-duduq/y1m01-variety-'+concept+'-'+git.slice(0,12)+'-'+sha(bytes).slice(0,12)+'.png';
 }
 assert.equal(blob(bytes),git,'SOURCE_GIT_BLOB_CHANGED:'+concept);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG');
 assert(bytes.readUInt32BE(16)>=512&&bytes.readUInt32BE(20)>=512,'PNG_TOO_SMALL');
 const digest=sha(bytes);
 if(manifest.has(rel))assert.equal(manifest.get(rel),digest,'SOURCE_MANIFEST_COLLISION');
 else {assert(!added.some(x=>x.rel===rel));added.push({rel,bytes});manifest.set(rel,digest);}
 bank.set(concept,{id,rel,sourcePath,git,digest});
}
const changed=new Set();
for(const [suffix,optionId,oldId,concept,newLabel] of plan.edits){
 const qid='Y1M01-'+suffix,q=qMap.get(qid),asset=bank.get(concept);
 assert(q&&asset,'PLAN_REFERENCE_MISSING:'+qid);
 const o=q.options?.find(x=>x.optionId===optionId);
 const choices=q.optionContract?.choices||[];
 const c=choices.find(x=>x.optionId===optionId);
 assert(o,'OPTION_NOT_FOUND:'+qid+':'+optionId);
 if(choices.length&&!c){
  assert.equal(q.mechanicId,'drag-drop-multimedia','CHOICE_NOT_FOUND:'+qid+':'+optionId);
  console.log('DUDUQ_DRAG_OPTION_CONTRACT_VARIANT='+JSON.stringify({qid,optionId,
    contractKeys:Object.keys(q.optionContract||{}),choiceIds:choices.map(v=>v.optionId)}));
 }
 assert.equal(o.mediaId,oldId,'SOURCE_OPTION_CHANGED:'+qid+':'+optionId);
 if(c){assert.equal(c.mediaId,oldId,'SOURCE_CONTRACT_CHANGED:'+qid+':'+optionId);
 assert.equal(Boolean(o.correct),Boolean(c.correct),'CORRECTNESS_DRIFT');}
 if(o.correct)assert.equal(optionId,concept,'UNSAFE_CORRECT_REPLACEMENT:'+qid);
 for(const obj of [o,c].filter(Boolean)){
  obj.mediaId=asset.id;obj.label=newLabel;obj.semanticReview='NEEDS_HUMAN_REVIEW';
 }
 for(const pool of q.bubbleDistractorPool||[])if(pool.id===qid+'-'+optionId){
  assert.equal(pool.mediaId,oldId,'BUBBLE_POOL_DRIFT');
  pool.mediaId=asset.id;pool.label=newLabel;
 }
 const source=before.get(qid);
 const matches=source.options.filter(x=>x.mediaId===oldId);
 const ix=source.options.findIndex(x=>x.optionId===optionId);
 for(const binding of q.mediaBindings||[]){
  if(binding.mediaId!==oldId)continue;
  if(matches.length===1){binding.mediaId=asset.id;continue}
  const m=/^option_([a-z])$/.exec(binding.role||'');
  if(m&&m[1].charCodeAt(0)-97===ix)binding.mediaId=asset.id;
 }
 if(o.correct&&q.image_ref===oldId)q.image_ref=asset.id;
 changed.add(qid);
}
for(const q of qDoc.items){
 const old=before.get(q.item_id);
 assert.equal(q.answerKey,old.answerKey,'ANSWER_KEY_DRIFT:'+q.item_id);
 assert.equal(q.resposta,old.resposta,'ANSWER_LETTER_DRIFT:'+q.item_id);
 assert.equal(q.audio_transcript,old.audio_transcript,'AUDIO_DRIFT');
 assert.deepEqual(q.correctAnswerContract,old.correctAnswerContract,'ANSWER_CONTRACT_DRIFT');
 assert.deepEqual(q.targetPolicy,old.targetPolicy,'TARGET_POLICY_DRIFT');
 assert.deepEqual(q.stimulusContract,old.stimulusContract,'STIMULUS_DRIFT');
 assert.deepEqual(q.options.map(x=>[x.optionId,x.correct]),
  old.options.map(x=>[x.optionId,x.correct]),'OPTION_IDS_CHANGED');
 assert.deepEqual((q.optionContract?.choices||[]).map(x=>[x.optionId,x.correct]),
  (old.optionContract?.choices||[]).map(x=>[x.optionId,x.correct]),'CHOICE_CONTRACT_CHANGED');
 assert.equal(new Set(q.options.map(x=>x.mediaId)).size,q.options.length,
  'DUPLICATE_PICTURE_IN_ONE_QUESTION:'+q.item_id);
 if(!changed.has(q.item_id))assert.deepEqual(q,old,'OTHER_QUESTION_CHANGED');
 if(q.options.filter(o=>o.correct).length===1){
  const values=q.options.map(o=>[o.optionId,o.label,o.mediaId].join(' ').toLowerCase());
  const hasHello=values.some(x=>/\bhello\b|\bhi\b|greeting-generic|greeting-informal/.test(x));
  const hasGoodbye=values.some(x=>/goodbye|farewell/.test(x));
  assert(!(hasHello&&hasGoodbye),'HELLO_AND_GOODBYE_AS_COMPETING_CHOICES:'+q.item_id);
 }
}
for(const id of plan.locked)assert.deepEqual(qMap.get(id),before.get(id),'LOCKED_QUESTION_EDITED:'+id);
for(const [concept,a] of bank){
 rDoc.entries.push({mediaId:a.id,kind:'image',status:'APPROVED',semantic:concept,
  description:'Editorial image variety '+concept,temporary:false,urlOrPath:a.rel,
  sha256:a.digest,assets:[{path:a.rel,sha256:a.digest,mediaType:'image/png',temporary:false}],
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',integrationStatus:'QA_ONLY',
  provenance:{provider:'Assets-DuduQ',sourceCommit:plan.srcCommit,
   sourcePath:a.sourcePath,sourceGitBlob:a.git,sha256:a.digest},
  usedByItems:[...new Set(plan.edits.filter(x=>x[3]===concept).map(x=>'Y1M01-'+x[0]))]});
}
assert.equal(new Set(rDoc.entries.map(x=>x.mediaId)).size,rDoc.entries.length);
const qb=Buffer.from(JSON.stringify(qDoc,null,2)+'\n');
const rb=Buffer.from(JSON.stringify(rDoc,null,2)+'\n');
manifest.set(qp,sha(qb));manifest.set(rp,sha(rb));
const mLines=ml.map(x=>{const i=x.lastIndexOf(' '),rel=x.slice(0,i);return rel+' '+manifest.get(rel);});
for(const a of added)mLines.push(a.rel+' '+sha(a.bytes));
const files=[{rel:qp,bytes:qb},{rel:rp,bytes:rb},...added,
 {rel:mp,bytes:Buffer.from(mLines.join('\n')+'\n')}];
for(const {rel,bytes} of files){
 const p=path.resolve(root,rel);assert(p.startsWith(root+path.sep));
 await mkdir(path.dirname(p),{recursive:true});await writeFile(p,bytes);
}
const report={questionsChanged:[...changed].sort(),optionImagesChanged:plan.edits.length,
 curatedConcepts:plan.sources.length,newPngs:added.length,
 reuses:plan.sources.length-added.length,
 approvedQ001Preserved:true,correctAnswersPreserved:true,
 helloGoodbyeCompetingPairs:0,
 multiAnswerLessonsUnchanged:['Y1M01-Q006','Y1M01-Q007','Y1M01-Q009'],
 pedagogicalQA:'PENDING',productionDeployed:false};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/y1m01-curated-variety.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_Y1M01_CURATED_VARIETY_PASS='+JSON.stringify(report));
