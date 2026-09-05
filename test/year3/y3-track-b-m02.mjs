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
const sourcePath='content/english/year-3/module-02/module-02-v1.js';
const source=fs.readFileSync(sourcePath,'utf8');
const context={window:{DuduQYear3Factory:{publish(spec){sourceSpec=spec;return spec}}},console};
vm.createContext(context);vm.runInContext(source,context,{filename:sourcePath});
assert.ok(sourceSpec,'M02 source spec not published');
assert.equal(sourceSpec.items.length,15);

const module=Factory.publish(sourceSpec);
assert.equal(module.module,2);
assert.equal(module.version,'3.0.0-track-b-m02');
assert.equal(module.activities.length,15);
const questions=module.activities.map(a=>a.questions[0]);
assert.equal(new Set(questions.map(q=>q.id)).size,15);

const distribution=questions.reduce((out,q)=>{out[q.delivery.mechanic]=(out[q.delivery.mechanic]||0)+1;return out},{});
assert.deepEqual(distribution,{'target-shooter':10,'smart-sentence':4,'bubble-pop':1});
assert.equal(distribution['drag-drop']||0,0,'M02 must not use decorative drag');
assert.equal(distribution.matching||0,0,'Matching is not used to invent extra pairing tasks');

const sourceById=new Map(sourceSpec.items.map(i=>[i.id,i]));
for(const q of questions){
  const s=sourceById.get(q.id);assert.ok(s,`${q.id}: source missing`);
  assert.equal(q.metadata.sourceInvariant.id,s.id);
  assert.equal(q.metadata.sourceInvariant.skill,s.skill);
  assert.equal(q.metadata.sourceInvariant.ability,s.ability);
  assert.deepEqual(q.metadata.sourceInvariant.answer,{id:s.answer.id,text:s.answer.text});
  assert.equal(q.metadata.sourceInvariant.difficulty,s.difficulty);
  assert.equal(q.metadata.sourceInvariant.linguisticTarget,s.answer.text);
  assert.ok(['R0','R1','R2'].includes(q.metadata.readingDemand),`${q.id}: reading above Y3 gate`);
  assert.equal(q.metadata.yearProfile,'Y3_GUIDED_READING');
}

const optionAudioIds=['EN3-M2-01','EN3-M2-02','EN3-M2-03','EN3-M2-04','EN3-M2-05','EN3-M2-06','EN3-M2-07','EN3-M2-13'];
for(const id of optionAudioIds){
  const q=questions.find(item=>item.id===id),s=sourceById.get(id);
  assert.equal(q.delivery.mechanic,'target-shooter',`${id}: mechanic`);
  assert.equal(q.metadata.targetShooter.mode,'visual-to-audio',`${id}: option audio mode`);
  assert.equal(q.metadata.targetShooter.promptVisual,s.visualQuery,`${id}: numeral visual`);
  assert.equal(q.metadata.targetShooter.audioText,'',`${id}: must not autoplay an answer option`);
  assert.equal(q.metadata.targetShooter.items.length,4,`${id}: option count`);
  assert.ok(q.metadata.targetShooter.items.every(item=>item.spokenText&&item.audioDescription),`${id}: repeatable option audio metadata`);
  assert.equal(q.metadata.technicalContract.adapterVersion,'1.0.22');
  assert.equal(q.metadata.technicalContract.optionAudio,true);
  assert.equal(q.metadata.technicalContract.resolvedGate,'TARGET_OPTION_AUDIO_GAP');
  assert.equal(q.media,undefined,`${id}: no stimulus audio should reveal an option`);
}

const ageQuestion=questions.find(q=>q.id==='EN3-M2-08');
assert.equal(ageQuestion.delivery.mechanic,'smart-sentence');
assert.equal(ageQuestion.media,undefined,'M02-08 must not autoplay the correct question');
assert.equal(ageQuestion.metadata.smartSentence.sentence,'___');
assert.equal(ageQuestion.metadata.smartSentence.instructionSpoken,'Choose the question about age.');
assert.notEqual(ageQuestion.metadata.smartSentence.instructionSpoken,sourceById.get('EN3-M2-08').answer.text);

