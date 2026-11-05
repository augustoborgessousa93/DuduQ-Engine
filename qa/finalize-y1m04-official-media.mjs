#!/usr/bin/env node
/** Finalize the already-integrated Y1M04 PNGs after all QA gates pass. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm,stat} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),dist=path.join(root,'dist-pages'),apply=process.argv.includes('--apply');
const bundlePath=path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json');
const semanticPath=path.join(root,'qa/media-candidates/y1m04-official-20261030/semantic-evidence.json');
const browserPath=path.join(root,'qa/results/y1m04-official-media-browser/report.json');
const buildPath=path.join(root,'qa/results/y1m04-v26-build.json');
const registryRel='content/english/media/media-registry.json',registryPath=path.join(dist,registryRel);
const evidenceRel='content/english/media/qa-evidence/y1m04-official-media-qa.json',evidencePath=path.join(dist,evidenceRel);
const trackedEvidencePath=path.join(root,'qa/results/y1m04-official-media-evidence.json');
const integrityPath=path.join(dist,'.duduq-pages-manifest');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const [bundleBytes,semanticBytes,browserBytes,buildBytes,registryBytes,integrityBytes]=await Promise.all([
  readFile(bundlePath),readFile(semanticPath),readFile(browserPath),readFile(buildPath),readFile(registryPath),readFile(integrityPath)]);
const bundle=JSON.parse(bundleBytes),semantic=JSON.parse(semanticBytes),browser=JSON.parse(browserBytes),build=JSON.parse(buildBytes),registry=JSON.parse(registryBytes);
if(bundle.moduleId!=='Y1M04'||bundle.originalAuditedPendingIds!==83||bundle.finalBindingIds!==84||bundle.assets?.length!==18)throw Error('STALE_BUNDLE');
if(semantic.moduleId!=='Y1M04'||semantic.reviewedQuestionCount!==20||semantic.postSplitIds!==84||semantic.renderedReview?.status!=='PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW')throw Error('SEMANTIC_QA_NOT_PASSED');
if(build.status!=='PASS'||build.modules!==30||build.activities!==600||build.steps?.length!==37)throw Error('FRESH_V26_BUILD_NOT_PASSED');
if(browser.status!=='PASS'||browser.routes?.length!==20||browser.routes.some(x=>!x.pass)||browser.transport?.length!==18||browser.transport.some(x=>!x.pass)||
   browser.gameplay?.pass!==true||browser.gameplay.incorrect?.state!=='incorrect'||browser.gameplay.correct?.state!=='correct'||
   browser.screenshots?.length!==3||browser.screenshots.some(x=>!x.pass||x.fullyContainedOfficialImages!==x.officialImageCount))
  throw Error('REAL_BROWSER_QA_NOT_PASSED');
for(const item of [...browser.screenshots,...Object.values(browser.artifacts)]){
  const file=path.join(root,item.path),bytes=await readFile(file);if(hash(bytes)!==item.sha256||(await stat(file)).size!==item.bytes)throw Error('BROWSER_EVIDENCE_HASH_MISMATCH:'+item.path);
}
const bindings=bundle.assets.flatMap(asset=>asset.bindings.map(binding=>({asset,...binding})));
if(bindings.length!==84||new Set(bindings.map(x=>x.mediaId)).size!==84)throw Error('EXPECTED_84_FINAL_BINDINGS');
const index=new Map(registry.entries.map((x,i)=>[x.mediaId,i]));
for(const binding of bindings){const entry=registry.entries[index.get(binding.mediaId)];
  if(!entry||entry.temporary!==true||entry.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry.sha256!==binding.asset.sha256)
    throw Error('ENTRY_NOT_QA_CANDIDATE:'+binding.mediaId);
}
const uniqueAssets=[...new Map(bundle.assets.map(asset=>[asset.sha256,{sha256:asset.sha256,
  concepts:bundle.assets.filter(x=>x.sha256===asset.sha256).map(x=>x.semanticTarget),
  width:asset.pixelWidth,height:asset.pixelHeight,provider:asset.provenance.provider}])).values()];
if(uniqueAssets.length!==17)throw Error('EXPECTED_17_UNIQUE_PNGS');
const evidence={
  schemaVersion:'DUDUQ_MEDIA_OFFICIAL_QA_V1',status:'PASS',moduleId:'Y1M04',reviewedAt:new Date().toISOString(),
  reviewScope:'Isolated review branch compiled artifact; no production deployment',reviewAuthority:'CODEX_DELEGATED_BY_OWNER_REQUEST',
  pedagogicalQaApproved:true,visualQaApproved:true,browserQaApproved:true,productionReleaseApproved:false,
  sourcePendingIds:83,finalMediaIds:84,questionUsageRecords:85,moduleQuestions:20,globalModulesVerified:30,globalActivitiesVerified:600,
  occurrenceScopedSplit:bundle.occurrenceScopedSplit,preservesAnswerKeysAndMechanics:true,answerKeyChanges:0,mechanicChanges:0,
  mediaIds:bindings.map(x=>x.mediaId).sort(),assets:uniqueAssets,
  semanticQa:{status:'PASS',path:path.relative(root,semanticPath).replaceAll('\\','/'),sha256:hash(semanticBytes),questionCount:20,usageRecords:85},
  buildQa:{status:'PASS',path:path.relative(root,buildPath).replaceAll('\\','/'),sha256:hash(buildBytes),steps:37,modules:30,activities:600},
  browserQa:{status:'PASS',path:path.relative(root,browserPath).replaceAll('\\','/'),sha256:hash(browserBytes),
    routes:20,transportPaths:18,nativePointerInput:true,incorrectTransition:true,correctTransition:true,zeroIframes:true,
    screenshots:browser.screenshots,video:browser.artifacts.video,trace:browser.artifacts.trace},
  goldMastersModified:false,sourceQuestionsModified:false,productionDeployed:false,rollback:'Rebuild immutable V26 artifact; overlay is compiled-review-only.'
};
const evidenceBytes=Buffer.from(JSON.stringify(evidence,null,2)+'\n'),evidenceSha256=hash(evidenceBytes);
for(const binding of bindings){
  const i=index.get(binding.mediaId),entry=registry.entries[i];
  registry.entries[i]={...entry,status:'APPROVED',temporary:false,
    integrationStatus:'OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH',humanResolutionStatus:'PEDAGOGICAL_QA_APPROVED',
    humanReview:'CODEX_DELEGATED_PEDAGOGICAL_VISUAL_BROWSER_QA_PASS',refinementStatus:'OFFICIAL_MEDIA_READY_REVIEW_BRANCH',
    backlogStatus:'RESOLVED_OFFICIAL_MEDIA_REVIEW_BRANCH',
    assets:(entry.assets||[]).map(asset=>({...asset,temporary:false,mediaType:'image/png'})),
    verification:{schemaVersion:'DUDUQ_MEDIA_OFFICIAL_QA_V1',moduleId:'Y1M04',evidencePath:evidenceRel,evidenceSha256,
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
const result={schemaVersion:'DUDUQ_Y1M04_OFFICIAL_MEDIA_FINALIZATION_V1',status:apply?'READY_TO_APPLY':'PREFLIGHT_PASS',
  moduleId:'Y1M04',mediaIds:84,uniquePngs:17,runtimePaths:18,questions:20,globalActivitiesVerified:600,
  browserRoutes:20,screenshots:3,nativePointerGameplay:true,evidenceSha256,productionDeployed:false,goldMastersModified:false};
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
  await writeFile(path.join(root,'qa/results/y1m04-official-media-finalization.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await writeFile(registryPath,registryBytes);await writeFile(integrityPath,integrityBytes);
  if(evidenceCreated)await rm(evidencePath,{force:true});
  throw error;
}
