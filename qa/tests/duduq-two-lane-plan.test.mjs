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
function realPng(size=1024){
 const ih=Buffer.alloc(13);ih.writeUInt32BE(size,0);ih.writeUInt32BE(size,4);ih[8]=8;ih[9]=6;
 const pixels=Buffer.alloc(size*(size*4+1));let p=0;
 for(let y=0;y<size;y++){
  pixels[p++]=0;
  for(let x=0;x<size;x++){
   pixels[p++]=133;pixels[p++]=52;pixels[p++]=22;
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
