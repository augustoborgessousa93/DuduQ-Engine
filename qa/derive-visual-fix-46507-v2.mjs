import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const originalSha='46507A5A595ADB4AFB467D45AC0CEC1849E913E7F1C8722FE8B1CDA5CB3E0B69';
const cssPath='dist-pages/play/drag-drop/drag-drop.css';
const manifestPath='dist-pages/.duduq-pages-manifest';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const oldManifest=await readFile(manifestPath);
if(digest(oldManifest).toUpperCase()!==originalSha)throw Error('REFUSE_TO_PATCH_NON_46507_CANDIDATE');
const oldCss=await readFile(cssPath,'utf8');
const selector='#game.drag-drop-screen[data-duduq-fullscreen-enhanced="true"] > .feedback-ribbon:not([hidden]) {';
const start=oldCss.indexOf(selector),end=oldCss.indexOf('}',start);
if(start<0||end<0||!oldCss.slice(start,end).includes('position: fixed !important;'))throw Error('FULLSCREEN_FOOTER_SELECTOR_MISSING');
if(oldCss.includes('Grouping fullscreen scaled canonical footer v3'))throw Error('ALREADY_PATCHED');
const override = [
 '',
 '/* Grouping fullscreen scaled canonical footer v3.',
 '   The Grouping shell intentionally carries target-shooter-screen for its shared HUD.',
 '   Its matching-derived feedback action is absolutely placed at x=1099 on a 1304px',
 '   baseline. Scale/center that entire canonical 1304px footer as one unit; never',
 '   resize its outer box while leaving the action at baseline coordinates. */',
 '#game.drag-drop-screen.target-shooter-screen[data-duduq-fullscreen-enhanced="true"] > .feedback-ribbon:not([hidden]) {',
 '  position: fixed !important;',
 '  left: 50% !important;',
 '  right: auto !important;',
 '  width: 1304px !important;',
 '  min-width: 1304px !important;',
 '  max-width: none !important;',
 '  display: block !important;',
 '  margin: 0 !important;',
 '  transform: translateX(-50%) !important;',
 '  scale: min(1, calc((100vw - 16px) / 1304px)) !important;',
 '  transform-origin: center bottom !important;',
 '}',
 ''
].join('\n');
const newCss = oldCss + override;
await writeFile(cssPath,newCss,'utf8');
const newCssSha=digest(Buffer.from(newCss));
const source=oldManifest.toString('utf8');
const re=/^play\/drag-drop\/drag-drop\.css ([0-9a-f]{64})$/m;
const matches=[...source.matchAll(new RegExp(re.source,'gm'))];
if(matches.length!==1)throw Error('MANIFEST_CSS_ENTRY_NOT_UNIQUE');
if(matches[0][1]!==digest(Buffer.from(oldCss)))throw Error('CSS_ENTRY_DID_NOT_MATCH_PREPATCH_BYTES');
let next=source.replace(re,'play/drag-drop/drag-drop.css '+newCssSha);

// Preserve the canonical Matching/Target Shooter feedback skin in Drag & Drop
// Multimedia. The DDM-specific fork changes title positioning, footer grid,
// CTA geometry and hides its pseudo-element depth. Leave the Gold Master
// untouched and remove only the derivative CSS overrides in this candidate.
const mmPath='dist-pages/play/drag-drop-multimedia/drag-drop-multimedia.css';
const mm=await readFile(mmPath,'utf8');
const mmStart=mm.indexOf('#game.drag-drop-multimedia-screen .feedback-ribbon {');
const mmEnd=mm.indexOf('@keyframes dnd-multimedia-feedback-enter',mmStart);
if(mmStart<0||mmEnd<0||mmEnd-mmStart<8000)throw Error('DDM_FORKED_FEEDBACK_BLOCK_UNEXPECTED');
let mmFixed=mm.slice(0,mmStart)
  +'/* Shared Gold Master owns DDM feedback visual, title, subtitle and CTA. */\n'
  +'#game.drag-drop-multimedia-screen .feedback-ribbon[hidden] { display:none !important; }\n'
  +'#game.drag-drop-multimedia-screen > .feedback-ribbon:not([hidden]) { z-index:55 !important; }\n\n'
  +mm.slice(mmEnd);
