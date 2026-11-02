#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';

const root=process.cwd(),mode=process.argv[2],bundlePath=path.resolve(process.argv[3]||'qa/media-candidates/assets-duduq-reuse-20261030');
const baselinePath=path.resolve(process.argv[4]||'qa/results/assets-duduq-pre-import-baseline.json');
const reportPath=path.resolve('qa/results/assets-duduq-import-verification.json');
const dist=path.join(root,'dist-pages'),registryRel='content/english/media/media-registry.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const safe=(base,target)=>target===base||target.startsWith(base+path.sep);
if(!['snapshot','verify'].includes(mode)||!safe(root,baselinePath)||!safe(root,reportPath))throw Error('USAGE: snapshot|verify [bundle] [baseline]');
const manifest=JSON.parse(await readFile(path.join(bundlePath,'batch-manifest.json'),'utf8'));
const registry=JSON.parse(await readFile(path.join(dist,registryRel),'utf8'));
const changedIds=[...new Set(manifest.assets.flatMap(a=>a.bindings.map(b=>b.mediaId)))].sort();
const index=new Map(registry.entries.map(e=>[e.mediaId,e]));
const questionHashes={};
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0'),id=`Y${year}M${mm}`;
  const rel=`content/english/year-${year}/module-${mm}/questions.json`,bytes=await readFile(path.join(dist,rel));
  const questions=JSON.parse(bytes.toString('utf8'));
  assert.equal(questions.moduleId,id);assert.equal(questions.items.length,20);
  for(const q of questions.items)assert(q.item_id.startsWith(id+'-'));
  questionHashes[rel]=sha(bytes);
}
if(mode==='snapshot'){
  const before={schemaVersion:'ASSETS_DUDUQ_PRE_IMPORT_SNAPSHOT_V1',questionHashes,
    registryEntries:Object.fromEntries(registry.entries.map(e=>[e.mediaId,e]))};
  await mkdir(path.dirname(baselinePath),{recursive:true});
  await writeFile(baselinePath,JSON.stringify(before,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'PASS',mode,questions:Object.keys(questionHashes).length*20,baseline:baselinePath},null,2));
}else{
  const before=JSON.parse(await readFile(baselinePath,'utf8'));
  assert.equal(before.schemaVersion,'ASSETS_DUDUQ_PRE_IMPORT_SNAPSHOT_V1');
  assert.deepEqual(questionHashes,before.questionHashes,'curriculum question bytes changed during import');
  const beforeRegistry=before.registryEntries;
  const changed=[];
  for(const [mediaId,prior] of Object.entries(beforeRegistry)){
    const current=index.get(mediaId);assert(current,`registry entry removed: ${mediaId}`);
    if(JSON.stringify(prior)!==JSON.stringify(current))changed.push(mediaId);
    if(!changedIds.includes(mediaId))assert.deepEqual(current,prior,`unapproved media registry mutation: ${mediaId}`);
  }
  assert.deepEqual(changed.sort(),changedIds,'only manifest-bound media IDs may change');
  const verifiedFiles=[];
  for(const asset of manifest.assets)for(const binding of asset.bindings){
    const entry=index.get(binding.mediaId);assert(entry,`missing imported media: ${binding.mediaId}`);
    assert.equal(entry.temporary,true);assert.equal(entry.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
    assert.equal(entry.integrationStatus,'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING');
    assert.equal(entry.provenance?.sourceRepository,manifest.sourceRepository);
    assert.equal(entry.provenance?.sourceCommit,manifest.sourceCommit);
    assert.equal(entry.provenance?.sourcePath,asset.sourcePath);
    assert.equal(entry.sha256,asset.sha256);
    const runtimePath=path.join(dist,entry.urlOrPath),bytes=await readFile(runtimePath);
    assert.equal(sha(bytes),asset.sha256);
    const qc=inspectPng(bytes);assert.equal(qc.valid,true);assert.equal(qc.transparent,true);
    verifiedFiles.push({mediaId:binding.mediaId,questionId:binding.questionId,semanticTarget:asset.semanticTarget,
      runtimePath:entry.urlOrPath,sha256:asset.sha256});
  }
  const report={schemaVersion:'ASSETS_DUDUQ_IMPORT_VERIFICATION_V1',status:'PASS_CANDIDATE_ONLY_HUMAN_QA_PENDING',
    sourceCommit:manifest.sourceCommit,verifiedQuestions:Object.keys(questionHashes).length*20,changedMediaIds:changed.sort(),
    preservedQuestionContracts:Object.keys(questionHashes).length*20,verifiedFiles};
  await mkdir(path.dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,verifiedQuestions:report.verifiedQuestions,changedMediaIds:report.changedMediaIds.length,
    imageBindings:verifiedFiles.length,report:reportPath},null,2));
}
