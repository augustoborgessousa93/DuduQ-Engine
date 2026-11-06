#!/usr/bin/env node
/**
 * DUDUQ Color_Purple.png targeted replacement.
 * Only affects the exact eleven 'purple' media references, from the audited
 * 06 Nov published version. No global alias, source-snapshot or question edit.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED_FOR_BUILD');
const preview=process.argv.includes('--preview');
const release=process.argv.includes('--release');
assert(preview!==release,'MUST_EXPLICITLY_SELECT_PREVIEW_OR_RELEASE');
const sourceCommit='286c30174161c2932247e3018d69131c786ce558';
const gitBlob='aafd4cfb4960de49837773e7af136ef94f8434d4';
const sourcePath='Imagens Ilustrativa/Color_Purple.png';
const sourceUrl='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+sourceCommit+
 '/Imagens%20Ilustrativa/Color_Purple.png';
const preRegistrySha='1f62cb7bec76fd386fdbaae65d3f7f9f89eb489c8d3f6bdbb3f8f9a6a0a04db8';
const dist=path.resolve('dist-pages');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitSha=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const targets=[
 'IMG-Y1M03-Q006-PURPLE','IMG-Q007-PURPLE','IMG-Y1M03-Q007-PURPLE',
 'IMG-Q008-PURPLE','IMG-Y1M03-Q009-PURPLE','IMG-Y1M03-Q010-PURPLE',
 'IMG-Y1M03-Q012-PURPLE','IMG-Y1M03-Q013-PURPLE','IMG-Y1M03-Q014-PURPLE',
 'IMG-Y1M03-Q015-PURPLE','IMG-Q018-PURPLE'
].sort();
const ids=new Set(targets);
assert.equal(ids.size,11,'DUPLICATE_PURPLE_ID');
const regRel='content/english/media/media-registry.json';
const regPath=path.join(dist,regRel);
const manifestPath=path.join(dist,'.duduq-pages-manifest');
assert(existsSync(regPath)&&existsSync(manifestPath),'IMMUTABLE_BUILD_NOT_READY');
const oldReg=readFileSync(regPath);
assert.equal(sha256(oldReg),preRegistrySha,'PUBLISHED_269_MEDIA_BASELINE_CHANGED');
const registry=JSON.parse(oldReg.toString('utf8'));
const got=registry.entries.filter(e=>e.kind==='image'&&(e.semantic==='purple'||/PURPLE/i.test(e.mediaId)));
assert.deepEqual(got.map(e=>e.mediaId).sort(),targets,'PURPLE_CONSUMERS_CHANGED');
const previousPaths={};
let previouslyOfficial=0,previouslyProvisional=0;
for(const e of got){
 assert.equal(e.semantic,'purple','PURPLE_SEMANTIC_MISMATCH');
 assert(e.temporary===true,'HOMOLOGATED_MEDIA_MUST_NOT_BE_OVERRIDDEN');
 assert(/\.svg$|\.png$/.test(e.urlOrPath),'PURPLE_NOT_IMAGE');
 if(e.urlOrPath.endsWith('.png')){
  previouslyOfficial++;
  assert.equal(e.provenance?.sourcePath,'Imagens Ilustrativa/lápis de cera roxo.png',
   'PREVIOUS_PURPLE_SOURCE_UNEXPECTED');
 }else{
  previouslyProvisional++;
  assert(!e.provenance,'PROVISIONAL_IMAGE_HAS_UNEXPECTED_PROVENANCE');
 }
 previousPaths[e.mediaId]=e.urlOrPath;
}
assert.equal(previouslyOfficial,8,'EXPECTED_EIGHT_CRAYON_IMAGES');
assert.equal(previouslyProvisional,3,'EXPECTED_THREE_TEMPORARY_PURPLE_IMAGES');
const resp=await fetch(sourceUrl,{signal:AbortSignal.timeout(120000)});
assert(resp.ok,'COLOR_PURPLE_HTTP_'+resp.status);
const bytes=Buffer.from(await resp.arrayBuffer());
assert.equal(gitSha(bytes),gitBlob,'COLOR_PURPLE_GITHUB_BLOB_HASH_MISMATCH');
assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','COLOR_PURPLE_INVALID_PNG');
assert(bytes.readUInt32BE(16)>=512&&bytes.readUInt32BE(20)>=512,'COLOR_PURPLE_TOO_SMALL');
assert.equal(bytes[25],6,'COLOR_PURPLE_REQUIRES_TRUE_ALPHA_PNG');
const digest=sha256(bytes);
const imgRel='content/english/assets/images/assets-duduq/fast-'+gitBlob.slice(0,12)+'-'+digest.slice(0,12)+'.png';
const imgPath=path.join(dist,imgRel);
assert(!existsSync(imgPath),'DUPLICATE_OFFICIAL_ASSET_PATH');
const manifestRaw=readFileSync(manifestPath,'utf8');
const lines=manifestRaw.trimEnd().split(/\r?\n/);
const manifest=new Map(lines.map((l,i)=>{
 const p=l.lastIndexOf(' ');assert(p>0,'BAD_MANIFEST_LINE');return [l.slice(0,p),{hash:l.slice(p+1),index:i}];
}));
assert.equal(manifest.size,lines.length,'DUPLICATE_MANIFEST_ENTRIES');
assert.equal(manifest.get(regRel)?.hash,preRegistrySha,'MANIFEST_REGISTRY_HASH_MISMATCH');
assert(!manifest.has(imgRel),'COLOR_PURPLE_PNG_ALREADY_IN_MANIFEST');
// All previously listed file hashes must be consistent with the immutable artifact.
for(const [file,{hash}] of manifest)assert.equal(sha256(readFileSync(path.join(dist,file))),hash,'IMMUTABLE_ARTIFACT_CHANGED:'+file);
// Audit all 600 questions and their media consumers without modifying their bytes.
const consumers=[];
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const doc=JSON.parse(readFileSync(path.join(dist,rel)));
 assert.equal(doc.items.length,20,'QUESTION_COUNT_MISMATCH:'+rel);
 for(const item of doc.items){
  const involved=new Set();
  function scan(v){
   if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){for(const x of v)scan(x);return;}
   if(typeof v.mediaId==='string'&&ids.has(v.mediaId))involved.add(v.mediaId);
   for(const value of Object.values(v))if(value&&typeof value==='object')scan(value);
  }
  scan(item);
  if(involved.size)consumers.push({questionId:item.item_id,mediaIds:[...involved]});
 }
}
assert(consumers.some(x=>x.questionId.startsWith('Y1M03')),'PURPLE_NOT_REFERENCED_IN_COLORS_MODULE');
for(const e of got){
 e.urlOrPath=imgRel;
 e.sha256=digest;
 e.assets=[{path:imgRel,sha256:digest}];
 e.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
 e.integrationStatus='USER_PROVIDED_COLOR_PURPLE_VISUAL_REVIEW';
 e.provenance={provider:'Assets-DuduQ',sourcePath,sourceCommit,
  sourceGitBlob:gitBlob,sha256:digest};
 e.replacementAudit={qaOnly:true,previousPath:previousPaths[e.mediaId],
  rule:'USER_EXACT_PURPLE_COLOR_SOURCE',originalSemantics:'purple',
  reviewedConsumerCount:consumers.filter(x=>x.mediaIds.includes(e.mediaId)).length};
}
const nextReg=Buffer.from(JSON.stringify(registry,null,2)+'\n');
lines[manifest.get(regRel).index]=regRel+' '+sha256(nextReg);
lines.push(imgRel+' '+digest);
const nextManifest=lines.join('\n')+'\n';
mkdirSync(path.dirname(imgPath),{recursive:true});
writeFileSync(imgPath,bytes,{flag:'wx'});
writeFileSync(regPath,nextReg);
writeFileSync(manifestPath,nextManifest);
assert.equal(sha256(readFileSync(imgPath)),digest,'COLOR_PURPLE_BYTES_CHANGED');
assert.equal(sha256(readFileSync(regPath)),sha256(nextReg),'REGISTRY_WRITE_FAILED');
const outcome={schema:'DUDUQ_COLOR_PURPLE_TARGETED_V1',
 sourceCommit,sourcePath,sourceGitBlob:gitBlob,sourceSha256:digest,
 pngPath:imgRel,imageSize:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)},
 replacedMediaIds:targets,previousOfficial:previouslyOfficial,previousProvisional:previouslyProvisional,
 impactedQuestions:consumers,previousRegistrySha:preRegistrySha,newRegistrySha:sha256(nextReg),
 remainingColorPurpleProvisional:registry.entries.filter(e=>ids.has(e.mediaId)&&e.urlOrPath.endsWith('.svg')).length,
 heldGlobalSourceSnapshotUnchanged:true,questionContracts:600,
 approvedPedagogically:false,productionDeployed:release};
assert.equal(outcome.remainingColorPurpleProvisional,0,'PURPLE_SVG_REMAINING');
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/duduq-purple-color-result.json',JSON.stringify(outcome,null,2)+'\n');
if(preview){
 const reportDir=path.join(dist,'media-review');
 mkdirSync(reportDir,{recursive:true});
 const report='<html lang="pt-BR"><meta charset="utf-8"><title>Purple · DUDUQ</title><style>body{font:16px Nunito,Arial;background:#f4f5ff;color:#26324e;padding:24px;max-width:680px;margin:auto}img{width:100%;max-width:360px;object-fit:contain;background:#fff;border-radius:20px;padding:16px}code{overflow-wrap:anywhere}</style><h1>Purple — imagem oficial</h1><img src="/'+imgRel+'" alt="Splash de tinta na cor roxa"><p>11 mídias atualizadas; 8 lápis de cera substituídos e 3 SVGs provisórios eliminados.</p><p>Não é uma homologação das alternativas do jogo.</p><p><a href="/play/english/year-1/module-03/">Abrir módulo Colors</a></p></html>';
 writeFileSync(path.join(reportDir,'purple.html'),report);
 writeFileSync(path.join(reportDir,'purple-audit.json'),JSON.stringify(outcome,null,2)+'\n');
}
console.log('DUDUQ_PURPLE_COLOR_APPLIED='+JSON.stringify({
 mediaIds:targets.length,replacedCrayon:previouslyOfficial,replacedSVG:previouslyProvisional,
 questionCount:consumers.length,sourceGitBlob:gitBlob,sourceSha256:digest,
 registrySha256:outcome.newRegistrySha,mode:preview?'PREVIEW':'RELEASE'}));
