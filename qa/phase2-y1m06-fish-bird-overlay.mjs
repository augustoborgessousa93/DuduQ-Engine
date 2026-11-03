#!/usr/bin/env node
// QA-only delta: original bird/fish PNGs for two Y1M06-Q004 choices.
// Does not edit any question, answer, audio, mechanic, Gold Master or prod.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),dist=path.resolve('dist-pages');
const sha=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const apply=process.argv.includes('--apply');
if(apply&&process.env.DUDUQ_QA_ONLY!=='1')throw Error('QA_ONLY_APPLY_REQUIRED');
const sources=[
 {semantic:'bird',mediaId:'IMG-Y1M06-Q004-BIRD',file:'pet-bird-passaro.png',sourceGitBlob:'1128475a8de84c4dbeb613fb798164f03d432342'},
 {semantic:'fish',mediaId:'IMG-Y1M06-Q004-FISH',file:'pet-fish-peixe.png',sourceGitBlob:'29b60c4e87bcd6cc0a5a4f2e7b7f4fada03a01fc'}
];
const regRel='content/english/media/media-registry.json',manRel='.duduq-pages-manifest';
const oldRegistry=await readFile(path.join(dist,regRel));
const oldManifest=await readFile(path.join(dist,manRel));
const registry=JSON.parse(oldRegistry);
const indexes=new Map(registry.entries.map((x,i)=>[x.mediaId,i]));
assert.equal(indexes.size,registry.entries.length,'DUPLICATED_MEDIA_IDS');
const lines=oldManifest.toString('utf8').trimEnd().split(/\r?\n/);
assert.equal(lines.length,2891,'BASELINE_NOT_CANONICAL_ORANGE');
const integrity=new Map();
for(const [i,line]of lines.entries()){
 const n=line.lastIndexOf(' ');assert(n>0);
 const rel=line.slice(0,n),expected=line.slice(n+1);
 assert(/^[0-9a-f]{64}$/.test(expected)&&!integrity.has(rel),'BAD_MANIFEST');
 integrity.set(rel,{expected,i});
}
assert.equal(integrity.get(regRel)?.expected,sha(oldRegistry));
const occurrences=new Map(),questionHashes=new Map();let count=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mod='Y'+y+'M'+String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(dist,rel));
 assert.equal(sha(bytes),integrity.get(rel)?.expected,'BASELINE_QUESTION_HASH_MISMATCH');
 questionHashes.set(rel,sha(bytes));
 const data=JSON.parse(bytes);
 assert.equal(data.moduleId,mod);assert.equal(data.items?.length,20);
 for(const q of data.items){
  count++;
  for(const spec of sources){
   function walk(node){
    if(!node||typeof node!=='object')return;
    if(!Array.isArray(node)&&
      ['mediaId','assetId','imageRef','image_ref'].some(k=>node[k]===spec.mediaId))
      occurrences.set(spec.mediaId,[...(occurrences.get(spec.mediaId)||[]),
        {questionId:q.item_id,semanticTarget:node.semanticTarget??null}]);
    for(const v of Object.values(node))if(v&&typeof v==='object')walk(v);
   }
   walk(q);
  }
 }
}
assert.equal(count,600);
const payloads=new Map(),changes=[];
for(const spec of sources){
 const matches=occurrences.get(spec.mediaId)||[];
 assert(matches.length>=1,'MEDIA_BINDING_NOT_FOUND:'+spec.mediaId);
 assert(matches.every(x=>x.questionId==='Y1M06-Q004'&&
  String(x.semanticTarget).toLowerCase().trim()===spec.semantic),
  'EXPLICIT_SEMANTIC_OR_USAGE_MISMATCH:'+spec.mediaId);
 const idx=indexes.get(spec.mediaId),current=registry.entries[idx];
 assert(current?.kind==='image'&&current?.temporary===true&&
  current.semantic===spec.semantic&&String(current.urlOrPath).endsWith('.svg'),
  'CURRENT_ORANGE_PROVISIONAL_SVG_REQUIRED:'+spec.mediaId);
 assert(current.humanResolutionStatus!=='PEDAGOGICAL_QA_APPROVED'&&
  current.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH','APPROVED_BINDING_PROTECTED');
 const image=path.resolve('source-pets',spec.file);
 const bytes=await readFile(image);
 const sig=Buffer.from([137,80,78,71,13,10,26,10]);
 assert(bytes.subarray(0,8).equals(sig),'NOT_PNG:'+spec.file);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert(width>=1024&&height>=1024&&bytes[24]===8&&bytes[25]===6,'SOURCE_NOT_HIGH_RES_RGBA:'+spec.file);
 assert.equal(gitBlob(bytes),spec.sourceGitBlob,'SOURCE_GIT_BLOB_CHANGED:'+spec.file);
 const pngHash=sha(bytes);
 const rel='content/english/assets/images/assets-duduq/'+spec.file.replace(/\.png$/,'')+'-'+pngHash.slice(0,12)+'.png';
 assert(!integrity.has(rel),'SOURCE_PATH_ALREADY_IN_CANONICAL_RELEASE');
 payloads.set(rel,bytes);
 changes.push({mediaId:spec.mediaId,semantic:spec.semantic,
  questionIds:['Y1M06-Q004'],oldPath:current.urlOrPath,assetPath:rel,
  sourcePath:'Imagens Ilustrativa/'+spec.file,sourceGitBlob:spec.sourceGitBlob,
  sha256:pngHash,width,height,previousTemporary:current.temporary,sourceByteCount:bytes.length});
}
const qa={schemaVersion:'DUDUQ_PHASE2_Y1M06_PETS_QA_ONLY_V1',
 baseProductionDeployment:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 baseProductionCommit:'acccef36c8a3029d98e5efef1923b0b6fdad36e1',
 baseReleaseTag:'duduq-phase2-orange-fruit-color-corrected-20261103',
 sourceAssetsCommit:'a62c07c075a4a744f81dee2eea3a6b93108f9d08',
 sourcePngs:2,mediaIds:changes.length,affectedQuestionIds:['Y1M06-Q004'],
 verifiedQuestionContracts:600,questionsChanged:0,gabaritosChanged:0,
 goldMastersChanged:0,mechanicsChanged:0,audioChanged:0,
 applyToProduction:false,pedagogicallyApproved:false,visualGameplayQAApproved:false,
 changes,status:apply?'APPLYING_ISOLATED_QA':'PREFLIGHT_VALIDATED_NO_DEPLOY'};
if(!apply){console.log(JSON.stringify({status:qa.status,changes,production:false}));process.exit(0);}
const next=structuredClone(registry);
for(const c of changes){const i=indexes.get(c.mediaId),before=next.entries[i];
 next.entries[i]={...before,temporary:true,urlOrPath:c.assetPath,sha256:c.sha256,
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',altText:c.semantic,
  assets:[{path:c.assetPath,sha256:c.sha256}],
  provenance:{provider:'Assets-DuduQ repository',sourceRepository:'augustoborgessousa93/Assets-DuduQ',
   sourceCommit:qa.sourceAssetsCommit,sourcePath:c.sourcePath,sourceGitBlob:c.sourceGitBlob,
   nativeWidth:c.width,nativeHeight:c.height,sha256:c.sha256},
  replacementAudit:{source:'canonical 600-contract exact leaf semantic + source Git blob',
   verifiedQuestionIds:c.questionIds,previousPath:c.oldPath,qaOnly:true}};
}
const nextReg=Buffer.from(JSON.stringify(next,null,2)+'\n');
const nextLines=[...lines];nextLines[integrity.get(regRel).i]=regRel+' '+sha(nextReg);
for(const c of changes)nextLines.push(c.assetPath+' '+c.sha256);
const nextMan=Buffer.from(nextLines.join('\n')+'\n'),created=[];
try{
 for(const [rel,b]of payloads){
  const out=path.resolve(dist,rel);assert(out.startsWith(dist+path.sep),'UNSAFE_OUTPUT_PATH');
  await mkdir(path.dirname(out),{recursive:true});await writeFile(out,b,{flag:'wx'});created.push(out);
 }
 await writeFile(path.join(dist,regRel),nextReg);
 await writeFile(path.join(dist,manRel),nextMan);
 for(const [rel,digest]of questionHashes)
  assert.equal(sha(await readFile(path.join(dist,rel))),digest,'QUESTION_BYTES_CHANGED:'+rel);
 for(const [rel,b]of payloads)assert.equal(sha(await readFile(path.join(dist,rel))),sha(b));
 assert.equal(sha(await readFile(path.join(dist,regRel))),sha(nextReg));
 assert.equal(sha(await readFile(path.join(dist,manRel))),sha(nextMan));
 qa.status='ISOLATED_QA_OVERLAY_CREATED_NO_DEPLOY';
 qa.candidateManifestSha256=sha(nextMan);
 qa.manifestEntries=nextLines.length;
 await mkdir('qa/results',{recursive:true});
 await writeFile('qa/results/y1m06-fish-bird-evidence.json',JSON.stringify(qa,null,2)+'\n');
 console.log(JSON.stringify({status:qa.status,changedMediaIds:qa.mediaIds,
  affectedQuestions:qa.affectedQuestionIds,manifestEntries:qa.manifestEntries,
  questionsChanged:0,productionDeployed:false}));
}catch(error){
 await writeFile(path.join(dist,regRel),oldRegistry);
 await writeFile(path.join(dist,manRel),oldManifest);
 for(const p of created)await rm(p,{force:true});
 throw error;
}
