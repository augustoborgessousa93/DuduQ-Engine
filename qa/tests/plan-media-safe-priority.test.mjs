#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const script=path.resolve('qa/plan-media-safe-priority.mjs');
function fixture(overrides={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duduq-safe-priority-'));
 const items=[
  {mediaId:'IMG-A',status:'PROVISIONAL',semantic:'apple',modules:['Y1M01'],questions:['Y1M01-Q001'],usage:1},
  {mediaId:'IMG-B',status:'PROVISIONAL',semantic:'apple',modules:['Y1M02','Y2M01'],questions:['Y1M02-Q001','Y2M01-Q001'],usage:2},
  {mediaId:'IMG-C',status:'NON_TEMPORARY_UNVERIFIED',semantic:'apple',modules:['Y2M01'],questions:['Y2M01-Q002'],usage:1}
 ];
 const inventory={schemaVersion:'DUDUQ_MEDIA_COMPLETION_V1',modules:30,activities:600,referencedMediaIds:3,items,queue:[{concept:'apple',scope:'Y1',mediaIds:['IMG-A','IMG-B','IMG-C'],questions:4}]};
 const split={schemaVersion:'DUDUQ_SHARED_MEDIA_SPLIT_PLAN_V1',mode:'READ_ONLY_NO_MUTATION',modules:30,activities:600,
  notConflictingImgIds:1,conflictsRequiringSplit:1,blockedSharedMediaIds:1,
  unchanged:[{mediaId:'IMG-A'}],proposed:[{mediaId:'IMG-C'}],blocked:[{mediaId:'IMG-B'}]};
 Object.assign(inventory,overrides.inventory||{});Object.assign(split,overrides.split||{});
 const inv=path.join(dir,'inventory.json'),spl=path.join(dir,'split.json'),out=path.join(dir,'out.json');
 fs.writeFileSync(inv,JSON.stringify(inventory));fs.writeFileSync(spl,JSON.stringify(split));
 const r=spawnSync(process.execPath,[script,'--inventory='+inv,'--split='+spl,'--output='+out],{encoding:'utf8'});
 return {dir,r,report:fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):null};
}
const clean=f=>fs.rmSync(f.dir,{recursive:true,force:true});
test('excludes ambiguous and proposed IDs from review-only queue',()=>{
 const f=fixture();try{
  assert.equal(f.r.status,0,f.r.stderr);
  assert.deepEqual(f.report.reviewOnly.map(x=>x.mediaId),['IMG-A']);
  assert.deepEqual(f.report.requiresSplit.map(x=>x.mediaId),['IMG-C']);
  assert.deepEqual(f.report.blockedAmbiguous.map(x=>x.mediaId),['IMG-B']);
  assert.equal(f.report.counts.top20QueueGroupsWithBlocked,1);
  assert.equal(f.report.reviewOnly[0].requiresPedagogicalReview,true);
 }finally{clean(f)}
});
test('fails closed for an unclassified media ID',()=>{
 const f=fixture({split:{unchanged:[],notConflictingImgIds:0}});try{
  assert.notEqual(f.r.status,0);assert.match(f.r.stderr,/UNCATEGORIZED_MEDIA_IDS/);
 }finally{clean(f)}
});
test('fails closed when an ID belongs to two categories',()=>{
 const f=fixture({split:{unchanged:[{mediaId:'IMG-A'},{mediaId:'IMG-B'}],notConflictingImgIds:2}});try{
  assert.notEqual(f.r.status,0);assert.match(f.r.stderr,/DUPLICATE_SPLIT_CATEGORY/);
 }finally{clean(f)}
});
test('fails closed if 30 modules and 600 activities are not preserved',()=>{
 const f=fixture({inventory:{activities:599}});try{
  assert.notEqual(f.r.status,0);assert.match(f.r.stderr,/EXPECTED_30_MODULES_600_ACTIVITIES/);
 }finally{clean(f)}
});
