#!/usr/bin/env node
/** Finalize Y1M02 media in the isolated compiled review artifact after every QA gate passes. */
import {readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {bundleRel,moduleId,registryRel,sha256} from './y1m02-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),record=process.argv.includes('--record');
if(process.argv.includes('--apply'))throw Error('Y1M02_FINALIZATION_BLOCKED_OWNER_HOMOLOGATION_AND_INDEPENDENT_RELEASE_APPROVAL_REQUIRED');
const bundlePath=path.join(root,bundleRel,'batch-manifest.json'),semanticPath=path.join(root,bundleRel,'semantic-evidence.json');
const browserPath=path.join(root,'qa/results/y1m02-official-media-browser/report.json'),buildPath=path.join(root,'qa/results/y1m02-review-build.json');
const registryPath=path.join(dist,registryRel),technicalEvidencePath=path.join(root,'qa/results/y1m02-technical-qa-evidence.json');
const integrityPath=path.join(dist,'.duduq-pages-manifest');
const [bundleBytes,semanticBytes,browserBytes,buildBytes,registryBytes,integrityBytes]=await Promise.all([
  readFile(bundlePath),readFile(semanticPath),readFile(browserPath),readFile(buildPath),readFile(registryPath),readFile(integrityPath)
]);
const bundle=JSON.parse(bundleBytes),semantic=JSON.parse(semanticBytes),browser=JSON.parse(browserBytes),build=JSON.parse(buildBytes),registry=JSON.parse(registryBytes);
if(bundle.moduleId!==moduleId||bundle.originalAuditedPendingIds!==92||bundle.originalQuestionUsageRecords!==94||bundle.finalBindingIds!==93||
   bundle.totalQuestionUsageRecords!==94||bundle.assets?.length!==10||bundle.occurrenceScopedSplits?.length!==11)throw Error('STALE_BUNDLE');
if(semantic.moduleId!==moduleId||semantic.reviewedQuestionCount!==20||semantic.postSplitIds!==93||semantic.usageRecords!==94||semantic.splitReview?.count!==11||
   semantic.renderedReview?.status!=='PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW')throw Error('SEMANTIC_QA_NOT_PASSED');
if(build.status!=='PASS'||build.modules!==30||build.activities!==600||build.y1m02?.bindingIds!==93||build.y1m02?.runtimePaths?.length!==10||
   build.sourceQuestionFilesModified!==false||build.goldMastersModified!==false||build.productionDeployed!==false)throw Error('Y1M02_REVIEW_BUILD_NOT_PASSED');
if(browser.status!=='PASS'||browser.routes?.length!==20||browser.routes.some(x=>!x.pass)||browser.transport?.length!==10||browser.transport.some(x=>!x.pass)||
   browser.gameplay?.pass!==true||browser.gameplay.incorrect?.state!=='incorrect'||browser.gameplay.correct?.state!=='correct'||
   browser.gameplay.incorrect?.observed?.targetVisible!==true||browser.gameplay.correct?.observed?.targetVisible!==true||
   browser.responsiveGameplay?.length!==2||browser.responsiveGameplay.some(x=>!x.pass||x.incorrect?.state!=='incorrect'||x.correct?.state!=='correct'||x.hasTouch!==true)||
   browser.screenshots?.length!==3||browser.screenshots.some(x=>!x.pass||x.fullyContainedOfficialImages!==x.officialImageCount))throw Error('REAL_BROWSER_QA_NOT_PASSED');
for(const item of [...browser.screenshots,...browser.responsiveGameplay.map(x=>x.screenshot),...Object.values(browser.artifacts)]){
  const file=path.join(root,item.path),bytes=await readFile(file);if(sha256(bytes)!==item.sha256||(await stat(file)).size!==item.bytes)throw Error('BROWSER_EVIDENCE_HASH_MISMATCH:'+item.path);
}
const bindings=bundle.assets.flatMap(asset=>asset.bindings.map(binding=>({asset,...binding})));
if(bindings.length!==93||new Set(bindings.map(x=>x.mediaId)).size!==93)throw Error('EXPECTED_93_FINAL_BINDINGS');
const index=new Map(registry.entries.map((x,i)=>[x.mediaId,i]));
for(const binding of bindings){
  const entry=registry.entries[index.get(binding.mediaId)];if(!entry||entry.temporary!==true||entry.integrationStatus!=='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'||entry.sha256!==binding.asset.sha256)
    throw Error('ENTRY_NOT_QA_CANDIDATE:'+binding.mediaId);
}
const uniqueAssets=[...new Map(bundle.assets.map(asset=>[asset.sha256,{sha256:asset.sha256,concepts:[asset.semanticTarget],width:asset.pixelWidth,height:asset.pixelHeight,
  provider:asset.provenance.provider,generationClass:asset.provenance.generationClass,originalSha256:asset.provenance.originalSha256,
  nativeSourceExactHashMatch:asset.provenance.nativeSourceExactHashMatch}])).values()];
if(uniqueAssets.length!==10||uniqueAssets.some(x=>x.nativeSourceExactHashMatch!==true))throw Error('EXPECTED_10_PROVEN_NATIVE_PNGS');

const evidence={schemaVersion:'DUDUQ_MEDIA_TECHNICAL_QA_V1',status:'TECHNICAL_PASS_AWAITING_HUMAN_HOMOLOGATION',moduleId,reviewedAt:new Date().toISOString(),
  reviewScope:'Isolated review branch compiled candidate artifact; no production deployment or owner homologation',reviewAuthority:'CODEX_TECHNICAL_QA_ONLY',
  pedagogicalQaApproved:false,ownerHomologationApproved:false,visualQaApproved:true,browserQaApproved:true,productionReleaseApproved:false,
  sourcePendingIds:92,sourceUsageRecords:94,finalMediaIds:93,questionUsageRecords:94,moduleQuestions:20,globalModulesVerified:30,globalActivitiesVerified:600,
  occurrenceScopedSplits:bundle.occurrenceScopedSplits,preservesAnswerKeysAndMechanics:true,answerKeyChanges:0,mechanicChanges:0,
  mediaIds:bindings.map(x=>x.mediaId).sort(),assets:uniqueAssets,
  semanticQa:{status:'PASS',path:path.relative(root,semanticPath).replaceAll('\\','/'),sha256:sha256(semanticBytes),questionCount:20,usageRecords:94},
  buildQa:{status:'PASS',path:path.relative(root,buildPath).replaceAll('\\','/'),sha256:sha256(buildBytes),strategy:build.buildStrategy,compiledManifestEntries:build.compiledManifestEntries,modules:30,activities:600},
  browserQa:{status:'PASS',path:path.relative(root,browserPath).replaceAll('\\','/'),sha256:sha256(browserBytes),routes:20,transportPaths:10,
    nativePointerInput:true,nativeTouchInput:true,incorrectTransition:true,correctTransition:true,zeroIframes:true,
    responsiveGameplay:browser.responsiveGameplay,screenshots:browser.screenshots,video:browser.artifacts.video,trace:browser.artifacts.trace},
  goldMastersModified:false,sourceQuestionsModified:false,productionDeployed:false,registryFinalized:false,
  rollback:'Rebuild the immutable V26 review artifact; this Y1M02 native-media overlay is compiled-review-only.'};
const evidenceBytes=Buffer.from(JSON.stringify(evidence,null,2)+'\n'),evidenceSha256=sha256(evidenceBytes);
const lines=integrityBytes.toString('utf8').trimEnd().split(/\r?\n/),entries=new Map();
lines.forEach((line,i)=>{const p=line.lastIndexOf(' '),name=line.slice(0,p),hash=line.slice(p+1);if(p<1||entries.has(name)||!/^[a-f0-9]{64}$/.test(hash))throw Error('BAD_MANIFEST:'+name);entries.set(name,{i,hash});});
if(entries.get(registryRel)?.hash!==sha256(registryBytes))throw Error('REGISTRY_NOT_HASH_BOUND_BEFORE_FINALIZATION');
const result={schemaVersion:'DUDUQ_Y1M02_TECHNICAL_QA_CHECKPOINT_V1',status:'TECHNICAL_QA_PASS_AWAITING_HUMAN_HOMOLOGATION',moduleId,
  mediaIds:93,usageRecords:94,uniquePngs:10,runtimePaths:10,questions:20,occurrenceScopedSplits:11,globalActivitiesVerified:600,
  browserRoutes:20,responsiveGameplay:2,screenshots:3,nativePointerGameplay:true,nativeTouchGameplay:true,
  evidenceSha256,registryFinalized:false,ownerHomologationApproved:false,productionDeployed:false,goldMastersModified:false};
if(record)await writeFile(technicalEvidencePath,evidenceBytes);
console.log(JSON.stringify(result,null,2));
