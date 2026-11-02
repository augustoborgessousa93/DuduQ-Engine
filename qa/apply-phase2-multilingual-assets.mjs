#!/usr/bin/env node
/**
 * Deterministic exact-name bilingual source reuse against the complete compiled
 * 600-question graph. Writes ONLY an isolated QA copy, never source or production.
 * No image generation, no answer-key changes, no guess when filenames conflict.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
const [distArg='qa/dist-pages-food-candidate',sourceArg='assets-source-latest']=process.argv.slice(2);
const dist=path.resolve(distArg),source=path.resolve(sourceArg);
const apply=process.argv.includes('--apply');
if(apply){assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
 assert(dist.startsWith(path.resolve('qa')+path.sep),'QA_DIST_MUST_BE_ISOLATED');}
const pinned='a51e0958d0c68941701b8373ccf30acf88aaf7d0';
assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),pinned,'SOURCE_HEAD_CHANGED');
assert.equal(execFileSync('git',['-C',source,'status','--porcelain'],{encoding:'utf8'}).trim(),'','SOURCE_NOT_CLEAN');
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[_]+/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ').toLowerCase();
const glossary={
 'cachorro':'dog','cao':'dog','gato':'cat','coelho':'rabbit','cavalo':'horse','vaca':'cow',
 'porco':'pig','ovelha':'sheep','pato':'duck','galinha':'chicken','elefante':'elephant',
 'leao':'lion','macaco':'monkey','tartaruga':'turtle','peixe':'fish','passaro':'bird',
 'cabeca':'head','maos':'hands','mao':'hand','nariz':'nose','boca':'mouth','olho':'eye',
 'olhos':'eyes','braco':'arm','perna':'leg','orelha':'ear','ombro':'shoulder',
 'pai':'father','mae':'mother','irma':'sister','irmao':'brother','avo':'grandmother',
 'avô':'grandfather','professora':'teacher','professor':'teacher',
 'atrizes':'actresses','atriz':'actress','escola':'school','biblioteca':'library',
 'hospital':'hospital','banco':'bank','mercado':'supermarket','supermercado':'supermarket',
 'correios':'post office','cozinha':'kitchen','banheiro':'bathroom','quarto':'bedroom',
 'sala de estar':'living room','sofa':'sofa','tapete':'rug','cama':'bed',
 'poltrona':'armchair','estante':'bookcase','bola':'ball','mochila':'backpack',
 'livro':'book','lapis':'pencil','vestido':'dress','jaqueta':'jacket',
 'macã':'apple','maca':'apple','banana':'banana','pera':'pear',
 'janeiro':'january','fevereiro':'february','marco':'march','abril':'april',
 'maio':'may','junho':'june','julho':'july','agosto':'august',
 'setembro':'september','outubro':'october','novembro':'november','dezembro':'december',
 'primavera':'spring','verao':'summer','outono':'autumn','inverno':'winter',
 'vermelho':'red','azul':'blue','preto':'black','branco':'white','marrom':'brown',
 'um':'one','dois':'two','tres':'three','quatro':'four','cinco':'five',
 'seis':'six','sete':'seven','oito':'eight','nove':'nine','dez':'ten',
 'futebol':'soccer','basquete':'basketball','natacao':'swimming',
 'desenhando no parque':'drawing in the park','jogando futebol':'playing soccer'
};
const structuredByConcept=new Map([
 ['one',{file:'Imagens Ilustrativa/number-01-one-um.png',blob:'69797d76b6691c5a041a1eb58a70d6b198090893'}],
 ['two',{file:'Imagens Ilustrativa/number-02-two-dois.png',blob:'6cd661861d3c66e2e22826fd81040d97336d4a8e'}],
 ['three',{file:'Imagens Ilustrativa/number-03-three-tres.png',blob:'35df6fa3cf3af45a92a6c4e47a1e86fd3548abd4'}],
 ['four',{file:'Imagens Ilustrativa/number-04-four-quatro.png',blob:'c7d0f655038e7d33ea489a7a93209b9e757d4ed3'}],
 ['five',{file:'Imagens Ilustrativa/number-05-five-cinco.png',blob:'e09e3cc58271c667ba1c3f93eb03e76e22495ce3'}],
 ['six',{file:'Imagens Ilustrativa/number-06-six-seis.png',blob:'89e5d7c65b53c8b0afe102e42819cdff010c68b2'}],
 ['seven',{file:'Imagens Ilustrativa/number-07-seven-sete.png',blob:'5be78da55a68ba352537e08838442cf01a13e8d9'}],
 ['eight',{file:'Imagens Ilustrativa/number-08-eight-oito.png',blob:'604dc435bc2c26abaa71a715406fd8dcca79fcc5'}],
 ['nine',{file:'Imagens Ilustrativa/number-09-nine-nove.png',blob:'5b5effc4d24e4c5ee24ef9f4b3387cca023191f9'}],
 ['ten',{file:'Imagens Ilustrativa/number-10-ten-dez.png',blob:'734081fc405be227f02f6b0b4e95d8f4af2f86ec'}],
 ['black',{file:'Imagens Ilustrativa/color-black-preto.png',blob:'e97d277f7df8fdb73b611f919fec34fca836bd8d'}],
 ['blue',{file:'Imagens Ilustrativa/color-blue-azul.png',blob:'d1c5c6980118941b1f43131214a6dcc7d7e39761'}],
 ['brown',{file:'Imagens Ilustrativa/color-brown-marrom.png',blob:'4ba5334007c4a8ac4ef4de3d87b03723e0523588'}],
 ['green',{file:'Imagens Ilustrativa/color-green-verde.png',blob:'425907d66db6bd1e8fefb6846f3f17e9a86eece1'}],
 ['red',{file:'Imagens Ilustrativa/color-red-vermelho.png',blob:'9c5fd365ad6fee630f695d2c403e6a02ba5fb4d6'}],
 ['yellow',{file:'Imagens Ilustrativa/color-yellow-amarelo.png',blob:'d641e8582975e926fe49ea04c32f4817114f53f0'}],
 ['backpack',{file:'Imagens Ilustrativa/school-object-backpack-mochila.png',blob:'f2f4ac58d70b8f25877e2fa3249a3bbc981e6da4'}],
 ['eraser',{file:'Imagens Ilustrativa/school-object-eraser-borracha.png',blob:'334a1fecdf362c6a19d50edb0ccc50db68606cb9'}],
 ['pencil case',{file:'Imagens Ilustrativa/school-object-pencil-case-estojo.png',blob:'4d55cc06cb124bfd485f5bbc52b33f7e85cdc59c'}],
 ['pencil',{file:'Imagens Ilustrativa/school-object-pencil-lapis.png',blob:'37a383e05c3c1bff123818b171c3bb9dc4a33c11'}],
 ['ruler',{file:'Imagens Ilustrativa/school-object-ruler-regua.png',blob:'2276abbd4f90caf142df84062c86d770ba394399'}],
 ['bird',{file:'Imagens Ilustrativa/pet-bird-passaro.png',blob:'1128475a8de84c4dbeb613fb798164f03d432342'}],
 ['cat',{file:'Imagens Ilustrativa/pet-cat-gato.png',blob:'a78d1430c8a62a83b52726312c10f494d6491155'}],
 ['dog',{file:'Imagens Ilustrativa/pet-dog-cachorro.png',blob:'b2c39c9abd7e113e093151a1780cde0fc79a5d3c'}],
 ['fish',{file:'Imagens Ilustrativa/pet-fish-peixe.png',blob:'29b60c4e87bcd6cc0a5a4f2e7b7f4fada03a01fc'}],
 ['hamster',{file:'Imagens Ilustrativa/pet-hamster.png',blob:'c0f63853e7c1ab26360983f97c33fa2067ca1fc1'}],
 ['rabbit',{file:'Imagens Ilustrativa/pet-rabbit-coelho.png',blob:'9421450b4ec44d4c39104d59e0e287a2b1c2ef7b'}],
 ['turtle',{file:'Imagens Ilustrativa/pet-turtle-tartaruga.png',blob:'c7cdf176515a397825a988064103a6c01a20030f'}]
]);
// These 28 explicit bilingual assets are anchored to the immutable source commit.
// White is intentionally excluded pending visibility contrast verification.
const structuredOnly=process.env.DUDUQ_STRUCTURED_ONLY==='1';
const heldSharedMediaIds=new Set(['IMG-V11-2B-0E55AE94BCF4CC3E']);
const candidateNames=new Map();
async function scan(dir,rel='Imagens Ilustrativa'){
 for(const e of await readdir(dir,{withFileTypes:true})){
  const full=path.join(dir,e.name),file=rel+'/'+e.name;
  if(e.isDirectory()){await scan(full,file);continue;}
  if(!e.isFile()||!/\.png$/i.test(e.name))continue;
  const stem=e.name.replace(/\.png$/i,'');
  // A full English title or an explicitly separated bilingual component counts;
  // never split substrings such as "one book in the bookcase" into "book".
  const aliases=[stem,...stem.split(/\s+[—–-]\s+|(?<=[a-zA-Z])-(?=[A-Z])/u)];
  for(const alias of aliases){
   const key=norm(alias);
   for(const concept of new Set([key,glossary[key]].filter(Boolean))){
    if(!candidateNames.has(concept))candidateNames.set(concept,new Set());
    candidateNames.get(concept).add(file);
   }
  }
 }
}
await scan(path.join(source,'Imagens Ilustrativa'));
const rowFile='docs/qa/media-audit-20261029/replacement-queue.json';
const queue=JSON.parse(await readFile(rowFile,'utf8')).queue;
const regRel='content/english/media/media-registry.json';
const oldRegistryBytes=await readFile(path.join(dist,regRel));
const registry=JSON.parse(oldRegistryBytes);
const byId=new Map(registry.entries.map((e,i)=>[e.mediaId,{entry:e,index:i}]));
assert.equal(byId.size,registry.entries.length,'DUPLICATE_REGISTRY_ID');
const oldManifest=await readFile(path.join(dist,'.duduq-pages-manifest'),'utf8');
const integrity=new Map(oldManifest.trimEnd().split(/\r?\n/).map(l=>{
 const i=l.lastIndexOf(' ');assert(i>0,'BAD_MANIFEST');
 return [l.slice(0,i),l.slice(i+1)];
}));
assert.equal(integrity.get(regRel),hash(oldRegistryBytes),'REGISTRY_SHA_CHANGED');
const usages=new Map(),questionHashes=new Map(),questions=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 assert.equal(hash(bytes),integrity.get(rel),'COMPILED_QUESTION_HASH_CHANGED:'+rel);
 questionHashes.set(rel,hash(bytes));
 const data=JSON.parse(bytes);
 assert.equal(data.items?.length,20,'NOT_20_ITEMS:'+rel);
 for(const q of data.items){assert(!questions.has(q.item_id),'DUPLICATE_QUESTION');
  questions.set(q.item_id,q);collectQuestionMediaUsages(q,usages);}
}
assert.equal(questions.size,600,'NOT_600_CONTRACTS');
const eligible=[],blocked=[],imageCache=new Map();
for(const row of queue){
 if(row.classification!=='PROVISIONAL'||row.kind!=='image'||row.semanticConflict!==false)continue;
 if(heldSharedMediaIds.has(row.mediaId))continue;
 if(structuredOnly&&!structuredByConcept.has(norm(row.semantic)))continue;
 const current=byId.get(row.mediaId)?.entry;
 const occurrences=usages.get(row.mediaId)||[];
 const actual=[...new Set(occurrences.map(x=>x.questionId))].sort();
 const concept=norm(row.semantic),fileCandidates=[...(candidateNames.get(concept)||[])].sort();
 const exactFile=fileCandidates.filter(f=>norm(path.basename(f,'.png'))===concept);
 const structured=structuredByConcept.get(concept);
 const file=structured?.file||
  (exactFile.length===1?exactFile[0]:fileCandidates.length===1?fileCandidates[0]:null);
 const reasons=[];
 const guard=(pass,reason)=>{if(!pass)reasons.push(reason)};
 guard(!!current&&current.kind==='image'&&current.urlOrPath===row.sourcePath&&
  current.urlOrPath.endsWith('.svg')&&norm(current.semantic)===concept,
  'REGISTRY_NOT_MATCHING_PROVISIONAL_QUEUE');
 guard(current?.temporary===true||(current?.temporary==null&&row.temporary==null&&
  current?.integrationStatus==='SOURCE_READY'&&row.integrationStatus==='SOURCE_READY'),
  'PROVISIONAL_STATUS_NOT_CONFIRMED');
 guard(current?.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED'&&
  current?.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH','ALREADY_OFFICIALLY_APPROVED');
 guard(actual.length>0&&actual.length===row.usage&&
  (row.exampleQuestions||[]).every(id=>actual.includes(id)),'SHARED_USAGE_NOT_VERIFIED');
 guard(occurrences.length>0&&occurrences.every(o=>norm(o.semanticTarget)===concept),
  'LEAF_SEMANTICS_NOT_EXPLICIT_EXACT');
 // Run #41536518602 proved blank imagery in Bubble Pop on BOTH viewports.
 // Shared media IDs must not be partially repointed while this consumer
 // cannot display the replacement. All other mechanics remain eligible.
 guard(actual.every(id=>questions.get(id)?.mechanicId!=='bubble-pop')||
  (apply&&process.env.DUDUQ_QA_ONLY==='1'&&process.env.DUDUQ_BUBBLE_FRAME_PROBE==='1'),
  'BUBBLE_POP_REQUIRES_IFRAME_AWARE_QA');
 guard(!!file,fileCandidates.length?'SOURCE_AMBIGUOUS':'NO_EXACT_SOURCE_FILENAME');
 if(reasons.length){blocked.push({mediaId:row.mediaId,concept,reasons});continue;}
 let image=imageCache.get(file);
 if(!image){
  const bytes=await readFile(path.join(source,file)),sha=hash(bytes);
  const png=bytes.length>26&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&
   bytes.toString('ascii',12,16)==='IHDR';
  const valid=png&&bytes.readUInt32BE(16)>=1024&&bytes.readUInt32BE(20)>=1024&&
   bytes[24]===8&&bytes[25]===6;
  const slug=norm(path.basename(file,'.png')).replace(/[^a-z0-9]+/g,'-').slice(0,65).replace(/-+$/,'');
  const dest='content/english/assets/images/assets-duduq/auto-'+slug+'-'+sha.slice(0,12)+'.png';
  const actualBlob=gitBlob(bytes);
  if(structured&&actualBlob!==structured.blob)
   throw Error('PINNED_BILINGUAL_SOURCE_BLOB_MISMATCH:'+file);
  image={sourcePath:file,sha,blob:actualBlob,dest,bytes,valid};
  imageCache.set(file,image);
 }
 if(structured&&file!==structured.file)
  throw Error('STRUCTURED_SOURCE_MAPPING_DRIFT:'+concept);
 if(!image.valid||integrity.has(image.dest)){
  blocked.push({mediaId:row.mediaId,concept,reasons:[!image.valid?'INVALID_OR_NONTRANSPARENT_PNG':'IMAGE_ALREADY_IN_MANIFEST']});
  continue;
 }
 // White-on-white color imagery needs dedicated visual contrast treatment.
 if(concept==='white'){blocked.push({mediaId:row.mediaId,concept,reasons:['WHITE_VISIBILITY_REQUIRES_CONTRAST_QA']});continue;}
 eligible.push({mediaId:row.mediaId,concept,sourcePath:file,imageDest:image.dest,sha256:image.sha,
  questionIds:actual,nestedReferences:occurrences.length,previousPath:current.urlOrPath});
}
const used=[...new Map(eligible.map(b=>[b.sourcePath,imageCache.get(b.sourcePath)])).values()];
const affected=[...new Set(eligible.flatMap(x=>x.questionIds))].sort();
const report={status:'EXACT_MULTILINGUAL_SOURCE_MATCH_PREVIEW',sourceCommit:pinned,
 sourceRepository:'augustoborgessousa93/Assets-DuduQ',verifiedContracts:600,
 scanFileCount:[...new Set([...candidateNames.values()].flatMap(x=>[...x]))].length,
 candidateMediaIds:eligible.length+blocked.length,eligibleMediaIds:eligible.length,
 blockedMediaIds:blocked.length,uniqueImages:used.length,affectedQuestions:affected.length,
 affectedModules:[...new Set(affected.map(x=>x.slice(0,5)))].sort(),eligible,blocked,
 questionsChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
 productionDeployed:false,pedagogicalQAApproved:false,releaseApproved:false};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-multilingual-source-preflight.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,sourceCommit:pinned,
 scanned:report.scanFileCount,eligible:eligible.length,images:used.length,
 blocked:blocked.length,questions:affected.length}));
if(!apply)process.exit(0);
const next=structuredClone(registry);
for(const binding of eligible){
 const ix=byId.get(binding.mediaId).index,prior=next.entries[ix],img=imageCache.get(binding.sourcePath);
 assert(prior.urlOrPath===binding.previousPath,'REGISTRY_WAS_CHANGED:'+binding.mediaId);
 next.entries[ix]={...prior,temporary:true,
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  urlOrPath:img.dest,sha256:img.sha,assets:[{path:img.dest,sha256:img.sha}],
  altText:binding.concept,provenance:{provider:'Assets-DuduQ repository',
   sourceRepository:report.sourceRepository,sourceCommit:pinned,
   sourcePath:img.sourcePath,sourceGitBlob:img.blob,sha256:img.sha},
  replacementAudit:{source:'all 600 compiled questions and multilingual exact source name',
   verifiedQuestionIds:binding.questionIds,previousPath:binding.previousPath,qaOnly:true}};
}
const newRegistry=Buffer.from(JSON.stringify(next,null,2)+'\n');
const lines=oldManifest.trimEnd().split(/\r?\n/).map(l=>
 l.startsWith(regRel+' ')?regRel+' '+hash(newRegistry):l);
for(const img of used)lines.push(img.dest+' '+img.sha);
const newManifest=Buffer.from(lines.join('\n')+'\n'),created=[];
try{
 for(const img of used){
  const output=path.resolve(dist,img.dest);
  assert(output.startsWith(dist+path.sep),'OUTPUT_PATH_ESCAPE');
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,img.bytes,{flag:'wx'});created.push(output);
 }
 await writeFile(path.join(dist,regRel),newRegistry);
 await writeFile(path.join(dist,'.duduq-pages-manifest'),newManifest);
 for(const [rel,sha] of questionHashes)
  assert.equal(hash(await readFile(path.join(dist,rel))),sha,'QUESTION_MUTATED:'+rel);
 for(const img of used)
  assert.equal(hash(await readFile(path.join(dist,img.dest))),img.sha,'IMAGE_MUTATED:'+img.dest);
 assert.equal(hash(await readFile(path.join(dist,regRel))),hash(newRegistry));
 const patch={schemaVersion:'DUDUQ_PHASE2_MULTILINGUAL_QA_PATCH_V1',
  status:'ISOLATED_MEDIA_UPDATED_VISUAL_AND_PEDAGOGICAL_QA_PENDING',
  sourceCommit:pinned,verifiedContracts:600,changedMediaIds:eligible.length,
  changedQuestionCount:affected.length,changedQuestionIds:affected,changedModules:report.affectedModules,
  images:used.map(x=>({assetPath:x.dest,sha256:x.sha,sourceGitBlob:x.blob})),
  bindings:eligible.map(x=>({mediaId:x.mediaId,concept:x.concept,sourcePath:x.imageDest,questionIds:x.questionIds})),
  questionsChanged:0,answerKeysChanged:0,audioChanged:0,mechanicsChanged:0,
  productionDeployed:false,pedagogicalQAApproved:false,releaseApproved:false,
  registrySha256:hash(newRegistry),manifestSha256:hash(newManifest)};
 await writeFile('qa/results/phase2-multilingual-source-qa-patch.json',JSON.stringify(patch,null,2)+'\n');
 console.log(JSON.stringify({status:patch.status,sourceCommit:pinned,mediaIds:patch.changedMediaIds,
  images:patch.images.length,questions:patch.changedQuestionCount,modules:patch.changedModules.length}));
}catch(err){
 await writeFile(path.join(dist,regRel),oldRegistryBytes);
 await writeFile(path.join(dist,'.duduq-pages-manifest'),oldManifest);
 for(const f of created)await rm(f,{force:true});
 throw err;
}
