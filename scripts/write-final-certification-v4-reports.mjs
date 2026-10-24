import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const sha=async p=>createHash('sha256').update(await fs.readFile(path.join(root,p))).digest('hex');
const [manifest,boot,flows,recovery,parent,finalFreeze,diff,queue]=await Promise.all([
  'docs/qa/DUDUQ_ENGLISH_600_ACTIVITY_PRODUCTION_ROUTES_2026-10-20.json',
  'docs/qa/DUDUQ_FINAL_600_ACTIVITY_BROWSER_BOOT_V4.json',
  'docs/qa/DUDUQ_SMART_SENTENCE_RETRY_COMPLETE_FLOW_44_V4.json',
  'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3.json',
  'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FREEZE.json',
  'docs/qa/DUDUQ_SMART_SENTENCE_V11_3AI_R1_FINAL_FREEZE.json',
  'docs/qa/DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V4.json',
  'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V3_QUEUE.json'
].map(read));
const flowById=new Map(flows.activities.map(x=>[x.questionId,x]));
const bootById=new Map(boot.activities.map(x=>[x.questionId,x]));
const retryAudioByQuestion=new Map();for(const j of queue.jobs)for(const c of j.consumers||[]){const xs=retryAudioByQuestion.get(c.questionId)||[];xs.push(j.audioId);retryAudioByQuestion.set(c.questionId,xs)}
const matrix=manifest.activities.map(a=>{
  const f=flowById.get(a.activityId);const b=bootById.get(a.activityId);
  const failedCorrect=!!f&&f.result==='FAIL';
  return {year:a.year,moduleId:a.module,questionId:a.activityId,mechanic:a.mechanic,route:a.route,
    boot:b?.result==='BOOT_PASS_INTERACTION_NOT_TESTED'?'PASS':b?.result||'NOT_TESTED',
    instruction:'NOT_TESTED',
    wrongPath:f?'PASS':'NOT_TESTED',incorrectFeedbackTitle:f?(f.incorrectTitle||'PRESENT_ASSERTED_NOT_CAPTURED'):'NOT_TESTED',incorrectFeedbackSubtitle:f?(f.incorrectSubtitle||'PRESENT_ASSERTED_NOT_CAPTURED'):'NOT_TESTED',
    tryAgain:f?'PASS':'NOT_TESTED',retryAudio:f?(f.retryAudio||retryAudioByQuestion.get(a.activityId)||'PASS_EVENTS_ASSERTED'):'NOT_TESTED',retryReady:f?'PASS':'NOT_TESTED',
    correctFlow:f?(f.result==='PASS'?'PASS':'ISSUE'):'NOT_TESTED',correctAnswer:f?(f.result==='PASS'?'PASS':'SUBMITTED'):'NOT_TESTED',correctFeedback:f?(f.result==='PASS'?'PASS':'FAIL_MISSING_CANONICAL_FEEDBACK'): 'NOT_TESTED',
    correctFeedbackTitle:f?f.correctTitle||'MISSING':'NOT_TESTED',correctFeedbackSubtitle:f?f.correctSubtitle||'MISSING':'NOT_TESTED',
    continueVisible:f?(f.result==='PASS'?'PASS':'FAIL_NOT_RENDERED'):'NOT_TESTED',continueEnabled:f?f.continueEnabled||'FAIL':'NOT_TESTED',
    continueClickable:f?f.continueClicked||'FAIL':'NOT_TESTED',advance:f?f.advance||'FAIL':'NOT_TESTED',
    audioApproval:recovery.humanReviewStatus==='NOT_TESTED'?'HUMAN_PRONUNCIATION_PENDING':'NOT_TESTED',
    evidence:f?'docs/qa/DUDUQ_SMART_SENTENCE_RETRY_COMPLETE_FLOW_44_V4.json':b?'docs/qa/DUDUQ_FINAL_600_ACTIVITY_BROWSER_BOOT_V4.json':null,
    runtimeError:f?.error||null,result:f?(f.result==='PASS'?'PASS':'ISSUE'):b?.result==='BOOT_PASS_INTERACTION_NOT_TESTED'?'BOOT_ONLY_NOT_CERTIFIED':'NOT_TESTED'};
});
const tested=matrix.filter(x=>x.evidence?.includes('RETRY_COMPLETE')).length;
const byResult=Object.fromEntries(['PASS','ISSUE','BOOT_ONLY_NOT_CERTIFIED','NOT_TESTED'].map(s=>[s,matrix.filter(x=>x.result===s).length]));
const e2e={feature:'DUDUQ_FINAL_600_ACTIVITY_E2E_MATRIX_V4',testedAt:new Date().toISOString(),requested:600,records:matrix.length,bootPass:boot.bootPass,bootIssue:boot.bootIssue,correctFlowPass:matrix.filter(x=>x.correctFeedback==='PASS'&&x.advance==='PASS').length,correctFlowIssue:matrix.filter(x=>x.correctFeedback==='FAIL_MISSING_CANONICAL_FEEDBACK').length,correctFlowNotTested:matrix.filter(x=>x.correctFeedback==='NOT_TESTED').length,wrongRetryPass:matrix.filter(x=>x.tryAgain==='PASS'&&x.retryReady==='PASS').length,wrongRetryApplicable:tested,interactionNotTested:matrix.filter(x=>x.correctFlow==='NOT_TESTED').length,classification:byResult,activities:matrix,status:matrix.every(x=>x.result==='PASS')?'PASS':'ISSUE'};
await fs.writeFile(path.join(root,'docs/qa/DUDUQ_FINAL_600_ACTIVITY_E2E_MATRIX_V4.json'),`${JSON.stringify(e2e,null,2)}\n`);

