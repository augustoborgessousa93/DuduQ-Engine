#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const file=process.argv[2]||'qa/results/assets-duduq-question-crosswalk.json';
const report=JSON.parse(await readFile(file,'utf8'));
assert.equal(report.schemaVersion,'ASSETS_DUDUQ_BILINGUAL_600_QUESTION_CROSSWALK_V1');
assert.equal(report.inventoryFiles,349);
assert.equal(report.questionCount,600);
assert.equal(report.humanPedagogicalApproval,'PENDING');
assert.match(report.matchingRule,/filename-only match is approved/i);
assert.equal(report.questions.length,600);
const modules=new Map();let options=0;
for(const q of report.questions){
  assert.match(q.questionId,/^Y[1-5]M0[1-6]-Q\d{3}$/);
  options+=q.options.length;
  const list=modules.get(q.moduleId)||[];list.push(q);modules.set(q.moduleId,list);
  for(const option of q.options)for(const candidate of option.candidates){
    assert(['VISUAL_EXACT_PRECHECK_HUMAN_QA_PENDING','SEMANTIC_REVIEW_REQUIRED'].includes(candidate.associationStatus));
    assert.notEqual(candidate.associationStatus,'APPROVED');
  }
}
assert.equal(modules.size,30);
for(const [moduleId,items] of modules)assert.equal(items.length,20,moduleId);
assert.equal(options,report.optionCount);
console.log(JSON.stringify({status:'PASS_CROSSWALK_COMPLETE_REVIEW_PENDING',files:report.inventoryFiles,modules:modules.size,questions:report.questionCount,options,
  candidateOptions:report.candidateOptions,visualExactPrechecks:report.optionsWithVisuallyReviewedExactConcept},null,2));
