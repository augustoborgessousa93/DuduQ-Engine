import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const Orchestrator=require('../../content/english/shared/pedagogical-orchestrator-v1.js');
const Profile=require('../../content/english/year-3/y3-guided-reading-profile-v1.js');
const Matrix=require('../../content/english/year-3/y3-orchestration-matrix-v1.js');
globalThis.DuduQPedagogicalOrchestrator=Orchestrator;
globalThis.DuduQY3GuidedReadingProfile=Profile;
globalThis.DuduQY3OrchestrationMatrix=Matrix;
globalThis.DuduQAssets={resolveImageDetails(query){const key=String(query||'').trim().toLowerCase().replace(/\s+/g,'-');return key?{key,url:`https://assets.invalid/${encodeURIComponent(key)}.png`}:null}};
delete require.cache[require.resolve('../../content/english/year-3/year3-track-b-factory-v1.js')];
const Factory=require('../../content/english/year-3/year3-track-b-factory-v1.js');

let sourceSpec=null;
const sourcePath='content/english/year-3/module-01/module-01-v1.js';
const source=fs.readFileSync(sourcePath,'utf8');
const context={window:{DuduQYear3Factory:{publish(spec){sourceSpec=spec;return spec}}},console};
vm.createContext(context);vm.runInContext(source,context,{filename:sourcePath});
assert.ok(sourceSpec,'M01 source spec not published');
assert.equal(sourceSpec.items.length,15);

const module=Factory.publish(sourceSpec);
assert.equal(module.module,1);
assert.equal(module.version,'3.0.0-track-b-m01-sentinel');
assert.equal(module.activities.length,15);
const questions=module.activities.map(a=>a.questions[0]);
assert.equal(new Set(questions.map(q=>q.id)).size,15);

const distribution=questions.reduce((out,q)=>{out[q.delivery.mechanic]=(out[q.delivery.mechanic]||0)+1;return out},{});
assert.deepEqual(distribution,{'smart-sentence':9,'word-slash':1,'bubble-pop':2,'target-shooter':2,'drag-drop':1});

const sourceById=new Map(sourceSpec.items.map(i=>[i.id,i]));
for(const q of questions){
  const s=sourceById.get(q.id);assert.ok(s,`${q.id}: source missing`);
  assert.equal(q.metadata.sourceInvariant.id,s.id);
  assert.equal(q.metadata.sourceInvariant.skill,s.skill);
  assert.equal(q.metadata.sourceInvariant.ability,s.ability);
  assert.deepEqual(q.metadata.sourceInvariant.answer,{id:s.answer.id,text:s.answer.text});
  assert.equal(q.metadata.sourceInvariant.difficulty,s.difficulty);
  assert.equal(q.metadata.sourceInvariant.linguisticTarget,s.answer.text);
  assert.equal(q.metadata.trackB.primaryMechanic,Matrix.plan[q.id].primary);
}

for(const q of questions.filter(q=>q.delivery.mechanic==='smart-sentence')){
  assert.ok(q.metadata.smartSentence);
  assert.equal(q.metadata.smartSentence.options.length,4);
  assert.equal(q.metadata.smartSentence.answer,sourceById.get(q.id).answer.text);
}
const word=questions.find(q=>q.id==='EN3-M1-05');
assert.equal(word.metadata.wordSlash.target.value,'M');
assert.deepEqual(word.metadata.wordSlash.target.acceptCategories,['correct']);
assert.equal(word.metadata.wordSlash.objects.filter(o=>o.category==='correct').length,1);

const profileAge=questions.find(q=>q.id==='EN3-M1-07');
assert.equal(profileAge.metadata.targetShooter.correctIds[0],'B');
assert.equal(profileAge.metadata.targetShooter.items.length,4);
const animal=questions.find(q=>q.id==='EN3-M1-09');
assert.ok(animal.metadata.targetShooter.items.every(i=>i.imageUrl&&i.imageAssetKey),'M01-09 must carry canonical option images');

const sequence=questions.find(q=>q.id==='EN3-M1-12');
assert.equal(sequence.payload.strategy,'sequence');
assert.equal(sequence.payload.targets.length,1);
assert.equal(sequence.payload.targets[0].kind,'list');
assert.equal(sequence.payload.targets[0].capacity,5);
assert.deepEqual(sequence.payload.items.map(i=>i.label),['H','E','L','L','O']);
assert.deepEqual(sequence.payload.items.map(i=>i.sequenceIndex),[0,1,2,3,4]);

const invariant=Orchestrator.sourceInvariantAudit(
  sourceSpec.items.map(s=>({id:s.id,metadata:{sourceInvariant:{id:s.id,skill:s.skill,answer:{id:s.answer.id,text:s.answer.text},difficulty:s.difficulty,linguisticTarget:s.answer.text}}})),
  questions
);
assert.equal(invariant.status,'PASS',JSON.stringify(invariant));
const dragAudit=Orchestrator.decorativeDragDetector(questions.map(q=>({id:q.id,mechanic:q.delivery.mechanic,analysis:{dragSemanticRole:q.metadata.dragSemanticRole,dragValueJustification:q.metadata.dragValueJustification}})));
assert.equal(dragAudit.status,'PASS',JSON.stringify(dragAudit));

const index=fs.readFileSync('content/english/year-3/module-01/index.html','utf8');
for(const mechanic of ['smart-sentence','word-slash','bubble-pop','target-shooter','drag-drop'])assert.ok(index.includes(`\"${mechanic}\"`),`index missing ${mechanic}`);
assert.ok(index.includes('year3-track-b-factory-v1.js'));
assert.ok(index.includes('R149/Core 1.0.12'));

console.log('Y3_M01_SENTINEL_CONTRACT = PASS — 15/15 built');
console.log('Y3_M01_MECHANICS',JSON.stringify(distribution));
console.log('Y3_M01_SOURCE_INVARIANTS = PASS');
console.log('Y3_M01_DECORATIVE_DRAG = PASS');
