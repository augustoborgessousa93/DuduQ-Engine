import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const SHA=b=>createHash('sha256').update(b).digest('hex');
const V18='50E85BA7BAB172DE2892137F9A4F8DFE7B9768B4938E7FAFC4924A6130F34F7A';
const file='dist-pages/play/drag-drop/drag-drop.js';
const manifestFile='dist-pages/.duduq-pages-manifest';
const manifest=await readFile(manifestFile,'utf8');
if(SHA(manifest).toUpperCase()!==V18)throw Error('V19_REFUSE_NON_APPROVED_V18_ARTIFACT');
const original=await readFile(file,'utf8');
if(SHA(original)!=='360e56444fe04b5950dc46231563bf9c919718e016be59d5ff76d1885d66d248')throw Error('V19_GROUPING_SOURCE_SHA_MISMATCH');
let code=original;
const hudFile='dist-pages/core/ui/duduq-canonical-question-hud.js';
const hudOriginal=await readFile(hudFile,'utf8');
const hudSourceHash=SHA(hudOriginal);
if(hudSourceHash!=='51d4b61c3d109762e9632fce48add1180ce77d3291ccea22d06e55cc42565d06')throw Error('V19_HUD_SOURCE_SHA_MISMATCH');
let hudCode=hudOriginal;
function once(a,b,name){const n=code.split(a).length-1;if(n!==1)throw Error('V19_ANCHOR_'+name+':'+n);code=code.replace(a,b);}
once('const showValidationFeedback = (outcome, spokenFeedback = "") => {',
'const showValidationFeedback = (outcome, spokenFeedback = "") => {\n  // Explicit opt-in consumed only by the Grouping-owned HUD audio gate.\n  feedbackRibbon.dataset.duduqFeedbackImmediateAction = "true";','OPT_IN_GROUPING');
once('let retryGroupingPlan = null;','let retryGroupingPlan = null;\nlet retryGroupingPlanPending = null;', 'PLAN_STATE');
once('const { correctCount, incorrectCount } = validation;','const { correctCount, incorrectCount } = validation;\n  // V19: show the original canonical feedback before potentially long pedagogical voice.\n  showValidationFeedback(incorrectCount === 0 ? "correct" : "incorrect");','EARLY_FOOTER');
once('    showValidationFeedback("correct", spokenFeedback);','    // V19: already painted. Do not reset its action after voice playback.','REMOVE_LATE_CORRECT');
once('  showValidationFeedback("incorrect", spokenFeedback);','  // V19: already painted. Do not reset its action after voice playback.','REMOVE_LATE_WRONG');
once('  retryGroupingPlan = await window.DuduQProductionQuestionBootstrap?.resolveRetryReminder?.({',
'  retryGroupingPlanPending = Promise.resolve(window.DuduQProductionQuestionBootstrap?.resolveRetryReminder?.({','PLAN_ASYNC_START');
once('    activeStimulus: incorrectCount === 1 ? retryGroupingStimulus : null\n  });',
'    activeStimulus: incorrectCount === 1 ? retryGroupingStimulus : null\n  }));\n  retryGroupingPlan = await retryGroupingPlanPending;','PLAN_ASYNC_FINISH');
const start=String.raw`    if (outcome === "incorrect") {
      const action = feedbackRibbon.querySelector(".feedback-action");
      if (action) action.disabled = true;
      if (retryGroupingPlan?.mode === "GLOBAL" || retryGroupingPlan?.mode === "TASK") {
        await window.DuduQPedagogicalAudioInteraction?.speakRetryReminder?.(retryGroupingPlan);
      } else if (retryGroupingStimulus?.audioId) {
        const target = retryGroupingStimulus;
        await window.DuduQPedagogicalAudioInteraction?.speakRetryReminder?.({
          mode: "TARGET", targetKind: "NUMBER", frameAudioId: "AUD-V11-3F-RETRY-NUMBER-PT",
          targetAudioId: target.audioId, targets: [{ audioId: target.audioId, text: target.semanticTarget }]
        });
      }
      retryGroupingStimulus = null;
      retryGroupingPlan = null;
      retryIncorrectItems();
      return;
    }`;
