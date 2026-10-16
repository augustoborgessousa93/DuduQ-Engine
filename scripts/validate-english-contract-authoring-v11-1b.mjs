#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const load=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const source=await load('content/english/production/v11-1b/deterministic-activity-contracts.json');
const media=await load('content/english/production/v11-1b/media-requirements.json');
const audio=await load('content/english/production/v11-1b/audio-requirements.json');
const errors=[]; const contractIds=new Set(); const itemIds=new Set();
const placeholder=/(?:\bTBD\b|\bGENERIC\b|\bPLACEHOLDER\b|\bAUTO\b|ANSWER_1|OPTION_A|TARGET_X|<fill>|GROUP A|GROUP B|IMAGE_1|AUDIO_1)/i;
const required=['moduleId','itemId','questionId','curricularObjective','semanticType','taskType','targetSkill','mechanicId','visibleInstructionEn','supportInstructionPt','spokenInstructionPlan','targetContent','studentStimuli','correctAnswer','feedbackProfile','requiredMedia','requiredAudio','EnglishProcessingDemand','MechanicPedagogicalFit','answerLeakStatus','refinementFlags','contractStatus'];
const idsByModule=new Map();
for(const c of source.contracts) {
  const tag=`${c.moduleId}/${c.questionId}`;
  if(itemIds.has(c.itemId))errors.push(`${tag}:DUPLICATE_ITEM_ID`); itemIds.add(c.itemId);
  for(const key of required)if(c[key]===undefined||c[key]===null||c[key]==='')errors.push(`${tag}:MISSING_${key}`);
  if(!/^Y[2-5]M0[1-6]-Q0(0[1-9]|1[0-9]|20)$/.test(c.itemId))errors.push(`${tag}:INVALID_ID`);
  if(!c.requiredMedia?.length||!c.requiredAudio?.instruction?.length)errors.push(`${tag}:MEDIA_OR_AUDIO_REQUIREMENT_MISSING`);
  if(placeholder.test(JSON.stringify(c)))errors.push(`${tag}:PLACEHOLDER_PATTERN`);
  if(/^(?:0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20)$/.test(String(c.targetContent))===false&& !String(c.targetContent).trim())errors.push(`${tag}:EMPTY_TARGET`);
  const q=c.studentStimuli;
  if(['target-shooter','bubble-pop'].includes(c.mechanicId)) {
    if(!q.options?.length||!q.options.some(o=>o.optionId===q.correctOptionId&&o.isCorrect))errors.push(`${tag}:CHOICE_ANSWER_NOT_IN_OPTIONS`);
    if(q.options.filter(o=>o.isCorrect).length!==1)errors.push(`${tag}:CHOICE_NOT_EXACTLY_ONE_CORRECT`);
  } else if(c.mechanicId==='drag-drop-multimedia') {
    const src=new Set(q.items?.map(x=>x.itemId)||[]),dst=new Set(q.destinations?.map(x=>x.targetId)||[]);
    if(!q.mappings?.length||q.mappings.some(x=>!src.has(x.itemId)||!dst.has(x.targetId))||Object.keys(q.answerKey||{}).length!==q.mappings.length)errors.push(`${tag}:DDM_MAPPING_INVALID`);
  } else if(c.mechanicId==='drag-drop') {
    const groups=new Set(q.groups?.map(x=>x.groupId)||[]),items=q.items||[];
    if(groups.size<2||items.length<4||items.some(x=>!groups.has(x.groupId))||Object.keys(q.answerKey||{}).length!==items.length)errors.push(`${tag}:GROUPING_MAPPING_INVALID`);
  } else if(c.mechanicId==='matching') {
    if(!q.pairs?.length||q.pairs.some(p=>q.answerKey?.[p.left.id]!==p.right.id))errors.push(`${tag}:MATCHING_MAPPING_INVALID`);
  } else if(c.mechanicId==='memory-quest') {
    if(!q.pairs?.length||q.pairs.some(p=>p.cards?.length!==2||q.answerKey?.includes(p.pairId)!==true))errors.push(`${tag}:MEMORY_PAIRS_INVALID`);
  } else if(c.mechanicId==='smart-sentence-complete') {
    if(!q.blank?.tokenFound||q.blank.tokenIndex<0||!q.options?.includes(q.answerKey))errors.push(`${tag}:SENTENCE_BLANK_OR_ANSWER_INVALID`);
  } else if(c.mechanicId==='smart-sentence-order') {
    if(!q.canonicalOrder?.length||JSON.stringify(q.answerKey)!==JSON.stringify(q.canonicalOrder)||q.units.length!==q.canonicalOrder.length)errors.push(`${tag}:SENTENCE_ORDER_INVALID`);
  }
  if(c.requiredAudio.learnerTargets?.some(x=>x.semanticType==='LETTER'&&x.presentationModel!=='ISOLATED_ENGLISH_TARGET'))errors.push(`${tag}:LETTER_AUDIO_MODEL_INVALID`);
  idsByModule.set(c.moduleId,(idsByModule.get(c.moduleId)||0)+1);
}
if(source.contracts.length!==460)errors.push(`CONTRACT_COUNT:${source.contracts.length}/460`);
if(media.requirements?.length!==media.count||audio.requirements?.length!==audio.count)errors.push('MANIFEST_COUNT_MISMATCH');
if(new Set(media.requirements.map(x=>x.mediaConceptId)).size!==media.count)errors.push('DUPLICATE_MEDIA_CONCEPT_ID');
if(new Set(audio.requirements.map(x=>x.audioConceptId)).size!==audio.count)errors.push('DUPLICATE_AUDIO_CONCEPT_ID');
if([...idsByModule.entries()].length!==23||[...idsByModule.values()].some(n=>n!==20))errors.push('MODULE_ACTIVITY_COUNTS_INVALID');
const planChecks=[];
for(let y=2;y<=5;y++)for(let n=1;n<=6;n++){
  if(y===2&&n===1)continue;
  const p=await load(`content/english/planning/year-${y}/module-${String(n).padStart(2,'0')}.json`);
  if(p.currentActivityContracts?.length!==20)errors.push(`${p.moduleId}:PLAN_CONTRACTS_NOT_POPULATED`);
  planChecks.push({moduleId:p.moduleId,contracts:p.currentActivityContracts?.length||0});
}
const sample=[];
for(const moduleId of idsByModule.keys())for(const qid of ['Q001','Q010','Q020']){
  const c=source.contracts.find(x=>x.moduleId===moduleId&&x.questionId===qid);
  if(c)sample.push({moduleId,itemId:c.itemId,target:c.targetContent,answer:c.correctAnswer,distractors:c.distractors,mappings:c.studentStimuli.mappings||c.studentStimuli.pairs||c.studentStimuli.items||[],mechanic:c.mechanicId,mediaRequirement:c.requiredMedia,audioRequirement:c.requiredAudio});
}
const report={feature:'DUDUQ_ACTIVE_CONTENT_AUTHORING_V11_1B',status:errors.length?'ISSUE':'PASS',contracts:source.contracts.length,moduleCounts:Object.fromEntries(idsByModule),uniqueMediaRequirements:media.count,uniqueAudioRequirements:audio.count,assetFactorySummary:{existingMediaSemanticCandidates:media.requirements.filter(x=>x.assetDisposition==='EXISTING_SEMANTIC_CANDIDATE_REVIEW_REQUIRED').length,newMediaRequired:media.requirements.filter(x=>x.assetDisposition==='NEW_ASSET_REQUIRED').length,existingExactAudioCandidates:audio.requirements.filter(x=>x.assetDisposition==='EXISTING_EXACT_AUDIO_CANDIDATE').length,newAudioRequired:audio.requirements.filter(x=>x.assetDisposition==='NEW_AUDIO_REQUIRED').length},planningCorrections:source.planningCorrections||[],planChecks,validationErrors:errors,samples:sample};
const out='content/english/production/v11-1b/authoring-validation-and-samples.json';
await mkdir(path.dirname(path.join(root,out)),{recursive:true});
await writeFile(path.join(root,out),`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(JSON.stringify({status:report.status,contracts:report.contracts,modules:Object.keys(report.moduleCounts).length,media:media.count,audio:audio.count,errors:errors.length,firstErrors:errors.slice(0,35),sampleAuditRows:sample.length,output:out},null,2));
if(errors.length)process.exitCode=1;