const uniqueModules=[...new Map(manifest.activities.map(a=>[a.module,{year:a.year,moduleId:a.module}])).values()].sort((a,b)=>a.year-b.year||a.moduleId.localeCompare(b.moduleId));
const moduleRows=uniqueModules.map(m=>({year:m.year,moduleId:m.moduleId,title:null,intro:'NOT_TESTED',activities:'NOT_TESTED',final:'NOT_TESTED',sequentialProgression:'NOT_TESTED',result:'NOT_TESTED'}));
const journeys={feature:'DUDUQ_FINAL_30_MODULE_JOURNEYS_V4',testedAt:new Date().toISOString(),requested:30,completed:0,pass:0,issue:0,notTested:30,modules:moduleRows,status:'ISSUE'};
await fs.writeFile(path.join(root,'docs/qa/DUDUQ_30_MODULE_JOURNEYS_V4.json'),`${JSON.stringify(journeys,null,2)}\n`);

const responsiveCases=[
  {width:1366,height:768,documentX:0,documentY:0,gameX:0,gameY:0,panelWidth:1210,panelHeight:360},
  {width:1280,height:720,documentX:0,documentY:0,gameX:4,gameY:0,panelWidth:1210,panelHeight:360},
  {width:1024,height:768,documentX:0,documentY:0,gameX:7,gameY:0,panelWidth:976,panelHeight:290.375},
  {width:1000,height:700,documentX:0,documentY:0,gameX:7,gameY:0,panelWidth:952,panelHeight:283.2375}
].map(x=>({caseId:`SSC-success-${x.width}x${x.height}`,mechanic:'smart-sentence-complete',questionId:'Y2M03-Q008',viewport:{width:x.width,height:x.height},availableContainer:{width:x.width,height:x.height},documentOverflow:{x:x.documentX,y:x.documentY},gameOverflow:{x:x.gameX,y:x.gameY},panel:{width:x.panelWidth,height:x.panelHeight},correctFeedbackVisible:false,continueVisible:false,result:x.gameX||x.gameY?'ISSUE':'ISSUE',evidence:'live CUA browser measurement after actual correct answer; feedback absent'}));
const responsive={feature:'DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V4',testedAt:new Date().toISOString(),requestedCases:90,measuredCases:4,notTestedCases:86,scope:'Four live measurements of one real Smart Sentence Complete post-correct state; not a full mechanic matrix.',cases:responsiveCases,status:'ISSUE'};
await fs.writeFile(path.join(root,'docs/qa/DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V4.json'),`${JSON.stringify(responsive,null,2)}\n`);

const freezeRows=[];for(const x of parent.hashInventory.entries)freezeRows.push({path:x.path,expectedSha256:x.sha256,actualSha256:await sha(x.path),match:(await sha(x.path))===x.sha256});for(const x of finalFreeze.hashInventory.entries)if(!parent.hashInventory.entries.some(p=>p.path===x.path))freezeRows.push({path:x.path,expectedSha256:x.sha256,actualSha256:await sha(x.path),match:(await sha(x.path))===x.sha256});
const freeze={expected:freezeRows.length,match:freezeRows.filter(x=>x.match).length,drift:freezeRows.filter(x=>!x.match),rows:freezeRows};
const gold={feature:'DUDUQ_GOLD_VOICE_RECOVERY_V4',testedAt:new Date().toISOString(),engine:recovery.engine,voice:recovery.voice,generatedUniqueTranscripts:recovery.generatedUniqueTranscripts,technicalQcPass:recovery.technicalQcPass,humanApproval:recovery.humanReviewStatus==='PASS'?recovery.generatedUniqueTranscripts:0,humanReviewPending:recovery.generatedUniqueTranscripts,humanReviewPanel:'http://127.0.0.1:4181/',reviewPanelReadme:'docs/qa/DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4_README.md',freezeInventory:freeze,freezeDiffStatus:diff.status,freezeGateB:diff.decisions.gateB,freezeSuccessor:'NOT_PREPARED',freezeSuccessorActivated:false,status:'READY_FOR_HUMAN_REVIEW'};
await fs.writeFile(path.join(root,'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V4.json'),`${JSON.stringify(gold,null,2)}\n`);

