#!/usr/bin/env node
/** Four questions / eight independently explicit season media IDs -> three
 *  identical-to-source PNGs. QA delta ONLY, pinned to the Orange deployment.
 *  Missing \`temporary\` is NOT approval or proof of temporary state: accept
 *  only exact verified historical SVGs, no already-approved media. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const sha256=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const dist=path.resolve('dist-pages'),qaOnly=process.env.DUDUQ_QA_ONLY==='1';
const apply=process.argv.includes('--apply');
if(apply&&!qaOnly)throw Error('SEASONS_APPLY_REQUIRES_EXPLICIT_QA_ENV');
const imgs=[
 {name:'summer',file:'Summer - verão.PNG',gitBlob:'458fc26126c67264b611c1d89a94ac4c8a928d79',
  ids:['IMG-V11-2B-D19DF2C30C83811A','IMG-V11-2B-C0AA3950B05EEC35']},
 {name:'autumn',file:'Autumn - outono.PNG',gitBlob:'3801879e526ffda7f3b5b1da72c5aaa2e9793a09',
  ids:['IMG-V11-2B-82E782E5BBD88C23','IMG-V11-2B-B47AC22E66692DB9']},
 {name:'winter',file:'Winter - inverno.PNG',gitBlob:'f2356ca0a8c30f7ea84730e3c9a6301cf5f00ffb',
  ids:['IMG-V11-2B-02BF78748FF20FDF','IMG-V11-2B-07B3D6634BA3FE98']}
];
const fallIds=['IMG-V11-2B-A8407B32EBD2465B','IMG-V11-2B-46C759715E33A813'];
const semantics=new Map();
for(const entry of imgs)for(const id of entry.ids)semantics.set(id,entry.name);
for(const id of fallIds)semantics.set(id,'fall');
assert.equal(semantics.size,8);
const regRel='content/english/media/media-registry.json';
const registryFile=path.join(dist,regRel),manifestFile=path.join(dist,'.duduq-pages-manifest');
const oldRegistry=await readFile(registryFile),oldManifest=await readFile(manifestFile);
const reg=JSON.parse(oldRegistry);
assert(reg.entries?.length>=1100);
const regById=new Map(reg.entries.map((e,i)=>[e.mediaId,i]));
assert.equal(regById.size,reg.entries.length);
const manifestLines=oldManifest.toString('utf8').trimEnd().split(/\r?\n/);
assert.equal(manifestLines.length,2891,'NOT_THE_PINNED_ORANGE_PRODUCTION_BASE');
const mf=new Map();
for(const [i,line] of manifestLines.entries()){
 const sep=line.lastIndexOf(' '),file=line.slice(0,sep),hash=line.slice(sep+1);
 assert(sep>0&&/^[a-f0-9]{64}$/.test(hash)&&!mf.has(file),'MANIFEST_BAD');
 mf.set(file,{hash,i});
}
assert.equal(sha256(oldRegistry),mf.get(regRel)?.hash,'REGISTRY_NOT_MATCHING_ORANGE_BASE');
const usage=new Map(),qHashes=new Map();let numberOfQuestions=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mod='Y'+y+'M'+String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));assert.equal(sha256(bytes),mf.get(rel)?.hash,'QUESTION_SOURCE_HASH_MISMATCH:'+mod);
 qHashes.set(rel,sha256(bytes));
 const data=JSON.parse(bytes);assert.equal(data.moduleId,mod);assert.equal(data.items?.length,20);
 for(const q of data.items){numberOfQuestions++;
  const walk=node=>{if(!node||typeof node!=='object')return;
   if(!Array.isArray(node)){
    const ids=new Set(['mediaId','assetId','image_ref','imageRef','imageId'].map(k=>node[k]).filter(x=>semantics.has(x)));
    for(const id of ids){const arr=usage.get(id)||[];
      arr.push({questionId:q.item_id,semanticTarget:typeof node.semanticTarget==='string'?node.semanticTarget.trim().toLowerCase():null});
      usage.set(id,arr);}
   }
   for(const value of Object.values(node))if(value&&typeof value==='object')walk(value);
  };walk(q);
 }
}
assert.equal(numberOfQuestions,600);
const assetBytes=new Map(),images=[];
for(const entry of imgs){
 const bytes=await readFile(path.join('source-seasons',entry.name+'.png'));
 assert.equal(blob(bytes),entry.gitBlob,'GIT_BLOB_NOT_PINNED:'+entry.name);
 assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'NOT_PNG:'+entry.name);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert(width>=512&&height>=512&&bytes[24]===8&&bytes[25]===6,'REQUIRE_SOURCE_RGBA_512_QA_ONLY:'+entry.name);
 const digest=sha256(bytes),assetPath='content/english/assets/images/assets-duduq/original-season-'+entry.name+'-'+digest.slice(0,12)+'.png';
 assert(!mf.has(assetPath),'ALREADY_IN_DISTRIBUTION:'+entry.name);
 assetBytes.set(assetPath,bytes);images.push({...entry,width,height,sha256:digest,assetPath,belowPreferred1024:width<1024||height<1024,productionResolutionApproval:false});
}
const changes=[],affected=new Set();
for(const [id,semantic] of semantics){
 const refs=usage.get(id)||[],questionIds=[...new Set(refs.map(x=>x.questionId))].sort();
 assert(questionIds.length>0,'NO_REFERENCES:'+id);
 assert(refs.every(x=>x.questionId.startsWith('Y4M03-Q')&&x.semanticTarget===semantic),
   'SEMANTICS_IN_ANY_OCCURRENCE_NOT_EXPLICIT:'+id);
 const current=reg.entries[regById.get(id)];
 assert(current?.mediaId===id&&current?.kind==='image'&&current.semantic===semantic,
   'REGISTRY_CONCEPT_MISMATCH:'+id);
 assert(current.urlOrPath===('content/english/assets/images/v11-2b/'+id.toLowerCase()+'.svg')
    || /^content\/english\/assets\/images\/v11-2b\/img-v11-2b-[a-z0-9]+\.svg$/.test(current.urlOrPath),
   'NOT_THE_ORIGINAL_UNAPPROVED_GENERATED_SVG:'+id);
 assert(current.temporary===undefined||current.temporary===null,
   'REVIEW_IF_TEMPORARY_FIELD_CHANGED:'+id);
 assert(!['PEDAGOGICAL_QA_APPROVED','OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH','RELEASE_APPROVED'].includes(current.humanResolutionStatus)&&
        !['PEDAGOGICAL_QA_APPROVED','OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH','RELEASE_APPROVED'].includes(current.integrationStatus),
       'EXISTING_OFFICIAL_MEDIA_PROTECTED:'+id);
 const img=images.find(x=>x.name===(semantic==='fall'?'autumn':semantic));
 assert(img,'SOURCE_IMAGE_MISSING:'+id);
 questionIds.forEach(q=>affected.add(q));
 changes.push({mediaId:id,semantic,sourceImage:img.name,originalSVG:current.urlOrPath,originalTemporary:current.temporary??null,
  sourcePath:'Imagens Ilustrativa/'+img.file,gitBlob:img.gitBlob,sha256:img.sha256,assetPath:img.assetPath,
  affectedQuestionIds:questionIds,occurrenceCount:refs.length});
}
assert.equal(changes.length,8);
const result={
 schemaVersion:'DUDUQ_PHASE2_Y4M03_SEASONS_V1',status:apply?'APPLYING_EPHEMERAL_QA':'EXACT_SOURCE_PREFLIGHT_QA_ONLY',
 baselineProductionDeployment:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 baselineProductionCommit:'acccef36c8a3029d98e5efef1923b0b6fdad36e1',
 baselineReleaseTarSha256:'cf049f8c7a5f3d02696f7997b6dd1e31ec7b28942f6c77b96af656e72b5a1800',
 sourceAssetsCommit:'a62c07c075a4a744f81dee2eea3a6b93108f9d08',
 sourceUniquePNGs:images.length,changedMediaIds:changes.length,questionIds:[...affected].sort(),questionCount:affected.size,
 600QuestionsVerified:numberOfQuestions,questionsChanged:0,answersChanged:0,audioChanged:0,
 GoldMastersChanged:0,runtimeChanged:0,productionDeployed:false,humanApproval:false,
 images,changes,
 humanReviewRequired:'Source PNGs are below preferred 1024px; require effective 2x density at displayed dimensions, full gameplay and pedagogical approval before homologation'};
if(!apply){console.log(JSON.stringify({status:result.status,sourcePNGs:images.length,changedMediaIds:changes.length,questions:affected.size}));process.exit(0);}
const next=structuredClone(reg);
for(const c of changes){const i=regById.get(c.mediaId),prior=next.entries[i];
 next.entries[i]={...prior,status:'APPROVED',temporary:true,urlOrPath:c.assetPath,sha256:c.sha256,
  altText:c.semantic,assets:[{path:c.assetPath,sha256:c.sha256}],
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  provenance:{provider:'Assets-DuduQ',sourceRepository:'augustoborgessousa93/Assets-DuduQ',
   sourceCommit:result.sourceAssetsCommit,sourcePath:c.sourcePath,sourceGitBlob:c.gitBlob,sha256:c.sha256},
  replacementAudit:{qaOnly:true,originalTemporaryField:c.originalTemporary,
    source:'600 canonical compiled question occurrences / exact semantics',verifiedQuestionIds:c.affectedQuestionIds}};
}
const nextBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
const updated=[...manifestLines];updated[mf.get(regRel).i]=regRel+' '+sha256(nextBytes);
for(const image of images)updated.push(image.assetPath+' '+image.sha256);
const nextMf=Buffer.from(updated.join('\n')+'\n');const made=[];
try{
 for(const [rel,b]of assetBytes){const dest=path.resolve(dist,rel);
  assert(dest.startsWith(dist+path.sep),'UNSAFE_TARGET');
  await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,b,{flag:'wx'});made.push(dest);
 }
 await writeFile(registryFile,nextBytes);await writeFile(manifestFile,nextMf);
 for(const [rel,digest]of qHashes)assert.equal(sha256(await readFile(path.join(dist,rel))),digest,'QUESTION_CHANGED:'+rel);
 assert.equal(sha256(await readFile(registryFile)),sha256(nextBytes));
 assert.equal(sha256(await readFile(manifestFile)),sha256(nextMf));
 for(const [rel,b]of assetBytes)assert.equal(sha256(await readFile(path.join(dist,rel))),sha256(b));
 result.status='SEASON_IMAGES_APPLIED_IN_ISOLATED_QA_NO_DEPLOY';
 result.candidateManifestSha256=sha256(nextMf);result.candidateManifestFileCount=updated.length;
 await mkdir('qa/results',{recursive:true});
 await writeFile('qa/results/y4m03-seasons-evidence.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,images:images.length,changedMediaIds:changes.length,
  questionIds:result.questionIds,candidateManifestSha256:result.candidateManifestSha256,
  questionBytesChanged:0,productionDeployed:false}));
}catch(e){
 await writeFile(registryFile,oldRegistry);await writeFile(manifestFile,oldManifest);
 for(const p of made)await rm(p,{force:true});throw e;
}
