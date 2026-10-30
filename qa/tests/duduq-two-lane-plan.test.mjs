#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const script=path.resolve('qa/duduq-two-lane-plan.mjs');
const sum=b=>createHash('sha256').update(b).digest('hex');
const all=Array.from({length:5},(_,i)=>i+1).flatMap(y=>Array.from({length:6},(_,j)=>'Y'+y+'M'+String(j+1).padStart(2,'0')));
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'duduq-lanes-'));
 const p=path.join(root,'qa/results/media-module-closure.json');
 fs.mkdirSync(path.dirname(p),{recursive:true});
 const modulesDetail=all.map(id=>({moduleId:id,complete:false,
  provisionalOrBlockedReferencedIds:3,unverifiedReferencedIds:0,verifiedReferencedIds:0}));
 for(const id of ['Y1M04','Y1M05']){
  const m=modulesDetail.find(x=>x.moduleId===id);
  Object.assign(m,{complete:true,provisionalOrBlockedReferencedIds:0,verifiedReferencedIds:3});
 }
 fs.writeFileSync(p,JSON.stringify({modules:30,activities:600,completedModules:2,
  distinctPendingMediaIds:84,modulesDetail}));
 return root;
}
function candidate(root,mod,{shaWrong=false,review='MODEL_SEMANTIC_PRECHECK_PASSED',questionCount=20}={}){
 const dir=path.join(root,'qa/media-candidates',mod.toLowerCase()+'-official-20261030');
 fs.mkdirSync(path.join(dir,'images'),{recursive:true});
 const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(18)]);
 fs.writeFileSync(path.join(dir,'images','A.png'),png);
 fs.writeFileSync(path.join(dir,'batch-manifest.json'),JSON.stringify({
  moduleId:mod,questionContractsReviewed:questionCount,productionApproved:false,
  assets:[{assetKey:'a',file:'images/A.png',sha256:shaWrong?'0'.repeat(64):sum(png),review,
   bindings:[{questionId:mod+'-Q001',mediaId:'IMG-'+mod+'-Q001-A'}]}]
 }));
}
function run(root){
 const file='qa/results/media-two-lane-plan.json';
 const p=spawnSync(process.execPath,[script,'--root='+root,'--output='+file],{encoding:'utf8'});
 return {status:p.status,stderr:p.stderr,stdout:p.stdout,
  report:fs.existsSync(path.join(root,file))?JSON.parse(fs.readFileSync(path.join(root,file),'utf8')):null};
}
test('QA blockage in Y1M04 does not prevent independent Y1M06 generation',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M04');candidate(root,'Y1M05');
  const {status,stderr,report}=run(root);
  assert.equal(status,0,stderr);
  assert.equal(report.producer.nextModule,'Y1M06');
  assert.equal(report.integrator.nextModule,'Y1M04');
  assert.equal(report.candidateAssetCount,2);
  assert.equal(report.independentQaGreen,false);
  assert.equal(report.finished,false);
  assert.equal(report.integrator.deployAllowed,false);
  assert.equal(report.moduleCount,30);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('candidate file hash mismatch never becomes a ready-to-integrate asset',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M04',{shaWrong:true});candidate(root,'Y1M05');
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.candidateAssetCount,1);
  assert.equal(x.report.integrator.nextModule,'Y1M05');
  assert.equal(x.report.modules.find(m=>m.moduleId==='Y1M04').candidate.invalidAssets[0].verdict,'PNG_HASH_OR_SIGNATURE_MISMATCH');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('a partial candidate bundle still needs generation and does not certify module',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M06',{questionCount:2});
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.producer.nextModule,'Y1M06');
  assert.equal(x.report.integrator.nextModule,'Y1M06');
  assert.equal(x.report.modules.find(m=>m.moduleId==='Y1M06').stage,'PARTIAL_CANDIDATES_QA');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('rejects stale or incomplete 30×600 ledger',()=>{
 const root=fixture();
 try{
  const p=path.join(root,'qa/results/media-module-closure.json');
  const x=JSON.parse(fs.readFileSync(p,'utf8'));
  x.activities=599;fs.writeFileSync(p,JSON.stringify(x));
  const z=run(root);assert.notEqual(z.status,0);
  assert.match(z.stderr,/DUDUQ_TWO_LANE_INVALID:NEEDS_30x600_CANONICAL_INVENTORY/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
