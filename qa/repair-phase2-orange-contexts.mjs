#!/usr/bin/env node
/**
 * Split the ambiguous shared "orange" ID by real question semantics:
 * six COLOR questions keep the already-integrated color PNG, fifteen FOOD
 * questions use the pinned original Orange Fruit PNG from Assets-DuduQ.
 * Only mediaId/assetId and the media registry/manifest may change.
 * No content, gabaritos, engines, audio, or production deployment changes.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','PRODUCTION_NOT_ALLOWED');
const root=path.resolve(process.env.DUDUQ_QA_DIST||'qa/dist-pages-food-candidate');
const batch=JSON.parse(await readFile('qa/results/phase2-batch-source-integration.json','utf8'));
assert.equal(batch.newMediaIds,153);
assert.equal(batch.newPngs,69);
const OLD='IMG-Y1M03-Q001-ORANGE';
const FRUIT='IMG-ASSETS-DUDUQ-ORANGE-FRUIT-PHASE2';
const COLOR_IDS=new Set(['Y1M03-Q001','Y2M02-Q015','Y2M02-Q017','Y2M04-Q017','Y2M05-Q007','Y3M05-Q015']);
const FRUIT_IDS=new Set(['Y2M06-Q002','Y2M06-Q003','Y2M06-Q009','Y2M06-Q011','Y2M06-Q016',
'Y3M06-Q001','Y3M06-Q002','Y3M06-Q003','Y3M06-Q005','Y3M06-Q006','Y3M06-Q010',
'Y3M06-Q012','Y3M06-Q017','Y3M06-Q018','Y4M05-Q003']);
assert.equal(COLOR_IDS.size,6);assert.equal(FRUIT_IDS.size,15);
const EXPECTED=new Set([...COLOR_IDS,...FRUIT_IDS]);
const SOURCE='Imagens Ilustrativa/Orange Fruit -laranja fruta.png';
const GIT_BLOB='dfdf5ba61bac0c7b1c2c6efc9d1f800f3fa9461e';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const regRel='content/english/media/media-registry.json';
const manifestRel='.duduq-pages-manifest';
const regBytes=await readFile(path.join(root,regRel));
const manifestBytes=await readFile(path.join(root,manifestRel));
assert.equal(sha(regBytes),batch.sha256Registry);
assert.equal(sha(manifestBytes),batch.sha256Manifest);
const registry=JSON.parse(regBytes);
assert(Array.isArray(registry.entries)&&registry.entries.length>=1100);
const i=registry.entries.findIndex(x=>x.mediaId===OLD);
assert(i!==-1 && !registry.entries.some(x=>x.mediaId===FRUIT),'MEDIA_ID_UNEXPECTED');
assert.equal(registry.entries[i].provenance?.sourcePath,'Imagens Ilustrativa/color orange-cor laranja.png','COLOR_ORIGINAL_DRIFT');
const baseColor=registry.entries[i];
const colorPath=baseColor.urlOrPath;
const sourceURL='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+batch.sourceCommit+'/'+SOURCE.split('/').map(encodeURIComponent).join('/');
const resp=await fetch(sourceURL,{signal:AbortSignal.timeout(60000)});
assert.equal(resp.status,200,'SOURCE_ORANGE_FRUIT_UNAVAILABLE');
const fruitBytes=Buffer.from(await resp.arrayBuffer());
assert.equal(blob(fruitBytes),GIT_BLOB,'ORANGE_FRUIT_SOURCE_GIT_BLOB_MISMATCH');
assert.equal(fruitBytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','FRUIT_NOT_PNG');
assert(fruitBytes.readUInt32BE(16)>=768&&fruitBytes.readUInt32BE(20)>=768,'FRUIT_PNG_TOO_SMALL');
assert.equal(fruitBytes[25],6,'FRUIT_PNG_NOT_RGBA');
const fruitSha=sha(fruitBytes), fruitRel='content/english/assets/images/assets-duduq/phase2-orange-fruit-'+fruitSha.slice(0,12)+'.png';
const manifest=new Map();
for(const [i,line] of manifestBytes.toString('utf8').trimEnd().split(/\r?\n/).entries()){
 const pos=line.lastIndexOf(' ');
 assert(pos>0,'MALFORMED_MANIFEST');
 manifest.set(line.slice(0,pos),{index:i,hash:line.slice(pos+1)});
}
assert.equal(manifest.get(regRel)?.hash,sha(regBytes),'REGISTRY_MANIFEST_MISMATCH');
assert(!manifest.has(fruitRel),'FRUIT_ALREADY_IN_153_BASELINE');
function countOld(value){
 if(value===OLD)return 1;
 if(Array.isArray(value))return value.reduce((n,v)=>n+countOld(v),0);
 if(value&&typeof value==='object')return Object.values(value).reduce((n,v)=>n+countOld(v),0);
 return 0;
}
function replaceMediaRefs(value){
 if(Array.isArray(value))return value.map(replaceMediaRefs);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,
  (k==='mediaId'||k==='assetId')&&v===OLD?FRUIT:replaceMediaRefs(v)]));
 return value;
}
function invertRefs(value){
 if(Array.isArray(value))return value.map(invertRefs);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,
  (k==='mediaId'||k==='assetId')&&v===FRUIT?OLD:invertRefs(v)]));
 return value;
}
const files=[], seen=new Set(), actualColor=new Set(), actualFruit=new Set(), touched=[];
let count=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(root,rel));const data=JSON.parse(bytes);
 assert.equal(manifest.get(rel)?.hash,sha(bytes),'BASE_QUESTION_MANIFEST_MISMATCH:'+rel);
 assert.equal(data.items?.length,20,'MISSING_QUESTION_CONTRACTS:'+rel);
 const next=structuredClone(data);let changed=false;
 for(let k=0;k<data.items.length;k++){
  const q=data.items[k],id=q.item_id,uses=countOld(q);
  if(!uses)continue;
  assert(EXPECTED.has(id),'UNCLASSIFIED_SHARED_ORANGE_USE:'+id);
  seen.add(id);
  if(FRUIT_IDS.has(id)){
   assert(!COLOR_IDS.has(id),'DUPLICATE_CONTEXT');
   assert(/food|fruit|preferences|body/i.test(q.topicEn||''),'FOOD_TOPIC_MISMATCH:'+id);
   const replaced=replaceMediaRefs(q);
   assert.equal(countOld(replaced),0,'UNREPLACED_FRUIT_REF:'+id);
   assert.deepEqual(invertRefs(replaced),q,'NON_MEDIA_CONTENT_CHANGED:'+id);
   next.items[k]=replaced;
   actualFruit.add(id);changed=true;
  } else {
   assert(!/fruit|food/i.test(q.topicEn||''),'COLOR_TOPIC_MISMATCH:'+id);
   actualColor.add(id);
  }
  count++;
 }
 if(changed){
  const newBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
  files.push({rel,bytes:newBytes,original:bytes});
 }
}
assert.equal(count,21,'EXPECTED_21_SHARED_ID_QUESTION_USAGES');
assert.deepEqual([...seen].sort(),[...EXPECTED].sort(),'UNKNOWN_OR_MISSING_ORANGE_CONTEXTS');
assert.equal(actualFruit.size,15);assert.equal(actualColor.size,6);
const fruitEntry=structuredClone(baseColor);
Object.assign(fruitEntry,{
 mediaId:FRUIT,semantic:'orange fruit',urlOrPath:fruitRel,sha256:fruitSha,altText:'orange fruit',
 temporary:true,integrationStatus:'PHASE2_ORANGE_FRUIT_QA_CANDIDATE',
 humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
 source:'ORIGINAL_ASSETS_DUDUQ',
 description:'Original orange fruit, distinct from the color orange. Pinned source and occurrences.',
 assets:[{path:fruitRel,sha256:fruitSha,temporary:true,mediaType:'image/png'}],
 provenance:{provider:'Assets-DuduQ',sourceRepository:'augustoborgessousa93/Assets-DuduQ',
 sourceCommit:batch.sourceCommit,sourcePath:SOURCE,sourceGitBlob:GIT_BLOB,sha256:fruitSha,
 nativeWidth:fruitBytes.readUInt32BE(16),nativeHeight:fruitBytes.readUInt32BE(20)},
 usedByItems:[...FRUIT_IDS].sort()
});
delete fruitEntry.mustNotInclude;
baseColor.usedByItems=[...COLOR_IDS].sort();
registry.entries.push(fruitEntry);
assert.equal(new Set(registry.entries.map(x=>x.mediaId)).size,registry.entries.length,'DUPLICATE_MEDIA_ID');
const newReg=Buffer.from(JSON.stringify(registry,null,2)+'\n');
files.push({rel:regRel,bytes:newReg,original:regBytes});
const lines=manifestBytes.toString('utf8').trimEnd().split(/\r?\n/);
for(const f of files){
 const m=manifest.get(f.rel);
 assert(m&&m.index>=0,'NO_MANIFEST_ENTRY:'+f.rel);
 lines[m.index]=f.rel+' '+sha(f.bytes);
}
lines.push(fruitRel+' '+fruitSha);
const newManifest=Buffer.from(lines.join('\n')+'\n');
const report={schemaVersion:'DUDUQ_PHASE2_ORANGE_FRUIT_COLOR_SPLIT_V1',mode:'ISOLATED_QA_ONLY',
 sourceCommit:batch.sourceCommit,sourceFile:SOURCE,sourceGitBlob:GIT_BLOB,sourceSha256:fruitSha,
 fruitMediaId:FRUIT,colorMediaId:OLD,fruitUsedBy:[...FRUIT_IDS].sort(),
 colorUsedBy:[...COLOR_IDS].sort(),changedQuestionFiles:files.filter(x=>x.rel!==regRel).map(x=>x.rel),
 changedQuestionMediaRefs:15,questionContractsPreserved:600,answersAndNonMediaFieldsUnchanged:true,
 registeredIdsBefore:registry.entries.length-1,registeredIdsAfter:registry.entries.length,
 sourcePngsAdded:1,priorOriginalPngs:69,priorMediaIds:153,
 registrySha256:sha(newReg),manifestSha256:sha(newManifest),fruitAsset:fruitRel,
 runtimeChanged:false,audioChanged:false,productionDeployed:false,releaseApproved:false,
 rollback:{registrySha256:sha(regBytes),manifestSha256:sha(manifestBytes)},
 classification:'Six color contexts retain color PNG. Fifteen food contexts reference fruit PNG. Zero answer keys changed.'};
const outputDir='qa/results/orange-fruit-context-split';
await mkdir(outputDir,{recursive:true});
const created=[];
try{
 for(const f of files)await writeFile(path.join(root,f.rel),f.bytes);
 const out=path.join(root,fruitRel);await mkdir(path.dirname(out),{recursive:true});
 await writeFile(out,fruitBytes,{flag:'wx'});created.push(out);
 await writeFile(path.join(root,manifestRel),newManifest);
 for(const f of files)assert.equal(sha(await readFile(path.join(root,f.rel))),sha(f.bytes));
 assert.equal(sha(await readFile(path.join(root,fruitRel))),fruitSha);
 assert.equal(sha(await readFile(path.join(root,manifestRel))),sha(newManifest));
 for(const rel of report.changedQuestionFiles){
  const b=JSON.parse(await readFile(path.join(root,rel),'utf8'));
  assert.equal(b.items.length,20);
 }
 await writeFile(path.join(outputDir,'split-report.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(path.join(outputDir,'changed-paths.json'),JSON.stringify([...files.map(x=>x.rel),manifestRel,fruitRel],null,2)+'\n');
 console.log('DUDUQ_ORANGE_SPLIT='+JSON.stringify({fruitQuestions:15,colorQuestions:6,sourcePngAdded:1,changedQuestionFiles:15,answersChanged:0,productionDeployed:false}));
}catch(err){
 for(const f of files)await writeFile(path.join(root,f.rel),f.original);
 await writeFile(path.join(root,manifestRel),manifestBytes);
 for(const f of created)await rm(f,{force:true});
 throw err;
}
