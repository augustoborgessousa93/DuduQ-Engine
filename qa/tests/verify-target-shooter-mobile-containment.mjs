#!/usr/bin/env node
// Hard gate for the Target Shooter QA-only mobile hitbox candidate.
// Do not equate visual containment with interactability or pedagogical QA.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=process.argv[2]||'qa/results/target-shooter-mobile-containment/report.json';
const report=JSON.parse(await readFile(src,'utf8'));
assert.equal(report.schemaVersion,'DUDUQ_TARGET_SHOOTER_MOBILE_CONTAINMENT_PROBE_V1');
assert.equal(report.mode,'EPHEMERAL_CSS_QA_ONLY');
assert.equal(report.immutableGoldMastersChanged,false);
assert.equal(report.productionDeployed,false);
assert.deepEqual(report.questions.map(q=>q.questionId).sort(),
 ['Y1M04-Q010','Y1M04-Q015','Y1M04-Q020']);
assert.equal(report.status,'PASS_EXPERIMENT_NOT_RELEASE',
 'Target Shooter mobile probe is NOT interaction-ready');
for(const q of report.questions){
 assert.equal(q.httpStatus,200,q.questionId+' failed HTTP');
 assert.equal(q.cssMediaAfter,true,q.questionId+' mobile CSS media not active');
 assert.equal(q.visualFit,true,q.questionId+' targets clipped');
 assert.equal(q.userFlowReady,true,q.questionId+' instruction audio did not reach READY through real user flow');
 assert(Array.isArray(q.audioActions),q.questionId+' missing audio user-flow evidence');
 for(const action of q.audioActions){
  assert.equal(action.input,'PLAYWRIGHT_NATIVE_POINTER',q.questionId+' synthetic audio interaction');
  assert.equal(action.visibleControl,true,q.questionId+' audio control not visibly clicked');
  assert.equal(action.error,undefined,q.questionId+' audio pointer action failed');
 }
 assert.equal(q.unlocked,true,q.questionId+' gameplay targets remain locked');
 assert.equal(q.interactiveFit,true,q.questionId+' pointer hit-testing failed');
 assert.equal(q.fit,true);
 assert.equal(q.errors.length,0,q.questionId+' runtime error');
 assert.equal(q.after.length,4,q.questionId+' must display four targets');
 for(const t of q.after){
  assert(t.width>=44&&t.height>=44&&t.visibleRatio>=0.98,
   q.questionId+' hitbox outside viewport');
  assert.equal(t.locked,false,q.questionId+' unexpected interaction lock');
  assert.notEqual(t.pointerEvents,'none',q.questionId+' pointer events disabled');
  assert.equal(t.centerHit,true,q.questionId+' center not actually hit-testable');
 }
}
console.log(JSON.stringify({status:'PASS_MOBILE_TARGET_VISUAL_AND_POINTER_READY_QA_ONLY',
 checkedQuestions:report.questions.length,targets:12,productionApproved:false,
 gameplayAndPedagogicalApproval:false}));
