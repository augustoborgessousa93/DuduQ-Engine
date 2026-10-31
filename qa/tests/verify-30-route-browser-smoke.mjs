#!/usr/bin/env node
/** Hard gate for 30 curricular entrypoint routes x 3 Chromium viewports.
 * The producer may run with continue-on-error to retain screenshots, but a
 * release must never interpret that diagnostic as a passing 90-route check.
 * This does NOT certify question identity, gameplay, or pedagogy.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const file=process.argv[2]||'qa/results/media-browser-qa/report.json';
const report=JSON.parse(await readFile(file,'utf8'));
const modules=Array.from({length:5},(_,i)=>i+1).flatMap(y=>Array.from({length:6},(_,j)=>'Y'+y+'M'+String(j+1).padStart(2,'0')));
const views=['desktop-1366x768','tablet-768x1024','mobile-390x844'];
assert.equal(report.schemaVersion,'DUDUQ_MEDIA_BROWSER_CANDIDATE_SMOKE_V1');
assert.equal(report.actualBrowser,'PLAYWRIGHT_CHROMIUM');
assert.equal(report.mode,'QA_ONLY_NON_PRODUCTION');
assert.deepEqual([...report.modules].sort(),[...modules].sort(),'30 modules not audited');
assert.deepEqual([...report.viewports].sort(),[...views].sort(),'3 viewports not audited');
assert.equal(report.checks,90,'not all 90 route/viewport checks were executed');
assert.equal(report.passes,90,'not all 90 route/viewport checks passed');
assert.equal(report.failures,0,'one or more curricular entrypoints failed');
assert.equal(report.mediaPendingChecks,0,'visible image sources are missing or broken');
assert.equal(report.status,'ENTRYPOINT_PASS_MEDIA_QA_NOT_CERTIFIED');
assert.equal(report.integratedImageQA,false,'entrypoint smoke cannot certify imported images');
assert.equal(report.pedagogicalQAApproved,false,'entrypoint smoke cannot approve pedagogy');
assert.equal(report.gameplayCertified,false,'entrypoint smoke cannot certify gameplay');
assert.equal(report.results.length,90);
const seen=new Set();
for(const r of report.results){
  assert(modules.includes(r.moduleId),'unexpected module: '+r.moduleId);
  assert(views.includes(r.viewport),'unexpected viewport: '+r.viewport);
  const key=r.moduleId+'/'+r.viewport;
  assert(!seen.has(key),'duplicate route/viewport: '+key);seen.add(key);
  assert.equal(r.boot,'PASS',key+' boot did not pass');
  assert.equal(r.httpStatus,200,key+' did not return HTTP 200');
  assert.equal(r.introStartClicked,true,key+' never reached a visible start action');
  assert.equal(r.imageQaStatus,'NOT_CERTIFIED',key+' has a visible media failure');
  assert.equal(r.visibleEmptyImageSources,0,key+' has a visible image without src');
  assert.equal(r.after?.brokenVisibleImages?.length,0,key+' has a broken image');
  assert.equal(r.pageErrors?.length,0,key+' has a page error');
  assert.equal(r.httpFailures?.length,0,key+' has an HTTP failure');
  assert.equal(r.networkFailures?.length,0,key+' has a network failure');
}
assert.equal(seen.size,90);
console.log(JSON.stringify({status:'PASS_30_CURRICULAR_ENTRYPOINTS_3_VIEWPORTS',modules:30,views:3,checks:90,
  scope:'ENTRYPOINT_BOOT_AND_MEDIA_TRANSPORT_ONLY',gameplayCertified:false,pedagogicalQAApproved:false},null,2));
