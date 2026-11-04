#!/usr/bin/env node
/**
 * Bulk ORIGINAL image source integration, into isolated QA only.
 * 49 content-addressed original source candidates / up to 150 exact mediaIds.
 * Never commit images or change questions, mechanics, audio, Gold Masters,
 * production deployments or account settings. All bindings remain unapproved.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
if(process.env.DUDUQ_QA_ONLY!=='1')throw Error('QA_ONLY_REQUIRED');
const dist=path.resolve('dist-pages'),regRel='content/english/media/media-registry.json';
const plan=JSON.parse(await readFile('qa/results/bulk/current-exact-source-coverage.json','utf8'));
const combined=JSON.parse(await readFile('qa/results/consolidated/evidence.json','utf8'));
assert.equal(plan.sourceCommit,'a62c07c075a4a744f81dee2eea3a6b93108f9d08');
assert.equal(plan.eligibleMediaIds,150);
assert.equal(plan.eligibleUniqueSourceBlobs,49);
assert.equal(combined.mediaIdsModified,10);
assert.equal(plan.canonicalProductionDeployment,combined.baselineProductionDeployment);
assert.equal(sha(await readFile(path.join(dist,'.duduq-pages-manifest'))),combined.candidateManifestSha256,'NOT_PINNED_5_PNG_CANDIDATE');
const oldReg=await readFile(path.join(dist,regRel)),reg=JSON.parse(oldReg);
assert.equal(reg.entries.length,1166);
const byId=new Map(reg.entries.map((e,i)=>[e.mediaId,i]));
assert.equal(byId.size,reg.entries.length);
const mfBytes=await readFile(path.join(dist,'.duduq-pages-manifest'));
const mfLines=mfBytes.toString('utf8').trimEnd().split(/\r?\n/);
assert.equal(mfLines.length,2896);
const manifests=new Map();
for(let i=0;i<mfLines.length;i++){
 const line=mfLines[i],pos=line.lastIndexOf(' ');
 assert(pos>0);
 const file=line.slice(0,pos),digest=line.slice(pos+1);
 assert(/^[a-f0-9]{64}$/.test(digest)&&!manifests.has(file),'BAD_MANIFEST_ENTRY');
 manifests.set(file,{index:i,sha256:digest});
}
assert.equal(manifests.get(regRel)?.sha256,sha(oldReg),'REGISTRY_SHA_INVALID');
const protectedIDs=new Set(combined.mediaBindings.map(x=>x.mediaId));
const verifiedQuestionIDs=new Set();
const seenByID=new Map();
const questionFileHashes=[];
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mid='Y'+y+'M'+String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 const digest=sha(bytes);assert.equal(digest,manifests.get(rel)?.sha256,'600_CONTRACTS_SHA_MISMATCH:'+mid);
 questionFileHashes.push([rel,digest]);
 const questions=JSON.parse(bytes);assert.equal(questions.moduleId,mid);assert.equal(questions.items.length,20);
 for(const q of questions.items){
  assert(!verifiedQuestionIDs.has(q.item_id));verifiedQuestionIDs.add(q.item_id);
  for(const row of plan.mediaIdEvidence.eligible){
    if(!JSON.stringify(q).includes('"'+row.mediaId+'"'))continue;
    const arr=seenByID.get(row.mediaId)||new Set();arr.add(q.item_id);seenByID.set(row.mediaId,arr);
  }
 }
}
assert.equal(verifiedQuestionIDs.size,600);
const safe=plan.mediaIdEvidence.eligible;
assert.equal(safe.length,150);
const records=new Map(),groups=new Map();
for(const item of safe){
 assert(!protectedIDs.has(item.mediaId),'CONFLICT_WITH_ALREADY_TESTED_QA_ID');
 assert(!records.has(item.mediaId),'DUPLICATE_BULK_ID');
 const index=byId.get(item.mediaId),original=reg.entries[index];
 assert(original,'UNKNOWN_MEDIA_ID');
 assert(original.urlOrPath===item.originalSvg,'REGISTRY_CHANGED_AFTER_DISCOVERY:'+item.mediaId);
 assert(original.semantic===item.currentRegistrySemantic,'SEMANTIC_CHANGED');
 assert(!original.humanResolutionStatus||!['PEDAGOGICAL_QA_APPROVED','RELEASE_APPROVED'].includes(original.humanResolutionStatus),'APPROVED_MEDIA_PROTECTED');
 assert(original.temporary===true||original.temporary===null||original.temporary===undefined);
 assert(!manifests.has(item.originalSvg)===false,'PROVISIONAL_SOURCE_NOT_IN_MANIFEST');
 const qids=[...(seenByID.get(item.mediaId)||[])].sort();
 assert(qids.length===item.questionIds.length&&qids.every((x,i)=>x===item.questionIds[i]),
   'ALL_REFERENCES_NOT_RECORDED:'+item.mediaId);
 records.set(item.mediaId,{...item,originalRegistry:original});
 let group=groups.get(item.sourceGitBlob);
 if(!group){group={gitBlob:item.sourceGitBlob,sourcePath:item.sourcePath,semantic:item.semantic,items:[]};groups.set(item.sourceGitBlob,group);}
 assert(group.semantic===item.semantic,'SOURCE_BLOB_USED_FOR_MULTIPLE_DIFFERENT_CONCEPTS');
 group.items.push(item.mediaId);
}
assert.equal(groups.size,49);
const jobs=[...groups.values()],validImages=[],rejectedImages=[];
const sourceCommit='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
const endpoint='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+sourceCommit+'/';
await mkdir('qa/results/bulk/originals',{recursive:true});
let cursor=0;
async function worker(){
 while(cursor<jobs.length){
  const item=jobs[cursor++],relative=item.sourcePath.split('/').map(encodeURIComponent).join('/');
  let error=null,data=null;
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const response=await fetch(endpoint+relative,{signal:AbortSignal.timeout(80000),headers:{'User-Agent':'duduq-phase2-qa-source-check'}});
    if(!response.ok)throw Error('HTTP_'+response.status);
    const len=Number(response.headers.get('content-length'))||0;
    if(len>15_000_000)throw Error('SOURCE_GT_15MB');
    const buffer=Buffer.from(await response.arrayBuffer());
    if(buffer.length>15_000_000)throw Error('SOURCE_GT_15MB');
    assert.equal(blob(buffer),item.gitBlob,'GIT_BLOB_NOT_PINNED');
    assert(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'NOT_ORIGINAL_PNG');
    const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20),depth=buffer[24],color=buffer[25];
    if(width<512||height<512||depth!==8||color!==6)throw Error('SOURCE_REQUIRES_RGBA_8BIT_MIN512:'+width+'x'+height+'_'+depth+'_'+color);
    const digest=sha(buffer);
    const safeStem=item.semantic.replace(/[^a-z0-9]+/g,'-').slice(0,48)||'source';
    const assetPath='content/english/assets/images/assets-duduq/phase2-bulk-'+safeStem+'-'+digest.slice(0,12)+'.png';
    if(manifests.has(assetPath))throw Error('FILE_ALREADY_ON_BASE');
    data={...item,sha256:digest,width,height,bytes:buffer,assetPath};
    error=null;break;
   }catch(e){error=String(e.message||e).slice(0,180);}
  }
  if(error)rejectedImages.push({...item,reason:error});
  else validImages.push(data);
 }
}
await Promise.all([worker(),worker(),worker(),worker()]);
const list=new Map(validImages.map(x=>[x.gitBlob,x]));
const accepted=new Map(),changedQuestionIds=new Set();
const next=structuredClone(reg);
for(const row of safe){
 const source=list.get(row.sourceGitBlob);
 if(!source)continue;
 const old=records.get(row.mediaId).originalRegistry;
 assert(old.urlOrPath===row.originalSvg);
 const i=byId.get(row.mediaId);
 next.entries[i]={...old,status:'APPROVED',temporary:true,
   urlOrPath:source.assetPath,sha256:source.sha256,altText:row.semantic,
   assets:[{path:source.assetPath,sha256:source.sha256}],
   integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
   humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
   provenance:{provider:'Assets-DuduQ',sourceRepository:'augustoborgessousa93/Assets-DuduQ',
     sourceCommit,sourcePath:source.sourcePath,sourceGitBlob:source.gitBlob,
     sha256:source.sha256,nativeWidth:source.width,nativeHeight:source.height},
   replacementAudit:{source:'exact English semantic, current 600 contracts, all occurrences verified',
     previousPath:row.originalSvg,questionIds:row.questionIds,qaOnly:true,
     humanVisualReviewPending:true}
 };
 accepted.set(row.mediaId,{mediaId:row.mediaId,semantic:row.semantic,sourcePath:source.sourcePath,
   assetPath:source.assetPath,sha256:source.sha256,questionIds:row.questionIds,wasProvisional:row.originalSvg});
 for(const q of row.questionIds)changedQuestionIds.add(q);
}
assert(accepted.size>=20,'INSUFFICIENT_SAFE_VALIDATED_BATCH');
const written=new Set();
for(const image of validImages){
 if(written.has(image.assetPath))continue;
 const dest=path.resolve(dist,image.assetPath);
 assert(dest.startsWith(dist+path.sep),'PATH_ESCAPE');
 await mkdir(path.dirname(dest),{recursive:true});
 await writeFile(dest,image.bytes,{flag:'wx'});
 written.add(image.assetPath);
}
const nextReg=Buffer.from(JSON.stringify(next,null,2)+'\n');
const nextLines=[...mfLines];
nextLines[manifests.get(regRel).index]=regRel+' '+sha(nextReg);
for(const image of validImages){if(image.assetPath&&!nextLines.some(x=>x.startsWith(image.assetPath+' ')))nextLines.push(image.assetPath+' '+image.sha256);}
const nextManifest=Buffer.from(nextLines.join('\n')+'\n');
await writeFile(path.join(dist,regRel),nextReg);
await writeFile(path.join(dist,'.duduq-pages-manifest'),nextManifest);
for(const [rel,digest]of questionFileHashes)
 assert.equal(sha(await readFile(path.join(dist,rel))),digest,'CONTRACT_BYTE_CHANGED:'+rel);
for(const i of validImages)assert.equal(sha(await readFile(path.join(dist,i.assetPath))),i.sha256);
assert.equal(sha(await readFile(path.join(dist,regRel))),sha(nextReg));
assert.equal(sha(await readFile(path.join(dist,'.duduq-pages-manifest'))),sha(nextManifest));
const report={schemaVersion:'DUDUQ_PHASE2_BULK_SOURCE_QA_CANDIDATE_V1',
 status:'BULK_QUALIFIED_ORIGINAL_IMAGES_APPLIED_QA_ONLY',
 canonicalProductionDeployment:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 baseCombinedManifestSha256:combined.candidateManifestSha256,
 candidateManifestSha256:sha(nextManifest),
 previousTestedOriginalPNGs:5,previousTestedMediaIds:10,
 newOriginalPNGs:written.size,newMediaIds:accepted.size,
 affectedQuestionIds:[...changedQuestionIds].sort(),affectedQuestionCount:changedQuestionIds.size,
 totalImagesInNewCandidate:5+written.size,totalUpdatedMediaIdsInNewCandidate:10+accepted.size,
 filesInManifest:nextLines.length,fullContractHashesChecked:600,
 questionsChanged:0,gabaritosChanged:0,mechanicsChanged:0,audioChanged:0,runtimeChanged:0,goldMastersChanged:0,
 sourceCommit,sourceRejected:rejectedImages,acceptedBindings:[...accepted.values()],
 imageBytesReviewedByHuman:false,gameplayVisualQAComplete:false,
 productionDeployed:false,humanPedagogicalApproval:'PENDING'};
await mkdir('qa/results/bulk',{recursive:true});
await writeFile('qa/results/bulk/integration-evidence.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,newPNGs:report.newOriginalPNGs,
 newMediaIds:report.newMediaIds,affectedQuestions:report.affectedQuestionCount,
 rejectedSourceGroups:report.sourceRejected.length,totalMediaIds:report.totalUpdatedMediaIdsInNewCandidate,
 candidateManifestSha256:report.candidateManifestSha256,contracts:600,productionDeployed:false}));
