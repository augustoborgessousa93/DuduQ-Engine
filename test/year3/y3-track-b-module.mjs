import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const moduleNumber=Number(process.argv[2]);
assert.ok([1,2,3,4,5,6].includes(moduleNumber),'Usage: node y3-track-b-module.mjs <1..6>');
const tag=String(moduleNumber).padStart(2,'0');

const Orchestrator=require('../../content/english/shared/pedagogical-orchestrator-v1.js');
const Profile=require('../../content/english/year-3/y3-guided-reading-profile-v1.js');
const Matrix=require('../../content/english/year-3/y3-orchestration-matrix-v1.js');
globalThis.DuduQPedagogicalOrchestrator=Orchestrator;
globalThis.DuduQY3GuidedReadingProfile=Profile;
globalThis.DuduQY3OrchestrationMatrix=Matrix;

// Deterministic catalog double: simple reusable concepts exist; compound color/size/count/profile
// queries must resolve through the factory's safe-base reuse or temporary placeholder policy.
globalThis.DuduQAssets={resolveImageDetails(query){
  const raw=String(query||'').trim().toLowerCase();
  if(!raw)return null;
  if(moduleNumber>=3&&/[:\s]/.test(raw))return null;
  const key=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');
  return {key,url:`https://assets.invalid/${encodeURIComponent(key)}.png`};
}};

delete require.cache[require.resolve('../../content/english/year-3/year3-track-b-factory-v1.js')];
const Factory=require('../../content/english/year-3/year3-track-b-factory-v1.js');
Factory.clearPendingCanonicalAssets();

let sourceSpec=null;
const sourcePath=`content/english/year-3/module-${tag}/module-${tag}-v1.js`;
const source=fs.readFileSync(sourcePath,'utf8');
const context={window:{DuduQYear3Factory:{publish(spec){sourceSpec=spec;return spec}}},console};
vm.createContext(context);vm.runInContext(source,context,{filename:sourcePath});
assert.ok(sourceSpec,`M${tag}: source spec not published`);
assert.equal(sourceSpec.items.length,15,`M${tag}: source items`);

const built=Factory.publish(sourceSpec);
assert.equal(built.module,moduleNumber);
assert.equal(built.activities.length,15);
assert.equal(built.implementationStatus,'PASS');
assert.equal(built.contentStatus,'PASS');
assert.equal(built.mechanicStatus,'PASS');
assert.equal(built.technicalStatus,'PASS');
assert.equal(built.technicalBlockers,0);
if(moduleNumber<=2){
  assert.equal(built.visualStatus,'PASS');
  assert.equal(built.publicationStatus,'READY');
  assert.equal(built.assetImplementationGate,'PASS');
  assert.equal(built.canonicalAssetGate,'PASS');
  assert.equal(built.readyForAssetReplacement,false);
  assert.equal(built.pendingCanonicalAssets.length,0);
}else{
  assert.equal(built.visualStatus,'PLACEHOLDER');
  assert.match(built.publicationStatus,/^NO-GO/);
  assert.equal(built.assetImplementationGate,'PASS_WITH_PLACEHOLDERS');
  assert.equal(built.canonicalAssetGate,'PENDING');
  assert.equal(built.readyForAssetReplacement,true);
  assert.ok(built.pendingCanonicalAssets.length>0,`M${tag}: expected placeholder manifest`);
}

const questions=built.activities.map(a=>a.questions[0]);
assert.equal(new Set(questions.map(q=>q.id)).size,15);
const expectedDistribution={
  1:{'smart-sentence':9,'word-slash':1,'bubble-pop':2,'target-shooter':2,'drag-drop':1},
  2:{'target-shooter':10,'smart-sentence':4,'bubble-pop':1},
  3:{'target-shooter':7,'smart-sentence':8},
  4:{'target-shooter':9,'smart-sentence':6},
  5:{'target-shooter':5,'smart-sentence':10},
  6:{'target-shooter':9,'smart-sentence':6}
}[moduleNumber];
const distribution=questions.reduce((out,q)=>{out[q.delivery.mechanic]=(out[q.delivery.mechanic]||0)+1;return out},{});
assert.deepEqual(distribution,expectedDistribution,`M${tag}: mechanic distribution`);
if(moduleNumber!==1)assert.equal(distribution['drag-drop']||0,0,`M${tag}: decorative drag forbidden`);
assert.equal(distribution.matching||0,0,`M${tag}: do not invent pairing tasks`);

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
  assert.equal(q.metadata.trackB.primaryMechanic,Matrix.plan[q.id].primary);
}

