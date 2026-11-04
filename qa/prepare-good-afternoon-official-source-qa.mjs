#!/usr/bin/env node
/**
 * QA only: replace the current production provisional Good Afternoon (12 Q,
 * 22 occurrences) by the NEW actual source HEAD a62c... official PNG.
 * Safeguards: 600 immutable JSON contracts, one mediaId, all real usages,
 * pinned Git blob SHA, PNG alpha+size check, two changed manifest records.
 * Never writes original production archive or publishes to Cloudflare.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

assert.equal(process.env.DUDUQ_QA_ONLY,'1');
const qa=path.resolve('qa/good-afternoon-source-candidate');
assert(qa.startsWith(path.resolve('qa')+path.sep));
const id='IMG-Y1M01-GREETING-AFTERNOON-001';
const oldPath='content/english/assets/images/year-1/module-01/temporary/286d695bc248-good-afternoon.png';
const sourceCommit='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
const sourceFile='Imagens Ilustrativa/Good Afternoon.png';
const sourceBlob='74b90da1925c289da672945d9a7def6df1ca9e00';
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const regRel='content/english/media/media-registry.json';
const regFile=path.join(qa,regRel),manifestFile=path.join(qa,'.duduq-pages-manifest');
const regBytes=await readFile(regFile),origManifest=await readFile(manifestFile);
const entries=origManifest.toString().trimEnd().split(/\r?\n/);
assert.equal(entries.length,2891,'WRONG_PUBLISHED_2891_RELEASE_BASELINE');
const manifest=new Map(entries.map((l,i)=>{
 const j=l.lastIndexOf(' ');assert(j>0);return [l.slice(0,j),{sha:l.slice(j+1),index:i}];
}));
assert.equal(manifest.get(regRel)?.sha,sha256(regBytes),'REGISTRY_MANIFEST_MISMATCH');
const registry=JSON.parse(regBytes),item=registry.entries.find(x=>x.mediaId===id);
assert(item?.urlOrPath===oldPath,'CURRENT_PRODUCTION_NOT_TEMPORARY_AFTERNOON');
assert(item?.temporary===true,'NON_PROVISIONAL_SOURCE_OVERWRITE_FORBIDDEN');
const usages=new Map(),questionHashes=new Map(),qCount=new Set(),mechanics=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const b=await readFile(path.join(qa,rel));
 assert.equal(manifest.get(rel)?.sha,sha256(b),'BASE_QUESTION_BYTES_DRIFT:'+rel);
 questionHashes.set(rel,sha256(b));
 const d=JSON.parse(b);assert.equal(d.items.length,20);
 for(const q of d.items){assert(!qCount.has(q.item_id));qCount.add(q.item_id);mechanics.set(q.item_id,q.mechanicId);collectQuestionMediaUsages(q,usages);}
}
assert.equal(qCount.size,600,'NOT_600_QUESTIONS');
const links=usages.get(id)||[];
const realQuestionIds=[...new Set(links.map(x=>x.questionId))].sort();
assert.equal(realQuestionIds.length,12,'AFTERNOON_SHARED_QUESTION_SET_DRIFT');
assert.equal(links.length,22,'AFTERNOON_SHARED_OCCURRENCE_COUNT_DRIFT');
assert(links.every(x=>!x.semanticTarget||/afternoon/i.test(x.semanticTarget)),
 'AFTERNOON_SEMANTIC_TARGET_CONFLICT');
const raw='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+
 sourceCommit+'/'+sourceFile.split('/').map(encodeURIComponent).join('/');
const response=await fetch(raw,{signal:AbortSignal.timeout(60000)});
assert.equal(response.status,200,'OFFICIAL_SOURCE_HTTP_'+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
assert.equal(gitBlob(bytes),sourceBlob,'OFFICIAL_BLOB_SHA_1_CHANGED');
assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG');
const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),bitDepth=bytes[24],colorType=bytes[25];
assert(width>=768&&height>=768,'PNG_TOO_SMALL');
assert.equal(colorType,6,'PNG_NOT_RGBA_ALPHA_CAPABLE');
assert.equal(bitDepth,8,'NOT_8BIT_RGBA');
const sha=sha256(bytes);
const target='content/english/assets/images/assets-duduq/good-afternoon-a62c07c0-'+sha.slice(0,12)+'.png';
assert(!manifest.has(target),'SOURCE_ALREADY_PRESENT_IN_THIS_BASELINE');
const targetPath=path.resolve(qa,target);
assert(targetPath.startsWith(qa+path.sep),'PATH_TRAVERSAL');
const next=structuredClone(registry);
const current=next.entries.find(e=>e.mediaId===id);
current.urlOrPath=target;
current.sha256=sha;
current.assets=[{path:target,sha256:sha}];
current.altText='Good Afternoon — afternoon greeting';
current.integrationStatus='QA_OFFICIAL_GOOD_AFTERNOON_NEW_BINARY_NOT_RELEASED';
current.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
current.provenance={provider:'Assets-DuduQ',sourceRepository:'augustoborgessousa93/Assets-DuduQ',
 sourceCommit,sourcePath:sourceFile,sourceGitBlob:sourceBlob,sha256:sha,nativeWidth:width,nativeHeight:height};
current.replacementAudit={qaOnly:true,previousPath:oldPath,realQuestionIds,realOccurrences:links.length,
 source:'one pinned Good Afternoon source across all 600 contracts'};
const newReg=Buffer.from(JSON.stringify(next,null,2)+'\n');
const updated=[...entries];
updated[manifest.get(regRel).index]=regRel+' '+sha256(newReg);
updated.push(target+' '+sha);
const newManifest=Buffer.from(updated.join('\n')+'\n');
await mkdir(path.dirname(targetPath),{recursive:true});
await writeFile(targetPath,bytes,{flag:'wx'});
await writeFile(regFile,newReg);
await writeFile(manifestFile,newManifest);
for(const [rel,digest] of questionHashes)assert.equal(sha256(await readFile(path.join(qa,rel))),digest);
assert.equal(sha256(await readFile(targetPath)),sha,'WRITTEN_PNG_HASH');
const report={schemaVersion:'DUDUQ_Y1Y2_CURRENT_PROD_GOOD_AFTERNOON_SOURCE_REPLACEMENT_QA_V1',
 status:'OFFICIAL_NEW_IMAGE_APPLIED_TO_DISPOSABLE_QA_AWAITING_VISUAL_REVIEW',
 sourceCommit,sourceBlob,sourceFile,mediaId:id,previousPath:oldPath,newPath:target,
 sourceSHA256:sha,width,height,bitDepth,colorType,
 affectedQuestionIds:realQuestionIds,affectedQuestions:realQuestionIds.length,
 realOccurrences:links.length,mechanicsByQuestion:Object.fromEntries(realQuestionIds.map(q=>[q,mechanics.get(q)])),
 expectedManifestFiles:2892,questionContractsUnchanged:600,
 questionJsonFilesChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
 previousRegistrySha256:sha256(regBytes),newRegistrySha256:sha256(newReg),
 manifestSha256:sha256(newManifest),productionDeployed:false,
 releaseApproved:false,pedagogicalQAApproved:false};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-current-good-afternoon-qa.json',JSON.stringify(report,null,2)+'\n');
console.log('OFFICIAL_NEW_AFTERNOON_APPLIED_IN_QA='+JSON.stringify({
 mediaId:report.mediaId,questions:report.affectedQuestions,occurrences:report.realOccurrences,
 sourceSha256:sha,width,height,transparentFormat:'RGBA',
 changedFiles:2,sourceCommit,productionDeployed:false}));
