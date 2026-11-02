#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist-pages'),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=root+'/.duduq-pages-manifest';
const lines=(await readFile(manifest,'utf8')).trimEnd().split(/\r?\n/);
const hashes=new Map(lines.map(s=>{let n=s.lastIndexOf(' ');assert(n>0);return[s.slice(0,n),s.slice(n+1)];}));
assert.equal(hashes.size,lines.length);
async function verify(rel){
 assert(hashes.has(rel),'NOT_MANIFESTED:'+rel);
 const file=path.resolve(root,rel);assert(file.startsWith(root+path.sep));
 const b=await readFile(file);assert.equal(sha(b),hashes.get(rel),'HASH_MISMATCH:'+rel);return b;
}
const p='content/english/media/media-registry.json',r=JSON.parse(await verify(p)),ids=new Map(r.entries.map(e=>[e.mediaId,e]));
assert.equal(ids.size,r.entries.length);
const patch={'IMG-Y1M02-Q001-ONE':'one','IMG-Y1M02-Q001-TWO':'two','IMG-Y1M02-Q001-THREE':'three','IMG-Y1M02-Q001-FOUR':'four','IMG-Y1M02-Q002-EIGHT':'eight','IMG-Y1M02-Q007-NINE':'nine','IMG-Y1M02-Q007-TEN':'ten'};
const src=new Map();
for(const e of r.entries){
 if(!Object.values(patch).includes(e.semantic)||src.has(e.semantic))continue;
 if(!e.urlOrPath?.startsWith('content/english/assets/images/assets-duduq/number-'))continue;
 if(e.provenance?.sourceRepository!=='augustoborgessousa93/Assets-DuduQ'||e.provenance?.sourceCommit!=='50fb80a89a5779d73f81c96aab35f6e86193d769')continue;
 assert.equal(e.sha256,hashes.get(e.urlOrPath));
 const b=await verify(e.urlOrPath);assert(b.readUInt32BE(16)>=1024&&b[25]===6,'BAD_SOURCE_PNG');
 src.set(e.semantic,e);
}
assert.equal(src.size,7,'SOURCE_CONCEPTS_NOT_PRESENT');
const usage=new Map(Object.keys(patch).map(id=>[id,new Set()]));
let n=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),mod='Y'+y+'M'+mm;
 const q=JSON.parse(await verify('content/english/year-'+y+'/module-'+mm+'/questions.json'));
 assert(q.moduleId===mod&&q.items?.length===20);n+=q.items.length;
 for(const item of q.items){
  function walk(v){
   if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){v.forEach(walk);return;}
   const found=new Set(['assetId','mediaId','image_ref','imageRef'].map(k=>v[k]).filter(x=>Object.hasOwn(patch,x)));
   for(const id of found){assert(!v.semanticTarget||v.semanticTarget===patch[id],'SEMANTIC_CONFLICT:'+id);usage.get(id).add(item.item_id);}
   Object.values(v).forEach(walk);
  }
  walk(item);
 }
}
assert.equal(n,600);
const changes=[];
for(const [id,word]of Object.entries(patch)){
 const e=ids.get(id),x=src.get(word),old='content/english/assets/images/year-1/provisional-semantic-v1/'+id.toLowerCase()+'.svg';
 assert(e?.semantic===word&&e.temporary===true&&e.urlOrPath===old,'NOT_EXPECTED_PROVISIONAL:'+id);
 assert(e.assets?.[0]?.sha256===hashes.get(old),'UNTRUSTED_OLD_MEDIA:'+id);
 const questions=[...usage.get(id)].sort();
 assert(questions.includes(id.split('-').slice(1,3).join('-')),'QUESTION_SCOPE:'+id);
 Object.assign(e,{urlOrPath:x.urlOrPath,sha256:x.sha256,assets:x.assets,altText:word,provenance:x.provenance,
   integrationStatus:'CANDIDATE_EXACT_SOURCE_NUMERAL_LEAF',
   humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
   replacementAudit:{source:'Already verified V28 numeral PNG; leaf replacement',previousPath:old,verifiedQuestionIds:questions,qaOnly:true}});
 changes.push({mediaId:id,semantic:word,old,new:x.urlOrPath,questionIds:questions});
}
const bytes=Buffer.from(JSON.stringify(r,null,2)+'\n');
await writeFile(root+'/'+p,bytes);
await writeFile(manifest,lines.map(s=>s.startsWith(p+' ')?p+' '+sha(bytes):s).join('\n')+'\n');
const q1=JSON.parse(await verify('content/english/year-1/module-02/questions.json')).items[0];
assert(q1.item_id==='Y1M02-Q001'&&q1.targets.length===4);
for(const t of q1.targets)assert.equal(ids.get(t.media.assetId).urlOrPath,src.get(t.semanticTarget).urlOrPath);
await mkdir('qa/results',{recursive:true});
const report={status:'PASS_7_Y1M02_NUMERAL_LEAF_REPLACEMENTS',changedMediaIds:7,changedQuestionIds:[...new Set(changes.flatMap(x=>x.questionIds))].sort(),changes,questions:600,manifestEntries:lines.length,audioChanged:false,answerKeysChanged:false,releaseApproved:false};
await writeFile('qa/results/v28-y1m02-seven-leaf-hotfix.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,mediaIds:7,affectedQuestions:report.changedQuestionIds.length}));
