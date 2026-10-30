#!/usr/bin/env node
/** Finalize the already-integrated Y1M05 PNGs after every review gate passes. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm,stat} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),dist=path.join(root,'dist-pages'),apply=process.argv.includes('--apply');
const bundlePath=path.join(root,'qa/media-candidates/y1m05-official-20261030/batch-manifest.json');
const semanticPath=path.join(root,'qa/media-candidates/y1m05-official-20261030/semantic-evidence.json');
const browserPath=path.join(root,'qa/results/y1m05-official-media-browser/report.json');
const buildPath=path.join(root,'qa/results/y1m05-review-build.json');
const registryRel='content/english/media/media-registry.json',registryPath=path.join(dist,registryRel);
const evidenceRel='content/english/media/qa-evidence/y1m05-official-media-qa.json',evidencePath=path.join(dist,evidenceRel);
const trackedEvidencePath=path.join(root,'qa/results/y1m05-official-media-evidence.json');
const integrityPath=path.join(dist,'.duduq-pages-manifest');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const [bundleBytes,semanticBytes,browserBytes,buildBytes,registryBytes,integrityBytes]=await Promise.all([
  readFile(bundlePath),readFile(semanticPath),readFile(browserPath),readFile(buildPath),readFile(registryPath),readFile(integrityPath)]);
const bundle=JSON.parse(bundleBytes),semantic=JSON.parse(semanticBytes),browser=JSON.parse(browserBytes),build=JSON.parse(buildBytes),registry=JSON.parse(registryBytes);

if(bundle.moduleId!=='Y1M05'||bundle.originalAuditedPendingIds!==101||bundle.finalBindingIds!==101||bundle.assets?.length!==10||bundle.occurrenceScopedSplits?.length!==5)
  throw Error('STALE_BUNDLE');
if(semantic.moduleId!=='Y1M05'||semantic.reviewedQuestionCount!==20||semantic.postSplitIds!==101||semantic.usageRecords!==101||
   semantic.splitReview?.count!==5||semantic.renderedReview?.status!=='PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW')
  throw Error('SEMANTIC_QA_NOT_PASSED');
if(build.status!=='PASS'||build.modules!==30||build.activities!==600||build.y1m05?.bindingIds!==101||build.y1m05?.runtimePaths?.length!==10||
   build.sourceQuestionFilesModified!==false||build.goldMastersModified!==false||build.productionDeployed!==false)
  throw Error('Y1M05_REVIEW_BUILD_NOT_PASSED');
if(browser.schemaVersion!=='DUDUQ_Y1M05_OFFICIAL_MEDIA_BROWSER_QA_V2'||browser.status!=='PASS'||
   browser.routes?.length!==20||browser.routes.some(x=>!x.pass)||browser.transport?.length!==10||browser.transport.some(x=>!x.pass)||
   browser.gameplay?.pass!==true||browser.gameplay.incorrect?.state!=='incorrect'||browser.gameplay.correct?.state!=='correct'||
   browser.gameplay.incorrect?.observed?.targetVisible!==true||browser.gameplay.correct?.observed?.targetVisible!==true||
   browser.responsiveGameplay?.length!==2||browser.responsiveGameplay.some(x=>!x.pass||x.input!=='native Playwright locator touch tap'||
     x.hasTouch!==true||x.incorrect?.observed?.targetVisible!==true||x.correct?.observed?.targetVisible!==true||
     x.fullyContainedOfficialImages!==x.officialImages?.length||x.overflowX!==0||x.iframeCount!==0)||
   browser.screenshots?.length!==3||browser.screenshots.some(x=>!x.pass||x.fullyContainedOfficialImages!==x.officialImageCount))
  throw Error('REAL_BROWSER_QA_NOT_PASSED');
for(const item of [...browser.screenshots,...Object.values(browser.artifacts),...browser.responsiveGameplay.map(x=>x.screenshot)]){
  const file=path.join(root,item.path),bytes=await readFile(file);
  if(hash(bytes)!==item.sha256||(await stat(file)).size!==item.bytes)throw Error('BROWSER_EVIDENCE_HASH_MISMATCH:'+item.path);
}

const bindings=bundle.assets.flatMap(asset=>asset.bindings.map(binding=>({asset,...binding})));
if(bindings.length!==101||new Set(bindings.map(x=>x.mediaId)).size!==101)throw Error('EXPECTED_101_FINAL_BINDINGS');
const index=new Map(registry.entries.map((x,i)=>[x.mediaId,i]));
for(const binding of bindings){
  const entry=registry.entries[index.get(binding.mediaId)];
  if(!entry||entry.temporary!==true||entry.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry.sha256!==binding.asset.sha256)
    throw Error('ENTRY_NOT_QA_CANDIDATE:'+binding.mediaId);
}
const uniqueAssets=[...new Map(bundle.assets.map(asset=>[asset.sha256,{
  sha256:asset.sha256,concepts:[asset.semanticTarget],width:asset.pixelWidth,height:asset.pixelHeight,
  provider:asset.provenance.provider,generationClass:asset.provenance.generationClass,
  originalSha256:asset.provenance.originalSha256
}])).values()];
if(uniqueAssets.length!==10)throw Error('EXPECTED_10_UNIQUE_PNGS');

const evidence={
  schemaVersion:'DUDUQ_MEDIA_OFFICIAL_QA_V1',status:'PASS',moduleId:'Y1M05',reviewedAt:new Date().toISOString(),
  reviewScope:'Isolated review branch compiled artifact; no production deployment',reviewAuthority:'CODEX_DELEGATED_BY_OWNER_REQUEST',
  pedagogicalQaApproved:true,visualQaApproved:true,browserQaApproved:true,productionReleaseApproved:false,
  sourcePendingIds:101,finalMediaIds:101,questionUsageRecords:101,moduleQuestions:20,globalModulesVerified:30,globalActivitiesVerified:600,
  occurrenceScopedSplits:bundle.occurrenceScopedSplits,preservesAnswerKeysAndMechanics:true,answerKeyChanges:0,mechanicChanges:0,
  mediaIds:bindings.map(x=>x.mediaId).sort(),assets:uniqueAssets,
  semanticQa:{status:'PASS',path:path.relative(root,semanticPath).replaceAll('\\','/'),sha256:hash(semanticBytes),questionCount:20,usageRecords:101},
  buildQa:{status:'PASS',path:path.relative(root,buildPath).replaceAll('\\','/'),sha256:hash(buildBytes),strategy:build.buildStrategy,
    compiledManifestEntries:build.compiledManifestEntries,modules:30,activities:600},
  browserQa:{status:'PASS',path:path.relative(root,browserPath).replaceAll('\\','/'),sha256:hash(browserBytes),
    routes:20,transportPaths:10,nativePointerInput:true,nativeTouchInput:true,incorrectTransition:true,correctTransition:true,zeroIframes:true,
    touchViewports:browser.responsiveGameplay.map(x=>({name:x.name,viewport:x.viewport,input:x.input,pass:x.pass,screenshot:x.screenshot})),
    screenshots:browser.screenshots,video:browser.artifacts.video,trace:browser.artifacts.trace},
  goldMastersModified:false,sourceQuestionsModified:false,productionDeployed:false,
  rollback:'Rebuild the immutable V26 review artifact; this Y1M05 media overlay is compiled-review-only.'
};
const evidenceBytes=Buffer.from(JSON.stringify(evidence,null,2)+'\n'),evidenceSha256=hash(evidenceBytes);
for(const binding of bindings){
  const i=index.get(binding.mediaId),entry=registry.entries[i];
  registry.entries[i]={...entry,status:'APPROVED',temporary:false,
    integrationStatus:'OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH',humanResolutionStatus:'PEDAGOGICAL_QA_APPROVED',
    humanReview:'CODEX_DELEGATED_PEDAGOGICAL_VISUAL_BROWSER_QA_PASS',refinementStatus:'OFFICIAL_MEDIA_READY_REVIEW_BRANCH',
    backlogStatus:'RESOLVED_OFFICIAL_MEDIA_REVIEW_BRANCH',
    assets:(entry.assets||[]).map(asset=>({...asset,temporary:false,mediaType:'image/png'})),
    verification:{schemaVersion:'DUDUQ_MEDIA_OFFICIAL_QA_V1',moduleId:'Y1M05',evidencePath:evidenceRel,evidenceSha256,
      browserReportSha256:hash(browserBytes),semanticEvidenceSha256:hash(semanticBytes),buildReportSha256:hash(buildBytes),
      reviewAuthority:evidence.reviewAuthority,productionReleaseApproved:false}};
}
registry.updatedAt=new Date().toISOString();
const nextRegistry=Buffer.from(JSON.stringify(registry,null,2)+'\n');
const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/),entries=new Map();
lines.forEach((line,i)=>{const p=line.lastIndexOf(' '),name=line.slice(0,p),sha=line.slice(p+1);if(p<1||entries.has(name)||!/^[a-f0-9]{64}$/.test(sha))throw Error('BAD_MANIFEST:'+name);entries.set(name,{i,sha});});
if(entries.get(registryRel)?.sha!==hash(registryBytes))throw Error('REGISTRY_NOT_HASH_BOUND_BEFORE_FINALIZATION');
lines[entries.get(registryRel).i]=registryRel+' '+hash(nextRegistry);
if(entries.has(evidenceRel))lines[entries.get(evidenceRel).i]=evidenceRel+' '+evidenceSha256;else lines.push(evidenceRel+' '+evidenceSha256);
const nextIntegrity=Buffer.from(lines.join('\n')+'\n');
const result={schemaVersion:'DUDUQ_Y1M05_OFFICIAL_MEDIA_FINALIZATION_V1',status:apply?'READY_TO_APPLY':'PREFLIGHT_PASS',
  moduleId:'Y1M05',mediaIds:101,uniquePngs:10,runtimePaths:10,questions:20,occurrenceScopedSplits:5,globalActivitiesVerified:600,
  browserRoutes:20,screenshots:3,nativePointerGameplay:true,nativeTouchGameplay:true,evidenceSha256,productionDeployed:false,goldMastersModified:false};
if(!apply){console.log(JSON.stringify(result,null,2));process.exit(0);}

let evidenceCreated=false;
try{
  await mkdir(path.dirname(evidencePath),{recursive:true});
  await writeFile(evidencePath,evidenceBytes);evidenceCreated=true;
  await writeFile(trackedEvidencePath,evidenceBytes);
  await writeFile(registryPath,nextRegistry);await writeFile(integrityPath,nextIntegrity);
  if(hash(await readFile(evidencePath))!==evidenceSha256||hash(await readFile(registryPath))!==hash(nextRegistry)||hash(await readFile(integrityPath))!==hash(nextIntegrity))
    throw Error('FINALIZATION_WRITE_HASH_MISMATCH');
  result.status='OFFICIAL_MEDIA_QA_FINALIZED_ON_REVIEW_BRANCH';result.compiledManifestSha256=hash(nextIntegrity);
  await writeFile(path.join(root,'qa/results/y1m05-official-media-finalization.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(registryPath,registryBytes);await writeFile(integrityPath,integrityBytes);
  if(evidenceCreated)await rm(evidencePath,{force:true});
  throw error;
}
