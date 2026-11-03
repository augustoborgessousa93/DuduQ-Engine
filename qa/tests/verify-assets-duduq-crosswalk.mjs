#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const file=process.argv[2]||'qa/results/assets-duduq-question-crosswalk.json';
const report=JSON.parse(await readFile(file,'utf8'));
assert.equal(report.schemaVersion,'ASSETS_DUDUQ_BILINGUAL_600_QUESTION_CROSSWALK_V1');
// The inventory is versioned by its source SHA, not by a stale fixed file count.
const inventory=JSON.parse(await readFile(report.inventoryPath,'utf8'));
assert.match(report.sourceCommit,/^[a-f0-9]{40}$/);
if(process.env.ASSETS_DUDUQ_SOURCE_COMMIT)
  assert.equal(report.sourceCommit,process.env.ASSETS_DUDUQ_SOURCE_COMMIT);
assert.equal(report.sourceCommit,inventory.sourceCommit);
assert.equal(report.inventoryFiles,inventory.fileCount);
assert.equal(report.uniqueSourceHashes,inventory.uniqueSha256);
assert.equal(inventory.files.length,report.inventoryFiles);
assert(report.inventoryFiles>0);
assert(report.sourceImageFiles>0);
assert(report.sourceImageFiles<=report.inventoryFiles);
if(inventory.status==='SOURCE_GIT_TREE_METADATA_ONLY'){
  assert.equal(report.sourceProvenanceLevel,'GIT_TREE_METADATA_ONLY');
  assert(Number.isInteger(report.uniqueGitBlobShas)&&report.uniqueGitBlobShas>0);
  assert.equal(report.uniqueSourceHashes,null,'A Git blob SHA is not a SHA-256 of PNG bytes');
  assert(inventory.files.every(f=>f.sha256===null),'No invented byte hash allowed');
}
assert.equal(report.questionCount,600);
assert.equal(report.humanPedagogicalApproval,'PENDING');
assert.match(report.matchingRule,/filename-only match is approved/i);
assert.equal(report.questions.length,600);
const graph=report.mediaBindingIndex;
assert(Array.isArray(graph)&&graph.length>0,'Reverse binding graph must exist');
const graphMap=new Map(graph.map(item=>[item.mediaId,item]));
assert.equal(graphMap.size,graph.length,'Duplicate media ID in index');
assert.equal(report.bindingsSummary.uniqueMediaIds,graph.length);
const modules=new Map();let options=0;
for(const q of report.questions){
  assert.match(q.questionId,/^Y[1-5]M0[1-6]-Q\d{3}$/);
  options+=q.options.length;
  const list=modules.get(q.moduleId)||[];list.push(q);modules.set(q.moduleId,list);
  for(const option of q.options){
    if(option.mediaId){
      const row=graphMap.get(option.mediaId);
      assert(row,'Missing media ID from full binding graph: '+option.mediaId);
      assert(row.uses.some(u=>u.questionId===q.questionId&&u.slot==='OPTION'&&u.optionId===option.optionId),
        'Missing option-level occurrence: '+q.questionId+' '+option.mediaId);
    }
  }
  const optionIds=new Set(q.options.map(x=>x.mediaId).filter(Boolean));
  for(const id of new Set([...(q.mediaIds||[]),q.primaryMediaId].filter(x=>typeof x==='string'&&x))){
    if(optionIds.has(id))continue;
    const row=graphMap.get(id);
    assert(row&&row.uses.some(u=>u.questionId===q.questionId&&u.slot==='QUESTION_LEVEL'),
      'Missing question-level occurrence: '+q.questionId+' '+id);
  }
  for(const option of q.options)for(const candidate of option.candidates){
    assert(['VISUAL_EXACT_PRECHECK_HUMAN_QA_PENDING','SEMANTIC_REVIEW_REQUIRED'].includes(candidate.associationStatus));
    assert.notEqual(candidate.associationStatus,'APPROVED');
  }
}
assert.equal(modules.size,30);
for(const [moduleId,items] of modules)assert.equal(items.length,20,moduleId);
assert.equal(options,report.optionCount);
assert.equal(report.bindingsSummary.totalOccurrences,
  graph.reduce((sum,item)=>sum+item.uses.length,0));
