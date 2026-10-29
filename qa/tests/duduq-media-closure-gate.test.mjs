#!/usr/bin/env node
// Regression: an apparently non-temporary image is NOT pedagogically verified.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function audit({includeProvisional}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'duduq-media-closure-'));
  const root=path.join(dir,'dist');
  const put=(p,v)=>{
    const file=path.join(root,p);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,JSON.stringify(v));
  };
  try {
    put('content/english/media/media-registry.json',{entries:[
      {mediaId:'IMG-UNVERIFIED',status:'APPROVED',temporary:false,assets:[]},
      {mediaId:'IMG-PROVISIONAL',status:'APPROVED',temporary:true,assets:[]}
    ]});
    for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
      const mm=String(module).padStart(2,'0'),moduleId='Y'+year+'M'+mm;
      const items=Array.from({length:20},(_,i)=>({
        item_id:moduleId+'-Q'+String(i+1).padStart(3,'0'),
        ...(year===1&&module===1&&i===0?{media:{assetId:'IMG-UNVERIFIED',semanticTarget:'book'}}:{}),
        ...(includeProvisional&&year===1&&module===1&&i===1?{media:{assetId:'IMG-PROVISIONAL',semanticTarget:'pencil'}}:{})
      }));
      put('content/english/year-'+year+'/module-'+mm+'/questions.json',{moduleId,items});
    }
    const out=path.join(dir,'result.json');
    const p=spawnSync(process.execPath,['qa/audit-media-completion.mjs',root,'--output='+out],{encoding:'utf8'});
    assert.equal(p.status,0,p.stderr||p.stdout);
    return JSON.parse(fs.readFileSync(out,'utf8'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}

test('unverified non-temporary reference blocks closure even with zero provisional IDs',()=>{
  const r=audit({includeProvisional:false});
  assert.equal(r.modules,30);
  assert.equal(r.activities,600);
  assert.equal(r.byStatus.NON_TEMPORARY_UNVERIFIED,1);
  assert.equal(r.provisionalOrBlockedReferencedIds,0);
  assert.equal(r.nonTemporaryUnverifiedReferencedIds,1);
  assert.equal(r.incompleteReferencedIds,1);
  assert.equal(r.metadataClosurePassed,false);
  assert.equal(r.finalCompletionPassed,false);
  assert.equal(r.queue.length,0);
});

test('provisional and non-temporary unverified references both count as blockers',()=>{
  const r=audit({includeProvisional:true});
  assert.equal(r.byStatus.PROVISIONAL,1);
  assert.equal(r.byStatus.NON_TEMPORARY_UNVERIFIED,1);
  assert.equal(r.provisionalOrBlockedReferencedIds,1);
  assert.equal(r.nonTemporaryUnverifiedReferencedIds,1);
  assert.equal(r.incompleteReferencedIds,2);
  assert.equal(r.metadataClosurePassed,false);
  assert.equal(r.queue.reduce((n,x)=>n+x.mediaIds.length,0),1);
});
