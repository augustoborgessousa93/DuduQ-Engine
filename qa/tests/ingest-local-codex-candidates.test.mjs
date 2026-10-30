#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const SCRIPT=path.resolve('qa/ingest-local-codex-candidates.mjs');
const BRANCH='automation/duduq-media-source-only-fix-20261029';
function crc32(buf){
 let c=0xffffffff;
 for(const b of buf){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}
 return (c^0xffffffff)>>>0;
}
function chunk(type,data){
 const t=Buffer.from(type,'ascii');
 const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
 const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));
 return Buffer.concat([len,t,data,crc]);
}
function testPng(){
 const n=512, ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(n,0);ihdr.writeUInt32BE(n,4);ihdr[8]=8;ihdr[9]=6;
 const rows=[];
 for(let y=0;y<n;y++){
  const row=Buffer.alloc(1+n*4);
  for(let x=0;x<n;x++)if(x>100&&x<410&&y>100&&y<410){
   const k=1+x*4;row[k]=x%255;row[k+1]=y%255;row[k+2]=90;row[k+3]=255;
  }
  rows.push(row);
 }
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);
}
function fixture(branch=BRANCH){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'duduq-codex-local-'));
 const work=path.join(tmp,'repo'),source=path.join(tmp,'generated');
 fs.mkdirSync(work);fs.mkdirSync(source);
 const git=spawnSync('git',['init','-q','-b',branch],{cwd:work,encoding:'utf8'});
 assert.equal(git.status,0,git.stderr);
 return {tmp,work,source};
}
function invoke(f,args=[]){
 return spawnSync(process.execPath,[SCRIPT,'--source='+f.source,...args],{cwd:f.work,encoding:'utf8'});
}
test('stages real RGBA PNG in quarantine and preserves hash without changing production',()=>{
 const f=fixture();
 try{
  const png=testPng();fs.writeFileSync(path.join(f.source,'fish.png'),png);
  const x=invoke(f);assert.equal(x.status,0,x.stderr);
  const dest=path.join(f.work,'qa/media-inbox/codex-local-20261029');
  const report=JSON.parse(fs.readFileSync(path.join(dest,'codex-local-candidates.json'),'utf8'));
  assert.equal(report.count,1);assert.equal(report.qaOnly,true);
  assert.equal(report.eligibleForProduction,false);
  assert.equal(report.originalImageGenerationProvenanceVerified,false);
  assert.equal(report.candidates[0].semanticQA,'PENDING');
  assert.equal(report.candidates[0].integrationStatus,'NOT_INTEGRATED');
  assert.deepEqual(report.candidates[0].reviewHints,['REVIEW_FRAMING_OR_DECORATIVE_DETAILS']);
  assert.equal(report.candidates[0].sha256,createHash('sha256').update(png).digest('hex'));
  assert.deepEqual(fs.readFileSync(path.join(dest,report.candidates[0].fileName)),png);
  assert.equal(fs.existsSync(path.join(f.work,'content')),false);
  const again=invoke(f);assert.equal(again.status,0,again.stderr);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
test('refuses to touch a dirty/wrong branch, even when PNG is valid',()=>{
 const f=fixture('feat/design-sync-primary-button-v1');
 try{
  fs.writeFileSync(path.join(f.source,'one.png'),testPng());
  const x=invoke(f);assert.notEqual(x.status,0);
  assert.match(x.stderr,/WRONG_BRANCH/);
  assert.equal(fs.existsSync(path.join(f.work,'qa')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
test('rejects a fake PNG without placing anything in the runtime or inbox',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.source,'fake.png'),Buffer.from('not an image'));
  const x=invoke(f);assert.notEqual(x.status,0);
  assert.match(x.stderr,/IMAGE_SIZE_OUT_OF_RANGE|NOT_VALID_TRANSPARENT_RGBA/);
  assert.equal(fs.existsSync(path.join(f.work,'qa')),false);
  assert.equal(fs.existsSync(path.join(f.work,'content')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
