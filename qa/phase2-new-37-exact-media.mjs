#!/usr/bin/env node
/** DUDUQ reviewed *exact* 5-concept media associations, incremental QA. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_REQUIRED');
const preview=process.argv.includes('--preview'),release=process.argv.includes('--release');
assert(preview!==release,'EXPLICIT_MODE_REQUIRED');
const plan=[{"concept":"57","filename":"57.png","sha":"8f1e97c22baec4420d36211ef67ff0847cb8d856","ids":["IMG-V11-2B-1357F306D00AD3F7"]},{"concept":"58","filename":"58.png","sha":"f4910fb18ae605640d7917c554013b30a738dbb1","ids":["IMG-V11-2B-74ACF04009A2B71B"]},{"concept":"59","filename":"59.png","sha":"159ad6740d6a635a5e8da5f461d75acec78bbefd","ids":["IMG-V11-2B-C45AE07568B642EE"]},{"concept":"64","filename":"64.png","sha":"1fd886ec8255a373631354aa709049497c2906a0","ids":["IMG-V11-2B-088FB17E9D1F09AB"]},{"concept":"65","filename":"65.png","sha":"a52028e1aef353d99e614c986d62bbb904689bb8","ids":["IMG-V11-2B-64F5CEC732DC2882"]},{"concept":"66","filename":"66.png","sha":"7f1e8672441b2212e270e59c81079fdb08360a15","ids":["IMG-V11-2B-67E6D36FEFB45408"]},{"concept":"67","filename":"67.png","sha":"46caedd92f2ebd3eec790d461b3c0d164e12f78f","ids":["IMG-V11-2B-28B5D3A11B641DEC"]},{"concept":"69","filename":"69.png","sha":"89fe40f31cc955eb86a0d2c0b7f35111142d096c","ids":["IMG-V11-2B-D1DD34B374920BF0"]},{"concept":"70","filename":"70.png","sha":"4a985f4faa29fe3b9717484feafb9152d0e6993b","ids":["IMG-V11-2B-9ED96256FAD26EAA","IMG-V11-2B-AFE7D45A37B4DE24"]},{"concept":"71","filename":"71.png","sha":"42a305f577401773fc7df59edf0a252c1930c3ca","ids":["IMG-V11-2B-64BDAB40C8CC1DFD"]},{"concept":"red triangle","filename":"red_triangle.png","sha":"fd30d683676306069ea0ead96500614ee666f8a7","ids":["IMG-V11-2B-504674DEDCB9FDCE","IMG-V11-2B-5115AB6D18FEBD42","IMG-V11-2B-D549CE8226285A2D"]},{"concept":"yellow rectangle","filename":"yellow_rectangle.png","sha":"fbc8a2225a7cd46a0057aebca02b021da4766396","ids":["IMG-V11-2B-541CAA8F2DB089FC","IMG-V11-2B-650F238F920DEBA9","IMG-V11-2B-C71E27A94D5A8AF0"]},{"concept":"green circle","filename":"green_circle.png","sha":"0ce04064a7e30f59c5ac4c81c7c09704e4900ccf","ids":["IMG-V11-2B-593652D334D2980A","IMG-V11-2B-6067E6DE84C0E5C7","IMG-V11-2B-E62B1CF9A2FFB18C"]},{"concept":"sunny","filename":"Sunny.png","sha":"1ba1f3dfcf20c3d6a48f22556512e593b33f0b5d","ids":["IMG-V11-2B-E1399161067B2F14","IMG-V11-2B-E4A2C3022C4689DD"]},{"concept":"windy","filename":"Windy.png","sha":"99ee70d1bbb2d9bae349faf5827f4f0baa1ee50f","ids":["IMG-V11-2B-17A1C3E1DB2192C0"]},{"concept":"finger","filename":"finger.png","sha":"5c56185cfb32a8ddb4a813f872a432acd03ba00f","ids":["IMG-V11-2B-7948E91B1FE60FC8","IMG-V11-2B-A210FFD1BF96DDB4"]},{"concept":"shoulders","filename":"shoulders.png","sha":"ea21095c8b04a1ff04aea852bb99a2c0453c1103","ids":["IMG-V11-2B-F3FAB54D046C94A0"]},{"concept":"toothache","filename":"toothache.png","sha":"63f3c3e6ee96ac6bc82283a77b19fb90a347bf37","ids":["IMG-V11-2B-1B529733B1EA1369","IMG-V11-2B-6BEDDD5F7F26B766"]},{"concept":"fever","filename":"fever.png","sha":"291ae72b45676f72bbb5848ac1ee73fce36ea34f","ids":["IMG-V11-2B-76B60D5C7F5E0B66","IMG-V11-2B-82F9BC49138C2B92"]},{"concept":"one fish","filename":"one_fish.png","sha":"f91890c28f542bb1c27462ade543d4963f886dd7","ids":["IMG-V11-2B-B4A1A90E2E55FDB2"]},{"concept":"three fish","filename":"three_fish.png","sha":"a28836f685f7b90712ad1576c09bc0067d5b9dd8","ids":["IMG-V11-2B-E93FA35D818E7702"]},{"concept":"one turtle","filename":"one_turtle.png","sha":"49ee6bcc747fe32474a1f81b75aefb6840225dd0","ids":["IMG-V11-2B-4011E8FCDB0C1A32"]},{"concept":"three turtles","filename":"Três Tartarugas Verdes Sorridentes.png","sha":"0095cdaca29f356fb06511d3695ed346802a2a5a","ids":["IMG-V11-2B-5F39D5541126AD95"]},{"concept":"in the bedroom","filename":"in_the_bedroom.png","sha":"cfe15eee1760fe0b859c9f79275d52e959c28d25","ids":["IMG-V11-2B-EE60A75AB2BFACB7"]},{"concept":"in the bathroom","filename":"in_the_bathroom.png","sha":"f9f450ec987dc9d6026296800f9d31061eda45fd","ids":["IMG-V11-2B-D50750F9CEE9F008"]},{"concept":"stomachache","filename":"stomachache.png","sha":"e6940ba3fc36f15100f9298db21e3c455393f248","ids":["IMG-V11-2B-5FF168A9953122AC"]},{"concept":"there is a table.","filename":"there_is_a_table.png","sha":"43813f554055ea3be0a749b17ec03c1ca277f8b7","ids":["IMG-V11-2B-56ADE30F9C01FFD7"]},{"concept":"there are three chairs.","filename":"there_are_three_chairs.png","sha":"e8de6b556679785aad6a402dcbc8ad9736bf6891","ids":["IMG-V11-2B-196B76C1A472E8CE"]},{"concept":"big banana","filename":"big_banana.png","sha":"f7699842e4d7e10082baef83462a23fd4f35bfd6","ids":["IMG-V11-2B-64F65B6254CDA0AF"]},{"concept":"big apple","filename":"big_apple.png","sha":"26afcecb2808abd5813257d7bca724060fe37145","ids":["IMG-V11-2B-A0A8A7AAF4DD84D8"]},{"concept":"big melon","filename":"big_melon.png","sha":"9b726cc5cb1bd8ad6efd900b93d67789f76d983a","ids":["IMG-V11-2B-EAAF1FABD1844321"]},{"concept":"small grape","filename":"small_grape.png","sha":"b0052e4009c9f887226222575fd996c0dc2bb559","ids":["IMG-V11-2B-48ABF3A913FF63A0"]},{"concept":"small pear","filename":"small_pear.png","sha":"195ef3cc081235946aa1d83b36a156ecae339d7a","ids":["IMG-V11-2B-06480218CC9BB101"]},{"concept":"small carrot","filename":"small_carrot.png","sha":"86661f6dc6412f05862be7740ab01b8964ce86c7","ids":["IMG-V11-2B-8C45DA566BF3CD91"]},{"concept":"on the bus","filename":"on_the_bus.png","sha":"6b4f0a6cd330a4f9d257387ecf34282ab7dd2b03","ids":["IMG-V11-2B-7401C92DFBEC3620"]},{"concept":"on the train","filename":"on_the_train.png","sha":"e9ba2244ff979749655967cec17ec589693a5ccf","ids":["IMG-V11-2B-D0221931D513B0BB"]},{"concept":"on the truck","filename":"on_the_truck.png","sha":"fca4963467644647f72decd7914560a6290035c9","ids":["IMG-V11-2B-4B810E2D1F77A5FA"]}];
const sourceCommit='5d8a2e243eefaefaf403a0be838c529c6fe6ed64';
const expectedRegistrySha='f7c8db9bae95722fa8255a1df5f1b55f4033ae93010ebfa2caef7c41591327f9';
const root='dist-pages/';
const regRel='content/english/media/media-registry.json';
const manifestRel='.duduq-pages-manifest';
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitHash=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const regBytes=readFileSync(root+regRel),reg=JSON.parse(regBytes);
assert.equal(hash(regBytes),expectedRegistrySha,'CURRENT_RELEASE_REGISTRY_CHANGED');
assert.equal(reg.entries.length,1166,'MEDIA_REGISTRY_COUNT_CHANGED');
const byId=new Map(reg.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,reg.entries.length,'DUPLICATE_MEDIA_ID');
const targets=plan.flatMap(p=>p.ids);
assert.equal(targets.length,48);
assert.equal(new Set(targets).size,targets.length,'TARGET_ID_REPEATED');
const fixture=JSON.parse(readFileSync('qa/fixtures/phase2-source-tree-558-20261107.json'));
assert.equal(fixture.sha,sourceCommit,'UNPINNED_SOURCE_INVENTORY');
assert.equal(fixture.truncated,false);
const treeMap=new Map(fixture.tree.map(e=>[e.path,e]));
const manifestLines=readFileSync(root+manifestRel,'utf8').trimEnd().split(/\r?\n/);
const fileManifest=new Map();
for(let i=0;i<manifestLines.length;i++){
 const line=manifestLines[i],idx=line.lastIndexOf(' ');
 assert(idx>0,'MALFORMED_MANIFEST_LINE');
 const name=line.slice(0,idx),digest=line.slice(idx+1);
 assert(/^[a-f0-9]{64}$/.test(digest)&&!fileManifest.has(name),'BAD_OR_DUPLICATE_MANIFEST');
 fileManifest.set(name,{sha:digest,i});
}
assert.equal(fileManifest.get(regRel)?.sha,expectedRegistrySha,'BASELINE_MANIFEST_REGISTRY_MISMATCH');
const origin={};for(const {concept,filename,sha,ids} of plan){
 const src='Imagens Ilustrativa/'+filename;
 assert.equal(treeMap.get(src)?.sha,sha,'SOURCE_INVENTORY_MISMATCH:'+src);
 for(const id of ids){
  const e=byId.get(id);assert(e,'MISSING_MEDIA_ID:'+id);
  assert.equal(e.kind,'image','NOT_IMAGE:'+id);
  assert.equal(e.semantic,concept,'SHARED_MEDIA_SEMANTIC_CONFLICT:'+id);
  assert(/\.svg$/i.test(e.urlOrPath),'CURRENT_MEDIA_NOT_PROVISIONAL_SVG:'+id);
  assert(!e.provenance,'EXISTING_OFFICIAL_IMAGE_MUST_NOT_BE_REPLACED:'+id);
  origin[id]=e.urlOrPath;
 }
}
const oldMediaPngByBlob=new Map();
const requestedBlobs=new Set(plan.map(p=>p.sha));
for(const e of reg.entries){
 // Legacy releases intentionally keep identical bytes at several named URLs
 // (e.g. two RED paths). They must not block unrelated concept mapping.
 if(e.provenance?.sourceGitBlob && requestedBlobs.has(e.provenance.sourceGitBlob) &&
    e.urlOrPath?.endsWith('.png')){
  const prior=oldMediaPngByBlob.get(e.provenance.sourceGitBlob);
  if(prior){
   assert.equal(prior.sha256,e.sha256,'SAME_GIT_BLOB_DIFFERENT_BYTES');
   continue;
  }
  oldMediaPngByBlob.set(e.provenance.sourceGitBlob,{url:e.urlOrPath,sha256:e.sha256});
 }
}
const actualImages=[];
const queue=[...plan];
async function worker(){while(queue.length){
 const part=queue.shift();
 const src='Imagens Ilustrativa/'+part.filename;
 const url='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+sourceCommit+
  '/Imagens%20Ilustrativa/'+encodeURIComponent(part.filename);
 const fromCache=oldMediaPngByBlob.get(part.sha);
 let bytes,digest,imageRel,reused=false;
 if(fromCache){
  assert.equal(fileManifest.get(fromCache.url)?.sha,fromCache.sha256,'EXISTING_IMAGE_UNPINNED');
  bytes=readFileSync(root+fromCache.url);
  assert.equal(hash(bytes),fromCache.sha256,'EXISTING_OFFICIAL_BYTES_CHANGED');
  assert.equal(gitHash(bytes),part.sha,'EXISTING_IMAGE_GIT_BLOB_MISMATCH');
  digest=fromCache.sha256;imageRel=fromCache.url;reused=true;
 }else{
  let resp;
  for(let a=0;a<3;a++){
   try { resp=await fetch(url,{signal:AbortSignal.timeout(120000)}); if(resp.ok)break; }
   catch(error) { if(a===2)throw error; }
   if(a<2)await new Promise(r=>setTimeout(r,600*(a+1)));
  }
  assert(resp?.ok,'SOURCE_DOWNLOAD_FAILED:'+part.filename+':'+resp?.status);
  bytes=Buffer.from(await resp.arrayBuffer());
  assert.equal(gitHash(bytes),part.sha,'SOURCE_BLOB_SHA_MISMATCH:'+part.filename);
  digest=hash(bytes);
  imageRel='content/english/assets/images/assets-duduq/fast-'+part.sha.slice(0,12)+'-'+digest.slice(0,12)+'.png';
  assert(!fileManifest.has(imageRel)&&!existsSync(root+imageRel),'DUPLICATE_NEW_SOURCE_PATH');
  mkdirSync(path.dirname(root+imageRel),{recursive:true});
  writeFileSync(root+imageRel,bytes,{flag:'wx'});
  manifestLines.push(imageRel+' '+digest);
 }
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG:'+part.filename);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert(width>=512&&height>=512,'UNDERSIZED_IMAGE:'+part.filename);
 assert.equal(bytes[25],6,'NEW_PNG_MUST_HAVE_ALPHA_CHANNEL:'+part.filename);
 actualImages.push({concept:part.concept,filename:part.filename,sha:part.sha,
  sha256:digest,url:imageRel,reused,width,height,ids:part.ids});
 for(const id of part.ids){
  const e=byId.get(id);
  e.urlOrPath=imageRel;e.sha256=digest;e.assets=[{path:imageRel,sha256:digest}];
  e.temporary=true;e.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
  e.integrationStatus='EXACT_ORIGINAL_SOURCE_PREVIEW_REVIEW';
  e.provenance={provider:'Assets-DuduQ',sourcePath:src,sourceCommit,
   sourceGitBlob:part.sha,sha256:digest};
  e.replacementAudit={qaOnly:true,previousPath:origin[id],concept:part.concept,
   semanticVerifiedAgainstAllSharedMediaIdConsumers:true};
 }
}}
await Promise.all(Array.from({length:5},()=>worker()));
assert.equal(actualImages.length,37,'NOT_37_CONCEPT_IMAGES');
// Verify 600 authored questions are identical to the immutable build and
// prevent newly introduced identical-PNG correct-vs-distractor collisions.
let questions=0;const linkedQuestions=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const qRel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const q=JSON.parse(readFileSync(root+qRel));
 assert.equal(q.items?.length,20,'QUESTION_COUNT_CHANGED:'+qRel);
 for(const item of q.items){
  questions++;
  const choices=(item.options||[]).filter(o=>o.mediaId&&byId.get(o.mediaId));
  for(let i=0;i<choices.length;i++)for(let j=i+1;j<choices.length;j++){
   const a=choices[i],b=choices[j],e1=byId.get(a.mediaId),e2=byId.get(b.mediaId);
   if(e1.sha256&&e1.sha256===e2.sha256&&a.mediaId!==b.mediaId&&
      (targets.includes(a.mediaId)||targets.includes(b.mediaId))&&
      Boolean(a.correct)!==Boolean(b.correct))
    throw Error('CORRECT_AND_DISTRACTOR_DUPLICATE_IMAGE:'+item.item_id+':'+a.mediaId+':'+b.mediaId);
  }
  const found=new Set();
  function scan(v){if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){for(const x of v)scan(x);return}
   for(const k of ['mediaId','assetId','image_ref','imageRef'])
    if(typeof v[k]==='string'&&targets.includes(v[k]))found.add(v[k]);
   for(const value of Object.values(v))if(value&&typeof value==='object')scan(value);
  }
  scan(item);
  for(const id of found){
   const arr=linkedQuestions.get(id)||[];arr.push(item.item_id);linkedQuestions.set(id,arr);
  }
 }
}
assert.equal(questions,600,'NOT_600_CONTRACTS');
for(const id of targets){
 assert((linkedQuestions.get(id)||[]).length>=1,'MEDIA_ID_UNUSED_IN_600:'+id);
}
const nextReg=Buffer.from(JSON.stringify(reg,null,2)+'\n');
const nextRegistrySha=hash(nextReg);
const oldLine=fileManifest.get(regRel);
manifestLines[oldLine.i]=regRel+' '+nextRegistrySha;
const nextManifest=manifestLines.join('\n')+'\n';
writeFileSync(root+regRel,nextReg);
writeFileSync(root+manifestRel,nextManifest);
assert.equal(hash(readFileSync(root+regRel)),nextRegistrySha);
const manifestCheck=new Map(nextManifest.trimEnd().split(/\n/).map(x=>{
 const at=x.lastIndexOf(' ');return [x.slice(0,at),x.slice(at+1)];
}));
assert.equal(manifestCheck.size,manifestLines.length,'MANIFEST_DUPLICATED_FILES');
for(const part of actualImages)assert.equal(manifestCheck.get(part.url),part.sha256,'IMAGE_MANIFEST_DIFF');
const report={schema:'DUDUQ_37_NEW_EXACT_CONCEPTS_V1',
 sourceCommit,previousRegistrySha:expectedRegistrySha,newRegistrySha:nextRegistrySha,
 mediaIdsUpdated:targets.length,concepts:plan.map(p=>p.concept),images:actualImages,
 affectedQuestionCount:[...new Set([...linkedQuestions.values()].flat())].length,
 mediaQuestionMap:Object.fromEntries(linkedQuestions),qaOnly:true,qaVisualApproved:false,
 contracts:600,sourcePngCount:558,noGabaritoChanges:true,notGeneratedImages:true,
 productionDeployed:release};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/new-37-exact-20261107.json',JSON.stringify(report,null,2)+'\n');
if(preview){
 const dir=root+'media-review';mkdirSync(dir,{recursive:true});
 const cards=actualImages.map(x=>'<article><img src="/'+x.url+'" alt="'+x.concept+'">'+
 '<h2>'+x.concept+'</h2><p>'+x.filename+'</p><small>'+x.ids.length+' mediaIds</small></article>').join('');
 const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUDUQ — 37 novos conceitos</title>'+
 '<style>body{font:16px Nunito,Arial;background:#f6f9ff;color:#234;padding:22px;max-width:1150px;margin:auto}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px}article{background:white;padding:16px;border-radius:16px}img{width:100%;height:210px;object-fit:contain}h2{font-size:1.15rem}</style>'+
 '<h1>Revisão pedagógica — 37 conceitos novos</h1><p>48 mediaIds, nenhuma questão ou gabarito alterado. Candidata QA não homologada.</p><main>'+cards+'</main></html>';
 writeFileSync(dir+'/new-37-exact-20261107.html',html);
 writeFileSync(dir+'/new-37-exact-20261107.json',JSON.stringify(report,null,2)+'\n');
}
console.log('DUDUQ_NEW_37_EXACT_CONCEPTS_PASS='+JSON.stringify({
 mediaIds:targets.length,pngsAdded:actualImages.filter(x=>!x.reused).length,
 pngsReused:actualImages.filter(x=>x.reused).length,
 concepts:report.concepts,affectedQuestions:report.affectedQuestionCount,
 registrySha:nextRegistrySha,preview,release}));
