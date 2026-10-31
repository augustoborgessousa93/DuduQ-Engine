#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const SCRIPT=path.resolve('qa/media-safe-retirement.mjs');
const sha=x=>createHash('sha256').update(x).digest('hex');
const OLD='content/english/assets/images/year-1/module-01/temporary/obsolete.png';
const LIVE='content/english/assets/images/year-1/module-01/temporary/live.png';
const SAFE='content/english/assets/images/year-1/approved/live.png';
function setup(withTemporaryReference){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duduq-retirement-fixture-'));
 const root=path.join(dir,'dist');
 const put=(name,contents)=>{
  const dest=path.join(root,name);fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,contents);
 };
 const entries=[
  {mediaId:'IMG-LIVE-OK',status:'APPROVED',temporary:false,humanResolutionStatus:'PEDAGOGICAL_QA_APPROVED',assets:[{path:SAFE}]},
  {mediaId:'IMG-TEMP-LIVE',status:'APPROVED',temporary:true,assets:[{path:LIVE}]},
  {mediaId:'IMG-TEMP-OLD',status:'APPROVED',temporary:true,assets:[{path:OLD}]},
  {mediaId:'IMG-ALIAS-ORPHAN',status:'APPROVED',temporary:true,assets:[{path:LIVE}]}
 ];
 put('content/english/media/media-registry.json',JSON.stringify({entries}));
 put(OLD,Buffer.from('DUDUQ-ORPHAN-IMAGE-SAMPLE'));
 put(LIVE,Buffer.from('DUDUQ-LIVE-IMAGE-SAMPLE'));
 put(SAFE,Buffer.from('DUDUQ-APPROVED-IMAGE-SAMPLE'));
 for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
  const mm=String(m).padStart(2,'0'),module='Y'+y+'M'+mm;
  const items=Array.from({length:20},(_,i)=>({
   item_id:module+'-Q'+String(i+1).padStart(3,'0'),
   ...(y===1&&m===1&&i===0?{stimulus:{assetId:'IMG-LIVE-OK'}}:{}),
   ...(withTemporaryReference&&y===1&&m===1&&i===1?{option:{imageRef:'IMG-TEMP-LIVE'}}:{})
  }));
  put('content/english/year-'+y+'/module-'+mm+'/questions.json',JSON.stringify({moduleId:module,items}));
 }
 return {dir,root};
}
function run(fixture,args=[]){
 const output=path.join(fixture.dir,'media-plan.json');
 const r=spawnSync(process.execPath,[SCRIPT,'--root='+fixture.root,'--output='+output,...args],
  {encoding:'utf8',cwd:fixture.dir});
 return {r,report:fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):null};
}
function writeCanonical(f,{complete=true}={}){
 const file=path.join(f.dir,'qa/results/media-closure-inventory.json');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify({
  schemaVersion:'DUDUQ_MEDIA_COMPLETION_V1',
  modules:30,activities:600,referencedMediaIds:1,
  incompleteReferencedIds:0,provisionalOrBlockedReferencedIds:0,
  nonTemporaryUnverifiedReferencedIds:0,
  metadataClosurePassed:true,finalPedagogicalQaApproved:complete,
  finalCompletionPassed:complete,
  items:[{mediaId:'IMG-LIVE-OK',status:'OFFICIAL_PEDAGOGICALLY_VERIFIED'}]
 }));
}

