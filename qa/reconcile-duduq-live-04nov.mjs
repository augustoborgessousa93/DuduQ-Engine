#!/usr/bin/env node
/**
 * DUDUQ Phase 2 — reconcile the 04-Nov-2026 Cloudflare production into a
 * DISPOSABLE QA directory, before applying later Assets-DuduQ uploads.
 * No deployment, merge, content contract or production write.
 *
 * Exact published delta from Cloudflare Pages deployment inventories:
 * 2892 -> 2900 static files, +8 official PNG, changed only registry + manifest.
 * The original immutable 03-Nov package is supplied by the QA workflow.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
assert(root.startsWith(path.resolve('qa')+path.sep),'DISPOSABLE_QA_ONLY');
const deployment='e7136200-791d-4e42-9d99-c262dc47893f';
const origin='https://'+deployment.slice(0,8)+'.duduq-engine-13a.pages.dev';
const oldDeployment='709a2477-4cfe-4330-b633-7293a35dc1ee';
const reg='content/english/media/media-registry.json';
const man='.duduq-pages-manifest';
const pngs=[
 'fast-28220749c1f5-63aa8ac40b4a.png',
 'fast-3801879e526f-79674ae4d44e.png',
 'fast-458fc26126c6-ece179e06519.png',
 'fast-723749cc7598-856e33036923.png',
 'fast-7cc673beab90-e567a5c49392.png',
 'fast-7d27b32275a3-ea5e2dad8d19.png',
 'fast-977a3656b1a4-cd92b9ca9c82.png',
 'fast-f2356ca0a8c3-d48f79d62a19.png'
].map(n=>'content/english/assets/images/assets-duduq/'+n);
const sha=b=>createHash('sha256').update(b).digest('hex');
function lines(data){
 const rows=data.toString('utf8').trimEnd().split(/\r?\n/);
 const entries=new Map();
 for(const row of rows){
  const idx=row.lastIndexOf(' '),p=row.slice(0,idx),h=row.slice(idx+1);
  assert(idx>0&&/^[0-9a-f]{64}$/.test(h)&&!entries.has(p),'INVALID_MANIFEST');
  assert(!p.startsWith('/')&&!p.includes('..'),'UNSAFE_MANIFEST_PATH');
  entries.set(p,h);
 }
 return {rows,entries};
}
async function getPublicFile(relative,optional=false){
 const full=origin+'/'+relative.replace(/^\/+/,'');
 let response;
 try{response=await fetch(full,{signal:AbortSignal.timeout(90000),redirect:'error'});}
 catch(e){if(optional)return null;throw e;}
 if(!response.ok){if(optional)return null;throw Error('LIVE_ASSET_HTTP_'+response.status+':'+relative);}
 const bytes=Buffer.from(await response.arrayBuffer());
 assert(bytes.length>0&&bytes.length<20_000_000,'LIVE_ASSET_SIZE:'+relative);
 if(relative.endsWith('.json'))assert(!bytes.toString('utf8',0,50).startsWith('<!DOCTYPE'),'LIVE_HTML_FALLBACK:'+relative);
 return bytes;
}
const oldRegBytes=await readFile(path.join(root,reg));
const oldManifestBytes=await readFile(path.join(root,man));
const base=lines(oldManifestBytes);
assert.equal(base.rows.length,2891,'WRONG_03NOV_BASE_MANIFEST');
assert.equal(base.entries.get(reg),sha(oldRegBytes),'WRONG_03NOV_BASE_REGISTRY');
const oldReg=JSON.parse(oldRegBytes);
assert(Array.isArray(oldReg.entries)&&oldReg.entries.length>=1100);
const liveRegBytes=await getPublicFile(reg);
const liveReg=JSON.parse(liveRegBytes);
assert(Array.isArray(liveReg.entries),'LIVE_REGISTRY_INVALID');
const oldById=new Map(oldReg.entries.map(x=>[x.mediaId,x]));
const liveById=new Map(liveReg.entries.map(x=>[x.mediaId,x]));
assert.equal(oldById.size,oldReg.entries.length,'OLD_DUPLICATE_MEDIA_ID');
assert.equal(liveById.size,liveReg.entries.length,'LIVE_DUPLICATE_MEDIA_ID');
assert.equal(liveById.size,oldById.size,'PRODUCTION_MEDIA_ID_CARDINALITY_CHANGED');
for(const id of oldById.keys())assert(liveById.has(id),'PRODUCTION_REMOVED_MEDIA_ID:'+id);
const changed=[...oldById].filter(([id,e])=>JSON.stringify(e)!==JSON.stringify(liveById.get(id))).map(([id])=>id);
assert.equal(changed.length,39,'NOT_EXACTLY_39_OFFICIAL_LINKS');
for(const id of changed){
 const e=liveById.get(id);
 assert(e.urlOrPath?.endsWith('.png'),'NON_PNG_RELEASE_DELTA:'+id);
 assert(/^[0-9a-f]{64}$/.test(e.sha256),'LIVE_IMAGE_SHA_REQUIRED:'+id);
}
const fruit=liveById.get('IMG-ASSETS-DUDUQ-ORANGE-FRUIT-PHASE2');
const color=liveById.get('IMG-Y1M03-Q001-ORANGE');
assert(fruit&&color&&fruit.urlOrPath!==color.urlOrPath,'ORANGE_FRUIT_COLOR_COLLAPSE');
const imgs=new Map();
for(const p of pngs){
 assert(!base.entries.has(p),'PNG_ALREADY_PRESENT_IN_03NOV_BASE:'+p);
 const b=await getPublicFile(p);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_A_PNG:'+p);
 assert(b.readUInt32BE(16)>=512&&b.readUInt32BE(20)>=512,'PNG_TOO_SMALL:'+p);
 imgs.set(p,b);
}
let publishedManifestBytes=await getPublicFile(man,true);
// Some Pages setups rewrite hidden-file URLs to index.html with HTTP 200.
// Treat that as unavailable, not as a live manifest or successful byte proof.
if(publishedManifestBytes&&!/^content\/|^\./.test(publishedManifestBytes.toString('utf8',0,90).trimStart())){
 publishedManifestBytes=null;
}
let newManifestBytes,mode;
if(publishedManifestBytes){
 const live=lines(publishedManifestBytes);
 assert.equal(live.rows.length,2899,'NOT_04NOV_MANIFEST_COUNT');
 assert.equal(live.entries.get(reg),sha(liveRegBytes),'PUBLISHED_REGISTRY_SHA_MISMATCH');
 for(const [p,h] of base.entries)if(p!==reg)assert.equal(live.entries.get(p),h,'PRODUCTION_BASE_CONTENT_CHANGED:'+p);
 for(const [p,b] of imgs)assert.equal(live.entries.get(p),sha(b),'PRODUCTION_PNG_SHA_MISMATCH:'+p);
 assert.equal(live.entries.size,base.entries.size+imgs.size,'PRODUCTION_MANIFEST_UNEXPECTED_ADDITIONS');
 newManifestBytes=publishedManifestBytes;
 mode='PUBLISHED_MANIFEST_BYTES_VERIFIED';
}else{
 // If the Pages server hides dotfiles, reconstruct strictly from the ONLY
 // published additions. Do not claim binary identity of the manifest itself.
 const next=base.rows.map(row=>row.startsWith(reg+' ')?reg+' '+sha(liveRegBytes):row);
 for(const [p,b] of imgs)next.push(p+' '+sha(b));
 newManifestBytes=Buffer.from(next.join('\n')+'\n');
 mode='SYNTHESIZED_MANIFEST_REQUIRES_BITWISE_PRODUCTION_CONFIRMATION';
}
const nextMan=lines(newManifestBytes);
assert.equal(nextMan.rows.length,2899,'RECONCILED_MANIFEST_WRONG_COUNT');
assert.equal(nextMan.entries.get(reg),sha(liveRegBytes),'RECONCILED_REGISTRY_HASH_MISMATCH');
for(const [p,b] of imgs)assert.equal(nextMan.entries.get(p),sha(b),'RECONCILED_IMAGE_HASH_MISMATCH');
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const q=await readFile(path.join(root,rel));
 assert.equal(base.entries.get(rel),sha(q),'QUESTION_SOURCE_CHANGED:'+rel);
 assert.equal(nextMan.entries.get(rel),sha(q),'QUESTION_PRODUCTION_CHANGED:'+rel);
 assert.equal(JSON.parse(q).items?.length,20,'NOT_20_CONTRACTS:'+rel);
}
const report={
 schemaVersion:'DUDUQ_04NOV_PRODUCTION_RECONCILIATION_V1',
 baselineDeployment:deployment,baseDeployment:oldDeployment,
 result:mode,productionInventoryBefore:2892,productionInventoryAfter:2900,
 publishedNewPngs:pngs.length,changedMediaIds:changed.length,
 mediaIds:changed,all30QuestionModulesPreserved:true,contractsPreserved:600,
 baseRegistrySHA256:sha(oldRegBytes),productionRegistrySHA256:sha(liveRegBytes),
 reconciledManifestSHA256:sha(newManifestBytes),
 publishedManifestSHA256:publishedManifestBytes?sha(publishedManifestBytes):null,
 newPngs:[...imgs].map(([sourcePath,b])=>({sourcePath,sha256:sha(b)})),
 verifiedAgainstPinnedPublicDeployment:true,
 releaseApproved:false,productionDeployed:false
};
const created=[];
try{
 for(const [p,b] of imgs){
  const dest=path.resolve(root,p);
  assert(dest.startsWith(root+path.sep),'PNG_PATH_OUTSIDE_QA');
  await mkdir(path.dirname(dest),{recursive:true});
  await writeFile(dest,b,{flag:'wx'});
  created.push(dest);
 }
 await writeFile(path.join(root,reg),liveRegBytes);
 await writeFile(path.join(root,man),newManifestBytes);
 await mkdir('qa/results',{recursive:true});
 await writeFile('qa/results/phase2-reconciled-live-production-04nov.json',JSON.stringify(report,null,2)+'\n');
}catch(e){
 await writeFile(path.join(root,reg),oldRegBytes);
 await writeFile(path.join(root,man),oldManifestBytes);
 for(const dest of created)await rm(dest,{force:true});
 throw e;
}
console.log('DUDUQ_PRODUCTION_RECONCILIATION='+JSON.stringify({
 status:mode,previousFiles:2892,newFiles:2900,
 mediaLinksPreserved:39,pngsAdded:8,contracts:600,
 qaOnly:true,productionDeployed:false
}));