const audioNumber=questions.find(q=>q.id==='EN3-M2-11');
assert.equal(audioNumber.metadata.targetShooter.mode,'audio-to-choice');
assert.equal(audioNumber.media.audio.text,'thirty-two');
assert.equal(audioNumber.metadata.targetShooter.correctIds[0],'C');

const bubble=questions.find(q=>q.id==='EN3-M2-12');
assert.equal(bubble.delivery.mechanic,'bubble-pop');
assert.equal(bubble.media.audio.text,'forty-eight');
assert.equal(bubble.answer.value,'C');

const invariant=Orchestrator.sourceInvariantAudit(
  sourceSpec.items.map(s=>({id:s.id,metadata:{sourceInvariant:{id:s.id,skill:s.skill,answer:{id:s.answer.id,text:s.answer.text},difficulty:s.difficulty,linguisticTarget:s.answer.text}}})),
  questions
);
assert.equal(invariant.status,'PASS',JSON.stringify(invariant));

const records=questions.map(q=>({
  id:q.id,sourceId:q.sourceId,mechanic:q.delivery.mechanic,
  pedagogicallyEquivalentMechanics:[Matrix.plan[q.id].primary,Matrix.plan[q.id].secondary].filter(Boolean),
  analysis:{dragSemanticRole:q.metadata.dragSemanticRole,dragValueJustification:q.metadata.dragValueJustification}
}));
const dragAudit=Orchestrator.decorativeDragDetector(records);
assert.equal(dragAudit.status,'PASS',JSON.stringify(dragAudit));
const diversity=Orchestrator.mechanicDiversityAudit(records);
assert.equal(diversity.status,'PASS',JSON.stringify(diversity));
const streak=Orchestrator.mechanicStreakAudit(records,{warningAt:5});
assert.equal(streak.status,'WARNING',JSON.stringify(streak));
assert.equal(streak.maxStreak.mechanic,'target-shooter');
assert.equal(streak.maxStreak.length,7);
assert.equal(streak.action,'REVIEW_ONLY_NO_AUTO_SWAP');

const index=fs.readFileSync('content/english/year-3/module-02/index.html','utf8');
for(const mechanic of ['smart-sentence','bubble-pop','target-shooter'])assert.ok(index.includes(`\"${mechanic}\"`),`index missing ${mechanic}`);
assert.ok(!index.includes('\"drag-drop\"'),'M02 index must not require drag-drop');
assert.ok(index.includes('year3-track-b-factory-v1.js'));
assert.ok(index.includes('R150/Core 1.0.12'));

const manifest=JSON.parse(fs.readFileSync('engine/channels/canary-v1.json','utf8'));
assert.equal(manifest.revision,150);
assert.equal(manifest.core.release,'1.0.12');
assert.equal(manifest.mechanics['target-shooter'].release,'1.0.22');
assert.equal(manifest.mechanics['target-shooter'].runtime,'/engine/releases/mechanics/target-shooter/1.0.21/DUDUQ_TARGET_SHOOTER.html');
const ts122=fs.readFileSync('engine/releases/mechanics/target-shooter/1.0.22/target-shooter.js','utf8');
assert.ok(ts122.includes('visual-to-audio'));
assert.ok(ts122.includes('optionAudio: true'));
assert.ok(ts122.includes('speechSynthesis.cancel()'));
assert.ok(ts122.includes('CONFIRMAR'));

console.log('Y3_M02_SOURCE = PASS — 15/15 source invariants preserved');
console.log('Y3_M02_CONTRACT = PASS — 15/15 built');
console.log('Y3_M02_MECHANICS',JSON.stringify(distribution));
console.log('Y3_M02_OPTION_AUDIO = PASS — 8/8 gated numeral-to-audio items');
console.log('Y3_M02_DECORATIVE_DRAG = PASS');
console.log('Y3_M02_DIVERSITY = PASS',JSON.stringify(diversity));
console.log('Y3_M02_STREAK = WARNING JUSTIFIED',JSON.stringify(streak.maxStreak));
