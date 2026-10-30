#!/usr/bin/env node
/**
 * Apply the isolated Y1M04 media overlay to the compiled review artifact.
 * The only question-contract change is the audited Q008 media-ID split.
 * Source questions, answers, mechanics, Gold Masters and production are not
 * touched. The existing hash-bound bundle importer performs the PNG import.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd(),apply=process.argv.includes('--apply');
const bundleRel='qa/media-candidates/y1m04-official-20261030';
const bundle=path.join(root,bundleRel);
const qRel='content/english/year-1/module-04/questions.json';
const regRel='content/english/media/media-registry.json';
const qPath=path.join(root,'dist-pages',qRel),regPath=path.join(root,'dist-pages',regRel);
const integrityPath=path.join(root,'dist-pages/.duduq-pages-manifest');
const manifest=JSON.parse(await readFile(path.join(bundle,'batch-manifest.json'),'utf8'));
const split=manifest.occurrenceScopedSplit;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const original={q:await readFile(qPath),reg:await readFile(regPath),integrity:await readFile(integrityPath)};

function parseIntegrity(bytes){
  const lines=bytes.toString('utf8').trimEnd().split(/\r?\n/),entries=new Map();
  lines.forEach((line,index)=>{const p=line.lastIndexOf(' '),name=line.slice(0,p),sha=line.slice(p+1);
    if(p<1||entries.has(name)||!/^[a-f0-9]{64}$/.test(sha))throw Error('BAD_COMPILED_MANIFEST:'+name);
    entries.set(name,{sha,index});
  });
  return {lines,entries};
}
const integrity=parseIntegrity(original.integrity);
if(integrity.entries.get(qRel)?.sha!==hash(original.q))throw Error('QUESTION_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(integrity.entries.get(regRel)?.sha!==hash(original.reg))throw Error('REGISTRY_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.moduleId!=='Y1M04'||
   manifest.originalAuditedPendingIds!==83||manifest.finalBindingIds!==84||manifest.assets?.length!==18)
  throw Error('STALE_OR_INVALID_Y1M04_BUNDLE');

const questions=JSON.parse(original.q.toString('utf8'));
const registry=JSON.parse(original.reg.toString('utf8'));
if(questions.moduleId!=='Y1M04'||questions.items?.length!==20)throw Error('INVALID_Y1M04_CONTRACT');
const q008=questions.items.find(x=>x.item_id===split.questionId);
if(q008?.mediaBindings?.[0]?.assetId!==split.from||q008.mediaBindings[0].semanticTarget!==split.semanticTarget)
  throw Error('Q008_SCOPED_SPLIT_SOURCE_CHANGED');
const oldEntry=registry.entries?.find(x=>x.mediaId===split.from);
if(!oldEntry||oldEntry.kind!=='image'||oldEntry.temporary!==true)throw Error('Q003_PENCIL_CASE_NOT_PROVISIONAL');
if(registry.entries.some(x=>x.mediaId===split.to))throw Error('Q008_SPLIT_ID_ALREADY_EXISTS');

// Mutate only the reviewed occurrence in memory and prove the media graph is
// fully covered by the hash-bound bundle before any write.
q008.mediaBindings[0].assetId=split.to;
const usages=new Map();
for(const question of questions.items)collectQuestionMediaUsages(question,usages);
if(usages.size!==84)throw Error('POST_SPLIT_MEDIA_ID_COUNT_MISMATCH:'+usages.size);
const bindings=manifest.assets.flatMap(a=>(a.bindings||[]).map(b=>({asset:a,...b})));
if(bindings.length!==84||new Set(bindings.map(x=>x.mediaId)).size!==84)throw Error('BUNDLE_BINDINGS_NOT_EXACTLY_84');
for(const binding of bindings){
  const records=usages.get(binding.mediaId)||[];
  if(!records.length||!records.some(x=>x.questionId===binding.questionId)||
     records.some(x=>!isExactPedagogicalConcept(binding.asset.semanticTarget,x.semanticTarget)))
    throw Error('BUNDLE_SEMANTIC_OR_QUESTION_MISMATCH:'+binding.mediaId);
  const prior=binding.mediaId===split.to?{...oldEntry,mediaId:split.to}:registry.entries.find(x=>x.mediaId===binding.mediaId);
  if(!prior||prior.kind!=='image'||prior.temporary!==true)throw Error('BINDING_NOT_EXISTING_PROVISIONAL:'+binding.mediaId);
}
for(const id of usages.keys())if(!bindings.some(x=>x.mediaId===id))throw Error('UNCOVERED_Y1M04_MEDIA_ID:'+id);

const nextQ=Buffer.from(JSON.stringify(questions,null,2)+'\n');
const nextRegistry=structuredClone(registry);
nextRegistry.entries.push({...oldEntry,mediaId:split.to,semantic:split.semanticTarget,
  description:'Occurrence-scoped provisional clone for audited Q008 semantic spelling; official pixels imported by hash-bound overlay.',
  splitAudit:{questionId:split.questionId,fromMediaId:split.from,field:split.field,reason:'exact semantic guard: pencil case vs pencil-case'}});
const nextReg=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');
const diffPaths=[];
function diff(a,b,p=''){
  if(Object.is(a,b))return;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return void diffPaths.push(p);
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of keys)diff(a[key],b[key],p+(p?'.':'')+key);
}
diff(JSON.parse(original.q),questions);
const expectedPath='items.7.mediaBindings.0.assetId';
if(diffPaths.length!==1||diffPaths[0]!==expectedPath)throw Error('QUESTION_DIFF_NOT_SCOPED:'+JSON.stringify(diffPaths));

const result={status:'Y1M04_OFFICIAL_MEDIA_OVERLAY_PREFLIGHT_PASS',mode:apply?'APPLY':'DRY_RUN',
  questions:20,sourcePendingIds:83,postSplitIds:84,pngSourceImages:17,manifestAssets:18,
  onlyQuestionDiff:expectedPath,answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,productionModified:false};
if(!apply){console.log(JSON.stringify(result,null,2));process.exit(0);}

try{
  await writeFile(qPath,nextQ);
  await writeFile(regPath,nextReg);
  const lines=[...integrity.lines];
  lines[integrity.entries.get(qRel).index]=qRel+' '+hash(nextQ);
  lines[integrity.entries.get(regRel).index]=regRel+' '+hash(nextReg);
  await writeFile(integrityPath,lines.join('\n')+'\n');
  const child=spawnSync(process.execPath,['scripts/duduq-import-chatgpt-bundle.mjs',bundle,'--apply'],{
    cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024
  });
  if(child.stdout)process.stdout.write(child.stdout);
  if(child.stderr)process.stderr.write(child.stderr);
  if(child.status!==0)throw Error('HASH_BOUND_IMPORTER_FAILED:'+child.status);
  const finalIntegrity=parseIntegrity(await readFile(integrityPath));
  const finalQ=await readFile(qPath),finalReg=await readFile(regPath);
  if(finalIntegrity.entries.get(qRel)?.sha!==hash(finalQ)||finalIntegrity.entries.get(regRel)?.sha!==hash(finalReg))
    throw Error('FINAL_COMPILED_MANIFEST_MISMATCH');
  const finalRegistry=JSON.parse(finalReg);
  for(const binding of bindings){
    const entry=finalRegistry.entries.find(x=>x.mediaId===binding.mediaId);
    if(entry?.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry?.temporary!==true||entry?.sha256!==binding.asset.sha256)
      throw Error('IMPORTED_ENTRY_NOT_HASH_BOUND_CANDIDATE:'+binding.mediaId);
  }
  result.status='Y1M04_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED';
  result.compiledManifestSha256=hash(await readFile(integrityPath));
  result.importedBindings=bindings.length;
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(qPath,original.q);
  await writeFile(regPath,original.reg);
  await writeFile(integrityPath,original.integrity);
  throw error;
}
