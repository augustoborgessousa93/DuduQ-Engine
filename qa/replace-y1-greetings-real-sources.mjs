#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const ROOT=path.resolve('dist-pages'),REPO='augustoborgessousa93/Assets-DuduQ';
const COMMIT='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY');
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const sources={
 morning:{file:'Good Morning.png',blob:'c17fc4fef70d9251d45a6f44d649126aa852c8d2'},
 afternoon:{file:'Good Afternoon.png',blob:'74b90da1925c289da672945d9a7def6df1ca9e00'},
 night:{file:'Good Night.png',blob:'3f4ffba44955ebd37f2da378e8d14a9ea4665396'},
 sleep:{file:'dormindo.png',blob:'fec2dea320a5a6a43ceeb0c7bde8f612ac831e6d'},
 school:{file:'chegada_escola_manha_arriving_at_school_morning.png',blob:'ea9d3d76b7b9be96e26acd071cce4ba3b6bab0eb'},
 orange:{file:'color orange-cor laranja.png',blob:'364c9ccfda05f4440da566495b47c5c6a2993532'}
};
const regRel='content/english/media/media-registry.json',manRel='.duduq-pages-manifest';
const regOriginal=await readFile(path.join(ROOT,regRel)),manOriginal=await readFile(path.join(ROOT,manRel));
const reg=JSON.parse(regOriginal),byId=new Map(reg.entries.map((e,i)=>[e.mediaId,i]));
assert.equal(byId.size,reg.entries.length);
const oldMorning='IMG-Y1M01-GREETING-MORNING-001';
const morningGeneric='IMG-Y1M01-GREETING-MORNING-ORIGINAL-20261103';
const morningSchool='IMG-Y1M01-MORNING-SCHOOL-ARRIVAL-20261103';
const afternoon='IMG-Y1M01-GREETING-AFTERNOON-001';
const night='Y1M01-EMOJI-NIGHT-001',sleep='Y1M01-EMOJI-SLEEP-001',orange='IMG-Y1M03-Q016-ORANGE';
for(const id of [oldMorning,afternoon,night,sleep,orange])assert(byId.has(id),'MISSING_REGISTRY_'+id);
for(const id of [morningGeneric,morningSchool])assert(!byId.has(id),'NEW_ID_COLLISION');
const oldMorningEntry=structuredClone(reg.entries[byId.get(oldMorning)]);
assert(oldMorningEntry.urlOrPath.includes('relogio'),'LEGACY_MORNING_SOURCE_CHANGED');
assert(reg.entries[byId.get(night)].urlOrPath.endsWith('.svg'));
assert(reg.entries[byId.get(sleep)].urlOrPath.endsWith('.svg'));
const manifests=new Map(),lines=manOriginal.toString('utf8').trimEnd().split(/\r?\n/);
for(let i=0;i<lines.length;i++){const k=lines[i].lastIndexOf(' ');assert(k>0);let rel=lines[i].slice(0,k);manifests.set(rel,{index:i,hash:lines[i].slice(k+1)});}
assert.equal(manifests.get(regRel)?.hash,sha(regOriginal));
const savedFiles=[],sourcesResolved={};
for(const [concept,src] of Object.entries(sources)){
 const loc='Imagens Ilustrativa/'+src.file;
 const url='https://raw.githubusercontent.com/'+REPO+'/'+COMMIT+'/'+loc.split('/').map(encodeURIComponent).join('/');
 const r=await fetch(url,{signal:AbortSignal.timeout(90000)});
 assert.equal(r.status,200,'SOURCE_NOT_AVAILABLE:'+loc);
 const bytes=Buffer.from(await r.arrayBuffer());
 assert.equal(blob(bytes),src.blob,'SOURCE_BLOB_MISMATCH:'+loc);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG:'+loc);
 assert(bytes.readUInt32BE(16)>=600&&bytes.readUInt32BE(20)>=600,'SMALL_PNG:'+loc);
 const digest=sha(bytes);
 const existing=reg.entries.find(e=>e.sha256===digest&&e.urlOrPath?.endsWith('.png'));
 let rel;
 if(existing){rel=existing.urlOrPath;assert.equal(sha(await readFile(path.join(ROOT,rel))),digest,'PREEXISTING_SOURCE_MISMATCH');}
 else {rel='content/english/assets/images/assets-duduq/y1-greetings-'+concept+'-'+digest.slice(0,12)+'.png';assert(!manifests.has(rel),'ASSET_PATH_ALREADY_EXISTS');savedFiles.push({rel,bytes})}
 sourcesResolved[concept]={...src,rel,sha256:digest,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),reusedExisting:!!existing,bytes:bytes.length};
}
const touch=(entry,concept)=>{
 const s=sourcesResolved[concept],prev=entry.urlOrPath;
 Object.assign(entry,{urlOrPath:s.rel,sha256:s.sha256,temporary:true,kind:'image',
  semantic:entry.semantic||concept,
  assets:[{path:s.rel,sha256:s.sha256,mediaType:'image/png',temporary:true}],
  integrationStatus:'Y1_GREETINGS_SOURCE_REUSE_QA_ONLY',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  provenance:{provider:'Assets-DuduQ',sourceRepository:REPO,sourceCommit:COMMIT,
   sourcePath:'Imagens Ilustrativa/'+s.file,sourceGitBlob:s.blob,sha256:s.sha256,
   nativeWidth:s.width,nativeHeight:s.height},
  previousMediaPath:prev});
};
const orig=reg.entries[byId.get(oldMorning)];
const generic=structuredClone(orig);generic.mediaId=morningGeneric;generic.semantic='good morning';touch(generic,'morning');
const school=structuredClone(orig);school.mediaId=morningSchool;school.semantic='arriving at school in the morning';touch(school,'school');
reg.entries.push(generic,school);
for(const [id,concept] of [[afternoon,'afternoon'],[night,'night'],[sleep,'sleep'],[orange,'orange']])touch(reg.entries[byId.get(id)],concept);
const recast=(value,oldId,newId)=>{
 if(Array.isArray(value))return value.map(x=>recast(x,oldId,newId));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,
  ((k==='mediaId'||k==='assetId')&&v===oldId)?newId:recast(v,oldId,newId)]));
 return value;
};
const restore=(value,newId,oldId)=>recast(value,newId,oldId);
const touched=[],morningUses=[],nightUses=[],afternoonUses=[],orangeUses=[],sleepUses=[];
const Y1=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const original=await readFile(path.join(ROOT,rel));
 assert.equal(sha(original),manifests.get(rel)?.hash,'BASE_QUESTION_MANIFEST_CHANGED:'+rel);
 const data=JSON.parse(original);assert.equal(data.items?.length,20,'CONTRACTS_INCOMPLETE:'+rel);
 let updated=false;
 for(let qindex=0;qindex<data.items.length;qindex++){
  let q=data.items[qindex],before=JSON.stringify(q),id=q.item_id;
  const has=mid=>before.includes('"'+mid+'"');
  if(has(oldMorning)){
   assert(id.startsWith('Y1M01-'),'CROSS_MODULE_MORNING_SHARED_CONFLICT:'+id);
   morningUses.push(id);
   const isLeo=id==='Y1M01-Q009',isSchool=id==='Y1M01-Q003';
   if(!isLeo){
    const replacement=isSchool?morningSchool:morningGeneric;
    const revised=recast(q,oldMorning,replacement);
    assert.deepEqual(restore(revised,replacement,oldMorning),q,'NON_MEDIA_QUESTION_DRIFT:'+id);
    data.items[qindex]=revised;updated=true;
   }
  }
  for(const [mid,arr] of [[afternoon,afternoonUses],[night,nightUses],[sleep,sleepUses],[orange,orangeUses]])if(has(mid))arr.push(id);
 }
 if(updated){const bytes=Buffer.from(JSON.stringify(data,null,2)+'\n');touched.push({rel,bytes,previous:original});}
 if(y===1)Y1.set(m,data);
}
assert.equal(Y1.size,6);
assert(morningUses.length>=7&&morningUses.includes('Y1M01-Q009')&&morningUses.includes('Y1M01-Q003'),'MORNING_OCCURRENCE_DRIFT');
assert(nightUses.includes('Y1M01-Q003')&&nightUses.includes('Y1M01-Q004'),'NIGHT_OCCURRENCES_MISSING');
assert(afternoonUses.length>=7,'AFTERNOON_OCCURRENCES_MISSING');
assert(orangeUses.includes('Y1M03-Q016'),'ORANGE_OCCURRENCE_MISSING');
const apples=JSON.stringify([...Y1.values()].flatMap(m=>m.items)).match(/\\bapple\\b/gi)||[];
assert.equal(apples.length,0,'APPLE_NOW_IN_Y1_CONTRACTS_REVIEW_REQUIRED');
const registryNew=Buffer.from(JSON.stringify(reg,null,2)+'\n');
touched.push({rel:regRel,bytes:registryNew,previous:regOriginal});
for(const f of touched){const entry=manifests.get(f.rel);assert(entry);lines[entry.index]=f.rel+' '+sha(f.bytes)}
for(const f of savedFiles)lines.push(f.rel+' '+sha(f.bytes));
const manNew=Buffer.from(lines.join('\n')+'\n');
const report={schemaVersion:'DUDUQ_Y1_GREETINGS_OFFICIAL_REUSE_V1',candidateOnly:true,productionDeployed:false,
 sourceCommit:COMMIT,sourceRepository:REPO,questions:600,year1Questions:120,answerKeysChanged:0,
 registeredBefore:reg.entries.length-2,registeredAfter:reg.entries.length,
 replacedMediaIds:[morningGeneric,morningSchool,afternoon,night,sleep,orange],
 schoolQuestion:'Y1M01-Q003',leoSpecialCasePreserved:'Y1M01-Q009',
 morningOccurrences:morningUses,nightOccurrences:nightUses,afternoonOccurrences:afternoonUses,
 sleepOccurrences:sleepUses,orangeOccurrences:orangeUses,
 newOriginalPngs:savedFiles.length,sourcePNGs:sourcesResolved,appleUnmapped:'No literal apple alternative in year-1/120 questions. Food is not auto-mapped to apple.',
 touchedQuestionFiles:touched.filter(x=>x.rel!==regRel).map(x=>x.rel),
 registryHash:sha(registryNew),manifestHash:sha(manNew),
 blocked:['Y1M01-Q009 Leo introduction needs Leo-specific scene; previous image preserved',
 'Good Night vs night semantic requires visual QA; file explicitly supplied by owner',
 '7 white media IDs remain blocked due to contrast',
 'other ambiguous SVG icons remain provisional']};
const dest='qa/results/y1-greetings-batch';
await mkdir(dest,{recursive:true});
for(const f of touched){await writeFile(path.join(ROOT,f.rel),f.bytes);if(f.rel!==regRel)assert(JSON.parse(f.bytes).items.length===20);}
for(const f of savedFiles){await mkdir(path.dirname(path.join(ROOT,f.rel)),{recursive:true});await writeFile(path.join(ROOT,f.rel),f.bytes,{flag:'wx'})}
await writeFile(path.join(ROOT,manRel),manNew);
assert.equal(sha(await readFile(path.join(ROOT,regRel))),report.registryHash);
assert.equal(sha(await readFile(path.join(ROOT,manRel))),report.manifestHash);
await writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(dest,'changed-paths.json'),JSON.stringify([...touched.map(x=>x.rel),...savedFiles.map(x=>x.rel),manRel],null,2)+'\n');
console.log('DUDUQ_Y1_BATCH='+JSON.stringify({changedMedia:report.replacedMediaIds.length,newPNG:report.newOriginalPngs,morningQuestions:morningUses.length,afternoonQuestions:afternoonUses.length,nightQuestions:nightUses.length,orangeQuestions:orangeUses.length,questions:600,productionDeployed:false}));
