#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {validateDuduqRgbaPng} from '../validate-duduq-png.mjs';
const script=path.resolve('qa/duduq-two-lane-plan.mjs');
const sum=b=>createHash('sha256').update(b).digest('hex');
const tab=Array.from({length:256},(_,i)=>{let v=i;for(let j=0;j<8;j++)v=(v&1)?(0xedb88320^(v>>>1)):(v>>>1);return v>>>0});
function crc(b){let c=0xffffffff;for(const x of b)c=tab[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function chunk(t,b){const h=Buffer.alloc(4),tail=Buffer.alloc(4),body=Buffer.concat([Buffer.from(t),b]);
 h.writeUInt32BE(b.length);tail.writeUInt32BE(crc(body));return Buffer.concat([h,body,tail])}
function realPng(size=1024,tint=133){
 const ih=Buffer.alloc(13);ih.writeUInt32BE(size,0);ih.writeUInt32BE(size,4);ih[8]=8;ih[9]=6;
 const pixels=Buffer.alloc(size*(size*4+1));let p=0;
 for(let y=0;y<size;y++){
  pixels[p++]=0;
  for(let x=0;x<size;x++){
   pixels[p++]=tint;pixels[p++]=52;pixels[p++]=22;
   pixels[p++]=x>=size/4&&x<3*size/4&&y>=size/4&&y<3*size/4?255:0;
  }
 }
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),
  chunk('IHDR',ih),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}

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
function candidate(root,mod,{shaWrong=false,truncated=false,size=1024,review='MODEL_SEMANTIC_PRECHECK_PASSED',questionCount=20}={}){
 const dir=path.join(root,'qa/media-candidates',mod.toLowerCase()+'-official-20261030');
 fs.mkdirSync(path.join(dir,'images'),{recursive:true});
 const png=truncated?Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(18)]):realPng(size);
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
  assert.equal(report.candidateAssetCount,1); // identical test PNG bytes across two manifests
  assert.equal(report.candidateManifestEntriesCount,2);
  assert.equal(report.independentQaGreen,false);
  assert.equal(report.finished,false);
  assert.equal(report.integrator.deployAllowed,false);
  assert.equal(report.moduleCount,30);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('positive fixture decodes a real transparent RGBA PNG with CRCs',()=>{
 const result=validateDuduqRgbaPng(realPng(16));assert.equal(result.width,16);
 assert.ok(result.opaquePixels>0&&result.transparentPixels>0);
});
test('signature-only 26-byte fake PNG is rejected even when its SHA matches',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M04',{truncated:true});candidate(root,'Y1M05');
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.candidateAssetCount,1);
  const row=x.report.modules.find(m=>m.moduleId==='Y1M04');
  assert.equal(row.candidate.validAssetCount,0);
  assert.match(row.candidate.invalidAssets[0].verdict,/PNG_DECODE_FAILED/);
  assert.equal(x.report.integrator.nextModule,'Y1M05');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('decodable 16px RGBA PNG with matching SHA cannot count as official high-resolution image',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M04',{size:16});candidate(root,'Y1M05');
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.candidateAssetCount,1);
  const row=x.report.modules.find(m=>m.moduleId==='Y1M04');
  assert.equal(row.candidate.validAssetCount,0);
  assert.equal(row.candidate.invalidAssets[0].verdict,'PNG_RESOLUTION_BELOW_MINIMUM');
  assert.equal(x.report.integrator.nextModule,'Y1M05');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('duplicate hash-bound bindings do not inflate generated-image progress',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M04');
  const before=run(root);assert.equal(before.status,0,before.stderr);
  const p=path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(p,'utf8'));
  manifest.assets.push({...manifest.assets[0],assetKey:'duplicate-binding-only',
   bindings:[{questionId:'Y1M04-Q002',mediaId:'IMG-Y1M04-Q002-A'}]});
  fs.writeFileSync(p,JSON.stringify(manifest));
  const after=run(root);assert.equal(after.status,0,after.stderr);
  assert.equal(after.report.candidateAssetCount,1);
  assert.equal(after.report.candidateManifestEntriesCount,2);
  const b=before.report.modules.find(m=>m.moduleId==='Y1M04').candidate;
  const a=after.report.modules.find(m=>m.moduleId==='Y1M04').candidate;
  assert.equal(a.validAssetCount,2);
  assert.equal(a.validUniquePngCount,1);
  assert.equal(a.assetFingerprintSha256,b.assetFingerprintSha256);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('candidate file hash mismatch never becomes a ready-to-integrate asset',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M04',{shaWrong:true});candidate(root,'Y1M05');
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.candidateAssetCount,1);
  assert.equal(x.report.integrator.nextModule,'Y1M05');
  assert.equal(x.report.modules.find(m=>m.moduleId==='Y1M04').candidate.invalidAssets[0].verdict,'PNG_HASH_MISMATCH');
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

