#!/usr/bin/env node
/**
 * Source delta -> exact occurrence inventory for the archived 127-ID candidate.
 * Run against qa/dist-pages-food-candidate, never production. No writes to game.
 * Filename hints are not pedagogical certification.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
const root=path.resolve(process.env.DUDUQ_QA_DIST||'qa/dist-pages-food-candidate');
const source=JSON.parse(await readFile('docs/qa/media-audit-20261029/phase2-source-head-delta-20261103.json','utf8'));
const registry=JSON.parse(await readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,registry.entries.length,'DUPLICATE_MEDIA_IDS');
const usages=new Map(),questions=[];
for(let year=1;year<=5;year++)for(let m=1;m<=6;m++){
 const module=String(m).padStart(2,'0');
 const p=path.join(root,'content/english/year-'+year+'/module-'+module+'/questions.json');
 const doc=JSON.parse(await readFile(p,'utf8'));
 assert.equal(doc.items.length,20,'QUESTION_COUNT_DRIFT:'+p);
 for(const q of doc.items){questions.push(q);collectQuestionMediaUsages(q,usages)}
}
assert.equal(questions.length,600,'CONTRACT_COUNT_DRIFT');
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/\.(png|jpg|webp)$/,'').replace(/\s+[—–-]\s+.*$/,'').replace(/[^a-z0-9]+/g,' ').trim();
const assets=source.assets.map(x=>({...x,conceptHint:normalize(path.basename(x.path))}));
const records=[];
for(const [id,rows] of usages){
 const entry=byId.get(id);
 const semantics=[...new Set(rows.map(x=>x.semanticTarget).filter(Boolean))];
 const absent=rows.filter(x=>!x.semanticTarget).map(x=>x.questionId);
 const same=semantics.length===1&&absent.length===0;
 const matches=assets.filter(a=>same&&a.conceptHint===normalize(semantics[0]));
 records.push({mediaId:id,temporary:entry?.temporary??null,
  registryPresent:!!entry,registryPath:entry?.urlOrPath||null,
  questions:[...new Set(rows.map(x=>x.questionId))].sort(),
  occurrences:rows.length,semanticTargets:semantics,missingSemanticQuestionIds:[...new Set(absent)].sort(),
  exactFilenameHintPaths:matches.map(x=>x.path),
  safeToAutoApply:false,
  reason:!entry?'MISSING_REGISTRY_ENTRY':entry.temporary!==true?'NOT_EXPLICITLY_TEMPORARY':
    !same?'AMBIGUOUS_OR_MISSING_SEMANTIC':matches.length===0?'NO_EXACT_FILENAME_HINT':
    matches.length>1?'MULTIPLE_SOURCE_CANDIDATES':'SOURCE_IMAGE_UNINSPECTED_PEDAGOGICAL_AND_VISUAL_QA_REQUIRED'});
}
const black=records.find(x=>x.mediaId==='IMG-Y1M03-Q001-BLACK');
assert(black,'SHARED_BLACK_MEDIA_ID_NOT_FOUND');
const banana=records.filter(x=>/BANANA/i.test(x.mediaId));
const white=records.filter(x=>/WHITE/i.test(x.mediaId));
const candidate=records.filter(x=>x.exactFilenameHintPaths.length===1&&x.temporary===true&&x.missingSemanticQuestionIds.length===0);
const report={
 schemaVersion:'DUDUQ_PHASE2_DELTA_OCCURRENCE_AUDIT_V1',
 sourceCommit:source.sourceCommit,sourceAssets:assets.length,modules:30,contracts:600,
 registryEntries:registry.entries.length,mediaIdsReferenced:records.length,
 sharedMediaIds:records.filter(x=>x.questions.length>1).length,
 candidatesRequiringHumanReview:candidate.length,
 blackSharedActualOccurrences:black,
 bananaRecords:banana,whiteRecords:white,
 candidates:candidate,missingRegistryRecords:records.filter(x=>!x.registryPresent),
 missingSemanticRecords:records.filter(x=>x.missingSemanticQuestionIds.length),
 mediaIdsApplied:0,productionDeployed:false,releaseApproved:false,
 rule:'Exact filename hint is NOT proof. Do not apply until source PNG SHA256, complete occurrence semantics, contrast and mechanic browser QA are approved.'
};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-source-delta-occurrence-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('PHASE2_DELTA_OCCURRENCE_AUDIT='+JSON.stringify({
 sourceCommit:report.sourceCommit,sourceAssets:report.sourceAssets,
 modules:report.modules,contracts:report.contracts,
 referenced:report.mediaIdsReferenced,shared:report.sharedMediaIds,
 candidateHints:report.candidatesRequiringHumanReview,
 blackOccurrences:black.occurrences,blackQuestions:black.questions,
 bananaRecords:banana.length,whiteRecords:white.length,
 missingRegistry:report.missingRegistryRecords.length,
 productionDeployed:false,mediaIdsApplied:0
}));