const small='@media (max-width: 680px) {\n  #game.drag-drop-multimedia-screen .feedback-ribbon';
const a=mmFixed.indexOf(small);
const b=mmFixed.indexOf('#game.drag-drop-multimedia-screen .dnd-multimedia-image-option img {',a);
if(a<0||b<0||b-a>3500)throw Error('DDM_FORKED_MOBILE_FEEDBACK_UNEXPECTED');
mmFixed=mmFixed.slice(0,a)+mmFixed.slice(b);
const full='/* Fullscreen keeps the same canonical footer node and visual composition.';
const x=mmFixed.indexOf(full);
const y=mmFixed.indexOf('@media (max-height: 800px) {',x);
if(x<0||y<0||y-x>1300)throw Error('DDM_FULLSCREEN_SCALE_OVERRIDE_UNEXPECTED');
mmFixed=mmFixed.slice(0,x)+mmFixed.slice(y);
if(mmFixed.includes('grid-template-columns: 82px minmax(0,1fr) auto !important'))throw Error('DDM_FORK_NOT_REMOVED');
await writeFile(mmPath,mmFixed,'utf8');
const oldMMHash=digest(Buffer.from(mm));
const newMMHash=digest(Buffer.from(mmFixed));
const reMM=/^play\/drag-drop-multimedia\/drag-drop-multimedia\.css ([0-9a-f]{64})$/m;
const mmMatches=[...source.matchAll(new RegExp(reMM.source,'gm'))];
if(mmMatches.length!==1||mmMatches[0][1]!==oldMMHash)throw Error('DDM_BASE_MANIFEST_HASH_MISMATCH');
next=next.replace(reMM,'play/drag-drop-multimedia/drag-drop-multimedia.css '+newMMHash);
console.log(JSON.stringify({kind:'DDM_CANONICAL_FEEDBACK_RESTORED',sourceHash:oldMMHash,patchedHash:newMMHash,removedCSSBytes:mm.length-mmFixed.length}));
// Intro screen full viewport while preserving the Penpot stage proportions.
const introCSSPath='dist-pages/play/intro-module/intro-module.css';
const introSource=await readFile(introCSSPath,'utf8');
const oldRoot='#intro-module-root { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; margin: 0; padding: 0; overflow: hidden; container-type: size; }';
const newRoot=oldRoot.replace('container-type: size;','container-type: size; background: #87c95a url("../../core/assets/Background%20Tela%20Inicial.png") center center / cover no-repeat;');
const oldStageBG='background: #87c95a url("../../core/assets/Background%20Tela%20Inicial.png") center center / cover no-repeat;';
if(!introSource.includes(oldRoot))throw Error('INTRO_BASE_CSS_UNEXPECTED');
let introFixed=introSource.replace(oldRoot,newRoot);
const stageLine=introFixed.split('\n').find(x=>x.startsWith('.duduq-module-intro::before {'));
if(!stageLine||!stageLine.includes(oldStageBG))throw Error('INTRO_STAGE_BACKGROUND_MISSING');
introFixed=introFixed.replace(stageLine,stageLine.replace(oldStageBG,'background:transparent;'));
// The legacy shadow lives in the scaled 1366x768 artboard. Its hard left/right
// edges become visible when the Intro-only outer iframe expands to full viewport.
// Paint the same #AABDF7 haze at the actual viewport level and overdraw its
// blurred sides beyond the clipping edge. Preserve the foreground artboard,
// cards and CTA; never apply the overlay over their interactive layer.
const introBlurViewportRule = [
  '',
  '/* DUDUQ Intro: full viewport soft footer haze (isolated from the game). */',
  '#intro-module-root { isolation: isolate; }',
  '#intro-module-root::after {',
  '  content: "";',
  '  position: absolute;',
  '  z-index: 1;',
  '  pointer-events: none;',
  '  left: -12vw; right: -12vw;',
  '  bottom: -6dvh;',
  '  height: clamp(205px, 34dvh, 370px);',
  '  background: #AABDF7;',
  '  filter: blur(clamp(32px, 5dvh, 60px));',
  '}',
  '.duduq-module-intro { z-index: 2; }',
  '.duduq-intro-footer-blur { display: none !important; }',
  ''
].join('\n');
if(introFixed.includes('DUDUQ Intro: full viewport soft footer haze'))throw Error('INTRO_BLUR_PATCH_ALREADY_APPLIED');
introFixed += introBlurViewportRule;
if(introFixed===introSource)throw Error('INTRO_CSS_NOT_CHANGED');
await writeFile(introCSSPath,introFixed,'utf8');
const introOldHash=digest(Buffer.from(introSource)),introNewHash=digest(Buffer.from(introFixed));
const reIntro=/^play\/intro-module\/intro-module\.css ([0-9a-f]{64})$/m;
const introMatches=[...source.matchAll(new RegExp(reIntro.source,'gm'))];
if(introMatches.length!==1||introMatches[0][1]!==introOldHash)throw Error('INTRO_BASE_MANIFEST_HASH_MISMATCH');
next=next.replace(reIntro,'play/intro-module/intro-module.css '+introNewHash);