for(const q of questions.filter(q=>q.delivery.mechanic==='target-shooter')){
  const row=Matrix.plan[q.id];
  assert.equal(q.metadata.technicalContract.adapterVersion,'1.0.23',`${q.id}: Target Shooter release`);
  if(row.audio==='OPTION_AUDIO_REQUIRED_REPEATABLE'){
    assert.equal(q.metadata.targetShooter.mode,'visual-to-audio',`${q.id}: option audio mode`);
    assert.equal(q.metadata.targetShooter.audioText,'',`${q.id}: must not autoplay an answer option`);
    assert.equal(q.metadata.technicalContract.optionAudio,true,`${q.id}: option audio contract`);
    assert.ok(q.metadata.targetShooter.items.every(item=>item.spokenText&&item.audioDescription),`${q.id}: repeatable option audio metadata`);
    assert.equal(q.media,undefined,`${q.id}: no answer-revealing stimulus audio`);
    if(row.modalities.includes('image')){
      assert.equal(q.metadata.technicalContract.stimulusVisual,true,`${q.id}: image stimulus pass-through contract`);
      assert.ok(q.metadata.targetShooter.promptVisualMedia,`${q.id}: missing promptVisualMedia`);
      assert.ok(['image','placeholder'].includes(q.metadata.targetShooter.promptVisualMedia.type),`${q.id}: invalid visual media type`);
    }
  }
}

const pendingById=new Map(built.pendingCanonicalAssets.map(item=>[item.id,item]));
function assertPlaceholder(id,expectedAsset){
  const q=questions.find(item=>item.id===id);assert.ok(q,`${id}: missing question`);
  assert.equal(q.metadata.imageRequirement.canonicalStatus,'TEMP_VISUAL_PLACEHOLDER',`${id}: visual status`);
  assert.equal(q.metadata.imageRequirement.expectedCanonicalAsset,expectedAsset,`${id}: expected canonical asset`);
  assert.equal(pendingById.get(id)?.expectedCanonicalAsset,expectedAsset,`${id}: central manifest entry`);
  if(q.delivery.mechanic==='smart-sentence')assert.equal(q.metadata.smartSentence.placeholderVisual?.visualStatus,'TEMP_VISUAL_PLACEHOLDER',`${id}: smart placeholder`);
  if(q.delivery.mechanic==='target-shooter')assert.equal(q.metadata.targetShooter.promptVisualMedia?.visualStatus,'TEMP_VISUAL_PLACEHOLDER',`${id}: target placeholder`);
}

