#!/usr/bin/env node
// DUDUQ English Y1M01 release safety gate: source-of-truth parity.
// The content served by /content/english/year-1/module-01/index.html
// loads module-01.js, not questions.json. Compare actual declared steps.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const read=p=>readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const html=read('content/english/year-1/module-01/index.html');
const moduleSource=read('content/english/year-1/module-01/module-01.js');
const canonical=json('content/english/year-1/module-01/questions.json');
assert(html.includes('contentScript: "./module-01.js?'),'ACTIVE_MODULE_JS_LINK_NOT_FOUND');
assert(html.includes('duduq-loader-v1.js'),'PLAYER_LOADER_LINK_NOT_FOUND');
assert.equal(canonical.moduleId,'Y1M01');
assert.equal(canonical.items.length,20);
const runtimeQuestions=[...moduleSource.matchAll(/\bid:\s*["'](EN1-M1-\d{2})["']/g)]
 .map(x=>x[1]);
const runtimeVariableDeclarations=[...moduleSource.matchAll(/\bconst\s+(q\d{2})\s*=\s*(targetQuestion|audioChoiceDragQuestion)\s*\(/g)]
 .map(x=>({id:x[1],mechanic:x[2]}));
assert.equal(runtimeQuestions.length,runtimeVariableDeclarations.length,
 'RUNTIME_Q_DEFINITION_COUNT_MISMATCH');
assert.equal(new Set(runtimeQuestions).size,runtimeQuestions.length,
 'RUNTIME_DUPLICATE_Q_IDS');
const activitySections=[...moduleSource.matchAll(/\bid:\s*["'](Y1-M01-A\d{2})["']/g)]
 .map(x=>x[1]);
const references=[...moduleSource.matchAll(/\bquestions:\s*\[([^\]]+)\]/g)]
 .flatMap(x=>x[1].split(',').map(v=>v.trim()).filter(v=>/^q\d{2}$/.test(v)));
const missingDefinitions=references.filter(x=>!runtimeVariableDeclarations.some(y=>y.id===x));
assert.equal(missingDefinitions.length,0,'RUNTIME_REFERENCES_UNDECLARED_Q');
const runtimeMediaKeys=[...new Set([...moduleSource.matchAll(/\bimageItem\(\s*["'][^"']+["']\s*,\s*["']([^"']+)["']/g)]
 .map(x=>x[1]))];
const canonicalIds=canonical.items.map(x=>x.item_id);
const runtimeIds=runtimeQuestions;
const runtimeIdsAreDifferent=!runtimeIds.every((id,i)=>canonicalIds[i]===id);
const countParity=canonicalIds.length===runtimeIds.length;
const activePath='content/english/year-1/module-01/module-01.js';
const canonicalPath='content/english/year-1/module-01/questions.json';
const releaseReady=countParity&&!runtimeIdsAreDifferent;
const report={
 schema:'DUDUQ_Y1M01_RUNTIME_SOURCE_PARITY_V1',
 status:releaseReady?'PARITY_CONFIRMED':'BLOCKED_SEPARATE_RUNTIME_CONTRACTS',
 module:'Y1M01',releasedToProduction:false,
 actualPage:'content/english/year-1/module-01/index.html',
 actualScriptLoaded:activePath,
 separatelyAuditedContract:canonicalPath,
 runtimeDeclaredQuestions:runtimeIds.length,
 canonicalDeclaredQuestions:canonicalIds.length,
 runtimeActivities:activitySections.length,
 runtimeReferencedQuestions:references.length,
 uniqueRuntimeImageKeys:runtimeMediaKeys.length,
 runtimeQuestionIDs:runtimeIds,
 canonicalQuestionIDs:canonicalIds,
 questionIdsCompatible:!runtimeIdsAreDifferent,
 runtimeQuestionList:runtimeVariableDeclarations,
 runtimeMediaKeys,
 auditedImageChangesGuaranteedVisibleInLivePlayer:false,
 releaseBlocked:!releaseReady,
 nextCorrectiveAction:'Audit how the active module-01.js and questions.json are composed; align the actual player question contracts without changing curricula, answers or Gold Masters. Revalidate active navigation and pedagogical scenes after aligning sources.'
};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/y1m01-runtime-lineage.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_Y1M01_RUNTIME_LINEAGE='+JSON.stringify({
 status:report.status,runtime:report.runtimeDeclaredQuestions,
 canonical:report.canonicalDeclaredQuestions,
 runtimeActivities:report.runtimeActivities,
 releasedToProduction:false,releaseBlocked:report.releaseBlocked
}));
if(process.env.DUDUQ_REQUIRE_RUNTIME_PARITY==='1')
 assert.equal(releaseReady,true,
  'RELEASE_BLOCKED_SOURCE_OF_TRUTH_MISMATCH_Y1M01_RUNTIME_12_VS_CANONICAL_20');
