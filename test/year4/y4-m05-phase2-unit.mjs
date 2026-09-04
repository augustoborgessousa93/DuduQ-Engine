import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"../..");
function repo(...parts){return path.join(ROOT,...parts)}
function loadSourceItems(){
  const code=fs.readFileSync(repo("content/english/year-4/module-05/module-05-v1.js"),"utf8");
  let spec=null;
  const sandbox={window:{DuduQYear4Factory:{publish(value){spec=value}}}};
  vm.runInNewContext(code,sandbox,{filename:"module-05-v1.js"});
  assert.ok(spec,"module source must publish");
  assert.equal(spec.module,5);
  assert.equal(spec.items.length,15);
  return spec.items;
}

const orchestrator=require(repo("content/english/shared/pedagogical-orchestrator-v1.js"));
globalThis.DuduQPedagogicalOrchestrator=orchestrator;
const planApi=require(repo("content/english/year-4/module-05/phase2-pilot-plan-v1.js"));
globalThis.DuduQY4M05Phase2Plan=planApi;
const smart=require(repo("content/english/year-4/module-05/phase2-smart-sentence-pilot-v1.js"));
const target=require(repo("content/english/year-4/module-05/phase2-target-shooter-pilot-v1.js"));
const assetAudit=JSON.parse(fs.readFileSync(repo("content/english/year-4/module-05/phase2-asset-audit-v1.json"),"utf8"));
const source=loadSourceItems();
const byId=new Map(source.map(item=>[item.id,item]));
const plan=planApi.plan;

assert.equal(Object.keys(plan).length,15,"plan must preserve 15 ids");
assert.deepEqual(planApi.distribution,{"target-shooter":10,"smart-sentence":5});
assert.deepEqual(Object.values(plan).reduce((acc,row)=>{acc[row.readingDemand]=(acc[row.readingDemand]||0)+1;return acc},{}),{R1:9,R2:2,R3:4});

const selected=source.map(item=>({sourceId:item.id,mechanic:plan[item.id].recommendedMechanic,analysis:plan[item.id]}));
for(const item of source){
  const analysis=plan[item.id];
  assert.ok(analysis,`${item.id} analysis missing`);
  assert.equal(orchestrator.readingDemandGate(analysis,"Y4_FUNCTIONAL_READING").status,"PASS",`${item.id} reading`);
  assert.equal(orchestrator.mechanicEligibilityAudit(analysis,analysis.recommendedMechanic,"Y4_FUNCTIONAL_READING").status,"PASS",`${item.id} mechanic eligibility`);
}
assert.equal(orchestrator.decorativeDragDetector(selected).status,"PASS");
assert.equal(orchestrator.mechanicDiversityAudit(selected).status,"PASS");
const streak=orchestrator.mechanicStreakAudit(selected,{warningAt:5});
assert.equal(streak.status,"WARNING");
assert.equal(streak.maxStreak.length,5);
assert.equal(streak.maxStreak.mechanic,"target-shooter");

const auditById=new Map(assetAudit.items.map(item=>[item.id,item]));
assert.equal(assetAudit.summary.canonicalAssetOk,0);
assert.equal(assetAudit.summary.assetGap,15);
for(const item of source){
  assert.equal(orchestrator.assetGapGate({required:true,...auditById.get(item.id)}).status,"FAIL",`${item.id} must remain asset gap`);
}

const before=source.map(item=>({
  sourceId:item.id,
  invariants:{id:item.id,skill:item.skill,answer:{id:item.answer.id,text:item.answer.text},difficulty:item.difficulty,linguisticTarget:plan[item.id].linguisticTarget}
}));
const afterProjection=source.map(item=>({
  sourceId:item.id,
  metadata:{sourceInvariant:{id:item.id,skill:item.skill,answer:{id:item.answer.id,text:item.answer.text},difficulty:item.difficulty,linguisticTarget:plan[item.id].linguisticTarget}}
}));
assert.equal(orchestrator.sourceInvariantAudit(before,afterProjection).status,"PASS");

