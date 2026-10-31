#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const script=path.resolve('qa/check-media-module-closure.mjs');
function run(data,args=[]){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duduq-module-closure-'));
 const input=path.join(dir,'inventory.json'),output=path.join(dir,'result.json');
 try {
  fs.writeFileSync(input,JSON.stringify(data));
  const p=spawnSync(process.execPath,[script,'--input='+input,'--output='+output,...args],{encoding:'utf8'});
  return {status:p.status,stdout:p.stdout,stderr:p.stderr,
   report:fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):null};
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
const moduleIds=Array.from({length:5},(_,i)=>i+1).flatMap(y=>Array.from({length:6},(_,m)=>'Y'+y+'M'+String(m+1).padStart(2,'0')));
function baseline(){
 return {modules:30,activities:600,referencedMediaIds:2,finalPedagogicalQaApproved:false,finalCompletionPassed:false,items:[
  {mediaId:'IMG-X',status:'PROVISIONAL',modules:['Y1M01','Y2M02']},
  {mediaId:'IMG-Y',status:'NON_TEMPORARY_UNVERIFIED',modules:['Y3M03']}
 ]};
}
test('all 30 module entries are emitted and both provisional and unverified shared references block completion',()=>{
 const p=run(baseline());
 assert.equal(p.status,0,p.stderr);
 assert.equal(p.report.modulesDetail.length,30);
 assert.deepEqual(p.report.modulesDetail.map(m=>m.moduleId),moduleIds);
 assert.equal(p.report.completedModules,27);
 assert.equal(p.report.pendingModules,3);
 assert.equal(p.report.distinctPendingMediaIds,2);
 assert.equal(p.report.status,'INCOMPLETE');
 assert.equal(p.report.modulesDetail[0].provisionalOrBlockedReferencedIds,1);
 assert.equal(p.report.modulesDetail.find(m=>m.moduleId==='Y3M03').unverifiedReferencedIds,1);
});
test('require-complete refuses false success even when every image is no longer provisional',()=>{
 const p=baseline();
 p.items=p.items.map(x=>({...x,status:'OFFICIAL_PEDAGOGICALLY_VERIFIED'}));
 const r=run(p,['--require-complete']);
 assert.equal(r.status,2);
 assert.equal(r.report.completedModules,30);
 assert.equal(r.report.allImagesReplacedAndVerified,true);
 assert.equal(r.report.status,'INCOMPLETE');
});
test('complete requires 30 modules plus both final QA approval signals',()=>{
 const p=baseline();
 p.items=p.items.map(x=>({...x,status:'OFFICIAL_PEDAGOGICALLY_VERIFIED'}));
 p.finalPedagogicalQaApproved=true;
 p.finalCompletionPassed=true;
 const r=run(p,['--require-complete']);
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.report.status,'PROJECT_COMPLETE');
 assert.equal(r.report.pendingModules,0);
});
test('canonical inventory mismatch is a hard error, not a completed project',()=>{
 const p=baseline();p.referencedMediaIds=3;
 const r=run(p);
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/DUDUQ_MODULE_CLOSURE_INVALID:MEDIA_REFERENCE_COUNT_MISMATCH/);
});