test('plans a detached image but never an image still referenced by a question or another ID',()=>{
 const f=setup(true);
 try{
  const {r,report}=run(f);
  assert.equal(r.status,0,r.stderr);
  assert.equal(report.modules,30);
  assert.equal(report.activities,600);
  assert.equal(report.referencedMediaIds,2);
  assert.equal(report.provisionalReferencedIds,1);
  assert.deepEqual(report.candidates.map(x=>x.path),[OLD]);
  assert.equal(report.applied,false);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  assert.ok(fs.existsSync(path.join(f.root,LIVE)));
  assert.ok(report.rejected.some(x=>x.reason==='STILL_REFERENCED_VIA_OTHER_MEDIA_ID'));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('rejects a stale canonical audit claiming zero blockers while live media remains',()=>{
 const f=setup(true);
 try{
  const audit=path.join(f.dir,'qa/results/media-closure-inventory.json');
  fs.mkdirSync(path.dirname(audit),{recursive:true});
  fs.writeFileSync(audit,JSON.stringify({
   modules:30,activities:600,referencedMediaIds:2,
   incompleteReferencedIds:0,provisionalOrBlockedReferencedIds:0,
   nonTemporaryUnverifiedReferencedIds:0
  }));
  const {r}=run(f);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/CANONICAL_AUDIT_UNDERCOUNTS_LIVE_MEDIA/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  assert.ok(fs.existsSync(path.join(f.root,LIVE)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('rejects internally inconsistent canonical blocker totals',()=>{
 const f=setup(true);
 try{
  const audit=path.join(f.dir,'qa/results/media-closure-inventory.json');
  fs.mkdirSync(path.dirname(audit),{recursive:true});
  fs.writeFileSync(audit,JSON.stringify({
   modules:30,activities:600,referencedMediaIds:2,
   incompleteReferencedIds:0,provisionalOrBlockedReferencedIds:1,
   nonTemporaryUnverifiedReferencedIds:0
  }));
  const {r}=run(f);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/CANONICAL_AUDIT_INTERNAL_COUNT_MISMATCH/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('cannot retire while even one referenced provisional media ID exists',()=>{
 const f=setup(true);
 try{
  const {r}=run(f,['--apply']);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/REFERENCED_MEDIA_NOT_PEDAGOGICALLY_VERIFIED/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('zero provisionals without release QA attestation still cannot remove files',()=>{
 const f=setup(false);
 try{
  writeCanonical(f);
  const {r,report}=run(f,['--apply']);
  assert.equal(report.provisionalReferencedIds,0);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/NO_FINAL_QA_APPROVAL/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('only pinned verified sign-off can retire orphaned media with byte-identical backup',()=>{
 const f=setup(false);
 try{
  writeCanonical(f);
  const dry=run(f);assert.equal(dry.r.status,0,dry.r.stderr);
  const evidence='qa/results/full-browser-pedagogical-evidence.json';
  const rollback='qa/backups/last-production-build.sha';
  const put=(p,bytes)=>{let dst=path.join(f.dir,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,bytes)};
  const evidenceBytes=Buffer.from('{"status":"PASS","scope":"30 modules"}');
  const rollbackBytes=Buffer.from('release-snapshot-verification');
  put(evidence,evidenceBytes);put(rollback,rollbackBytes);
  const approval={
   schemaVersion:'DUDUQ_RETIREMENT_APPROVAL_V1',
   referenceFingerprint:dry.report.referenceFingerprint,
   pedagogicalQAApproved:true,browserQA30ModulesPassed:true,
   productionDeploymentVerified:true,rollbackVerified:true,
   evidencePath:evidence,evidenceSha256:sha(evidenceBytes),
   rollbackPath:rollback,rollbackSha256:sha(rollbackBytes),
   reviewer:'QA reviewer'
  };
  put('qa/results/final-signoff.json',Buffer.from(JSON.stringify(approval)));
  const done=run(f,['--apply','--approval='+path.join(f.dir,'qa/results/final-signoff.json')]);
  assert.equal(done.r.status,0,done.r.stderr);
  assert.equal(done.report.applied,true);
  // With zero references, BOTH old provisional files are legitimate orphans.
  assert.deepEqual(done.report.removed,[LIVE,OLD]);
  assert.equal(fs.existsSync(path.join(f.root,OLD)),false);
  assert.equal(fs.existsSync(path.join(f.root,LIVE)),false);
  assert.ok(fs.existsSync(path.join(f.root,SAFE)), 'A still-referenced official asset must remain');
  const backup=path.join(f.dir,'qa/results/duduq-media-retirement-backup',OLD);
  const liveBackup=path.join(f.dir,'qa/results/duduq-media-retirement-backup',LIVE);
  assert.equal(sha(fs.readFileSync(backup)),sha(Buffer.from('DUDUQ-ORPHAN-IMAGE-SAMPLE')));
  assert.equal(sha(fs.readFileSync(liveBackup)),sha(Buffer.from('DUDUQ-LIVE-IMAGE-SAMPLE')));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('rejects an orphan whose ancestor directory is a symlink, preserving outside files',()=>{
 const f=setup(false);
 try{
  const ancestor=path.dirname(path.join(f.root,OLD));
  const external=path.join(f.dir,'external-images');
  fs.mkdirSync(external,{recursive:true});
  fs.writeFileSync(path.join(external,'obsolete.png'),'EXTERNAL-VICTIM-OBSOLETE');
  fs.writeFileSync(path.join(external,'live.png'),'EXTERNAL-VICTIM-LIVE');
  fs.rmSync(ancestor,{recursive:true,force:true});
  fs.symlinkSync(external,ancestor,process.platform==='win32'?'junction':'dir');
  const {r}=run(f,['--apply']);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/DUDUQ_RETIREMENT_BLOCKED:SYMLINK_DIRECTORY/);
  assert.equal(fs.readFileSync(path.join(external,'obsolete.png'),'utf8'),'EXTERNAL-VICTIM-OBSOLETE');
  assert.equal(fs.readFileSync(path.join(external,'live.png'),'utf8'),'EXTERNAL-VICTIM-LIVE');
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('rejects a substituted Q999 question in both inventory and retirement planning',()=>{
 const f=setup(false);
 try{
  const file=path.join(f.root,'content/english/year-1/module-01/questions.json');
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  data.items[19].item_id='Y1M01-Q999';
  fs.writeFileSync(file,JSON.stringify(data));
  const retirement=run(f);
  assert.notEqual(retirement.r.status,0);
  assert.match(retirement.r.stderr,/INVALID_QUESTION:Y1M01/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  const output=path.join(f.dir,'inventory.json');
  const audit=spawnSync(process.execPath,[path.resolve('qa/audit-media-completion.mjs'),f.root,'--output='+output],{encoding:'utf8'});
  assert.notEqual(audit.status,0);
  assert.match(audit.stderr,/INVALID_QUESTION:Y1M01/);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('rejects a symlinked backup destination before removing any orphaned file',()=>{
 const f=setup(false);
 try{
  const dry=run(f);assert.equal(dry.r.status,0,dry.r.stderr);
  const evidence='qa/results/full-browser-pedagogical-evidence.json';
  const rollback='qa/backups/last-production-build.sha';
  const put=(p,bytes)=>{
   const dst=path.join(f.dir,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,bytes);
  };
  const evidenceBytes=Buffer.from('{"status":"PASS","scope":"30 modules"}');
  const rollbackBytes=Buffer.from('release-snapshot-verification');
  put(evidence,evidenceBytes);put(rollback,rollbackBytes);
  const approval={
   schemaVersion:'DUDUQ_RETIREMENT_APPROVAL_V1',
   referenceFingerprint:dry.report.referenceFingerprint,
   pedagogicalQAApproved:true,browserQA30ModulesPassed:true,
   productionDeploymentVerified:true,rollbackVerified:true,
   evidencePath:evidence,evidenceSha256:sha(evidenceBytes),
   rollbackPath:rollback,rollbackSha256:sha(rollbackBytes),
   reviewer:'QA reviewer'
  };
  put('qa/results/final-signoff.json',Buffer.from(JSON.stringify(approval)));
  const alias=path.join(f.dir,'qa/results/backup-alias');
  fs.symlinkSync(f.root,alias,process.platform==='win32'?'junction':'dir');
  const result=run(f,[
   '--apply',
   '--approval='+path.join(f.dir,'qa/results/final-signoff.json'),
   '--backup-dir='+alias
  ]);
  assert.notEqual(result.r.status,0);
  assert.match(result.r.stderr,/DUDUQ_RETIREMENT_BLOCKED:SYMLINK_BACKUP_DIRECTORY/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  assert.ok(fs.existsSync(path.join(f.root,LIVE)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

function createValidFixtureApproval(f){
 writeCanonical(f);
 const dry=run(f);assert.equal(dry.r.status,0,dry.r.stderr);
 const evidence='qa/results/full-browser-pedagogical-evidence.json';
 const rollback='qa/backups/last-production-build.sha';
 const put=(p,bytes)=>{
  const dst=path.join(f.dir,p);
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.writeFileSync(dst,bytes);
 };
 const evidenceBytes=Buffer.from('{"status":"PASS","scope":"30 modules"}');
 const rollbackBytes=Buffer.from('release-snapshot-verification');
 put(evidence,evidenceBytes);put(rollback,rollbackBytes);
 const approval={
  schemaVersion:'DUDUQ_RETIREMENT_APPROVAL_V1',
  referenceFingerprint:dry.report.referenceFingerprint,
  pedagogicalQAApproved:true,browserQA30ModulesPassed:true,
  productionDeploymentVerified:true,rollbackVerified:true,
  evidencePath:evidence,evidenceSha256:sha(evidenceBytes),
  rollbackPath:rollback,rollbackSha256:sha(rollbackBytes),
  reviewer:'QA reviewer'
 };
 const file=path.join(f.dir,'qa/results/final-signoff.json');
 put('qa/results/final-signoff.json',Buffer.from(JSON.stringify(approval)));
 return file;
}

test('rejects nested symlink aliases inside the backup tree before any deletion',()=>{
 const f=setup(false);
 try{
  const approval=createValidFixtureApproval(f);
  const backupDir=path.join(f.dir,'qa/results/nested-backup');
  fs.mkdirSync(backupDir,{recursive:true});
  fs.symlinkSync(f.root,path.join(backupDir,'content'),process.platform==='win32'?'junction':'dir');
  const result=run(f,['--apply','--approval='+approval,'--backup-dir='+backupDir]);
  assert.notEqual(result.r.status,0);
  assert.match(result.r.stderr,/DUDUQ_RETIREMENT_BLOCKED:SYMLINK_BACKUP_DIRECTORY/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  assert.ok(fs.existsSync(path.join(f.root,LIVE)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('never overwrites an existing backup or deletes its source on failed backup',()=>{
 const f=setup(false);
 try{
  const approval=createValidFixtureApproval(f);
  const backupDir=path.join(f.dir,'qa/results/duduq-media-retirement-backup');
  const previous=path.join(backupDir,LIVE);
  fs.mkdirSync(path.dirname(previous),{recursive:true});
  fs.writeFileSync(previous,'PREVIOUS-BACKUP-MUST-SURVIVE');
  const result=run(f,['--apply','--approval='+approval,'--backup-dir='+backupDir]);
  assert.notEqual(result.r.status,0);
  assert.match(result.r.stderr,/EEXIST/);
  assert.equal(fs.readFileSync(previous,'utf8'),'PREVIOUS-BACKUP-MUST-SURVIVE');
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  assert.ok(fs.existsSync(path.join(f.root,LIVE)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('refuses apply without a canonical completion audit even when all referenced media are locally approved',()=>{
 const f=setup(false);
 try{
  const {r,report}=run(f,['--apply']);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/CANONICAL_AUDIT_REQUIRED_FOR_APPLY/);
  assert.equal(report.applied,false);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  assert.ok(fs.existsSync(path.join(f.root,LIVE)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('rejects a synthetic signed-off release when the canonical final QA gate remains false',()=>{
 const f=setup(false);
 try{
  const approval=createValidFixtureApproval(f);
  writeCanonical(f,{complete:false});
  const {r}=run(f,['--apply','--approval='+approval]);
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/FINAL_CANONICAL_CLOSURE_NOT_PROVEN/);
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
  assert.ok(fs.existsSync(path.join(f.root,LIVE)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('keeps an orphan file referenced directly by a compiled HTML page',()=>{
 const f=setup(true);
 try{
  const html=path.join(f.root,'play/english/year-1/module-01/index.html');
  fs.mkdirSync(path.dirname(html),{recursive:true});
  fs.writeFileSync(html,'<img src="/'+OLD+'">');
  const {r,report}=run(f);
  assert.equal(r.status,0,r.stderr);
  assert.equal(report.candidates.some(x=>x.path===OLD),false);
  assert.ok(report.rejected.some(x=>x.path===OLD &&
    x.reason==='REFERENCED_BY_COMPILED_RUNTIME' &&
    x.runtimeFiles.includes('play/english/year-1/module-01/index.html')));
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('keeps an orphan file referenced through an images/ suffix in compiled CSS',()=>{
 const f=setup(true);
 try{
  const css=path.join(f.root,'play/english/year-1/module-01/style.css');
  fs.mkdirSync(path.dirname(css),{recursive:true});
  fs.writeFileSync(css,'body{background:url("../'+OLD.slice(OLD.indexOf('images/'))+'")}');
  const {r,report}=run(f);
  assert.equal(r.status,0,r.stderr);
  assert.equal(report.candidates.some(x=>x.path===OLD),false);
  assert.ok(report.rejected.some(x=>x.path===OLD &&
    x.reason==='REFERENCED_BY_COMPILED_RUNTIME'));
  assert.ok(fs.existsSync(path.join(f.root,OLD)));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
