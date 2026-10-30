#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const script=path.resolve('qa/plan-shared-media-splits.mjs');
const rootPath=(root,y,m)=>path.join(root,'content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json');
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duduq-media-split-'));
 const root=path.join(dir,'dist'),registry=path.join(root,'content/english/media/media-registry.json');
 fs.mkdirSync(path.dirname(registry),{recursive:true});
 fs.writeFileSync(registry,JSON.stringify({entries:[{mediaId:'IMG-SHARED',temporary:true},{mediaId:'IMG-OTHER',temporary:true}]}));
 for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
  const mod='Y'+y+'M'+String(m).padStart(2,'0');
  const items=Array.from({length:20},(_,i)=>({item_id:mod+'-Q'+String(i+1).padStart(3,'0'),
    questionType:'example',correctOptionId:'A',options:[]}));
  const f=rootPath(root,y,m);fs.mkdirSync(path.dirname(f),{recursive:true});
  fs.writeFileSync(f,JSON.stringify({moduleId:mod,items}));
 }
 return {dir,root};
}
function mutate(f,y,m,qindex,fn){
 const p=rootPath(f.root,y,m);
 const json=JSON.parse(fs.readFileSync(p,'utf8'));fn(json.items[qindex]);fs.writeFileSync(p,JSON.stringify(json));
}
function run(f){
 const dest=path.join(f.dir,'plan.json');
 const p=spawnSync(process.execPath,[script,'--root='+f.root,'--output='+dest],{encoding:'utf8'});
 return {process:p,plan:fs.existsSync(dest)?JSON.parse(fs.readFileSync(dest,'utf8')):null};
}
test('plans question-and-context-specific splits for shared apple vs animal without rewriting a single question',()=>{
 const f=fixture();
 try{
  mutate(f,1,1,0,q=>{q.options.push({assetId:'IMG-SHARED',semanticTarget:'apple'});});
  mutate(f,1,1,1,q=>{q.options.push({mediaId:'IMG-SHARED',semanticTarget:'dog'});});
  mutate(f,2,1,0,q=>{q.options.push({imageRef:'IMG-SHARED',semanticTarget:'apple'});});
  const before=[fs.readFileSync(rootPath(f.root,1,1)),fs.readFileSync(rootPath(f.root,2,1))].map(x=>createHash('sha256').update(x).digest('hex'));
  const x=run(f);
  assert.equal(x.process.status,0,x.process.stderr);
  assert.equal(x.plan.modules,30);assert.equal(x.plan.activities,600);
  assert.equal(x.plan.conflictsRequiringSplit,1);
  assert.equal(x.plan.blockedSharedMediaIds,0);
  assert.equal(x.plan.proposedNewMediaIds,3);
  const changes=x.plan.proposed[0].changes;
  assert.equal(new Set(changes.map(z=>z.newMediaId)).size,3);
  assert.ok(changes.every(z=>z.newMediaId.startsWith('IMG-'+z.questionId+'-CTX-')));
  assert.equal(x.plan.mode,'READ_ONLY_NO_MUTATION');
  const after=[fs.readFileSync(rootPath(f.root,1,1)),fs.readFileSync(rootPath(f.root,2,1))].map(x=>createHash('sha256').update(x).digest('hex'));
  assert.deepEqual(after,before);
  const repeat=run(f);
  assert.equal(repeat.process.status,0);
  assert.deepEqual(repeat.plan.proposed,x.plan.proposed);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});
test('quarantines entire shared ID if one visual occurrence lacks explicit semanticTarget',()=>{
 const f=fixture();
 try{
  mutate(f,1,1,0,q=>{q.options.push({assetId:'IMG-SHARED',semanticTarget:'apple'});});
  mutate(f,1,1,1,q=>{q.options.push({assetId:'IMG-SHARED'});});
  const x=run(f);
  assert.equal(x.process.status,0,x.process.stderr);
  assert.equal(x.plan.conflictsRequiringSplit,0);
  assert.equal(x.plan.blockedSharedMediaIds,1);
  assert.ok(x.plan.blocked[0].reasons.includes('MISSING_NODE_SEMANTIC_TARGET'));
  assert.equal(x.plan.blocked[0].unresolved[0].questionId,'Y1M01-Q002');
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});
test('preserves safe same-module same-concept reuse while flagging cross-module reuse',()=>{
 const f=fixture();
 try{
  mutate(f,1,1,0,q=>{q.options.push({assetId:'IMG-SHARED',semanticTarget:'apple'});});
  mutate(f,1,1,1,q=>{q.options.push({assetId:'IMG-SHARED',semanticTarget:'  APPLE  '});});
  const same=run(f);
  assert.equal(same.process.status,0);
  assert.equal(same.plan.conflictsRequiringSplit,0);
  assert.equal(same.plan.notConflictingImgIds,1);
  mutate(f,2,1,0,q=>{q.options.push({assetId:'IMG-SHARED',semanticTarget:'apple'});});
  const across=run(f);
  assert.equal(across.process.status,0,across.process.stderr);
  assert.equal(across.plan.conflictsRequiringSplit,1);
  assert.ok(across.plan.proposed[0].reasons.includes('CROSS_MODULE_SHARED_ID'));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});
test('refuses incomplete 600-question contracts',()=>{
 const f=fixture();
 try{
  const target=rootPath(f.root,1,1),j=JSON.parse(fs.readFileSync(target,'utf8'));
  j.items.pop();fs.writeFileSync(target,JSON.stringify(j));
  const x=run(f);assert.notEqual(x.process.status,0);
  assert.match(x.process.stderr,/DUDUQ_SHARED_MEDIA_SPLIT_PLAN_INVALID:NOT_20_QUESTIONS/);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true})}
});
