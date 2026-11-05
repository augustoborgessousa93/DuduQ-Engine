#!/usr/bin/env node
// Read-only audit of the frozen 600-activity media-reference snapshot.
// This verifies data consistency and exact V27 option bindings, not actual PNGs or browser QA.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root='docs/qa/media-audit-20261029/';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const summary=read(root+'summary.json');
const queue=read(root+'replacement-queue.json');
const next=read(root+'next-batch-exact-concepts.json');
const conflicts=read(root+'semantic-conflicts.json');
const v27=read('qa/media-inbox/batch-20261029/batch-manifest.json');
const questions=[],ids=new Set(),modules=new Set();
for(let year=1;year<=5;year++){
  const file=read(root+'year-'+year+'.json');
  assert.equal(file.year,year);
  assert.equal(file.modules.length,6);
  for(const mod of file.modules){
    assert.equal(mod.questionCount,20,mod.moduleId);
    assert.equal(mod.questions.length,20,mod.moduleId);
    assert(!modules.has(mod.moduleId),'duplicate module '+mod.moduleId);
    modules.add(mod.moduleId);
    for(const q of mod.questions){
      assert(q.questionId.startsWith(mod.moduleId+'-'),'wrong question ID '+q.questionId);
      assert(!ids.has(q.questionId),'duplicate question '+q.questionId);
      ids.add(q.questionId);questions.push(q);
      for(const option of q.options||[]){
        if(option.mediaId)assert(q.mediaIds.includes(option.mediaId),'option assetId omitted '+q.questionId+' '+option.mediaId);
      }
    }
  }
}
assert.equal(modules.size,30);
assert.equal(questions.length,600);
assert.equal(ids.size,600);
const media=new Set(questions.flatMap(q=>q.mediaIds));
assert.equal(media.size,summary.uniqueReferencedMediaIds);
assert.equal(summary.uniqueQuestionIds,600);
assert.equal(summary.sourceModules,30);
assert.equal(summary.sourceQuestions,600);
assert.equal(summary.referencedClassifications.PROVISIONAL,queue.total);
assert.equal(queue.queue.length,queue.total);
const queued=new Set(queue.queue.map(x=>x.mediaId));
assert.equal(queued.size,queue.total);
for(const x of queue.queue)assert(media.has(x.mediaId),'queued mediaId not referenced '+x.mediaId);
for(const asset of v27.assets){
  for(const b of asset.bindings){
    const q=questions.find(x=>x.questionId===b.questionId);
    assert(q,'V27 missing question '+b.questionId);
    const o=q.options.find(x=>x.mediaId===b.mediaId);
    assert(o,'V27 mediaId not bound to option '+b.mediaId);
    assert.equal(o.semanticTarget?.toLowerCase(),asset.semanticTarget.toLowerCase(),'V27 semantic mismatch '+b.mediaId);
  }
}
const conflictIds=new Set(conflicts.conflicts.map(x=>x.mediaId));
assert.equal(conflictIds.size,conflicts.count);
assert.equal(conflictIds.size,queue.queue.filter(x=>x.semanticConflict).length);
for(const c of conflicts.conflicts)assert(queued.has(c.mediaId),'conflict not queued '+c.mediaId);
const planned=new Set();
for(const a of next.assets){
  assert(a.mediaIds.length,'empty exact-concept plan '+a.concept);
  for(const id of a.mediaIds){
    assert(!planned.has(id),'duplicate planned mediaId '+id);
    planned.add(id);
    const item=queue.queue.find(x=>x.mediaId===id);
    assert(item,'planned mediaId not queued '+id);
    assert(!conflictIds.has(id),'conflicted mediaId in automatic plan '+id);
    assert.deepEqual(item.optionSemanticTargets,[a.concept],'plan semantic mismatch '+id);
  }
}
assert.equal(next.assets.length,next.totals.uniqueConcepts);
assert.equal(planned.size,next.totals.mediaIds);
console.log(JSON.stringify({audit:'PASS_SNAPSHOT_ONLY',modules:modules.size,activities:questions.length,referencedMediaIds:media.size,provisionalOrPendingIds:queue.total,semanticConflicts:conflictIds.size,plannedSingleAssets:next.assets.length,plannedMediaIds:planned.size,v27ExactBindings:v27.assets.reduce((n,a)=>n+a.bindings.length,0),binaryUploadVerified:false,browserQaVerified:false,productionModified:false}));