const smartBuilt=smart.build(source,{assets:{}});
assert.equal(smartBuilt.length,5);
assert.deepEqual(smartBuilt.map(q=>q.id),["EN4-M5-06","EN4-M5-07","EN4-M5-12","EN4-M5-13","EN4-M5-14"]);
assert.deepEqual(smartBuilt.map(q=>q.metadata.smartSentence.mode),["complete-sentence","complete-sentence","image-sentence","image-sentence","image-sentence"]);
for(const q of smartBuilt){
  const original=byId.get(q.id);
  assert.equal(q.metadata.runtimeReady,false,`${q.id} cannot be READY without asset`);
  assert.equal(q.answer.value,original.answer.id,`${q.id} answer id`);
  assert.deepEqual(q.alternatives.map(a=>a.text),original.alternatives.map(a=>a.text),`${q.id} options`);
  assert.equal(q.metadata.sourceInvariant.difficulty,original.difficulty,`${q.id} difficulty`);
}
assert.equal(smartBuilt.find(q=>q.id==="EN4-M5-06").metadata.smartSentence.answer,"blue");
assert.equal(smartBuilt.find(q=>q.id==="EN4-M5-07").metadata.smartSentence.answer,"medium");
assert.ok(smartBuilt.find(q=>q.id==="EN4-M5-12").metadata.smartSentence.options.every(t=>t.value.includes(" ")),"image-sentence uses whole sentence options");

const tsBlocked=target.build(source,{plan,assets:{},questionImageCapability:false});
assert.equal(tsBlocked.length,10);
assert.ok(tsBlocked.every(result=>result.status==="BLOCKED"&&result.reason==="TARGET_QUESTION_IMAGE_CAPABILITY_NOT_PROVEN"));
const tsAssetBlocked=target.build(source,{plan,assets:{},questionImageCapability:true});
assert.ok(tsAssetBlocked.every(result=>result.status==="BLOCKED"&&result.reason==="ASSET_GAP"));
assert.ok(tsBlocked.every(result=>result.payload===null));

// Capability audit of the immutable 1.0.21 adapter/runtime.
const tsAdapter=fs.readFileSync(repo("engine/releases/mechanics/target-shooter/1.0.21/target-shooter.js"),"utf8");
const tsRuntime=fs.readFileSync(repo("engine/releases/mechanics/target-shooter/1.0.21/DUDUQ_TARGET_SHOOTER.html"),"utf8");
assert.match(tsAdapter,/const items = reorderItems\(config\.items, order\);/,"adapter must preserve target item objects");
assert.match(tsAdapter,/audioText: asString\(config\.audioText \|\| question\?\.media\?\.audio\?\.text/,"legacy audio contract must remain");
assert.doesNotMatch(tsAdapter,/instructionImage:\s*asString\(/,"question-level image passthrough is not present in 1.0.21");
assert.match(tsRuntime,/item\.image\?React\.createElement\("img"/,"runtime must render target item.image");
assert.match(tsRuntime,/aria-label`,?\s*:\s*`Lançar estrela no alvo|Lançar estrela no alvo/,"target must expose an accessible label");

const fixtureSource=byId.get("EN4-M5-01");
const fixtureAssets={
  stimulus:{canonicalStatus:"CANONICAL_ASSET_OK",resolvedUrl:"/test-assets/hat-stimulus.png",resolvedKey:"test-hat",altText:"hat"},
  targets:Object.fromEntries(fixtureSource.alternatives.map(option=>[option.id,{canonicalStatus:"CANONICAL_ASSET_OK",resolvedUrl:`/test-assets/${option.id}.png`,resolvedKey:`test-${option.id}`,altText:option.text}]))
};
const fixtureBuilt=target.buildTargetShooter(fixtureSource,plan[fixtureSource.id],{assetRecord:fixtureAssets,questionImageCapability:true});
assert.equal(fixtureBuilt.status,"BUILT");
assert.equal(fixtureBuilt.payload.metadata.targetShooter.items.length,4);
assert.equal(fixtureBuilt.payload.answer.value,fixtureSource.answer.id);
assert.equal(fixtureBuilt.payload.metadata.targetShooter.difficulty.timeLimitMs,0);
assert.equal(fixtureBuilt.payload.metadata.targetShooter.difficulty.timerMode,"none");
assert.equal(fixtureBuilt.payload.metadata.targetShooter.difficulty.speed,.48);

console.log("PASS Y4 M05 Phase 2 unit gates");
console.log("IDs=15/15 ANSWERS=15/15 SKILLS=15/15 DIFFICULTIES=15/15 TARGETS=15/15");
console.log("READING=R1:9 R2:2 R3:4 DISTRIBUTION=target-shooter:10 smart-sentence:5");
console.log("SMART=5 CONTRACTS BUILT, 5/5 ASSET_GAP / runtimeReady=false");
console.log("TARGET=10/10 BLOCKED: question-image capability + canonical assets not proven");
console.log("ASSETS=0/15 CANONICAL, 15/15 ASSET_GAP; PUBLICATION=NO-GO");
