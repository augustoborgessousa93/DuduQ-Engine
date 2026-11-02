import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {sha256} from '../y2m06-official-media-model.mjs';
import {verifyY2M06SourceRegistryContext} from '../verify-y2m06-source-registry-rebase.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),
  registryPath=path.join(dist,'content/english/media/media-registry.json'),
  questionPath=path.join(dist,'content/english/year-2/module-06/questions.json'),
  integrityPath=path.join(dist,'.duduq-pages-manifest');

function repin(integrityBytes,relative,bytes){
  const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/),
    index=lines.findIndex(line=>line.startsWith(relative+' '));
  assert.notEqual(index,-1,'manifest entry '+relative);lines[index]=relative+' '+sha256(bytes);
  return Buffer.from(lines.join('\n')+'\n');
}

test('accepts exact pristine V26 while retaining the older composed registry pin as provenance',async()=>{
  const result=await verifyY2M06SourceRegistryContext({root,dist});
  assert.equal(result.context,'PRISTINE_V26_EXACT_WHOLE_REGISTRY_AND_MANIFEST_WITH_LEGACY_PIN_PRESERVED');
  assert.equal(result.sourceEntries,56);assert.equal(result.sourceQuestionContracts,20);
  assert.notEqual(result.actualRegistrySha256,result.legacyReviewedRegistrySha256);
  assert.equal(result.sourceHashesRewritten,false);assert.equal(result.productionDeployed,false);
});

test('rejects a whole-registry mutation even when its manifest line is repinned',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const registry=JSON.parse(registryBytes),entry=registry.entries.find(candidate=>candidate.mediaId==='IMG-Q009-BIG');
  assert(entry);entry.semantic='tampered-big';const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY2M06SourceRegistryContext({root,dist,questionBytes,registryBytes:mutated,
    integrityBytes:repin(integrityBytes,'content/english/media/media-registry.json',mutated)}),/EXACT_PRISTINE_V26_HASHES/);
});

test('rejects an answer-key mutation even when its manifest line is repinned',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const questions=JSON.parse(questionBytes);questions.items[0].answerKey['Y2M06-Q001-I1']='Y2M06-Q001-T4';
  const mutated=Buffer.from(JSON.stringify(questions,null,2)+'\n');
  await assert.rejects(()=>verifyY2M06SourceRegistryContext({root,dist,questionBytes:mutated,registryBytes,
    integrityBytes:repin(integrityBytes,'content/english/year-2/module-06/questions.json',mutated)}),
    /EXACT_PRISTINE_V26_HASHES/);
});