// Fit middleware dynamically expands only Intro; other games remain 1366x768.
const fitFunctionPath='functions/play/english/_middleware.js';
const fitSource=await readFile(fitFunctionPath,'utf8');
const baseFitHash='695E973CC8F9F36FE09A42827334AB8C22887B58BD5F41CA1C51576ACB3866C1';
if(digest(Buffer.from(fitSource)).toUpperCase()!==baseFitHash)throw Error('FIT_PAGES_FUNCTION_UNEXPECTED_BASE');
const fitOld="  let lastW=-1,lastH=-1;\n  function fit(){\n    const w=viewport.clientWidth,h=viewport.clientHeight;\n    if(w<=0||h<=0||(w===lastW&&h===lastH))return;\n    lastW=w;lastH=h;\n    const s=Math.min(w/LOGICAL_W,h/LOGICAL_H);\n    const x=(w-LOGICAL_W*s)/2;\n    const y=(h-LOGICAL_H*s)/2;\n    frame.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+s+')';\n    viewport.dataset.scale=s.toFixed(8);\n  }\n  new ResizeObserver(fit).observe(viewport);";
const fitNew="  let lastW=-1,lastH=-1,isIntro=false,scene=null;\n  // Only Target Shooter gets the single native full-viewport backdrop.\n  // The 1366x768 Gold Master stays at exactly its former viewport coordinates.\n  function detachScene(){\n    if(!scene)return;\n    scene.doc.removeEventListener('fullscreenchange',scene.onFullscreen);\n    document.removeEventListener('fullscreenchange',scene.onFullscreen);\n    scene=null;\n  }\n  function isNativeFullscreen(){\n    try{return !!scene?.doc.fullscreenElement||document.fullscreenElement===frame}catch{return false}\n  }\n  function configureTarget(){\n    let doc,path;\n    try{doc=frame.contentDocument;path=new URL(frame.contentWindow.location.href).pathname}catch{return}\n    // Single-frame background for seven shared-scenery mechanics.\n    // Target Shooter uses the exact same approved native-scene implementation.\n    const supported=new Set(['/play/target-shooter/','/play/bubble-pop/','/play/drag-drop/',\n      '/play/drag-drop-multimedia/','/play/matching/','/play/memory-quest/','/play/smart-sentence/']);\n    if(!supported.has(path)){detachScene();return}\n    // Tear down the previous question's native scene before probing the next\n    // question. Otherwise delayed backdrop setup leaves scene pointing to the\n    // old iframe document and prevents installing the new mutation watcher.\n    if(scene?.doc&&scene.doc!==doc)detachScene();\n    const game=doc.querySelector('#game'),world=doc.querySelector('.world-backdrop'),veil=doc.querySelector('.readability-veil');\n    if(!game||!world||!veil)return;\n    if(scene?.doc===doc)return;\n    detachScene();\n    const image=getComputedStyle(world).backgroundImage;\n    const tint=getComputedStyle(veil).backgroundImage;\n    if(!image||image==='none'||!image.startsWith('url('))return;\n    const cssName='duduq-fit-native-scene';\n    const onFullscreen=()=>fit(true);\n    scene={doc,game,world,veil,image,tint,onFullscreen,path};\n    doc.addEventListener('fullscreenchange',onFullscreen);\n    document.addEventListener('fullscreenchange',onFullscreen);\n    viewport.dataset.bleed=cssName;\n  }\n  function fit(force=false){\n    const w=viewport.clientWidth,h=viewport.clientHeight;\n    if(w<=0||h<=0||(!force&&w===lastW&&h===lastH))return;\n    lastW=w;lastH=h;\n    const scale=Math.min(w/LOGICAL_W,h/LOGICAL_H);\n    viewport.dataset.scale=scale.toFixed(8);\n    if(isIntro){\n      frame.style.width=w+'px';frame.style.height=h+'px';\n      frame.style.transform='translate3d(0px,0px,0) scale(1)';\n      viewport.dataset.mode='intro';\n      viewport.dataset.bleed='intro';\n      return;\n    }\n    if(scene&&scene.doc===frame.contentDocument){\n      const {doc,game,world,veil,image,tint}=scene;\n      frame.style.width=w+'px';frame.style.height=h+'px';\n      frame.style.transform='translate3d(0px,0px,0) scale(1)';\n      frame.style.background='transparent';\n      // Everything is composited in this SAME iframe: one native image.\n      viewport.style.backgroundImage='none';\n      viewport.dataset.mode='game';\n      doc.documentElement.style.width=w+'px';doc.documentElement.style.height=h+'px';\n      doc.documentElement.style.overflow='hidden';\n      doc.body.style.width=w+'px';doc.body.style.height=h+'px';\n      doc.body.style.margin='0';doc.body.style.overflow='hidden';\n      doc.body.style.backgroundImage=tint&&tint!=='none'?tint+', '+image:image;\n      doc.body.style.backgroundSize=tint&&tint!=='none'?'100% 100%, cover':'cover';\n      doc.body.style.backgroundPosition='center center';\n      doc.body.style.backgroundRepeat='no-repeat';\n      if(isNativeFullscreen()){\n        // The native fullscreen document must own its usual world backdrop.\n        if(scene.path!=='/play/target-shooter/'){\n          for(const name of ['width','height','position','left','top','transform','transform-origin'])\n            game.style.removeProperty(name);\n        }\n        doc.body.style.backgroundImage='none';\n        game.style.width='100vw';game.style.height='100vh';\n        game.style.position='relative';game.style.left='0';game.style.top='0';\n        game.style.transform='none';\n        game.style.removeProperty('background');\n        world.style.removeProperty('background');\n        veil.style.removeProperty('background');\n        // CSS-defined Target Shooter fullscreen is an approved Gold Master.\n        // The other mechanisms may assign the scene by inline backgroundImage;\n        // our normal full-bleed mode clears that property. Restore the exact\n        // original image and tint ONLY while their native fullscreen is active.\n        if(scene.path!=='/play/target-shooter/'){\n          world.style.setProperty('background-image',image,'important');\n          if(tint&&tint!=='none')veil.style.setProperty('background-image',tint,'important');\n        }\n        viewport.dataset.fullscreenBackground='native';\n      }else{\n        const x=(w-LOGICAL_W*scale)/2,y=(h-LOGICAL_H*scale)/2;\n        if(scene.path==='/play/target-shooter/'){\n          // Exact V11 owner-approved Target Shooter stage: do not change it.\n          game.style.width=LOGICAL_W+'px';game.style.height=LOGICAL_H+'px';\n          game.style.position='absolute';game.style.left=x+'px';game.style.top=y+'px';\n          game.style.transformOrigin='top left';\n          game.style.transform='scale('+scale+')';\n        }else{\n          // The six legacy mechanics may re-assert a full-viewport layout\n          // after async hydration; lock only the logical playable stage.\n          for(const [prop,val] of [\n            ['width',LOGICAL_W+'px'],['height',LOGICAL_H+'px'],\n            ['position','absolute'],['left',x+'px'],['top',y+'px'],\n            ['transform-origin','top left'],['transform','scale('+scale+')']\n          ])game.style.setProperty(prop,val,'important');\n        }\n        game.style.setProperty('background','transparent','important');\n        world.style.setProperty('background','transparent','important');\n        veil.style.setProperty('background','transparent','important');\n        viewport.dataset.fullscreenBackground='single-native-scene';\n      }\n      viewport.dataset.bleed='native-single-scene';\n      return;\n    }\n    frame.style.background='';\n    frame.style.width=LOGICAL_W+'px';frame.style.height=LOGICAL_H+'px';\n    const x=(w-LOGICAL_W*scale)/2,y=(h-LOGICAL_H*scale)/2;\n    frame.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+')';\n    viewport.dataset.mode='game';\n    viewport.dataset.bleed='default';\n  }\n  frame.addEventListener('load',()=>{\n    let intro=false;\n    try{intro=new URL(frame.contentWindow.location.href).pathname==='/play/intro-module/'}catch{}\n    if(intro!==isIntro){isIntro=intro;}\n    configureTarget();\n    fit(true);\n    // Some mechanics mount their scenery after the iframe's load event.\n    // Observe only the initial mount, never poll or mutate the game engine.\n    if(!scene&&!intro){\n      let currentPath='',doc=null;\n      try{doc=frame.contentDocument;currentPath=new URL(frame.contentWindow.location.href).pathname}catch{}\n      const needsWatch=new Set(['/play/bubble-pop/','/play/drag-drop/','/play/drag-drop-multimedia/',\n        '/play/matching/','/play/memory-quest/','/play/smart-sentence/']).has(currentPath);\n      if(needsWatch&&doc?.body){\n        const observer=new MutationObserver(()=>{\n          if(frame.contentDocument!==doc){observer.disconnect();return;}\n          if(scene)return void observer.disconnect();\n          configureTarget();\n          if(scene){observer.disconnect();fit(true);}\n        });\n        // Smart Sentence Order paints its backdrop URL after mounting children.\n        // Observe that later style/class binding as well as element insertion;\n        // disconnect before fit() to prevent re-entrant layout mutations.\n        observer.observe(doc.querySelector('#game')||doc.body,{\n          childList:true,subtree:true,attributes:true,attributeFilter:['style','class']\n        });\n        setTimeout(()=>observer.disconnect(),12000);\n        viewport.dataset.bleed='mount-pending';\n      }\n    }\n  });\n  new ResizeObserver(()=>fit()).observe(viewport);";
if(!fitSource.includes(fitOld)||fitSource.split(fitOld).length!==2)throw Error('FIT_MIDDLEWARE_PATCH_ANCHOR_MISMATCH');
const fitFixed=fitSource.replace(fitOld,fitNew);
await writeFile(fitFunctionPath,fitFixed,'utf8');
const fitNewHash=digest(Buffer.from(fitFixed)).toUpperCase();
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/derived-function-sha256.txt',fitNewHash+'\n');
console.log(JSON.stringify({kind:'INTRO_FULL_VIEWPORT_DERIVED',cssOldSha:introOldHash,cssNewSha:introNewHash,functionOldSha:baseFitHash,functionNewSha:fitNewHash,reason:'Seven scenic mechanics one native backdrop inside full-viewport iframe; game geometry preserved; Target Shooter implementation unchanged'}));

await writeFile(manifestPath,next,'utf8');
const candidateSha=digest(Buffer.from(next)).toUpperCase();
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/derived-manifest-sha256.txt',candidateSha+'\n');
console.log(JSON.stringify({derivedCandidate:'v16-non-target-fullscreen-scene-restoration',baseManifestSha256:originalSha,manifestSha256:candidateSha,changedFiles:[cssPath,mmPath,introCSSPath,fitFunctionPath],oldCssSha:matches[0][1],newCssSha,change:'Grouping fullscreen geometry and DDM canonical Matching feedback title/subtitle/CTA restoration'}));
