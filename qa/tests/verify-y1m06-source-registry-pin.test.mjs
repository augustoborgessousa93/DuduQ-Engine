import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {canonicalLfSha256,EXPECTED,sha256} from '../y1m06-official-media-model.mjs';
import {verifyY1M06SourceRegistryContext} from '../verify-y1m06-source-registry-pin.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages');
const registryPath=path.join(dist,'content/english/media/media-registry.json');
const questionPath=path.join(dist,'content/english/year-1/module-06/questions.json');
const integrityPath=path.join(dist,'.duduq-pages-manifest');

function repin(integrityBytes,relative,bytes){
  const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/);
  const index=lines.findIndex(line=>line.startsWith(relative+' '));
  assert.notEqual(index,-1,'manifest entry '+relative);
  lines[index]=relative+' '+sha256(bytes);
  return Buffer.from(lines.join('\n')+'\n');
}

test('pins generation provenance canonically across LF and CRLF checkouts',async()=>{
  const files=[
    ['generation-batch-manifest.json',EXPECTED.generationManifestSha256],
    ['generation-semantic-evidence.json',EXPECTED.generationSemanticSha256]
  ];
  for(const [name,expected] of files){
    const bytes=await readFile(path.join(root,'qa/media-candidates/y1m06-official-20261030',name));
    const lf=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
    const crlf=Buffer.from(lf.toString('utf8').replace(/\n/g,'\r\n'));
    assert.equal(canonicalLfSha256(lf),expected,name+' LF pin');
    assert.equal(canonicalLfSha256(crlf),expected,name+' CRLF pin');
  }
});

test('accepts the exact clean V26 source without rewriting a hash',async()=>{
  const result=await verifyY1M06SourceRegistryContext({root,dist});
  assert.equal(result.context,'PRISTINE_V26_EXACT_WHOLE_REGISTRY_PIN');
  assert.equal(result.actualRegistrySha256,result.cleanV26RegistrySha256);
  assert.equal(result.sourceEntries,93);
  assert.equal(result.sourceUsageRecords,93);
  assert.equal(result.registryEntriesOutsideY1M04,1076);
  assert.equal(result.sourceHashesRewritten,false);
});

test('rejects a manifest-repinned semantic mutation in the 93-entry Y1M06 scope',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const registry=JSON.parse(registryBytes),entry=registry.entries.find(x=>x.mediaId==='IMG-Y1M06-Q004-CAT');
  assert(entry);entry.semantic='unrelated-concept';
  const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY1M06SourceRegistryContext({root,dist,questionBytes,registryBytes:mutated,
    integrityBytes:repin(integrityBytes,'content/english/media/media-registry.json',mutated)}),
    /SOURCE_ENTRY_SEMANTIC_MISMATCH|Y1M06_SOURCE_SCOPE_PIN/);
});

test('rejects a manifest-repinned mutation outside the audited Y1M04 scope',async()=>{
  const [questionBytes,registryBytes,integrityBytes,y1m04Bytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath),
    readFile(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json'))
  ]);
  const registry=JSON.parse(registryBytes),y1m04=JSON.parse(y1m04Bytes);
  const y1m04Ids=new Set(y1m04.assets.flatMap(asset=>asset.bindings.map(binding=>binding.mediaId)));
  const entry=registry.entries.find(x=>!y1m04Ids.has(x.mediaId)&&!x.mediaId.includes('Y1M06'));
  assert(entry);entry.altText=(entry.altText||entry.semantic||entry.mediaId)+' tampered';
  const mutated=Buffer.from(JSON.stringify(registry,null,2)+'\n');
  await assert.rejects(()=>verifyY1M06SourceRegistryContext({root,dist,questionBytes,registryBytes:mutated,
    integrityBytes:repin(integrityBytes,'content/english/media/media-registry.json',mutated)}),
    /REGISTRY_OUTSIDE_Y1M04_SCOPE_PIN/);
});

test('rejects a manifest-repinned non-media question change',async()=>{
  const [questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(integrityPath)
  ]);
  const questions=JSON.parse(questionBytes);questions.items[0].answerKey['Y1M06-Q001-A1']='Y1M06-Q001-T2';
  const mutated=Buffer.from(JSON.stringify(questions,null,2)+'\n');
  await assert.rejects(()=>verifyY1M06SourceRegistryContext({root,dist,questionBytes:mutated,registryBytes,
    integrityBytes:repin(integrityBytes,'content/english/year-1/module-06/questions.json',mutated)}),
    /SOURCE_QUESTION_CONTRACT/);
});
