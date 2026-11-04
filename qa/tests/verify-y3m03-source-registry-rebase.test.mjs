import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {BUNDLE_REL,EXPECTED,sha256} from '../y3m03-official-media-model.mjs';
import {verifyY3M03SourceRegistryContext} from '../verify-y3m03-source-registry-rebase.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),
  registryPath=path.join(dist,'content/english/media/media-registry.json'),
  questionPath=path.join(dist,'content/english/year-3/module-03/questions.json'),
  integrityPath=path.join(dist,'.duduq-pages-manifest');

function repin(integrityBytes,relative,bytes){
  const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/),
    index=lines.findIndex(line=>line.startsWith(relative+' '));
  assert.notEqual(index,-1,'manifest entry '+relative);lines[index]=relative+' '+sha256(bytes);
  return Buffer.from(lines.join('\n')+'\n');
}

test('accepts only an explicitly pinned Y3M03 source context',async()=>{
  const result=await verifyY3M03SourceRegistryContext({root,dist});
  assert.ok([
    'GENERATION_AUDITED_COMPOSED_REGISTRY_EXACT_WHOLE_HASH',
    'PRISTINE_V26_EXACT_WHOLE_REGISTRY_AND_MANIFEST_PIN'
  ].includes(result.context));
  assert.equal(result.sourceEntries,29);assert.equal(result.logicalUsageRecords,74);
  assert.equal(result.rawReferenceFields,340);assert.equal(result.finalOccurrenceScopedIds,66);
  assert.equal(result.sourceHashesRewritten,false);assert.equal(result.productionDeployed,false);
  const [generationBytes,reviewBytes]=await Promise.all([
    readFile(path.join(root,BUNDLE_REL,'generation-batch-manifest.json')),
    readFile(path.join(root,BUNDLE_REL,'batch-manifest.json'))
  ]);
  assert.equal(sha256(generationBytes),EXPECTED.generationManifestSha256);
  const review=JSON.parse(reviewBytes);
  assert.equal(review.generationManifestSha256,EXPECTED.generationManifestSha256);
  assert(review.assets.every(asset=>asset.reviewEvidence===BUNDLE_REL+'/integration-semantic-evidence.json'));
});

test('rejects a registry mutation even when its manifest line is repinned',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const registry=JSON.parse(registryBytes),entry=registry.entries.find(candidate=>candidate.mediaId==='IMG-V11-2B-0E55AE94BCF4CC3E');
  assert(entry);entry.semantic='tampered-family';const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY3M03SourceRegistryContext({root,dist,requireRebase:false,questionBytes,
    registryBytes:mutated,integrityBytes:repin(integrityBytes,'content/english/media/media-registry.json',mutated)}),
    /UNRECOGNIZED_WHOLE_REGISTRY_HASH/);
});

test('rejects an answer-key mutation even when its manifest line is repinned',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const questions=JSON.parse(questionBytes);questions.items[2].answerKey='Y3M03-Q003-O2';
  const mutated=Buffer.from(JSON.stringify(questions,null,2)+'\n');
  await assert.rejects(()=>verifyY3M03SourceRegistryContext({root,dist,requireRebase:false,questionBytes:mutated,
    registryBytes,integrityBytes:repin(integrityBytes,'content/english/year-3/module-03/questions.json',mutated)}),
    /SOURCE_QUESTION_CONTRACT/);
});
