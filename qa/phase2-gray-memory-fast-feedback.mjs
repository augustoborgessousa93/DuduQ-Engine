#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_REQUIRED');
const preview=process.argv.includes('--preview'), release=process.argv.includes('--release');
assert(preview!==release,'SELECT_PREVIEW_OR_RELEASE');
const root=path.resolve('dist-pages'), fp=p=>path.join(root,p);
const digest=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const registryRel='content/english/media/media-registry.json';
const memoryRel='play/memory-quest/memory-quest.js';
const baselineRegistrySha='d9c4c31c4764c5a8a42cc99be0b29259a128ae1971d32855af89067304465dab';
const sourceCommit='038c7191a324beaf0a04842eff6dba5d71277701';
const sourceGitBlob='64a278da3c6333064650a144fd700f187a745b07';
const sourcePath='Imagens Ilustrativa/Color_Cinza_Grey.png';
const srcURL='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+sourceCommit+'/Imagens%20Ilustrativa/Color_Cinza_Grey.png';
const expectedIds=['IMG-Y1M03-Q006-GRAY','IMG-Q009-GRAY','IMG-Q019-GRAY','IMG-Y1M03-Q007-GRAY','IMG-Y1M03-Q012-GRAY','IMG-Y1M03-Q013-GRAY','IMG-Y1M03-Q014-GRAY','IMG-Y1M03-Q015-GRAY','IMG-Y1M03-Q017-GRAY'].sort();
assert(existsSync(fp(registryRel))&&existsSync(fp(memoryRel))&&existsSync(fp('.duduq-pages-manifest')),'BASE_ARTIFACT_MISSING');
const originalRegistry=readFileSync(fp(registryRel));
assert.equal(digest(originalRegistry),baselineRegistrySha,'PUBLISHED_REGISTRY_CHANGED');
const registry=JSON.parse(originalRegistry);
assert.equal(registry.entries.length,1166,'ENTRY_COUNT_CHANGED');
const gray=registry.entries.filter(e=>e.kind==='image'&&(e.semantic==='gray'||/GRAY|GREY/i.test(e.mediaId)));
assert.deepEqual(gray.map(e=>e.mediaId).sort(),expectedIds,'GRAY_CONSUMERS_CHANGED');
let crayon=0,provisional=0;
const originalPaths={};
for(const e of gray){
 assert.equal(e.semantic,'gray','GRAY_SEMANTIC_CONFLICT');
 assert.equal(e.temporary,true,'APPROVED_MEDIA_MUST_NOT_BE_OVERRIDDEN');
 originalPaths[e.mediaId]=e.urlOrPath;
 if(e.urlOrPath.endsWith('.png')){
  assert.equal(e.provenance?.sourcePath,'Imagens Ilustrativa/lápis de cera cinza.png','SOURCE_NOT_CRAYON');
  crayon++;
 }else if(e.urlOrPath.endsWith('.svg')){
  assert(!e.provenance,'SVG_HAS_PROVENANCE');
  provisional++;
 }else throw Error('GRAY_MEDIA_FORMAT_UNKNOWN:'+e.mediaId);
}
assert.equal(crayon,8);assert.equal(provisional,1);
const lines=readFileSync(fp('.duduq-pages-manifest'),'utf8').trimEnd().split(/\r?\n/);
const manifest=new Map();
for(let i=0;i<lines.length;i++){
 const at=lines[i].lastIndexOf(' ');assert(at>0);
 const name=lines[i].slice(0,at),sha=lines[i].slice(at+1);
 assert(/^[a-f0-9]{64}$/.test(sha)&&!manifest.has(name),'MANIFEST_BAD');
 manifest.set(name,{sha,index:i});
}
assert.equal(manifest.get(registryRel)?.sha,baselineRegistrySha);
const oldMemory=readFileSync(fp(memoryRel),'utf8');
assert.equal(digest(Buffer.from(oldMemory)),manifest.get(memoryRel)?.sha,'MEMORY_PRODUCTION_BYTES_CHANGED');
assert(oldMemory.includes('async function finishActivity() {')&&oldMemory.includes('feedbackTimer = window.setTimeout(() => release('),'MEMORY_PRODUCTION_SIGNATURE_MISSING');
assert(!oldMemory.includes('DUDUQ_MQ_FAST_FEEDBACK_20261106'),'MEMORY_ALREADY_PATCHED');
const response=await fetch(srcURL,{signal:AbortSignal.timeout(120000)});
assert(response.ok,'GRAY_HTTP_'+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
assert.equal(gitBlob(bytes),sourceGitBlob,'GRAY_GITHUB_HASH_MISMATCH');
assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG');
assert(bytes.readUInt32BE(16)>=512&&bytes.readUInt32BE(20)>=512,'GRAY_TOO_SMALL');
assert([2,6].includes(bytes[25]),'PNG_COLOR_FORMAT_UNEXPECTED');
const pngSha=digest(bytes);
const imageRel='content/english/assets/images/assets-duduq/fast-'+sourceGitBlob.slice(0,12)+'-'+pngSha.slice(0,12)+'.png';
assert(!manifest.has(imageRel)&&!existsSync(fp(imageRel)),'IMAGE_ALREADY_PRESENT');
for(const e of gray){
 e.urlOrPath=imageRel;e.sha256=pngSha;
 e.assets=[{path:imageRel,sha256:pngSha}];
 e.temporary=true;e.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
 e.integrationStatus='USER_PROVIDED_GRAY_COLOR_VISUAL_REVIEW';
 e.provenance={provider:'Assets-DuduQ',sourcePath,sourceCommit,sourceGitBlob,sha256:pngSha};
 e.replacementAudit={qaOnly:true,previousPath:originalPaths[e.mediaId],rule:'USER_EXACT_GRAY_COLOR_SOURCE'};
}
const nextRegistry=Buffer.from(JSON.stringify(registry,null,2)+'\n');
const registrySha=digest(nextRegistry);
let js=oldMemory;
function swap(from,to){const parts=js.split(from);assert.equal(parts.length,2,'MEMORY_PATCH_ANCHOR_CHANGED:'+from.slice(0,80));js=parts.join(to);}
swap('    foundPairCount += 1;\n    await pairSfxFinished;',
     '    foundPairCount += 1;\n    // DUDUQ_MQ_FAST_FEEDBACK_20261106\n    if (foundPairCount === requiredPairs) { void finishActivity().catch(error => { root.dataset.fastFeedbackError = String(error?.message || error); }); return; }\n    await pairSfxFinished;');
swap('    if (foundPairCount === requiredPairs) finishActivity();\n    else {\n      resolving = false;\n      setBoardLocked(false, "READY");\n    }',
     '    resolving = false;\n    setBoardLocked(false, "READY");');
const wrongStart='  await playPairFeedbackSfx("incorrect");\n  const pedagogy = window.DuduQPedagogicalAudioInteraction;\n  if (pedagogy?.enabled) await pedagogy.speakFeedback("MEMORY_WRONG", { mechanic: "memory-quest" });';
const wrongReplacement=[
 '  void Promise.resolve(playPairFeedbackSfx("incorrect")).catch(() => {});',
 '  const pedagogy = window.DuduQPedagogicalAudioInteraction;',
 '  if (pedagogy?.enabled) void Promise.resolve(pedagogy.speakFeedback("MEMORY_WRONG", { mechanic: "memory-quest" })).catch(() => {});',
 '  let retryClosed = false;',
 '  let retryTimer = null;',
 '  function resetWrongPair() {',
 '    if (retryClosed) return;',
 '    retryClosed = true;',
 '    if (retryTimer) window.clearTimeout(retryTimer);',
 '    feedback.hidden = true;',
 '    feedback.dataset.feedback = "";',
 '    flip(firstSlot, false);',
 '    flip(secondSlot, false);',
 '    firstSlot.classList.remove("is-non-match");',
 '    secondSlot.classList.remove("is-non-match");',
 '    resolving = false;',
 '    setBoardLocked(false, "READY");',
 '  }',
 '  Feedback(feedback, window.DuduQAssets?.assets, "incorrect", resetWrongPair);',
 '  feedback.querySelector(\'[data-slot="feedback-title"]\').textContent = "Tente de novo!";',
 '  feedback.querySelector(\'[data-slot="feedback-detail"]\').textContent = "Essas cartas não formam um par.";',
 '  const retryButton = feedback.querySelector(".feedback-action");',
 '  retryButton.hidden = false;',
 '  retryButton.disabled = false;',
 '  retryButton.setAttribute("aria-disabled", "false");',
 '  retryTimer = window.setTimeout(resetWrongPair, 1000);'
].join('\n');
swap(wrongStart,wrongReplacement);
const timerStart='  window.setTimeout(() => {\n    flip(firstSlot, false);\n    flip(secondSlot, false);\n    firstSlot.classList.remove("is-non-match");\n    secondSlot.classList.remove("is-non-match");\n    resolving = false;\n    setBoardLocked(false, "READY");\n  }, match ? 0 : 900);';
swap(timerStart,'  // The retry button or 1-second fallback resets the cards.');
const early=[
 '  let recapCanceled = false;',
 '  Feedback(feedback, window.DuduQAssets?.assets, "correct", () => {',
 '    recapCanceled = true;',
 '    if (feedbackTimer) window.clearTimeout(feedbackTimer);',
 '    window.dispatchEvent(new CustomEvent("duduq:feedback", { detail: { type: "continue", mechanic: "memory-quest" } }));',
 '  });',
 '  feedback.querySelector(\'[data-slot="feedback-title"]\').textContent = "Mandou bem!";',
 '  feedback.querySelector(\'[data-slot="feedback-detail"]\').textContent = "Você encontrou todos os pares.";',
 '  const action = feedback.querySelector(".feedback-action");',
 '  action.hidden = false;',
 '  action.disabled = false;',
 '  action.setAttribute("aria-disabled", "false");',
 '  feedback.dataset.duduqFeedbackGate = "RELEASED";',
 '  root.dataset.interactionState = "AWAITING_CONTINUE";'
].join('\n');
swap('  resultFx.trigger("correct");\n  const spoken =', '  resultFx.trigger("correct");\n'+early+'\n  const spoken =');
const start=js.indexOf('async function finishActivity() {');
const tailStart=js.indexOf('  Feedback(feedback, window.DuduQAssets?.assets, "correct", () => {',start+1800);
const tailEnd=js.indexOf('\n}\n\nfunction updateGridLayout()',tailStart);
assert(tailStart>start+1800&&tailEnd>tailStart,'OLD_LATE_FEEDBACK_NOT_FOUND');
const tail=js.slice(tailStart,tailEnd);
assert(tail.includes('feedbackTimer = window.setTimeout')&&tail.includes('action.hidden = !feedbackAudioReady'),'WRONG_DELAY_TAIL');
js=js.slice(0,tailStart)+js.slice(tailEnd);
swap('  if (requiredPairs > 1) {\n    root.dataset.successRecapState = "playing";\n    for (const pair of activity.pairs) {',
     '  if (!recapCanceled && requiredPairs > 1) {\n    root.dataset.successRecapState = "playing";\n    for (const pair of activity.pairs) {\n      if (recapCanceled) break;');
assert.equal(js.match(/DUDUQ_MQ_FAST_FEEDBACK_20261106/g)?.length,1);
assert(!js.includes('action.hidden = !feedbackAudioReady'),'LATE_CTA_GATE_REMAINS');
assert(js.includes('retryTimer = window.setTimeout(resetWrongPair, 1000);'),'RETRY_FALLBACK_MISSING');
assert(js.length>20000,'PRODUCTION_MEMORY_JS_TRUNCATED');
const nextMemory=Buffer.from(js);
lines[manifest.get(registryRel).index]=registryRel+' '+registrySha;
lines[manifest.get(memoryRel).index]=memoryRel+' '+digest(nextMemory);
lines.push(imageRel+' '+pngSha);
mkdirSync(path.dirname(fp(imageRel)),{recursive:true});
writeFileSync(fp(imageRel),bytes,{flag:'wx'});
writeFileSync(fp(registryRel),nextRegistry);
writeFileSync(fp(memoryRel),nextMemory);
writeFileSync(fp('.duduq-pages-manifest'),lines.join('\n')+'\n');
assert.equal(digest(readFileSync(fp(imageRel))),pngSha);
assert.equal(digest(readFileSync(fp(memoryRel))),digest(nextMemory));
const report={schema:'DUDUQ_GRAY_MEMORY_FAST_FEEDBACK_QA',gray:{ids:expectedIds,sourcePath,sourceCommit,sourceGitBlob,pngSha,imageRel,crayonReplaced:8,svgReplaced:1},memory:{previousSha:digest(Buffer.from(oldMemory)),nextSha:digest(nextMemory),continue:'IMMEDIATE_LAST_PAIR',retry:'IMMEDIATE_WRONG_PAIR',fallbackMs:1000,recap:'ASYNC_NOT_CTA_GATE'},registrySha,contracts:600,preview,release,qaBrowserNotYetCertified:true};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/duduq-gray-memory-result.json',JSON.stringify(report,null,2)+'\n');
if(preview){const dir=fp('media-review');mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,'gray.html'),'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>DUDUQ Grey</title><h1>Cor cinza oficial</h1><img src="/'+imageRel+'" style="max-width:300px" alt="Cor cinza"><p>9 mídias cinza atualizadas; 8 lápis substituídos e um SVG provisório.</p><a href="/play/english/year-1/module-03/">Colors</a><p>Memory Quest: Continuar e Tentar de novo imediatos. QA visual pendente.</p></html>');}
console.log('DUDUQ_GRAY_MEMORY_APPLIED='+JSON.stringify({grayMediaIds:9,replacedCrayon:8,replacedSvg:1,graySha:pngSha,registrySha,memorySha:digest(nextMemory),preview,release}));
