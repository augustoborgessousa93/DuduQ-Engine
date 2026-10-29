#!/usr/bin/env node
/**
 * DUDUQ asset bundle importer.
 * Reads individual PNGs produced in ChatGPT. Updates only the central
 * media registry and approved asset directory after a full preflight.
 * No changes to mechanics, answers, HUD, Gold Masters, audio or deployments.
 *
 * Usage: node scripts/duduq-import-chatgpt-bundle.mjs /path/to/unzipped/bundle
 *        node scripts/duduq-import-chatgpt-bundle.mjs /path/to/unzipped/bundle --apply
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { inspectPng } from './duduq-image-pipeline.mjs';
import { isExactPedagogicalConcept } from './duduq-exact-semantic-match.mjs';
import {collectQuestionMediaUsages,assertBindingSafeAcrossQuestions} from '../qa/media-binding-usage-guard.mjs';
const root=process.cwd();
const bundle=path.resolve(process.argv[2]||'');
const apply=process.argv.includes('--apply');
const artifactRoot=path.join(root,'dist-pages');
const registryRel='content/english/media/media-registry.json';
const registryPath=path.join(artifactRoot,registryRel);
const integrityPath=path.join(artifactRoot,'.duduq-pages-manifest');
const exists=p=>fs.stat(p).then(s=>s.isFile(),()=>false);
const hash=b=>createHash('sha256').update(b).digest('hex');
const safe=(base,target)=>target===base||target.startsWith(base+path.sep);
if(!process.argv[2]||!safe(root,root))throw Error('Provide bundle folder');
const manifest=JSON.parse(await fs.readFile(path.join(bundle,'batch-manifest.json'),'utf8'));
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1')throw Error('Invalid bundle schema');
const originalRegistryBytes=await fs.readFile(registryPath);
const originalIntegrityBytes=await fs.readFile(integrityPath);
const originalIntegrityLines=originalIntegrityBytes.toString('utf8').trimEnd().split(/\r?\n/);
const integrity=new Map();
originalIntegrityLines.forEach((line,i)=>{const k=line.lastIndexOf(' '),p=line.slice(0,k),sha=line.slice(k+1);
  if(k<1||integrity.has(p)||!/^[a-f0-9]{64}$/.test(sha))throw Error('Invalid immutable manifest entry: '+p);
  integrity.set(p,{sha,index:i});});
if(integrity.get(registryRel)?.sha!==hash(originalRegistryBytes))throw Error('Compiled media registry differs from release manifest');
const registry=JSON.parse(originalRegistryBytes.toString('utf8'));
if(!Array.isArray(registry.entries))throw Error('Invalid central registry');
const index=new Map(registry.entries.map((e,i)=>[e.mediaId,i]));
const moduleCache=new Map(), actions=[];
function imageIds(node, out=new Set()){
  if(!node||typeof node!=='object')return out;
  for(const [k,v] of Object.entries(node)){
    if(typeof v==='string'&&['assetId','mediaId','image_ref'].includes(k)&&v.startsWith('IMG-'))out.add(v);
    else if(v&&typeof v==='object')imageIds(v,out);
  }
  return out;
}
async function questionFor(qid){
  const m=/^Y([1-5])M(0[1-6])-Q\d{3}$/.exec(qid);
  if(!m)throw Error('Invalid question ID: '+qid);
  const relative='content/english/year-'+m[1]+'/module-'+m[2]+'/questions.json';
  if(!moduleCache.has(relative)){
    const p=path.join(artifactRoot,relative);
    if(!await exists(p))throw Error('Missing built question contract: '+relative);
    const bytes=await fs.readFile(p);
    if(integrity.get(relative)?.sha!==hash(bytes))throw Error('Question contract not verified in artifact manifest: '+relative);
    const json=JSON.parse(bytes.toString('utf8'));
    moduleCache.set(relative,new Map((json.items||[]).map(i=>[i.item_id,i])));
  }
  const q=moduleCache.get(relative).get(qid);
  if(!q)throw Error('Missing question: '+qid);
  return q;
}
// Verify all 30 immutable question contracts BEFORE any image import.
 // A media ID may be reused elsewhere even when this binding is exact.
 // Never silently overwrite another module's intended meaning.
const allQuestionUsages=new Map();
let verifiedQuestionCount=0;
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0'),prefix='Y'+year+'M'+mm;
  await questionFor(prefix+'-Q001');
  const relative='content/english/year-'+year+'/module-'+mm+'/questions.json';
  const questions=moduleCache.get(relative);
  if(questions?.size!==20)throw Error('INCOMPLETE_VERIFIED_MODULE:'+prefix);
  for(const q of questions.values()){
    if(!q.item_id?.startsWith(prefix+'-'))throw Error('INVALID_QUESTION_SCOPE:'+q.item_id);
    collectQuestionMediaUsages(q,allQuestionUsages);
    verifiedQuestionCount++;
  }
}
if(verifiedQuestionCount!==600)throw Error('EXPECTED_600_VERIFIED_QUESTIONS');
for(const asset of manifest.assets||[]){
  // Unmapped candidates remain in the inbox; they must never be imported into game options.
  if(!asset.bindings?.length) continue;
  if(asset.review!=='MODEL_SEMANTIC_PRECHECK_PASSED')throw Error('SEMANTIC_PRECHECK_NOT_PASSED:'+asset.assetKey);
  if(!asset.reviewEvidence)throw Error('MISSING_SEMANTIC_EVIDENCE:'+asset.assetKey);
  const evidencePath=path.resolve(root,asset.reviewEvidence);
  if(!safe(root,evidencePath))throw Error('UNSAFE_SEMANTIC_EVIDENCE_PATH:'+asset.assetKey);
  const evidence=JSON.parse(await fs.readFile(evidencePath,'utf8'));
  const visual=evidence.candidateAssets?.find(x=>x.assetKey===asset.assetKey);
  if(visual?.semanticPrecheck!=='PASSED'||visual.sha256!==asset.sha256||visual.concept!==asset.semanticTarget)
    throw Error('SEMANTIC_EVIDENCE_NOT_PASSED_OR_STALE:'+asset.assetKey);
  if(/^REJECTED/.test(String(evidence.renderedReview?.status||'')))
    throw Error('RENDERED_PEDAGOGICAL_QA_REJECTED:'+asset.assetKey);
  const png=path.resolve(bundle,asset.file||'');
  if(!safe(bundle,png))throw Error('Bundle path escape');
  const bytes=await fs.readFile(png);
  const actual=hash(bytes);
  if(actual!==asset.sha256)throw Error('Asset hash mismatch '+asset.assetKey);
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  if(!bytes.subarray(0,8).equals(signature))throw Error('Not PNG '+asset.assetKey);
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width<1024||height<1024||bytes[24]!==8||bytes[25]!==6)throw Error('Not native high-resolution RGBA '+asset.assetKey);
  const alpha=inspectPng(bytes);
  if(!alpha.valid||!alpha.transparent)throw Error('PNG alpha validation failed: '+asset.assetKey+':'+alpha.reason);
  if(!asset.bindings?.length)continue;
  const out='content/english/assets/images/chatgpt/'+asset.assetKey.toLowerCase()+'-'+actual.slice(0,12)+'.png';
  for(const binding of asset.bindings){
    if(!/^IMG-(?:Y[1-5]M0[1-6]-)?Q\d{3}-[A-Z0-9-]+$/.test(binding.mediaId))throw Error('Unsafe media ID: '+binding.mediaId);
    // Generic IDs are permitted only when the independently verified 600-question guard
    // proves every usage has the exact same semantic target and stays within this module.
    const q=await questionFor(binding.questionId);
    if(!imageIds(q).has(binding.mediaId))throw Error('Media not bound to question: '+binding.mediaId);
    const option=(q.options||[]).find(o=>o.media?.assetId===binding.mediaId||o.mediaId===binding.mediaId);
    const sem=String(option?.media?.semanticTarget||option?.semanticTarget||option?.label||'').trim().toLowerCase();
    if(!option||!isExactPedagogicalConcept(asset.semanticTarget,sem))
      throw Error('Image must match exact answer option: '+binding.mediaId+':'+sem);
    assertBindingSafeAcrossQuestions({usages:allQuestionUsages,mediaId:binding.mediaId,
      questionId:binding.questionId,semanticTarget:asset.semanticTarget});
    const prior=index.has(binding.mediaId)?registry.entries[index.get(binding.mediaId)]:null;
    // APPROVED here is loader compatibility only; candidate remains temporary until real visual/pedagogical QA.
    const entry={...(prior||{}),mediaId:binding.mediaId,status:'APPROVED',kind:'image',temporary:true,
      integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
      urlOrPath:out,sha256:actual,assets:[{path:out,sha256:actual}],
      altText:asset.semanticTarget,
      provenance:{provider:'ChatGPT image generation',sourceAsset:asset.assetKey,nativeWidth:width,nativeHeight:height,sha256:actual},
      replacementAudit:{questionId:binding.questionId,previousPath:prior?.urlOrPath||null}};
    actions.push({binding,entry,bytes,out});
  }
}
if(!actions.length)throw Error('No safe image bindings in bundle');
const seen=new Set();
for(const action of actions){
  if(seen.has(action.binding.mediaId))throw Error('Duplicate image binding: '+action.binding.mediaId);
  seen.add(action.binding.mediaId);
  const dest=path.join(artifactRoot,action.out);
  if(!safe(artifactRoot,dest))throw Error('Unsafe media destination: '+action.out);
  if(await exists(dest) && hash(await fs.readFile(dest))!==hash(action.bytes))throw Error('Existing media hash conflict: '+action.out);
}
const result={mode:apply?'COMPILED_ARTIFACT_IMPORT':'DRY_RUN',assets:manifest.assets.length,bindings:actions.length,files:[...new Set(actions.map(a=>a.out))],changedIds:actions.map(a=>a.binding.mediaId),verifiedQuestionContracts:verifiedQuestionCount,candidateOnly:true,pedagogicalQaApproved:false,productionReleaseCertified:false};
if(apply){
  const backup=path.join(root,'.duduq','media-backups','chatgpt-artifact-'+hash(originalIntegrityBytes).slice(0,12));
  await fs.mkdir(backup,{recursive:true});
  await fs.writeFile(path.join(backup,'media-registry.json'),originalRegistryBytes);
  await fs.writeFile(path.join(backup,'.duduq-pages-manifest'),originalIntegrityBytes);
  const created=[];
  try{
    for(const item of new Map(actions.map(a=>[a.out,a])).values()){
      const target=path.join(artifactRoot,item.out);
      await fs.mkdir(path.dirname(target),{recursive:true});
      if(!await exists(target)){await fs.writeFile(target,item.bytes);created.push(target);}
    }
    for(const action of actions){
      const i=index.get(action.binding.mediaId);
      if(i===undefined){index.set(action.binding.mediaId,registry.entries.length);registry.entries.push(action.entry);}
      else registry.entries[i]=action.entry;
    }
    const nextRegistry=Buffer.from(JSON.stringify(registry,null,2)+'\n');
    await fs.writeFile(registryPath,nextRegistry);
    const lines=[...originalIntegrityLines];
    lines[integrity.get(registryRel).index]=registryRel+' '+hash(nextRegistry);
    for(const item of new Map(actions.map(a=>[a.out,a])).values()){
      const line=item.out+' '+hash(item.bytes);
      if(integrity.has(item.out))lines[integrity.get(item.out).index]=line;
      else lines.push(line);
    }
    const nextIntegrity=Buffer.from(lines.join('\n')+'\n');
    await fs.writeFile(integrityPath,nextIntegrity);
    if(hash(await fs.readFile(registryPath))!==hash(nextRegistry))throw Error('Written registry integrity failed');
    for(const item of new Map(actions.map(a=>[a.out,a])).values()){
      if(hash(await fs.readFile(path.join(artifactRoot,item.out)))!==hash(item.bytes))throw Error('Written image hash failed: '+item.out);
    }
    result.status='COMPILED_ARTIFACT_PATCHED_REQUIRES_RELEASE_QA';
    result.finalManifestSha256=hash(nextIntegrity);
    result.finalManifestEntries=lines.length;
  }catch(e){
    await fs.writeFile(registryPath,originalRegistryBytes);
    await fs.writeFile(integrityPath,originalIntegrityBytes);
    for(const createdFile of created)await fs.rm(createdFile,{force:true});
    throw e;
  }
}else result.status='PREFLIGHT_PASS';
console.log(JSON.stringify(result,null,2));
