import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateRequests } from '../../scripts/duduq-image-pipeline.mjs';

test('no paid API calls and no more than ten image requests selected', async () => {
  const dir=await mkdtemp(path.join(tmpdir(),'duduq-free-media-'));
  const saveEnable=process.env.DUDUQ_ENABLE_BILLABLE_IMAGE_API;
  const saveMax=process.env.DUDUQ_IMAGE_MAX_PER_RUN;
  try {
    const needs=Array.from({length:11},(_,i)=>({
      status:'NEEDS_CHATGPT_IMAGE_GENERATION',
      generationRequest:{requestId:'TEST-'+String(i+1),mediaId:'IMG-TEST-'+String(i+1),prompt:'toy school object '+i}
    }));
    const file=path.join(dir,'requests.json');
    await writeFile(file,JSON.stringify({schemaVersion:'1.0',needs}));
    delete process.env.DUDUQ_ENABLE_BILLABLE_IMAGE_API;
    process.env.DUDUQ_IMAGE_MAX_PER_RUN='10';
    const result=await generateRequests({requestPath:file});
    assert.equal(result.status,'ZERO_COST_POLICY_API_BLOCKED');
    assert.equal(result.generationRequestLimit,10);
    assert.equal(result.pending,11);
    assert.equal(result.selected,10);
    assert.equal(result.deferred,1);
    assert.equal(result.paidApiCalls,0);
    assert.equal(result.generated,0);
    assert.equal(result.budgetUsd,0);

    process.env.DUDUQ_IMAGE_MAX_PER_RUN='11';
    await assert.rejects(()=>generateRequests({requestPath:file}),/MAX_PER_RUN_MUST_BE_BETWEEN_1_AND_10/);
  } finally {
    if(saveEnable===undefined) delete process.env.DUDUQ_ENABLE_BILLABLE_IMAGE_API;
    else process.env.DUDUQ_ENABLE_BILLABLE_IMAGE_API=saveEnable;
    if(saveMax===undefined) delete process.env.DUDUQ_IMAGE_MAX_PER_RUN;
    else process.env.DUDUQ_IMAGE_MAX_PER_RUN=saveMax;
    await rm(dir,{recursive:true,force:true});
  }
});
