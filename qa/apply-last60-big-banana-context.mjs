#!/usr/bin/env node
/**
 * DUDUQ Last60: fix Y2M06-Q018 visual "big banana" in isolated QA only.
 * The generic IMG-Q009-BIG is also used for Y1M06-Q009, so it must NOT
 * be globally changed to a banana. This patch changes one media pointer
 * for one authored question in compiled QA content, preserving its text,
 * gabarito, instructions, audio and Gold Masters. Release requires review.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1');
assert(process.argv.includes('--preview')&&!process.argv.includes('--release'),'QA_PREVIEW_ONLY');
const root='dist-pages';
const qRel='content/english/year-2/module-06/questions.json';
const regRel='content/english/media/media-registry.json';
const mRel='.duduq-pages-manifest';
const qFile=path.join(root,qRel),regFile=path.join(root,regRel),mFile=path.join(root,mRel);
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitHash=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const plan=JSON.parse(readFileSync('qa/plans/last60-official-assets-20261110.json','utf8'));
const sourceBlob='f7699842e4d7e10082baef83462a23fd4f35bfd6';
const sourceFile='big_banana.png';
const oldId='IMG-Q009-BIG';
const newId='IMG-Y2M06-Q018-BIG-BANANA';
const originalQ=readFileSync(qFile),originalReg=readFileSync(regFile),originalM=readFileSync(mFile);
const manifestLines=originalM.toString('utf8').trimEnd().split(/\r?\n/);
const manifest=new Map();
manifestLines.forEach((l,i)=>{
 const k=l.lastIndexOf(' '),rel=l.slice(0,k),digest=l.slice(k+1);
 assert(k>0&&/^[a-f0-9]{64}$/.test(digest)&&!manifest.has(rel),'INVALID_MANIFEST:'+rel);
 manifest.set(rel,{index:i,digest});
});
assert.equal(manifest.get(qRel)?.digest,hash(originalQ),'QUESTION_SHA_DRIFT');
assert.equal(manifest.get(regRel)?.digest,hash(originalReg),'REGISTRY_SHA_DRIFT');
const questions=JSON.parse(originalQ),registry=JSON.parse(originalReg);
assert.equal(questions.moduleId,'Y2M06');
assert.equal(questions.items.length,20);
const question=questions.items.find(x=>x.item_id==='Y2M06-Q018');
assert(question,'TARGET_QUESTION_NOT_FOUND');
assert.equal(question.mechanicId,'smart-sentence-complete');
assert.equal(question.answerKey,'big');
const oldEntry=registry.entries.find(e=>e.id===oldId);
assert(oldEntry&&oldEntry.kind==='image','ORIGINAL_BIG_ENTRY_MISSING');
assert(!registry.entries.some(e=>e.id===newId),'SCOPED_BANANA_ALREADY_EXISTS');
const existing=registry.entries.find(e=>e.provenance?.sourceGitBlob===sourceBlob&&e.kind==='image'&&e.urlOrPath?.endsWith('.png'));
let scopedMediaId,sourceUrl,imageSha,sourceMode;
if(existing){
 assert.equal(manifest.get(existing.urlOrPath)?.digest,existing.sha256,'EXISTING_BANANA_MANIFEST_SHA_DRIFT');
 const b=readFileSync(path.join(root,existing.urlOrPath));
 assert.equal(hash(b),existing.sha256,'EXISTING_BANANA_CONTENT_SHA_DRIFT');
 scopedMediaId=existing.id;sourceUrl=existing.urlOrPath;imageSha=existing.sha256;sourceMode='reuse-official';
}else{
 const sourceUrlRaw='https://raw.githubusercontent.com/'+plan.sourceRepo+'/'+plan.sourceCommit+'/Imagens%20Ilustrativa/'+encodeURIComponent(sourceFile);
 let response;
 for(let attempt=1;attempt<=4;attempt++){
  try{response=await fetch(sourceUrlRaw,{signal:AbortSignal.timeout(110000)});if(response.ok)break;}catch(e){if(attempt===4)throw e;}
  assert(attempt<4,'BANANA_SOURCE_FETCH_FAILED:'+response?.status);
  await new Promise(resolve=>setTimeout(resolve,900*attempt));
 }
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.equal(gitHash(bytes),sourceBlob,'PINNED_BANANA_BLOB_MISMATCH');
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','BANANA_NOT_PNG');
 assert.equal(bytes[25],6,'BANANA_NO_TRUE_ALPHA');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert(width>=1024&&height>=1024,'BANANA_RESOLUTION_TOO_LOW');
 imageSha=hash(bytes);
 sourceUrl='content/english/assets/images/assets-duduq/semantic-'+sourceBlob.slice(0,12)+'-'+imageSha.slice(0,12)+'.png';
 assert(!manifest.has(sourceUrl)&&!existsSync(path.join(root,sourceUrl)),'BANANA_OUTPUT_ALREADY_EXISTS');
 mkdirSync(path.dirname(path.join(root,sourceUrl)),{recursive:true});
 writeFileSync(path.join(root,sourceUrl),bytes,{flag:'wx'});
 manifestLines.push(sourceUrl+' '+imageSha);
 manifest.set(sourceUrl,{index:manifestLines.length-1,digest:imageSha});
 const entry=structuredClone(oldEntry);
 entry.id=newId;
 entry.semantic='big';
 entry.urlOrPath=sourceUrl;entry.sha256=imageSha;entry.assets=[{path:sourceUrl,sha256:imageSha}];
 entry.temporary=true;
 entry.integrationStatus='Y2M06_Q018_CONTEXT_CORRECTION_QA';
 entry.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
 entry.provenance={provider:'Assets-DuduQ',sourcePath:'Imagens Ilustrativa/'+sourceFile,
  sourceCommit:plan.sourceCommit,sourceGitBlob:sourceBlob,sha256:imageSha};
 entry.replacementAudit={qaOnly:true,questionId:'Y2M06-Q018',originalId:oldId,
  reason:'sentence mentions banana, original image was a blue ball'};
 registry.entries.push(entry);
 scopedMediaId=newId;sourceMode='new-official-png';
}
const allowedKeys=new Set(['assetId','mediaId','image_ref','imageRef']);
const changedPaths=[];
function replaceRefs(v,prefix){
 if(!v||typeof v!=='object')return;
 if(Array.isArray(v)){v.forEach((x,i)=>replaceRefs(x,prefix+'['+i+']'));return;}
 for(const [k,value]of Object.entries(v)){
  if(allowedKeys.has(k)&&value===oldId){v[k]=scopedMediaId;changedPaths.push(prefix+'.'+k);}
  else if(value&&typeof value==='object')replaceRefs(value,prefix+'.'+k);
 }
}
const originalAnswer=JSON.stringify(question.answerKey);
const originalInstructions=JSON.stringify({a:question.primaryInstructionEn,b:question.primaryInstructionPt});
replaceRefs(question,'Y2M06-Q018');
assert(changedPaths.length>=1,'QUESTION_IMAGE_POINTER_NOT_FOUND');
assert.equal(JSON.stringify(question.answerKey),originalAnswer);
assert.equal(JSON.stringify({a:question.primaryInstructionEn,b:question.primaryInstructionPt}),originalInstructions);
assert.equal(questions.items.length,20);
assert(registry.entries.some(e=>e.id===oldId),'SHARED_ORIGINAL_BIG_MUST_SURVIVE');
assert(registry.entries.some(e=>e.id===scopedMediaId),'SCOPED_MEDIA_NOT_REGISTERED');
const qNext=Buffer.from(JSON.stringify(questions,null,2)+'\n');
const regNext=Buffer.from(JSON.stringify(registry,null,2)+'\n');
manifestLines[manifest.get(qRel).index]=qRel+' '+hash(qNext);
manifestLines[manifest.get(regRel).index]=regRel+' '+hash(regNext);
writeFileSync(qFile,qNext);
writeFileSync(regFile,regNext);
writeFileSync(mFile,manifestLines.join('\n')+'\n');
assert.equal(hash(readFileSync(qFile)),hash(qNext));
assert.equal(hash(readFileSync(regFile)),hash(regNext));
const info={schema:'DUDUQ_Y2M06_Q018_BIG_BANANA_CONTEXT_QA_V1',qaOnly:true,releaseApproved:false,
 sourceCommit:plan.sourceCommit,sourceBlob,sourceFile,sourceMode,originalMediaId:oldId,
 scopedMediaId,sourceUrl,sha256:imageSha,question:'Y2M06-Q018',changedPaths,
 questionCount:20,answerKeyPreserved:true,textPreserved:true,audioPreserved:true,goldMastersPreserved:true,
 affectsOtherQuestions:false,changedAuthoredSourceFiles:0,changedCompiledQuestionFiles:1,
 humanPedagogicalApproval:false,productionDeployed:false};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/last60-banana-context-correction.json',JSON.stringify(info,null,2)+'\n');
console.log('LAST60_BANANA_CONTEXT_QA_PATCH='+JSON.stringify(info));
