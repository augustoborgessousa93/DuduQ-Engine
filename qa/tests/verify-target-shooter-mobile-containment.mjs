#!/usr/bin/env node
/** FAIL-CLOSED combined gate:
 * The standalone /play/target-shooter/ demo can be interaction-locked because
 * audio/start of curriculum was not exercised; do not require it to unlock.
 * Instead prove full mobile geometry for all 3 preview questions AND
 * real native mouse gameplay on the Y1M04-Q010 curriculum with audio READY.
 * This NEVER certifies pedagogical correctness, 600 questions or release.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const probePath=process.argv[2]||'qa/results/target-shooter-mobile-containment/report.json';
const gameplayPath=process.argv[3]||'qa/results/assets-duduq-browser/report.json';
const probe=JSON.parse(await readFile(probePath,'utf8'));
const qa=JSON.parse(await readFile(gameplayPath,'utf8'));
const ids=['Y1M04-Q010','Y1M04-Q015','Y1M04-Q020'];
const viewports=['desktop-1366x768','tablet-768x1024','mobile-390x844'];
const same=(got,want,label)=>assert.deepEqual([...got].sort(),[...want].sort(),label);
assert.equal(probe.schemaVersion,'DUDUQ_TARGET_SHOOTER_MOBILE_CONTAINMENT_PROBE_V1');
assert.equal(probe.mode,'EPHEMERAL_CSS_QA_ONLY');
assert.equal(probe.immutableGoldMastersChanged,false);
assert.equal(probe.productionDeployed,false);
same(probe.questions.map(q=>q.questionId),ids,'3 probe questions missing');
for(const q of probe.questions){
 assert.equal(q.httpStatus,200,q.questionId+' HTTP');
 assert.equal(q.cssMediaAfter,true,q.questionId+' mobile CSS not active');
 assert.equal(q.visualFit,true,q.questionId+' visual target clipping');
 assert.equal(q.errors.length,0,q.questionId+' page errors');
 assert.equal(q.after.length,4,q.questionId+' target count');
 for(const target of q.after){
   assert(target.width>=44&&target.height>=44&&target.visibleRatio>=.98,
     q.questionId+' target out of mobile screen');
 }
 // No unlocked/clickable requirement on the bare demo URL: the real
 // gameplay test below must enter READY and physically click the targets.
}
assert.equal(qa.schemaVersion,'ASSETS_DUDUQ_REUSE_BROWSER_QA_V1');
assert.equal(qa.status,'PASS_CANDIDATE_PREVIEW_ONLY','candidate native browser QA did not pass');
assert.equal(qa.productionDeployed,false);
assert.equal(qa.questions.length,9,'3 questions x 3 viewports not exercised');
const keys=new Set();
for(const q of qa.questions){
 assert(ids.includes(q.questionId),'unexpected reviewed question');
 assert(viewports.includes(q.view?.name),'unexpected viewport');
 const key=q.questionId+'/'+q.view.name;assert(!keys.has(key),'duplicate check');keys.add(key);
 assert.equal(q.pass,true,key+' viewport/media check failed');
 assert.equal(q.httpStatus,200,key+' HTTP');
 assert.equal(q.clippedAssets?.length,0,key+' clipped images');
 assert.equal(q.clippedTargets?.length,0,key+' clipped targets');
 assert.equal(q.overflow,0,key+' horizontal overflow');
 assert.equal(q.pageErrors?.length,0,key+' runtime errors');
 assert.equal(q.requestFailures?.length,0,key+' network failures');
 assert.equal(q.targets?.length,4,key+' target count');
 assert(q.targets.every(t=>t.width>=44&&t.height>=44&&t.viewportVisibleRatio>=.98),key+' bounds');
}
assert.equal(keys.size,9);
assert.equal(qa.curricularOptionPreflight?.pass,true,'Y1M04-Q010 curriculum option identity unproven');
const expected=['backpack','crayon','pen','ruler'];
same(qa.curricularOptionPreflight.actualSemantics,expected,'Y1M04-Q010 options not curricular');
const gameplay=qa.gameplay;
assert.equal(gameplay?.pass,true,'real Q010 wrong/retry/correct flow failed');
assert.equal(gameplay.questionId,'Y1M04-Q010');
assert.equal(gameplay.mechanicId,'target-shooter');
assert.deepEqual(gameplay.viewport,{width:390,height:844},'gameplay must be real MOBILE Chromium');
assert.equal(gameplay.mobilePreflight?.engineState,'READY','real game not unlocked');
assert.equal(gameplay.mobilePreflight?.pass,true,'real gameplay mobile hitbox check failed');
assert.equal(gameplay.mobilePreflight?.hitboxes?.length,4);
assert(gameplay.mobilePreflight.hitboxes.every(t=>t.hit&&!t.locked&&t.pointerEvents!=='none'
  &&t.visibleRatio>=.98&&t.width>=44&&t.height>=44),'real unlocked target hitboxes not clickable');
assert.equal(gameplay.finalFeedback,'correct');
assert(/tentar novamente|tentar de novo|try again|retry/i.test(gameplay.retryLabel),'retry not exercised');
assert(gameplay.events?.filter(e=>e.realMouse).length>=4,'native mouse events missing');
assert.equal(gameplay.pageErrors.length,0);
assert.equal(gameplay.requestFailures.length,0);
assert(gameplay.trace?.sha256&&gameplay.video?.sha256,'real gameplay trace/video missing');
console.log(JSON.stringify({status:'PASS_MOBILE_GEOMETRY_AND_REAL_CURRICULAR_GAMEPLAY_PREVIEW_ONLY',
  reviewedQuestions:3,mobileTargetHitboxes:12,viewportChecks:9,
  realMobileWrongRetryCorrectQuestions:1,
  independentDemoUnlockNotRequired:true,
  pedagogicalQAApproved:false,releaseApproved:false,productionDeployed:false}));