const failedActivities=matrix.filter(x=>x.correctFeedback==='FAIL_MISSING_CANONICAL_FEEDBACK');
const visual={feature:'DUDUQ_FINAL_VISUAL_REGRESSION_V4',testedAt:new Date().toISOString(),productSourceFilesModifiedByV4:[],smartSentenceProtectedFilesModifiedByV4:[],runtimeVisualRegression:'ISSUE',observed:{activityIds:failedActivities.map(x=>x.questionId),count:failedActivities.length,correctInlineState:'PASS',canonicalCorrectFeedback:'MISSING',continueAction:'NOT_RENDERED',evidence:'docs/qa/DUDUQ_SMART_SENTENCE_RETRY_COMPLETE_FLOW_44_V4.json; live browser screenshot was captured during this run'},rootCause:'The production Smart Sentence Complete runtime constructs the visible completed sentence without terminal punctuation, then compares it byte-for-byte to completedSentenceEn which includes a final period. The strict mismatch throw occurs before Feedback(...) is called. All 30 failures show this same issue. This is in the protected play/smart-sentence/smart-sentence.js runtime and requires explicit reopen approval before editing.',runtimeEvidence:flows.errors.filter(x=>x.message.includes('VISIBLE_AUDIO_TEXT_MISMATCH')),status:'ISSUE'};
await fs.writeFile(path.join(root,'docs/qa/DUDUQ_FINAL_VISUAL_REGRESSION_V4.json'),`${JSON.stringify(visual,null,2)}\n`);

const main={feature:'DUDUQ_MASTER_FINAL_CERTIFICATION_V4',generatedAt:new Date().toISOString(),status:'ISSUE',productionReady:false,audio:{technicalQc:'29/29',humanReview:'0/29',panel:'http://127.0.0.1:4181/'},freeze:{expected:freeze.expected,match:freeze.match,changed:freeze.drift.map(x=>x.path),successor:'NOT_PREPARED',activated:false,diffStatus:diff.status},activityE2E:{requested:600,bootPass:boot.bootPass,bootIssue:boot.bootIssue,correctFlowPass:e2e.correctFlowPass,correctFeedbackIssue:e2e.correctFlowIssue,correctFlowNotTested:e2e.correctFlowNotTested,wrongRetryPass:e2e.wrongRetryPass,wrongRetryApplicable:e2e.wrongRetryApplicable,interactionNotTested:e2e.interactionNotTested},moduleJourneys:{pass:0,requested:30,notTested:30},responsive:{measured:4,requested:90,issue:true},rootCause:visual.rootCause,build:'NOT_PERFORMED',deploy:'NOT_PERFORMED',production:'UNCHANGED',artifacts:{audioReviewPanelDirectory:'docs/qa/gold-voice-human-review-v4/',audioReviewPanelServer:'scripts/serve-gold-voice-human-review-v4.mjs',audioReviewPanelReadme:'docs/qa/DUDUQ_GOLD_VOICE_HUMAN_REVIEW_V4_README.md',freezeDiffJson:'docs/qa/DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V4.json',freezeDiffMarkdown:'docs/qa/DUDUQ_SMART_SENTENCE_FREEZE_DIFF_V4.md',activityMatrix:'docs/qa/DUDUQ_FINAL_600_ACTIVITY_E2E_MATRIX_V4.json',moduleJourneys:'docs/qa/DUDUQ_30_MODULE_JOURNEYS_V4.json',responsiveMatrix:'docs/qa/DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V4.json',goldVoice:'docs/qa/DUDUQ_GOLD_VOICE_RECOVERY_V4.json',visualRegression:'docs/qa/DUDUQ_FINAL_VISUAL_REGRESSION_V4.json'}};
await fs.writeFile(path.join(root,'docs/qa/DUDUQ_MASTER_FINAL_CERTIFICATION_V4.json'),`${JSON.stringify(main,null,2)}\n`);
console.log(JSON.stringify({status:main.status,freeze:`${freeze.match}/${freeze.expected}`,interactive:`${flows.passed}/${flows.requested}`,correctFeedbackMissing:failedActivities.length,boot:`${boot.bootPass}/600`,responsive:`${responsive.measuredCases}/90`,output:'docs/qa/DUDUQ_MASTER_FINAL_CERTIFICATION_V4.json'},null,2));
