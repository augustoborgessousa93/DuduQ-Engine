#!/usr/bin/env node
/**
 * Read-only source inspection for the Y4M04 generation lane.
 * The only write is the module-local question-inventory.json report.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const moduleId='Y4M04';
const questionRel='dist-pages/content/english/year-4/module-04/questions.json';
const registryRel='dist-pages/content/english/media/media-registry.json';
const ledgerRel='qa/results/media-module-closure.json';
const outputPath=path.join(batchDir,'question-inventory.json');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const visibleRoots=['stimulus','options','targetsToFind','items','targets','groups','pairs','bubbleDistractorPool','dragDropContract'];

function collectVisualUsages(question){
  const records=[];
  function walk(node,field){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){
      node.forEach((value,index)=>walk(value,field+'['+index+']'));
      return;
    }
    const media=node.media&&typeof node.media==='object'?node.media:null;
    const mediaId=media?.mediaId??media?.assetId??node.mediaId??node.assetId??node.image_ref??node.imageRef??null;
    const semanticTarget=node.semanticTarget??media?.semanticTarget??null;
    if(typeof mediaId==='string'&&mediaId&&semanticTarget){
      records.push({
        questionId:question.item_id,
        mediaId,
        contractPath:field,
        role:media?.role??node.role??null,
        semanticTarget:normalize(semanticTarget),
        correct:node.correct??null,
        optionOrCardId:node.optionId??node.id??node.targetId??node.pairId??null
      });
      return;
    }
    for(const [key,value] of Object.entries(node)){
      if(value&&typeof value==='object')walk(value,field?field+'.'+key:key);
    }
  }
  for(const key of visibleRoots)walk(question[key],key);
  for(const [index,binding] of (question.mediaBindings||[]).entries()){
    if(!records.some(record=>record.mediaId===binding.mediaId)){
      records.push({
        questionId:question.item_id,
        mediaId:binding.mediaId,
        contractPath:'mediaBindings['+index+']',
        role:binding.role??null,
        semanticTarget:normalize(binding.semanticTarget),
        correct:null,
        optionOrCardId:binding.targetId??null
      });
    }
  }
  return records;
}

function collectAllSemanticTargets(question){
  const values=[];
  function walk(node){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){
      node.forEach(walk);
      return;
    }
    if(node.semanticTarget)values.push(normalize(node.semanticTarget));
    for(const value of Object.values(node))if(value&&typeof value==='object')walk(value);
  }
  walk(question);
  return [...new Set(values)].sort();
}

function contextMediaId(sourceMediaId,questionId,semanticTarget){
  const digest=sha256(Buffer.from(sourceMediaId+'|'+questionId+'|'+normalize(semanticTarget))).slice(0,12).toUpperCase();
  return 'IMG-'+questionId+'-CTX-'+digest;
}

const [questionBytes,registryBytes,ledgerBytes]=await Promise.all([
  readFile(path.join(root,questionRel)),
  readFile(path.join(root,registryRel)),
  readFile(path.join(root,ledgerRel))
]);
const questions=JSON.parse(questionBytes);
const registry=JSON.parse(registryBytes);
const ledger=JSON.parse(ledgerBytes);
if(questions.moduleId!==moduleId||questions.itemCount!==20||questions.items?.length!==20){
  throw Error('Y4M04_REQUIRES_EXACT_20_QUESTION_CONTRACT');
}
const expectedQuestionIds=Array.from({length:20},(_,index)=>moduleId+'-Q'+String(index+1).padStart(3,'0'));
if(JSON.stringify(questions.items.map(item=>item.item_id))!==JSON.stringify(expectedQuestionIds)){
  throw Error('Y4M04_QUESTION_SEQUENCE_DRIFT');
}
const ledgerModule=ledger.modulesDetail?.find(entry=>entry.moduleId===moduleId);
if(ledger.modules!==30||ledger.activities!==600||!ledgerModule){
  throw Error('Y4M04_CANONICAL_30x600_LEDGER_UNAVAILABLE');
}
const usages=questions.items.flatMap(collectVisualUsages);
const sourceMediaIds=[...new Set(usages.map(record=>record.mediaId))].sort();
const visualConcepts=[...new Set(usages.map(record=>record.semanticTarget))].sort();
const allSemanticTargets=[...new Set(questions.items.flatMap(collectAllSemanticTargets))].sort();
const nonVisualOnlySemanticTargets=allSemanticTargets.filter(concept=>!visualConcepts.includes(concept));
const registryById=new Map(registry.entries.map(entry=>[entry.mediaId,entry]));
const missingRegistryIds=sourceMediaIds.filter(mediaId=>!registryById.has(mediaId));
if(missingRegistryIds.length)throw Error('Y4M04_REGISTRY_ENTRIES_MISSING:'+missingRegistryIds.join(','));

const occurrenceGroups=[];
for(const sourceMediaId of sourceMediaIds){
  const sourceUsages=usages.filter(record=>record.mediaId===sourceMediaId);
  for(const questionId of [...new Set(sourceUsages.map(record=>record.questionId))]){
    const records=sourceUsages.filter(record=>record.questionId===questionId);
    const semanticTargets=[...new Set(records.map(record=>record.semanticTarget))];
    if(semanticTargets.length!==1){
      throw Error('Y4M04_CONTEXT_SEMANTIC_COLLISION:'+sourceMediaId+':'+questionId);
    }
    occurrenceGroups.push({
      sourceMediaId,
      questionId,
      semanticTarget:semanticTargets[0],
      plannedMediaId:contextMediaId(sourceMediaId,questionId,semanticTargets[0]),
      contractPaths:[...new Set(records.map(record=>record.contractPath))].sort(),
      roles:[...new Set(records.map(record=>record.role).filter(Boolean))].sort(),
      optionOrCardIds:[...new Set(records.map(record=>record.optionOrCardId).filter(Boolean))].sort()
    });
  }
}
occurrenceGroups.sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.sourceMediaId.localeCompare(b.sourceMediaId));

const questionInventory=questions.items.map(question=>{
  const questionUsages=usages.filter(record=>record.questionId===question.item_id);
  return {
    questionId:question.item_id,
    sourceSha256:sha256(Buffer.from(JSON.stringify(question))),
    mechanicId:question.mechanicId,
    mechanicMode:question.mechanicMode,
    titleEn:question.instruction?.titleEn??null,
    instructionEn:question.primaryInstructionEn??question.instruction?.instructionEn??null,
    stimulusTarget:question.stimulus?.target??null,
    answerKey:question.answerKey,
    allSemanticTargets:collectAllSemanticTargets(question),
    visualUsages:questionUsages
  };
});

let auditedAt=new Date().toISOString();
try{
  const previous=JSON.parse(await readFile(outputPath,'utf8'));
  if(previous.sourceQuestionSha256===sha256(questionBytes)&&
    previous.sourceRegistrySha256===sha256(registryBytes)&&
    previous.sourceLedgerSha256===sha256(ledgerBytes)){
    auditedAt=previous.auditedAt;
  }
}catch(error){
  if(error?.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;
}

const report={
  schemaVersion:'DUDUQ_Y4M04_QUESTION_INVENTORY_V1',
  auditedAt,
  moduleId,
  sourceQuestionFile:questionRel,
  sourceQuestionSha256:sha256(questionBytes),
  sourceRegistryFile:registryRel,
  sourceRegistrySha256:sha256(registryBytes),
  sourceLedgerFile:ledgerRel,
  sourceLedgerSha256:sha256(ledgerBytes),
  questionCount:questions.items.length,
  globalPendingMediaIds:ledger.distinctPendingMediaIds,
  moduleLedger:{
    referencedMediaIds:ledgerModule.referencedMediaIds,
    provisionalOrBlockedReferencedIds:ledgerModule.provisionalOrBlockedReferencedIds,
    unverifiedReferencedIds:ledgerModule.unverifiedReferencedIds,
    brokenReferencedIds:ledgerModule.brokenReferencedIds
  },
  visualUsageCount:usages.length,
  sourceMediaIds,
  sourceMediaIdCount:sourceMediaIds.length,
  visualConcepts,
  visualConceptCount:visualConcepts.length,
  allSemanticTargets,
  allSemanticTargetCount:allSemanticTargets.length,
  nonVisualOnlySemanticTargets,
  occurrenceScopedBindingPlanCount:occurrenceGroups.length,
  occurrenceGroups,
  questions:questionInventory,
  safety:{questionMutation:false,registryMutation:false,runtimeMutation:false,goldMasterMutation:false,productionMutation:false}
};
await writeFile(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
  status:'Y4M04_QUESTION_INVENTORY_COMPLETE',
  questions:report.questionCount,
  visualUsages:report.visualUsageCount,
  sourceMediaIds:report.sourceMediaIdCount,
  visualConcepts:report.visualConceptCount,
  allSemanticTargets:report.allSemanticTargetCount,
  nonVisualOnlySemanticTargets:report.nonVisualOnlySemanticTargets,
  occurrenceScopedBindings:report.occurrenceScopedBindingPlanCount,
  globalPendingMediaIds:report.globalPendingMediaIds
}));