for(const row of graph){
  assert(row.uses.length>=row.questionCount,'Invalid usage count '+row.mediaId);
  assert(row.questions.length===row.questionCount,'Question count mismatch '+row.mediaId);
  assert(!row.classification.includes('APPROVED'),'Discovery cannot approve binding '+row.mediaId);
  for(const use of row.uses)assert(modules.has(use.moduleId),'Unknown module '+use.moduleId);
}
for(const candidate of report.sourceCandidateIndex){
  assert(candidate.status==='DISCOVERY_ONLY_PEDAGOGICAL_QA_REQUIRED');
  assert(candidate.mediaIds.every(id=>graphMap.has(id)));
}
// Reuse discoveries must not turn a number into a picture of that many items,
// a color into a colored object, or a grandmother into a grandfather. These
// are lexical crosswalk preconditions, NOT pedagogical approval.
for(const q of report.questions)for(const opt of q.options){
 const semantic=String(opt.semanticTarget||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 for(const candidate of opt.candidates){
   const name=String(candidate.sourcePath||'').split('/').pop().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   if(['one','two','three','four','five','six','seven','eight','nine','ten','1','2','3','4','5','6','7','8','9','10'].includes(semantic))
     assert(!/y3-(?:one|two|three|four|five|six|seven|eight|nine|ten)-/.test(name),
       'number-only alternative cannot use pictured quantity: '+q.questionId+' '+candidate.sourcePath);
   if(['red','blue','green','yellow','white','black','brown','pink'].includes(semantic))
     assert(/^(?:cor|color)[ _-]/.test(name),'pure color cannot reuse an object of that color: '+q.questionId+' '+candidate.sourcePath);
   if(semantic==='orange'){
     const context=[q.learningTarget,q.instructionPt,q.visualRequirement]
       .filter(x=>typeof x==='string').join(' ').normalize('NFD')
       .replace(/[\u0300-\u036f]/g,'').toLowerCase();
     const color=/(?:^|[^a-z])(?:color|colors|cor|cores)(?:[^a-z]|$)/.test(context);
     const fruit=/(?:^|[^a-z])(?:fruit|fruits|fruta|frutas|food|foods|alimento|alimentos|comida|comidas)(?:[^a-z]|$)/.test(context);
     assert.notEqual(color,fruit,'ambiguous orange should have zero name-only candidates: '+q.questionId);
     assert((color?/^(?:cor|color)[ _-]/:/^orange[ _-]fruit[ _-]/).test(name),
       'orange semantic domain mismatch: '+q.questionId+' '+candidate.sourcePath);
   }
   if(semantic==='pencil')
     assert(!/(?:pencil[ _-]case|estojo)/.test(name),
       'pencil case cannot be offered as pencil: '+q.questionId+' '+candidate.sourcePath);
   if(semantic==='grandmother')
     assert(!name.includes('grandfather'),'ambiguous avó/avô reuse: '+candidate.sourcePath);
   if(semantic==='grandfather')
     assert(!name.includes('grandmother'),'ambiguous avó/avô reuse: '+candidate.sourcePath);
   if(semantic==='play')assert(!/logo[ _-]/.test(name),'logo is not the action play: '+candidate.sourcePath);
 }
}

// This option previously remained a tiny fallback despite a candidate
// pencil-case source already available. This asserts discovery only;
// source PNG still requires full semantic visual and pedagogical review.
const schoolCase=report.questions.find(q=>q.questionId==='Y1M04-Q020')?.options
  .find(o=>String(o.semanticTarget||'').toLowerCase()==='pencil case');
assert(schoolCase,'Expected Y1M04-Q020 pencil case option in canonical question');
assert(schoolCase.candidates.some(x=>/school-object-pencil-case-estojo\.png$/i.test(x.sourcePath)),
  'Existing school-object pencil case must be discoverable as QA candidate');

console.log(JSON.stringify({status:'PASS_CROSSWALK_COMPLETE_REVIEW_PENDING',files:report.inventoryFiles,modules:modules.size,questions:report.questionCount,options,
  candidateOptions:report.candidateOptions,visualExactPrechecks:report.optionsWithVisuallyReviewedExactConcept},null,2));
