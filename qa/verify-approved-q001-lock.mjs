#!/usr/bin/env node
// LOCK approved by owner on 2026-11-04: Y1M01-Q001 must keep a focused
// official Hello scene, a non-greeting Reading distractor and correct C.
// Do not freeze unrelated media; only these exact pedagogical decisions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const load=(rel)=>readFileSync(path.join(root,rel));
const json=(rel)=>JSON.parse(load(rel));
const sha=b=>createHash('sha256').update(b).digest('hex');
const q=json('content/english/year-1/module-01/questions.json')
 .items.find(x=>x.item_id==='Y1M01-Q001');
assert(q,'Y1M01_Q001_MISSING');
assert.equal(q.answerKey,'hello','APPROVED_Q001_ANSWER_CHANGED');
assert.equal(q.resposta,'C','APPROVED_Q001_CORRECT_LETTER_CHANGED');
assert.equal(q.correctAnswerContract?.answerKey,'hello','APPROVED_Q001_CONTRACT_DRIFT');
assert.equal(q.targetPolicy?.correctOptionId,'hello','APPROVED_Q001_TARGET_DRIFT');
assert.equal(q.audio_transcript,'Hello!','APPROVED_Q001_AUDIO_PROMPT_CHANGED');
assert.deepEqual(q.options.map(x=>x.optionId),
 ['reading','sleep','hello','snack'],'APPROVED_Q001_OPTIONS_CHANGED');
assert.deepEqual(q.optionContract.choices.map(x=>x.optionId),
 ['reading','sleep','hello','snack'],'APPROVED_Q001_OPTION_CONTRACT_CHANGED');
assert.equal(q.options.filter(x=>x.correct).length,1);
assert.equal(q.options.find(x=>x.correct)?.optionId,'hello');
assert.equal(q.options[0].correct,false);
assert.equal(q.options.some(x=>x.optionId==='farewell'),false,'GOODBYE_DISTRACTOR_RETURNED');
assert.deepEqual(q.distractorOptionIds,['reading','sleep','snack']);
const correct='IMG-Y1M01-Q001-HELLO-FOCUSED-20261104';
const reading='IMG-Y1M01-Q001-READING-DISTRACTOR-20261104';
assert.equal(q.options[2].mediaId,correct,'HELLO_IMAGE_REPLACED_WITH_OLD_SCENE');
assert.equal(q.options[0].mediaId,reading,'READING_DISTRACTOR_REPLACED_WITH_GOODBYE');
const registry=json('content/english/media/media-registry.json');
const assets=new Map(registry.entries.map(x=>[x.mediaId,x]));
const fixed=[
 {id:correct,source:'Imagens Ilustrativa/Hello - oi.png',blob:'70e74ce5db1853ee0da7a93ab1f96da7bf457ab0'},
 {id:reading,source:'Imagens Ilustrativa/Reading — Lendo.png',blob:'52019f75341009c2e3900e1581e7da1baac2c036'}
];
const manifest=new Map(load('.duduq-pages-manifest').toString('utf8')
 .trimEnd().split(/\r?\n/).map(s=>{const i=s.lastIndexOf(' ');return [s.slice(0,i),s.slice(i+1)];}));
for(const item of fixed){
 const entry=assets.get(item.id);
 assert(entry,'APPROVED_MEDIA_ENTRY_MISSING:'+item.id);
 assert.equal(entry.provenance?.sourceGitBlob,item.blob,'APPROVED_MEDIA_BLOB_CHANGED');
 assert.equal(entry.provenance?.sourcePath,item.source,'APPROVED_MEDIA_SOURCE_CHANGED');
 assert.equal(entry.provenance?.sourceCommit,'a62c07c075a4a744f81dee2eea3a6b93108f9d08');
 assert.equal(entry.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING',
  'TECHNICAL_APPROVAL_MUST_NOT_MISREPRESENT_ALL_PEDAGOGICAL_SIGNOFF');
 assert.equal(entry.urlOrPath.endsWith('.png'),true);
 const actual=sha(load(entry.urlOrPath));
 assert.equal(actual,entry.sha256,'APPROVED_PNG_CHANGED');
 assert.equal(actual,manifest.get(entry.urlOrPath),'APPROVED_PNG_MANIFEST_DRIFT');
}
let activities=0,otherMediaConsumers=0;
for(let year=1;year<=5;year++)for(let mod=1;mod<=6;mod++){
 const suffix=String(mod).padStart(2,'0');
 const file='content/english/year-'+year+'/module-'+suffix+'/questions.json';
 const arr=json(file).items;
 assert.equal(arr.length,20,'UNEXPECTED_CONTRACT_COUNT:'+file);
 activities+=arr.length;
 for(const task of arr){
  if(task.item_id==='Y1M01-Q001')continue;
  const serialized=JSON.stringify(task);
  if(serialized.includes('IMG-Y1M01-FAREWELL-GENERIC-001'))otherMediaConsumers++;
  assert(!serialized.includes(correct)&&!serialized.includes(reading),
   'Q001_SCOPED_IMAGE_REUSED_OUTSIDE_APPROVED_QUESTION:'+task.item_id);
 }
}
assert.equal(activities,600,'NOT_600_CONTRACTS');
assert(otherMediaConsumers>0,'GLOBAL_GOODBYE_MEDIA_ACCIDENTALLY_REMOVED');
console.log('DUDUQ_APPROVED_Q001_LOCK_PASS='+JSON.stringify({
 question:'Y1M01-Q001',correctOption:'C / hello',disambiguatedDistractor:'reading',
 otherFarewellConsumersRetained:otherMediaConsumers,
 pinnedOfficialAssets:fixed.length,contracts:activities,
 status:'USER_APPROVED_Q001_ONLY',productionDeployed:false}));
