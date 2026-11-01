import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {questionsRel,registryRel,sha256} from '../y1m02-official-media-model.mjs';
import {verifyY1M02SourceRegistryContext} from '../verify-y1m02-source-registry-pin.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages');
const registryPath=path.join(dist,registryRel),questionPath=path.join(dist,questionsRel);
const integrityPath=path.join(dist,'.duduq-pages-manifest');

function repin(integrityBytes,relative,bytes){
  const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/);
  const index=lines.findIndex(line=>line.startsWith(relative+' '));
  assert.notEqual(index,-1,'manifest entry '+relative);lines[index]=relative+' '+sha256(bytes);
  return Buffer.from(lines.join('\n')+'\n');
}

test('accepts exact pristine V26 without rewriting the historical registry hash',async()=>{
  const result=await verifyY1M02SourceRegistryContext({root,dist});
  assert.equal(result.context,'PRISTINE_V26_EXACT_WHOLE_REGISTRY_AND_MANIFEST_PIN');
  assert.equal(result.actualRegistrySha256,result.cleanV26RegistrySha256);
  assert.notEqual(result.actualRegistrySha256,result.legacyReviewedRegistrySha256);
  assert.equal(result.sourceEntries,92);assert.equal(result.sourceUsageRecords,94);
  assert.equal(result.registryEntriesOutsideY1M04,1076);assert.equal(result.sourceHashesRewritten,false);
});

test('rejects a manifest-repinned semantic mutation in the 92-entry Y1M02 projection',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const registry=JSON.parse(registryBytes),entry=registry.entries.find(x=>x.mediaId==='IMG-Q001-ONE');
  assert(entry);entry.semantic='unrelated-concept';const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY1M02SourceRegistryContext({root,dist,questionBytes,registryBytes:mutated,
    integrityBytes:repin(integrityBytes,registryRel,mutated)}),
  /SOURCE_ENTRY_SEMANTIC_MISMATCH|Y1M02_SOURCE_SCOPE_PIN/);
});

test('rejects a manifest-repinned mutation outside the audited Y1M04 predecessor scope',async()=>{
  const [questionBytes,registryBytes,integrityBytes,y1m04Bytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath),
    readFile(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json'))
  ]);
  const registry=JSON.parse(registryBytes),y1m04=JSON.parse(y1m04Bytes);
  const y1m04Ids=new Set(y1m04.assets.flatMap(asset=>asset.bindings.map(binding=>binding.mediaId)));
  const entry=registry.entries.find(x=>!y1m04Ids.has(x.mediaId)&&!x.mediaId.includes('Y1M02'));
  assert(entry);entry.altText=(entry.altText||entry.semantic||entry.mediaId)+' tampered';
  const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY1M02SourceRegistryContext({root,dist,questionBytes,registryBytes:mutated,
    integrityBytes:repin(integrityBytes,registryRel,mutated)}),/REGISTRY_OUTSIDE_Y1M04_SCOPE_PIN/);
});

test('rejects a manifest-repinned non-media question-contract change',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const questions=JSON.parse(questionBytes);questions.items[0].prompt='tampered prompt';
  const mutated=Buffer.from(JSON.stringify(questions,null,2)+'\n');
  await assert.rejects(()=>verifyY1M02SourceRegistryContext({root,dist,questionBytes:mutated,registryBytes,
    integrityBytes:repin(integrityBytes,questionsRel,mutated)}),/SOURCE_QUESTION_CONTRACT/);
});
