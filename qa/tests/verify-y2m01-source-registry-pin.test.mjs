import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {canonicalLfSha256,sha256} from '../y2m01-official-media-model.mjs';
import {verifyY2M01SourceRegistryContext} from '../verify-y2m01-source-registry-pin.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),
  registryPath=path.join(dist,'content/english/media/media-registry.json'),
  questionPath=path.join(dist,'content/english/year-2/module-01/questions.json'),
  integrityPath=path.join(dist,'.duduq-pages-manifest');

function repin(integrityBytes,relative,bytes){
  const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/),
    index=lines.findIndex(line=>line.startsWith(relative+' '));
  assert.notEqual(index,-1,'manifest entry '+relative);lines[index]=relative+' '+sha256(bytes);
  return Buffer.from(lines.join('\n')+'\n');
}

test('canonical evidence hashes accept LF or CRLF bytes but reject changed JSON',()=>{
  const lf=Buffer.from('{\n  "status": "PASS"\n}\n');
  const crlf=Buffer.from('{\r\n  "status": "PASS"\r\n}\r\n');
  const changed=Buffer.from('{\n  "status": "FAIL"\n}\n');
  assert.equal(canonicalLfSha256(lf),canonicalLfSha256(crlf));
  assert.notEqual(canonicalLfSha256(lf),canonicalLfSha256(changed));
});

test('accepts only the exact pristine V26 Y2M01 source context',async()=>{
  const result=await verifyY2M01SourceRegistryContext({root,dist});
  assert.equal(result.context,'PRISTINE_V26_EXACT_WHOLE_MANIFEST_AND_REGISTRY_PIN');
  assert.equal(result.sourceEntries,29);assert.equal(result.sourceUsageRecords,93);
  assert.equal(result.sourceHashesRewritten,false);assert.equal(result.productionDeployed,false);
});

test('rejects a registry mutation even when the registry line is repinned',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const registry=JSON.parse(registryBytes),entry=registry.entries.find(candidate=>candidate.mediaId==='MEDIA-LETTER-A');
  assert(entry);entry.semantic='tampered-letter';const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY2M01SourceRegistryContext({root,dist,questionBytes,registryBytes:mutated,
    integrityBytes:repin(integrityBytes,'content/english/media/media-registry.json',mutated)}),/EXACT_PRISTINE_V26_HASHES/);
});

test('rejects an answer-key mutation even when the question line is repinned',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const questions=JSON.parse(questionBytes);questions.items[8].answerKey='IMG-Y1M01-NAME-LEO-001';
  const mutated=Buffer.from(JSON.stringify(questions,null,2)+'\n');
  await assert.rejects(()=>verifyY2M01SourceRegistryContext({root,dist,questionBytes:mutated,registryBytes,
    integrityBytes:repin(integrityBytes,'content/english/year-2/module-01/questions.json',mutated)}),
    /EXACT_PRISTINE_V26_HASHES/);
});