function canonicalFixture(root){
 const ledgerPath=path.join(root,'qa/results/media-module-closure.json');
 const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
 const items=[];
 for(const m of ledger.modulesDetail){
  const complete=m.complete===true;
  const ids=['A','B','C'].map(x=>'IMG-'+m.moduleId+'-Q001-'+x);
  m.referencedMediaIds=3;
  m.blockers=complete?[]:ids.map(mediaId=>({mediaId,status:'PROVISIONAL'}));
  for(const mediaId of ids)items.push({
   mediaId,modules:[m.moduleId],questions:[m.moduleId+'-Q001'],
   status:complete?'OFFICIAL_PEDAGOGICALLY_VERIFIED':'PROVISIONAL'
  });
 }
 ledger.referencedMediaIds=items.length;
 fs.writeFileSync(ledgerPath,JSON.stringify(ledger));
 fs.writeFileSync(path.join(root,'qa/results/media-closure-inventory.json'),
  JSON.stringify({modules:30,activities:600,referencedMediaIds:items.length,items}));
}
test('invented Q999 cannot count as a valid question binding',()=>{
 const root=fixture();
 try{
  candidate(root,'Y1M06');const p=path.join(root,'qa/media-candidates/y1m06-official-20261030/batch-manifest.json');
  const m=JSON.parse(fs.readFileSync(p,'utf8'));
  m.assets[0].bindings[0].questionId='Y1M06-Q999';
  fs.writeFileSync(p,JSON.stringify(m));
  const x=run(root);assert.equal(x.status,0,x.stderr);
  const c=x.report.modules.find(m=>m.moduleId==='Y1M06').candidate;
  assert.equal(c.validAssetCount,0);
  assert.equal(c.verifiedBindingIds,0);
  assert.equal(x.report.producer.nextModule,'Y1M06');
  assert.equal(c.invalidAssets[0].verdict,'INVALID_BINDING_SCOPE');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('invented media ID is rejected against fresh canonical source even with correct Q001',()=>{
 const root=fixture();
 try{
  canonicalFixture(root);candidate(root,'Y1M06');
  const p=path.join(root,'qa/media-candidates/y1m06-official-20261030/batch-manifest.json');
  const m=JSON.parse(fs.readFileSync(p,'utf8'));
  m.assets[0].bindings[0].mediaId='IMG-FAKE-NOT-IN-QUESTION';
  fs.writeFileSync(p,JSON.stringify(m));
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.canonicalSourceTrusted,true);
  const c=x.report.modules.find(m=>m.moduleId==='Y1M06').candidate;
  assert.equal(c.validAssetCount,1); // real PNG bytes remain available for integrator review
  assert.equal(c.verifiedBindingIds,0);
  assert.equal(c.sourceBindingProblems[0].reason,'NOT_IN_CANONICAL_QUESTION');
  assert.equal(x.report.modules.find(m=>m.moduleId==='Y1M06').needsGeneration,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('stale ledger blocker IDs invalidate all source-binding readiness',()=>{
 const root=fixture();
 try{
  canonicalFixture(root);candidate(root,'Y1M06');
  const p=path.join(root,'qa/results/media-module-closure.json');
  const ledger=JSON.parse(fs.readFileSync(p,'utf8'));
  ledger.modulesDetail.find(m=>m.moduleId==='Y1M06').blockers[0].mediaId='STALE-ID';
  fs.writeFileSync(p,JSON.stringify(ledger));
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.canonicalSourceTrusted,false);
  const c=x.report.modules.find(m=>m.moduleId==='Y1M06').candidate;
  assert.equal(c.verifiedBindingIds,0);
  assert.equal(x.report.modules.find(m=>m.moduleId==='Y1M06').needsGeneration,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('different PNG bytes bound to the same mediaId never count as verified coverage',()=>{
 const root=fixture();
 try{
  canonicalFixture(root);candidate(root,'Y1M06');
  const dir=path.join(root,'qa/media-candidates/y1m06-official-20261030');
  const png=realPng(1024,134);
  fs.writeFileSync(path.join(dir,'images/B.png'),png);
  const p=path.join(dir,'batch-manifest.json');
  const m=JSON.parse(fs.readFileSync(p,'utf8'));
  m.assets.push({...m.assets[0],assetKey:'conflict',file:'images/B.png',sha256:sum(png)});
  fs.writeFileSync(p,JSON.stringify(m));
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.canonicalSourceTrusted,true);
  const c=x.report.modules.find(m=>m.moduleId==='Y1M06').candidate;
  assert.equal(c.validAssetCount,2);
  assert.equal(c.verifiedBindingIds,0);
  assert.ok(c.sourceBindingProblems.some(p=>p.reason==='CONFLICTING_PNG_SHA256'));
  assert.equal(x.report.modules.find(m=>m.moduleId==='Y1M06').needsGeneration,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('approved media bindings cannot disguise missing provisional media in candidate readiness',()=>{
 const root=fixture();
 try{
  canonicalFixture(root);candidate(root,'Y1M06');
  const ledgerPath=path.join(root,'qa/results/media-module-closure.json');
  const invPath=path.join(root,'qa/results/media-closure-inventory.json');
  const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
  const inv=JSON.parse(fs.readFileSync(invPath,'utf8'));
  const module=ledger.modulesDetail.find(m=>m.moduleId==='Y1M06');
  const approved=['X','Y','Z'].map(x=>'IMG-Y1M06-Q001-APPROVED-'+x);
  for(const mediaId of approved)inv.items.push({
   mediaId,modules:['Y1M06'],questions:['Y1M06-Q001'],
   status:'OFFICIAL_PEDAGOGICALLY_VERIFIED'
  });
  inv.referencedMediaIds+=approved.length;
  module.referencedMediaIds+=approved.length;
  module.verifiedReferencedIds+=approved.length;
  ledger.referencedMediaIds+=approved.length;
  fs.writeFileSync(invPath,JSON.stringify(inv));
  fs.writeFileSync(ledgerPath,JSON.stringify(ledger));
  const manifestPath=path.join(root,'qa/media-candidates/y1m06-official-20261030/batch-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  manifest.assets[0].bindings=approved.map(mediaId=>({questionId:'Y1M06-Q001',mediaId}));
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));
  const x=run(root);assert.equal(x.status,0,x.stderr);
  assert.equal(x.report.canonicalSourceTrusted,true);
  const row=x.report.modules.find(m=>m.moduleId==='Y1M06');
  assert.equal(row.pendingMediaReferences,3);
  assert.equal(row.candidate.verifiedBindingIds,3);
  assert.equal(row.candidate.verifiedPendingBindingIds,0);
  assert.equal(row.needsGeneration,true);
  assert.equal(x.report.producer.nextModule,'Y1M06');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