if(moduleNumber===1){
  const animal=questions.find(q=>q.id==='EN3-M1-09');
  assert.ok(animal.metadata.targetShooter.items.every(i=>i.imageUrl&&i.imageAssetKey),'M01-09 canonical option images');
  const sequence=questions.find(q=>q.id==='EN3-M1-12');
  assert.equal(sequence.answer.type,'sequence');
  assert.deepEqual(sequence.alternatives.map(i=>i.text),['H','E','L','L','O']);
}
if(moduleNumber===2){
  for(const id of ['EN3-M2-01','EN3-M2-02','EN3-M2-03','EN3-M2-04','EN3-M2-05','EN3-M2-06','EN3-M2-07','EN3-M2-13']){
    const q=questions.find(item=>item.id===id);
    assert.equal(q.metadata.targetShooter.mode,'visual-to-audio');
    assert.equal(q.metadata.technicalContract.optionAudio,true);
    assert.equal(q.metadata.technicalContract.adapterVersion,'1.0.23');
    assert.equal(q.media,undefined);
  }
  const age=questions.find(q=>q.id==='EN3-M2-08');
  assert.equal(age.media,undefined);assert.equal(age.metadata.smartSentence.instructionSpoken,'Choose the question about age.');
}
if(moduleNumber===3){
  assertPlaceholder('EN3-M3-12','duck/yellow');
  assertPlaceholder('EN3-M3-13','cat/white');
  assertPlaceholder('EN3-M3-15','rabbit/brown');
  const turtle=questions.find(q=>q.id==='EN3-M3-11');
  assert.equal(turtle.metadata.targetShooter.promptVisualMedia.type,'image');
  assert.equal(turtle.metadata.targetShooter.promptVisualMedia.count,3);
  const profile=questions.find(q=>q.id==='EN3-M3-07');
  assert.match(profile.metadata.smartSentence.sentence,/AGE 8/);
}
if(moduleNumber===4){
  assertPlaceholder('EN3-M4-13','pencil/big-blue');
  const math=questions.find(q=>q.id==='EN3-M4-01');
  assert.equal(math.metadata.targetShooter.promptVisual,'2 + 3 = 5');
}
if(moduleNumber===5){
  assertPlaceholder('EN3-M5-06','circle/red');
  assertPlaceholder('EN3-M5-07','rectangle/blue');
  assertPlaceholder('EN3-M5-10','triangle/big');
  assertPlaceholder('EN3-M5-14','square/red');
}
if(moduleNumber===6){
  assertPlaceholder('EN3-M6-06','car/green');
  assertPlaceholder('EN3-M6-07','bus/red-blue');
  assertPlaceholder('EN3-M6-08','truck/big');
  assertPlaceholder('EN3-M6-13','hand/big');
  assertPlaceholder('EN3-M6-14','eye/green');
  assertPlaceholder('EN3-M6-15','hair/brown');
}

const invariant=Orchestrator.sourceInvariantAudit(
  sourceSpec.items.map(s=>({id:s.id,metadata:{sourceInvariant:{id:s.id,skill:s.skill,answer:{id:s.answer.id,text:s.answer.text},difficulty:s.difficulty,linguisticTarget:s.answer.text}}})),
  questions
);
assert.equal(invariant.status,'PASS',JSON.stringify(invariant));
const dragAudit=Orchestrator.decorativeDragDetector(questions.map(q=>({id:q.id,mechanic:q.delivery.mechanic,analysis:{dragSemanticRole:q.metadata.dragSemanticRole,dragValueJustification:q.metadata.dragValueJustification}})));
assert.equal(dragAudit.status,'PASS',JSON.stringify(dragAudit));

const manifest=JSON.parse(fs.readFileSync('engine/channels/canary-v1.json','utf8'));
assert.equal(manifest.revision,151);
assert.equal(manifest.core.release,'1.0.12');
assert.equal(manifest.mechanics['target-shooter'].release,'1.0.23');
assert.equal(manifest.mechanics['target-shooter'].runtime,'/engine/releases/mechanics/target-shooter/1.0.21/DUDUQ_TARGET_SHOOTER.html');

console.log(`Y3_M${tag}_SOURCE = PASS — 15/15 source invariants preserved`);
console.log(`Y3_M${tag}_CONTRACT = PASS — 15/15 built`);
console.log(`Y3_M${tag}_MECHANICS ${JSON.stringify(distribution)}`);
console.log(`Y3_M${tag}_TECHNICAL_BLOCKERS = 0`);
console.log(`Y3_M${tag}_VISUAL_STATUS = ${built.visualStatus} — ${built.pendingCanonicalAssets.length} pending in deterministic contract fixture`);
console.log(`Y3_M${tag}_IMPLEMENTATION = PASS`);
console.log(`Y3_M${tag}_PUBLICATION = ${built.publicationStatus}`);
