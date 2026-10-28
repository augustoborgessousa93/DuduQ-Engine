import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Based on V16. Treat the real Target Shooter UI stylesheet as sole authority.
// No modification of Target Shooter, Matching, game mechanics or assets.
const BASE='CE0C02A441863EBDCB1CED8EBD3D91582844FA4150EEF91E93C1F686D668CD7B';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const mPath='dist-pages/.duduq-pages-manifest';
let manifest=await readFile(mPath,'utf8');
if(SHA(manifest).toUpperCase()!==BASE)throw Error('V16_ARTIFACT_MISMATCH');
const cssPath='dist-pages/play/bubble-pop/bubble-pop.css';
const htmlPath='dist-pages/play/bubble-pop/index.html';
const jsPath='dist-pages/play/bubble-pop/bubble-pop.js';
const target='dist-pages/core/duduq-live-hud.css';
const [bubbleCSS,bubbleHTML,bubbleJS,canonical]=await Promise.all([cssPath,htmlPath,jsPath,target].map(p=>readFile(p,'utf8')));
const start=canonical.indexOf('/* Shared Penpot Feedback Correct + Continuar composition. */');
const end=canonical.indexOf('/* Shared-shell consumer title:',start);
if(start<0||end<0||end-start<10000)throw Error('TARGET_SHOOTER_FEEDBACK_REFERENCE_MISSING');
const block=canonical.slice(start,end);
const checks={
 incorrect:block.includes('#game.target-shooter-screen:not(.bubble-pop-screen) .feedback-ribbon[data-feedback="incorrect"]'),
 correct:block.includes('#game.target-shooter-screen .feedback-ribbon[data-feedback="correct"]'),
 buttonFace:block.includes('.feedback-action::before'),
 exampleStart:block.slice(0,260),
 exampleEnd:block.slice(-260),
 codeBytes:block.length
};
console.log('TARGET_SHOOTER_REFERENCE_DIAGNOSTICS:'+JSON.stringify(checks));
if(!checks.incorrect||!checks.correct||!checks.buttonFace)throw Error('TARGET_SHOOTER_REFERENCE_INCOMPLETE:'+JSON.stringify(checks));
if(bubbleCSS.includes('BUBBLE_TARGET_SHOOTER_PARITY_V18'))throw Error('ALREADY_DERIVED');
// Target Shooter already lends some selectors to shared shells; make its
// exact rules win against generic footer CSS by narrowing only the Target root.
const targetStyles=block
  // The frozen V16 QA stylesheet intentionally excluded Bubble Pop from
  // Target Shooter's incorrect footer via :not(.bubble-pop-screen).
  // Remove that exclusion ONLY in this Bubble Pop-owned derived CSS.
  .replaceAll('#game.target-shooter-screen:not(.bubble-pop-screen)',
              '#game.bubble-pop-screen.target-shooter-screen')
  .replaceAll('#game.target-shooter-screen',
              '#game.bubble-pop-screen.target-shooter-screen');
// The target footer has *no* feedback-status-badge. Do not leave Bubble's
// extra status column competing with the reference composition.
const badge='<span class="feedback-status-badge" aria-hidden="true"><span class="feedback-status-icon"></span></span>';
if(bubbleJS.split(badge).length!==2)throw Error('BUBBLE_FEEDBACK_DOM_UNEXPECTED');
const nextJS=bubbleJS.replace(badge,'');
const nextCss=bubbleCSS+'\n/* BUBBLE_TARGET_SHOOTER_PARITY_V18 — same Penpot feedback contract as Target Shooter. */\n'
  +targetStyles+'\n#game.bubble-pop-screen .feedback-ribbon[hidden] {display:none!important;}\n';
if(!bubbleHTML.includes('href="/core/duduq-live-hud.css"'))throw Error('BUBBLE_STYLESHEET_LINK_UNEXPECTED');
const nextHtml=bubbleHTML.replace('href="/core/duduq-live-hud.css"','href="/core/duduq-live-hud.css?v=HUD_FINAL_01"');
const files=[[cssPath,nextCss],[htmlPath,nextHtml],[jsPath,nextJS]];
const lines=manifest.trimEnd().split(/\r?\n/);
if(lines.length!==2670)throw Error('MANIFEST_ENTRIES_CHANGED:'+lines.length);
for(const [p,c] of files){
 const name=p.replace(/^dist-pages\//,'');
 const index=lines.findIndex(l=>l.startsWith(name+' '));
 if(index<0||lines.filter(l=>l.startsWith(name+' ')).length!==1)throw Error('MANIFEST_ITEM_NOT_UNIQUE:'+name);
 const before=await readFile(p);
 if(lines[index]!==name+' '+SHA(before))throw Error('BASE_HASH_MISMATCH:'+name);
 lines[index]=name+' '+SHA(c);
 await writeFile(p,c,'utf8');
}
const nextManifest=lines.join('\n')+'\n';
await writeFile(mPath,nextManifest,'utf8');
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/v18-bubble-target-manifest.txt',SHA(nextManifest).toUpperCase()+'\n','utf8');
console.log('BUBBLE_TARGET_SHOOTER_V18_DERIVED:'+JSON.stringify({
  sha256:SHA(nextManifest).toUpperCase(),
  fromManifest:BASE,targetSource:target,targetSourceHash:SHA(canonical),
  targetFeedbackRulesHash:SHA(block),copiedBytes:block.length,changed:files.map(([p])=>p),
  originalBubbleCSSHash:SHA(bubbleCSS),newBubbleCSSHash:SHA(nextCss),
  noGameplayLogicChange:true
}));