const finish=String.raw`    if (outcome === "incorrect") {
      const action = feedbackRibbon.querySelector(".feedback-action");
      if (action) action.disabled = true;
      window.DuduQContentAudio?.stopVoice?.();
      const pendingPlan = retryGroupingPlanPending;
      const target = retryGroupingStimulus;
      retryGroupingStimulus = null;
      retryGroupingPlan = null;
      retryGroupingPlanPending = null;
      // The cards become playable on this click, never after an audio Promise.
      retryIncorrectItems();
      // Optional reminder is still narrated as pedagogical reinforcement.
      void Promise.resolve(pendingPlan).then(plan => {
        if (plan?.mode === "GLOBAL" || plan?.mode === "TASK") {
          return window.DuduQPedagogicalAudioInteraction?.speakRetryReminder?.(plan);
        }
        if (target?.audioId) return window.DuduQPedagogicalAudioInteraction?.speakRetryReminder?.({
          mode: "TARGET", targetKind: "NUMBER", frameAudioId: "AUD-V11-3F-RETRY-NUMBER-PT",
          targetAudioId: target.audioId, targets: [{ audioId: target.audioId, text: target.semanticTarget }]
        });
      }).catch(error => {
        root.dataset.retryReminderError = String(error?.message || error).slice(0,180);
        window.dispatchEvent(new CustomEvent("duduq:retry-reminder-error", {detail:{mechanic:"drag-drop"}}));
      });
      return;
    }`;
once(start,finish,'RETRY_NONBLOCKING');
once('    if (!lifecycle.continueActivity()) return;','    window.DuduQContentAudio?.stopVoice?.();\n    if (!lifecycle.continueActivity()) return;','CONTINUE_STOPS_VOICE');
const hudAnchor=String.raw`      const expectedKind = feedback.dataset.feedback === "correct" ? "correct" : "error";`;
const hudReplacement=hudAnchor+String.raw`
      // V19: only validated Drag & Drop Grouping opts into immediate, real
      // Retry/Continue while pedagogical feedback audio plays independently.
      // Never bypass the separate question-instruction audio prerequisite.
      if (gameRoot.classList.contains("drag-drop-screen") &&
          feedback.dataset.duduqFeedbackImmediateAction === "true") {
        feedback.dataset.duduqFeedbackGate = "RELEASED_NONBLOCKING";
        setGateState(feedback.dataset.feedback === "correct" ? "AWAITING_CONTINUE" : "AWAITING_RETRY");
        return;
      }`;
if(hudCode.split(hudAnchor).length!==2)throw Error('V19_HUD_GATE_ANCHOR_MISSING');
hudCode=hudCode.replace(hudAnchor,hudReplacement);
const lines=manifest.trimEnd().split(/\r?\n/);
if(lines.length!==2670)throw Error('MANIFEST_COUNT');
const name='play/drag-drop/drag-drop.js',rows=lines.filter(x=>x.startsWith(name+' '));
if(rows.length!==1||rows[0]!==name+' '+SHA(original))throw Error('MANIFEST_ORIGINAL_WRONG');
lines[lines.indexOf(rows[0])]=name+' '+SHA(code);
const hudName='core/ui/duduq-canonical-question-hud.js';
const hudRows=lines.filter(x=>x.startsWith(hudName+' '));
if(hudRows.length!==1||hudRows[0]!==hudName+' '+hudSourceHash)throw Error('HUD_MANIFEST_ORIGINAL_WRONG');
lines[lines.indexOf(hudRows[0])]=hudName+' '+SHA(hudCode);
await writeFile(hudFile,hudCode,'utf8');
const nextManifest=lines.join('\n')+'\n';
await writeFile(file,code,'utf8');
await writeFile(manifestFile,nextManifest,'utf8');
await mkdir('qa/results',{recursive:true});
const candidate=SHA(nextManifest).toUpperCase();
await writeFile('qa/results/v19-grouping-latency-manifest.txt',candidate+'\n');
console.log('GROUPING_FEEDBACK_LATENCY_V19_DERIVED:'+JSON.stringify({from:V18,manifest:candidate,sourceSha:SHA(original),candidateSha:SHA(code),changed:[name,hudName],bytes:code.length,hudBefore:hudSourceHash,hudAfter:SHA(hudCode)}));