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
  sourceCandidates:matches.map(x=>({path:x.path,gitBlob:x.gitBlob,bytes:x.bytes,sha256:x.sha256??null})),
  reviewHold:/WHITE/i.test(id)?'WHITE_CONTRAST_UNVERIFIED':/BANANA/i.test(id)?'BANANA_TEMPORARY_AND_SEMANTIC_AUDIT':id==='IMG-Y1M03-Q001-BLACK'?'BLACK_SHARED_OCCURRENCE_REVIEW':null,
  safeToAutoApply:false,
  reason:!entry?'MISSING_REGISTRY_ENTRY':entry.temporary!==true?'NOT_EXPLICITLY_TEMPORARY':
    !same?'AMBIGUOUS_OR_MISSING_SEMANTIC':matches.length===0?'NO_EXACT_FILENAME_HINT':
    matches.length>1?'MULTIPLE_SOURCE_CANDIDATES':'SOURCE_IMAGE_UNINSPECTED_PEDAGOGICAL_AND_VISUAL_QA_REQUIRED'});
}
const black=records.find(x=>x.mediaId==='IMG-Y1M03-Q001-BLACK');
assert(black,'SHARED_BLACK_MEDIA_ID_NOT_FOUND');
const banana=records.filter(x=>/BANANA/i.test(x.mediaId));
const bananaRegistry=registry.entries.filter(x=>/banana/i.test(JSON.stringify(x))).map(x=>({
 mediaId:x.mediaId,temporary:x.temporary??null,temporaryFieldPresent:Object.prototype.hasOwnProperty.call(x,'temporary'),path:x.urlOrPath||null,
 referenced:usages.has(x.mediaId),questionIds:[...new Set((usages.get(x.mediaId)||[]).map(y=>y.questionId))]
}));
const bananaQuestionText=questions.filter(q=>/banana/i.test(JSON.stringify(q))).map(q=>({
 questionId:q.item_id,mechanicId:q.mechanicId,
 mediaIds:[...new Set([...JSON.stringify(q).matchAll(/(?:IMG|AUD)-[A-Z0-9-]+/g)].map(m=>m[0]))],
 rawBananaMentions:(JSON.stringify(q).match(/banana/gi)||[]).length
}));
const bananaUnreferenced=bananaRegistry.filter(x=>!x.referenced);
const bananaMissingTemporary=bananaRegistry.filter(x=>!x.temporaryFieldPresent);
const bananaNotExplicitTemporary=bananaRegistry.filter(x=>x.temporary!==true);
const bananaExplicitFalse=bananaRegistry.filter(x=>x.temporaryFieldPresent&&x.temporary===false);

const white=records.filter(x=>/WHITE/i.test(x.mediaId));
const candidate=records.filter(x=>x.exactFilenameHintPaths.length===1&&x.temporary===true&&x.missingSemanticQuestionIds.length===0);
const remainingTemporary=records.filter(x=>x.temporary===true);
const unresolvedBacklog=remainingTemporary.filter(x=>!candidate.includes(x)).map(x=>({
 mediaId:x.mediaId,questions:x.questions,occurrences:x.occurrences,
 semanticTargets:x.semanticTargets,reason:x.reason,reviewHold:x.reviewHold,
 sourceHintCount:x.sourceCandidates.length
}));
const heldCandidateIds=candidate.filter(x=>x.reviewHold!==null).map(x=>x.mediaId);
const reviewQueue=candidate.map(x=>({mediaId:x.mediaId,questions:x.questions,occurrences:x.occurrences,semanticTargets:x.semanticTargets,source:x.sourceCandidates[0],reviewHold:x.reviewHold,sha256Verified:false,visualApproved:false,pedagogicalApproved:false,eligibleForIntegration:false}));
const report={
 schemaVersion:'DUDUQ_PHASE2_DELTA_OCCURRENCE_AUDIT_V4',
 sourceCommit:source.sourceCommit,sourceAssets:assets.length,modules:30,contracts:600,
 registryEntries:registry.entries.length,mediaIdsReferenced:records.length,
 sharedMediaIds:records.filter(x=>x.questions.length>1).length,
 candidatesRequiringHumanReview:candidate.length,
 blackSharedActualOccurrences:black,
 bananaRecords:banana,bananaRegistry,bananaQuestionText,bananaUnreferenced,bananaMissingTemporary,bananaNotExplicitTemporary,bananaExplicitFalse,whiteRecords:white,
 candidates:candidate,reviewQueue,unresolvedBacklog,heldCandidateIds,remainingTemporaryCount:remainingTemporary.length,missingRegistryRecords:records.filter(x=>!x.registryPresent),
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
 candidateHints:report.candidatesRequiringHumanReview,remainingTemporary:report.remainingTemporaryCount,unresolvedBacklog:report.unresolvedBacklog.length,heldCandidates:report.heldCandidateIds.length,
 blackOccurrences:black.occurrences,blackQuestions:black.questions,
 bananaRecords:banana.length,bananaRegistry:bananaRegistry.length,bananaQuestionText:bananaQuestionText.length,bananaMissingTemporary:bananaMissingTemporary.length,bananaExplicitFalse:bananaExplicitFalse.length,bananaNotExplicitTemporary:bananaNotExplicitTemporary.length,whiteRecords:white.length,
 missingRegistry:report.missingRegistryRecords.length,
 productionDeployed:false,mediaIdsApplied:0
}));
