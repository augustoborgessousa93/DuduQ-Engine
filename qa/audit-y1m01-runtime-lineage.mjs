#!/usr/bin/env node
// Y1M01 actual deployed Pages source-of-truth: inspect the COMPILED route,
// not a legacy module-01.js file that is not published to Pages.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const file=rel=>path.join(root,rel);
const read=rel=>readFileSync(file(rel),'utf8');
const canonicalPath='content/english/year-1/module-01/questions.json';
const activePage='play/english/year-1/module-01/index.html';
const legacyScript='content/english/year-1/module-01/module-01.js';
const legacyHtml='content/english/year-1/module-01/index.html';
assert(existsSync(file(canonicalPath)),'COMPILED_20_QUESTIONS_FILE_MISSING');
assert(existsSync(file(activePage)),'COMPILED_MODULE_ROUTE_MISSING');
const content=JSON.parse(read(canonicalPath));
assert.equal(content.moduleId,'Y1M01','MISMATCHED_COMPILED_MODULE');
assert.equal(content.items?.length,20,'NOT_20_COMPILED_QUESTIONS');
const html=read(activePage);
assert(html.toLowerCase().includes('<!doctype html'),'COMPILED_ROUTE_INVALID_HTML');
assert(!existsSync(file(legacyScript)),'LEGACY_UNEXPECTEDLY_DEPLOYED_AS_ACTIVE_ASSET');
assert(!existsSync(file(legacyHtml)),'LEGACY_UNEXPECTEDLY_DEPLOYED_AS_ACTIVE_PAGE');
const scriptRefs=[...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
 .map(m=>m[1]);
const htmlExcerpt=html.slice(0,4000);
const report={
 schema:'DUDUQ_Y1M01_REAL_DEPLOYED_SOURCE_LINEAGE_V2',
 status:'COMPILED_ROUTE_AND_20_JSON_PRESENT_LEGACY_12_NOT_PUBLISHED',
 module:'Y1M01',qaOnly:true,productionDeployed:false,
 deployedRoutePath:activePage,
 deployedContractPath:canonicalPath,
 deployedQuestions:content.items.length,
 questionIds:content.items.map(x=>x.item_id),
 staticScriptReferences:scriptRefs,
 legacy12QuestionScriptPresentInSourceRepo:true,
 legacy12QuestionScriptPresentInCandidate:false,
 legacyPagePresentInCandidate:false,
 actualRouteExists:true,
 routeHtmlExcerpt:htmlExcerpt,
 correctConclusion:'The published candidate contains /play/english/... route and its 20-question JSON, NOT legacy content/module-01.js. Do not claim the legacy 12-question runtime is active.',
 unresolvedProof:'Q003/Q004 deep-link screenshot probes find 0 daypart images even though 14/14 PNG HTTP and decode checks pass. This may be page navigation or test routing; gameplay session validation is pending.',
 productionReady:false,
 blockers:['Q003_Q004_ACTUAL_SESSION_VISUAL_NOT_PROVEN','HUMAN_PEDAGOGICAL_REVIEW_PENDING','22_PROVISIONAL_MEDIA_IDS']
};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/y1m01-runtime-lineage.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_Y1M01_RUNTIME_LINEAGE='+JSON.stringify({
 status:report.status,activePage,compiledQuestions:20,
 legacyScriptInDeployedBuild:false,scriptRefs,
 sourceOfTruth:'COMPILED_20_QUESTION_JSON',productionReady:false
}));
if(process.env.DUDUQ_REQUIRE_RUNTIME_SESSION_VISUAL==='1')
 assert.fail('RELEASE_BLOCKED_Q003_Q004_LIVE_SESSION_RENDER_AND_PEDAGOGICAL_QA_PENDING');
