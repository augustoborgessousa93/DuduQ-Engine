#!/usr/bin/env node
/**
 * Convert a successfully reviewed two-module QA build into a persistent,
 * hash-audited distribution CANDIDATE. This never grants release approval,
 * changes source questions, accesses Cloudflare or deploys.
 *
 * Critical: drop the temporary inline QA-only HTML patch after proving the
 * identical tested mobile geometry is packaged as a versioned V27 Pages CSS.
 * Every modified compiled path is immediately rehashed in the manifest.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),dist=path.resolve(root,'dist-pages');
if(process.env.DUDUQ_QA_ONLY!=='1')throw Error('REQUIRES_QA_ONLY_RUNNER');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const load=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const reports=await Promise.all([
 load('qa/results/y1m04-official-media-finalization.json'),
 load('qa/results/y1m05-official-media-finalization.json'),
 load('qa/results/media-module-closure.json')
]);
const [m04,m05,closure]=reports;
assert.equal(m04.status,'OFFICIAL_MEDIA_QA_FINALIZED_ON_REVIEW_BRANCH');
assert.equal(m05.status,'OFFICIAL_MEDIA_QA_FINALIZED_ON_REVIEW_BRANCH');
assert.equal(m04.moduleId,'Y1M04');assert.equal(m05.moduleId,'Y1M05');
assert.equal(m04.mediaIds,84);assert.equal(m05.mediaIds,101);
assert.equal(m04.productionDeployed,false);assert.equal(m05.productionDeployed,false);
assert.equal(closure.modules,30);assert.equal(closure.activities,600);
assert.equal(closure.completedModules,2);
assert.deepEqual(closure.modulesDetail.filter(m=>m.complete).map(m=>m.moduleId).sort(),['Y1M04','Y1M05']);
assert.equal(closure.distinctVerifiedMediaIds,185);
assert.equal(closure.distinctPendingMediaIds,954);
assert.equal(closure.status,'INCOMPLETE');

const manifestName='.duduq-pages-manifest';
const manifestFile=path.join(dist,manifestName);
const manifestText=await readFile(manifestFile,'utf8');
const rows=manifestText.trimEnd().split(/\r?\n/);
const hashes=new Map();
for(let i=0;i<rows.length;i++){
 const pos=rows[i].lastIndexOf(' ');
 assert(pos>0,'BAD_MANIFEST_LINE');
 const relative=rows[i].slice(0,pos),sum=rows[i].slice(pos+1);
 assert(!relative.startsWith('/')&&!relative.includes('\\')&&!relative.split('/').includes('..'),'UNSAFE_COMPILED_PATH');
 assert(/^[a-f0-9]{64}$/.test(sum),'BAD_MANIFEST_SHA');
 assert(!hashes.has(relative),'DUPLICATE_MANIFEST_PATH');
 hashes.set(relative,{sha:sum,index:i});
}
const rel='play/target-shooter/index.html',record=hashes.get(rel);
assert(record,'TARGET_SHOOTER_NOT_IN_MANIFEST');
const htmlFile=path.join(dist,rel);
const before=await readFile(htmlFile);
assert.equal(sha(before),record.sha,'TARGET_SHOOTER_SOURCE_HASH');
const marker='data-duduq-review="target-shooter-mobile-hitbox-reflow-v2"';
const css=await readFile(path.join(root,'qa/overlays/target-shooter-mobile-hitbox-reflow-v2.css'),'utf8');
const injected='<style '+marker+'>\n'+css+'\n</style>\n';
const html=before.toString('utf8');
assert.equal(html.split(injected).length,2,'EXPECTED_EXACTLY_ONE_QA_ONLY_STYLE_INJECTION');
// V26 Pages and Canary Core R148 are separate output formats.
 // Do NOT invent a Canary manifest inside compiled Pages. Promote the exact
 // QA-tested mobile rules through a new versioned V27 Pages adapter instead.
const cssRel='core/adapters/v27/target-shooter-mobile-containment.css';
assert(!hashes.has(cssRel),'V27_ADAPTER_ALREADY_IN_COMPILED_MANIFEST');
const productCss=await readFile(path.join(root,cssRel));
const qaMedia=css.slice(css.indexOf('@media (max-width:520px)')).trim();
const productText=productCss.toString('utf8');
const productMedia=productText.slice(productText.indexOf('@media (max-width:520px)')).trim();
assert(qaMedia===productMedia,'V27_MOBILE_RULES_DIFFER_FROM_TESTED_QA');
for(const key of ['dog','cat','rabbit','fish']){
 const selector='.target-shooter-screen .target-shooter-target--'+key;
 assert(qaMedia.includes(selector),'TESTED_MOBILE_TARGET_RULE_MISSING:'+key);
}
const link='<link rel="stylesheet" href="/'+cssRel+'" data-duduq-release="v27-target-shooter-mobile">\n';
const compiled=html.replace(injected,link);
assert(!compiled.includes(marker),'QA_INJECTION_NOT_FULLY_REMOVED');
assert(compiled.split('data-duduq-release="v27-target-shooter-mobile"').length===2,'RELEASE_LINK_NOT_UNIQUE');
const targetCss=path.join(dist,cssRel);
await mkdir(path.dirname(targetCss),{recursive:true});
await writeFile(targetCss,productCss,{flag:'wx'});
await writeFile(htmlFile,compiled);
rows[record.index]=rel+' '+sha(Buffer.from(compiled));
rows.push(cssRel+' '+sha(productCss));
await writeFile(manifestFile,rows.join('\n')+'\n');
hashes.set(rel,{sha:sha(Buffer.from(compiled)),index:record.index});
hashes.set(cssRel,{sha:sha(productCss),index:rows.length-1});

// Check EVERY compiled asset referenced by the immutable manifest.
for(const [relative,expected] of hashes){
 const bytes=await readFile(path.join(dist,relative));
 assert.equal(sha(bytes),expected.sha,'COMPILED_FILE_TAMPERED:'+relative);
}
const registry=await load('dist-pages/content/english/media/media-registry.json');
const index=new Map(registry.entries.map(x=>[x.mediaId,x]));
const sourceIds=new Set();
for(const moduleId of ['Y1M04','Y1M05']){
 const evidence=await load('dist-pages/content/english/media/qa-evidence/'+moduleId.toLowerCase()+'-official-media-qa.json');
 assert.equal(evidence.moduleId,moduleId);
 assert.equal(evidence.status,'PASS');assert.equal(evidence.browserQaApproved,true);
 assert.equal(evidence.pedagogicalQaApproved,true);
 assert.equal(evidence.productionReleaseApproved,false);
 for(const id of evidence.mediaIds){
  assert(!sourceIds.has(id),'CROSS_MODULE_DUPLICATE_MEDIA_ID:'+id);
  sourceIds.add(id);
  const entry=index.get(id);
  assert(entry?.temporary===false,'MEDIA_NOT_VERIFIED:'+id);
  assert.equal(entry?.humanResolutionStatus,'PEDAGOGICAL_QA_APPROVED');
  assert.equal(hashes.get(entry.urlOrPath)?.sha,entry.sha256,'MEDIA_PNG_NOT_HASH_BOUND:'+id);
 }
}
assert.equal(sourceIds.size,185);
const report={
 schemaVersion:'DUDUQ_DISTRIBUTABLE_MEDIA_CANDIDATE_V1',
 status:'COMPILED_DISTRIBUTION_READY_FOR_RELEASE_GATES_NOT_APPROVED',
 sourceCommit:process.env.GITHUB_SHA||null,
 candidateManifestSha256:sha(await readFile(manifestFile)),
 manifestEntryCount:hashes.size,
 pagesFitAdapter:'v27-target-shooter-mobile',canaryR148IsSeparateArtifact:true,
 modules:30,activities:600,reviewedModules:['Y1M04','Y1M05'],
 sourceMediaIdsIntegrated:185,
 pendingMediaIds:954,
 qaOnlyInlineCssRemoved:true,
 mobileContainmentLoadedFromVersionedV27:true,
 semanticApprovalLimitedToReviewedModules:true,
 releaseApproved:false,productionDeployed:false,
 rollback:'Retain prior canonical production deployment; never promote without separate release gate.'
};
const out=path.join(root,'qa/results/duduq-distribution-candidate.json');
await mkdir(path.dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
