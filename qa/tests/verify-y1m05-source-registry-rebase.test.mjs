import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {verifyY1M05SourceRegistryContext} from '../verify-y1m05-source-registry-rebase.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const registryPath=path.join(dist,'content/english/media/media-registry.json');
const questionsPath=path.join(dist,'content/english/year-1/module-05/questions.json');
const integrityPath=path.join(dist,'.duduq-pages-manifest');

function repinRegistry(integrityBytes,registryBytes){
  const rel='content/english/media/media-registry.json';
  const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/);
  const index=lines.findIndex(line=>line.startsWith(rel+' '));
  assert.notEqual(index,-1,'registry manifest entry');
  lines[index]=rel+' '+hash(registryBytes);
  return Buffer.from(lines.join('\n')+'\n');
}

test('accepts the exact pristine V26 registry and preserves both historical hashes',async()=>{
  const result=await verifyY1M05SourceRegistryContext({root,dist});
  assert.equal(result.context,'PRISTINE_V26_EXACT_WHOLE_REGISTRY_PIN');
  assert.equal(result.actualRegistrySha256,result.cleanV26RegistrySha256);
  assert.notEqual(result.actualRegistrySha256,result.legacyReviewedRegistrySha256);
  assert.equal(result.registryEntriesOutsideY1M04,1076);
  assert.equal(result.sourceHashesRewritten,false);
});

test('rejects a manifest-repinned mutation outside the audited Y1M04 scope',async()=>{
  const [questionsBytes,registryBytes,integrityBytes,y1m04Bytes]=await Promise.all([
    readFile(questionsPath),readFile(registryPath),readFile(integrityPath),
    readFile(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json'))
  ]);
  const registry=JSON.parse(registryBytes),bundle=JSON.parse(y1m04Bytes);
  const y1m04Ids=new Set(bundle.assets.flatMap(asset=>asset.bindings.map(binding=>binding.mediaId)));
  const entry=registry.entries.find(candidate=>!y1m04Ids.has(candidate.mediaId));
  assert(entry,'entry outside Y1M04');entry.altText=(entry.altText||entry.semantic||entry.mediaId)+' tampered';
  const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY1M05SourceRegistryContext({root,dist,questionsBytes,registryBytes:mutated,
    integrityBytes:repinRegistry(integrityBytes,mutated)}),/REGISTRY_OUTSIDE_Y1M04_SCOPE_PIN/);
});

test('rejects a manifest-repinned semantic mutation in the 101-entry Y1M05 source projection',async()=>{
  const [questionsBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionsPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const registry=JSON.parse(registryBytes),entry=registry.entries.find(candidate=>candidate.mediaId==='IMG-Q001-HEAD');
  assert(entry,'Y1M05 source entry');entry.semantic='unrelated-concept';
  const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY1M05SourceRegistryContext({root,dist,questionsBytes,registryBytes:mutated,
    integrityBytes:repinRegistry(integrityBytes,mutated)}),/SOURCE_ENTRY_SEMANTIC_MISMATCH|Y1M05_SOURCE_SCOPE_PIN/);
});
