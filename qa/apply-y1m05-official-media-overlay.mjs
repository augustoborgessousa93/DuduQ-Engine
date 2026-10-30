#!/usr/bin/env node
/**
 * Apply the isolated Y1M05 official-media overlay to the compiled review
 * artifact. Only five audited media-ID occurrences change; source questions,
 * answers, mechanics, Gold Masters, and production remain untouched.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd(),apply=process.argv.includes('--apply');
const bundleRel='qa/media-candidates/y1m05-official-20261030';
const bundle=path.join(root,bundleRel);
const qRel='content/english/year-1/module-05/questions.json';
const regRel='content/english/media/media-registry.json';
const qPath=path.join(root,'dist-pages',qRel),regPath=path.join(root,'dist-pages',regRel);
const integrityPath=path.join(root,'dist-pages/.duduq-pages-manifest');
const manifest=JSON.parse(await readFile(path.join(bundle,'batch-manifest.json'),'utf8'));
const evidence=JSON.parse(await readFile(path.join(bundle,'semantic-evidence.json'),'utf8'));
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
function withoutMediaIds(node){
  if(Array.isArray(node))return node.map(withoutMediaIds);
  if(!node||typeof node!=='object')return node;
  const out={};
  for(const [key,value] of Object.entries(node))out[key]=['assetId','mediaId','image_ref','imageRef'].includes(key)&&typeof value==='string'&&value.startsWith('IMG-')?'<MEDIA_ID>':withoutMediaIds(value);
  return out;
}
function locate(question,field){
  const parts=[...field.matchAll(/([A-Za-z0-9_]+)|\[(\d+)\]/g)].map(x=>x[1]??Number(x[2]));
  let node=question;
  for(const part of parts.slice(0,-1))node=node?.[part];
  return {node,key:parts.at(-1)};
}
function diff(a,b,p=''){
  if(Object.is(a,b))return [];
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return [p];
  return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>diff(a[key],b[key],p+(p?'.':'')+key));
}

const integrity=parseIntegrity(original.integrity);
if(integrity.entries.get(qRel)?.sha!==hash(original.q))throw Error('QUESTION_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(integrity.entries.get(regRel)?.sha!==hash(original.reg))throw Error('REGISTRY_NOT_HASH_BOUND_BEFORE_OVERLAY');
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.moduleId!=='Y1M05'||
   manifest.originalAuditedPendingIds!==101||manifest.finalBindingIds!==101||manifest.totalQuestionUsageRecords!==101||
   manifest.occurrenceScopedSplits?.length!==5||manifest.assets?.length!==10)
  throw Error('STALE_OR_INVALID_Y1M05_BUNDLE');
if(evidence.sourceQuestionContractSha256!==hash(original.q)||evidence.sourceRegistrySha256!==hash(original.reg))
  throw Error('Y1M05_SOURCE_EVIDENCE_HASH_MISMATCH');

const questions=JSON.parse(original.q.toString('utf8'));
const registry=JSON.parse(original.reg.toString('utf8'));
if(questions.moduleId!=='Y1M05'||questions.items?.length!==20)throw Error('INVALID_Y1M05_CONTRACT');
const invariantBefore=hash(Buffer.from(JSON.stringify(withoutMediaIds(questions))));
if(invariantBefore!==evidence.sourceQuestionInvariantSha256)throw Error('QUESTION_INVARIANT_SOURCE_MISMATCH');

const originalUsages=new Map();
for(const question of questions.items)collectQuestionMediaUsages(question,originalUsages);
if(originalUsages.size!==101||[...originalUsages.values()].reduce((n,x)=>n+x.length,0)!==101)throw Error('Y1M05_SOURCE_BINDINGS_CHANGED');

// Apply each split only to its exact reviewed occurrence.
for(const split of manifest.occurrenceScopedSplits){
  const question=questions.items.find(x=>x.item_id===split.questionId);if(!question)throw Error('SPLIT_QUESTION_MISSING:'+split.questionId);
  const {node,key}=locate(question,split.field);
  if(node?.[key]!==split.from||!isExactPedagogicalConcept(node?.semanticTarget,split.semanticTarget))
    throw Error('SPLIT_OCCURRENCE_CHANGED:'+split.from);
  node[key]=split.to;
}
if(hash(Buffer.from(JSON.stringify(withoutMediaIds(questions))))!==invariantBefore)throw Error('QUESTION_OR_BEHAVIOR_CHANGED_BY_SPLIT');
const expectedDiffs=manifest.occurrenceScopedSplits.map(split=>{
  const qi=JSON.parse(original.q).items.findIndex(x=>x.item_id===split.questionId);
  return `items.${qi}.${split.field.replaceAll('[','.').replaceAll(']','')}`;
}).sort();
const actualDiffs=diff(JSON.parse(original.q),questions).sort();
if(JSON.stringify(actualDiffs)!==JSON.stringify(expectedDiffs))throw Error('QUESTION_DIFF_NOT_OCCURRENCE_SCOPED:'+JSON.stringify(actualDiffs));

const postSplit=new Map();
for(const question of questions.items)collectQuestionMediaUsages(question,postSplit);
if(postSplit.size!==101||[...postSplit.values()].reduce((n,x)=>n+x.length,0)!==101)throw Error('POST_SPLIT_MEDIA_ID_COUNT_MISMATCH');
const bindings=manifest.assets.flatMap(asset=>(asset.bindings||[]).map(binding=>({asset,...binding})));
if(bindings.length!==101||new Set(bindings.map(x=>x.mediaId)).size!==101)throw Error('BUNDLE_BINDINGS_NOT_EXACTLY_101');
for(const binding of bindings){
  const records=postSplit.get(binding.mediaId)||[];
  if(records.length!==1||records[0].questionId!==binding.questionId||!isExactPedagogicalConcept(binding.asset.semanticTarget,records[0].semanticTarget))
    throw Error('BUNDLE_SEMANTIC_OR_QUESTION_MISMATCH:'+binding.mediaId);
}
for(const id of postSplit.keys())if(!bindings.some(x=>x.mediaId===id))throw Error('UNCOVERED_Y1M05_MEDIA_ID:'+id);

const nextRegistry=structuredClone(registry),index=new Map(nextRegistry.entries.map((entry,i)=>[entry.mediaId,i]));
for(const split of manifest.occurrenceScopedSplits){
  const prior=nextRegistry.entries[index.get(split.from)];
  if(!prior||prior.kind!=='image'||prior.temporary!==true)throw Error('SHARED_SOURCE_ID_NOT_PROVISIONAL:'+split.from);
  if(index.has(split.to))throw Error('SPLIT_ID_ALREADY_EXISTS:'+split.to);
  const clone={...structuredClone(prior),mediaId:split.to,semantic:split.semanticTarget,
    description:'Occurrence-scoped provisional clone for audited Y1M05 question node; official pixels imported by hash-bound overlay.',
    splitAudit:{questionId:split.questionId,fromMediaId:split.from,field:split.field,
      reason:'The source ID is also referenced by Y2M06-Q015; split only this exact Y1M05 occurrence.'}};
  index.set(split.to,nextRegistry.entries.length);nextRegistry.entries.push(clone);
}
const nextQ=Buffer.from(JSON.stringify(questions,null,2)+'\n');
const nextReg=Buffer.from(JSON.stringify(nextRegistry,null,2)+'\n');
const result={status:'Y1M05_OFFICIAL_MEDIA_OVERLAY_PREFLIGHT_PASS',mode:apply?'APPLY':'DRY_RUN',questions:20,
  sourcePendingIds:101,postSplitIds:101,occurrenceScopedSplits:5,pngSourceImages:10,manifestAssets:10,
  onlyQuestionDiffs:expectedDiffs,answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,productionModified:false};
if(!apply){console.log(JSON.stringify(result,null,2));process.exit(0);}

try{
  await writeFile(qPath,nextQ);await writeFile(regPath,nextReg);
  const lines=[...integrity.lines];
  lines[integrity.entries.get(qRel).index]=qRel+' '+hash(nextQ);
  lines[integrity.entries.get(regRel).index]=regRel+' '+hash(nextReg);
  await writeFile(integrityPath,lines.join('\n')+'\n');
  const child=spawnSync(process.execPath,['scripts/duduq-import-chatgpt-bundle.mjs',bundle,'--apply'],{
    cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024
  });
  if(child.stdout)process.stdout.write(child.stdout);if(child.stderr)process.stderr.write(child.stderr);
  if(child.status!==0)throw Error('HASH_BOUND_IMPORTER_FAILED:'+child.status+':'+String(child.error?.code||child.error?.message||'NO_SPAWN_ERROR'));
  const finalIntegrity=parseIntegrity(await readFile(integrityPath)),finalQ=await readFile(qPath),finalReg=await readFile(regPath);
  if(finalIntegrity.entries.get(qRel)?.sha!==hash(finalQ)||finalIntegrity.entries.get(regRel)?.sha!==hash(finalReg))
    throw Error('FINAL_COMPILED_MANIFEST_MISMATCH');
  if(hash(Buffer.from(JSON.stringify(withoutMediaIds(JSON.parse(finalQ)))) )!==invariantBefore)throw Error('FINAL_QUESTION_INVARIANT_MISMATCH');
  const finalRegistry=JSON.parse(finalReg);
  for(const binding of bindings){
    const entry=finalRegistry.entries.find(x=>x.mediaId===binding.mediaId);
    if(entry?.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry?.temporary!==true||entry?.sha256!==binding.asset.sha256)
      throw Error('IMPORTED_ENTRY_NOT_HASH_BOUND_CANDIDATE:'+binding.mediaId);
  }
  result.status='Y1M05_OFFICIAL_MEDIA_QA_OVERLAY_APPLIED';result.compiledManifestSha256=hash(await readFile(integrityPath));
  result.importedBindings=bindings.length;result.runtimePngs=new Set(bindings.map(x=>x.asset.sha256)).size;
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(qPath,original.q);await writeFile(regPath,original.reg);await writeFile(integrityPath,original.integrity);
  throw error;
}
