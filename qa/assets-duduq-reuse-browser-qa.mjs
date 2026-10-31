#!/usr/bin/env node
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/);
const bundlePath=path.resolve(process.env.DUDUQ_MEDIA_CANDIDATE_BUNDLE||'qa/media-candidates/assets-duduq-reuse-20261030');
const output=path.resolve(process.env.DUDUQ_MEDIA_BROWSER_OUT||'qa/results/assets-duduq-browser');
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile(path.join(bundlePath,'batch-manifest.json'),'utf8'));
const questions=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/year-1/module-04/questions.json'),'utf8')).items;
const crosswalk=JSON.parse(await readFile(path.join(root,'qa/results/assets-duduq-question-crosswalk.json'),'utf8'));
const registry=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/media/media-registry.json'),'utf8'));
const registryById=new Map(registry.entries.map(e=>[e.mediaId,e]));
const routeQuestions=['Y1M04-Q010','Y1M04-Q015','Y1M04-Q020'];
const pathsByQuestion=new Map(),expectedHashes=new Map();
for(const asset of manifest.assets)for(const binding of asset.bindings){
  const entry=registryById.get(binding.mediaId);if(!entry)throw Error('CANDIDATE_MEDIA_NOT_IN_RUNTIME_REGISTRY:'+binding.mediaId);
  const set=pathsByQuestion.get(binding.questionId)||new Set();set.add(entry.urlOrPath);pathsByQuestion.set(binding.questionId,set);
  expectedHashes.set(entry.urlOrPath,asset.sha256);
}
const views=[{name:'desktop-1366x768',width:1366,height:768},{name:'tablet-768x1024',width:768,height:1024},{name:'mobile-390x844',width:390,height:844}];
await mkdir(output,{recursive:true});
const report={schemaVersion:'ASSETS_DUDUQ_REUSE_BROWSER_QA_V1',status:'RUNNING',sourceCommit:manifest.sourceCommit,
  candidateDistinctAssets:manifest.assets.length,candidateBindings:manifest.assets.reduce((n,a)=>n+a.bindings.length,0),
  questions:[],transport:[],gameplay:null,screenshots:[],errors:[],productionDeployed:false};
let browser,activeContext,traceStopped=false;
function attachDiagnostics(page){const errors=[],failed=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));page.on('requestfailed',r=>{const failure=String(r.failure()?.errorText||'');if(!failure.includes('ERR_ABORTED'))failed.push({url:r.url(),failure});});return{errors,failed};}
async function visibleCandidateImages(page){return page.locator('img').evaluateAll((imgs,paths)=>imgs.filter(img=>paths.includes(new URL(img.src).pathname.replace(/^\//,''))).map(img=>{
  const r=img.getBoundingClientRect(),css=getComputedStyle(img);return{path:new URL(img.src).pathname.replace(/^\//,''),alt:img.alt,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
    rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},visible:img.complete&&img.naturalWidth>0&&r.width>5&&r.height>5&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity)>0};
}),[...expectedHashes.keys()]);}
async function click(page,locator,label,events){await locator.waitFor({state:'visible',timeout:10000});const box=await locator.boundingBox();if(!box)throw Error('POINTER_TARGET_NOT_VISIBLE:'+label);await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:3});await page.mouse.down();await page.mouse.up();events.push({label,x:box.x+box.width/2,y:box.y+box.height/2,realMouse:true});}
try{
  browser=await chromium.launch({headless:true});
  for(const [runtimePath,expected] of [...expectedHashes]){
    const response=await fetch(base+'/'+runtimePath),bytes=Buffer.from(await response.arrayBuffer()),contentType=response.headers.get('content-type')||'';
    const actual=sha(bytes),check={runtimePath,status:response.status,contentType,expectedSha256:expected,actualSha256:actual,
      pass:response.status===200&&contentType.startsWith('image/png')&&actual===expected};
    report.transport.push(check);if(!check.pass)throw Error('RUNTIME_MEDIA_HASH_MISMATCH:'+runtimePath);
  }
  for(const qid of routeQuestions){
    const q=questions.find(x=>x.item_id===qid);if(!q)throw Error('QUESTION_NOT_FOUND:'+qid);
    const paths=[...(pathsByQuestion.get(qid)||[])];if(!paths.length)throw Error('QUESTION_HAS_NO_REPLACED_MEDIA:'+qid);
    for(const view of views){
      const context=await browser.newContext({viewport:{width:view.width,height:view.height}}),page=await context.newPage(),diag=attachDiagnostics(page);
      const route='/play/'+q.mechanicId+'/?duduqModule=Y1M04&duduqItem='+qid+'&qaSeed=20261031';
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(({paths})=>{
        const candidates=[...document.images].filter(img=>paths.includes(new URL(img.src).pathname.replace(/^\//,'')));
        return paths.every(assetPath=>candidates.some(img=>new URL(img.src).pathname.replace(/^\//,'')===assetPath&&img.complete));
      },{paths},{timeout:20000});
      const images=await visibleCandidateImages(page),missing=paths.filter(p=>!images.some(i=>i.path===p&&i.visible));
      const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
      const screenshot=path.join(output,`${qid.toLowerCase()}-${view.name}.png`);await page.screenshot({path:screenshot,fullPage:false});
      const check={questionId:qid,mechanicId:q.mechanicId,view,route,httpStatus:response?.status()||null,expectedPaths:paths,missing,images,overflow,
        iframeCount:await page.locator('iframe').count(),pageErrors:diag.errors,requestFailures:diag.failed,
        screenshot:path.relative(root,screenshot).replaceAll('\\','/'),screenshotSha256:sha(await readFile(screenshot))};
      check.pass=check.httpStatus===200&&!missing.length&&images.length===paths.length&&images.every(i=>i.visible)&&overflow===0&&check.iframeCount===0&&!diag.errors.length&&!diag.failed.length;
      report.questions.push(check);await context.close();if(!check.pass)throw Error('CANDIDATE_IMAGE_RENDER_FAILED:'+qid+':'+view.name+':'+JSON.stringify(check));
    }
  }

  // A real error -> Retry -> correct answer round-trip on a question that uses
  // the just-imported crayon PNG. No direct engine API or synthetic events.
  const qid='Y1M04-Q010',q=questions.find(x=>x.item_id===qid),qCross=crosswalk.questions.find(x=>x.questionId===qid);
  if(!q||!qCross||q.mechanicId!=='target-shooter'||qCross.mechanic!=='target-shooter')throw Error('CANONICAL_Q010_MECHANIC_CONTRACT_CHANGED');
  const norm=value=>String(value??'').trim().toLocaleLowerCase('en-US');
  const crayon=qCross.options.find(o=>o.mediaId==='IMG-Y1M04-Q010-CRAYON');
  if(!crayon||norm(qCross.correctAnswer)!==norm(crayon.answerKey))throw Error('CANONICAL_Q010_CRAYON_CONTRACT_CHANGED:'+JSON.stringify({correctAnswer:qCross.correctAnswer,option:crayon||null}));
  const wrong=qCross.options.find(o=>norm(o.answerKey)!==norm(qCross.correctAnswer));if(!wrong)throw Error('Q010_WRONG_TARGET_MISSING');
  const videoDir=path.join(output,'video');await mkdir(videoDir,{recursive:true});
  const context=activeContext=await browser.newContext({viewport:{width:1366,height:768},recordVideo:{dir:videoDir}}),page=await context.newPage(),diag=attachDiagnostics(page),events=[];
  const tracePath=path.join(output,'y1m04-q010-playwright-trace.zip');await context.tracing.start({screenshots:true,snapshots:true,sources:false});
  await page.goto(base+'/play/target-shooter/?duduqModule=Y1M04&duduqItem='+qid+'&qaSeed=20261031',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForSelector('#game',{timeout:20000});
  const audio=page.locator('.audio-button').first();await click(page,audio,'instruction-audio-recovery',events);await page.waitForTimeout(700);await click(page,audio,'instruction-audio-replay',events);
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:30000});
  const target=semantic=>page.locator('.target-shooter-target').filter({has:page.locator('img[alt="'+semantic+'"]')});
  const crayonPath=registryById.get(crayon.mediaId)?.urlOrPath;if(!crayonPath)throw Error('Q010_CRAYON_MEDIA_NOT_REGISTERED');
  await page.waitForFunction(expected=>[...document.images].some(i=>new URL(i.src).pathname.replace(/^\//,'')===expected&&i.complete&&i.naturalWidth>0),crayonPath,{timeout:20000});
  // Target backgrounds have decorative IMG alt text like "Alvo com gato";
  // the _playable foreground_ image carries the curricular semantic. The old
  // check counted both and incorrectly rejected real 4-option sessions.
  const expectedSemantics=qCross.options.map(o=>norm(o.semanticTarget||o.answerKey)).sort();
  const identity=await page.locator('.target-shooter-target').evaluateAll((targets,expected)=>{
    const norm=s=>String(s||'').trim().toLocaleLowerCase('en-US');
    return targets.map(t=>{
      const r=t.getBoundingClientRect(),imgs=[...t.querySelectorAll('img')],foreground=imgs.filter(i=>expected.includes(norm(i.alt)));
      const cs=getComputedStyle(t),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {optionSemantics:foreground.map(i=>norm(i.alt)),allImageAlts:imgs.map(i=>i.alt),
        visible:r.width>10&&r.height>10&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&cs.visibility!=='hidden'&&cs.display!=='none',
        centerHitsSelf:hit===t||t.contains(hit),hitTag:hit?.tagName||null,hitClass:String(hit?.className||''),
        rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
    });
  },expectedSemantics);
  const actualSemantics=identity.flatMap(x=>x.optionSemantics).sort();
  if(actualSemantics.length!==expectedSemantics.length||actualSemantics.some((v,i)=>v!==expectedSemantics[i])||
     identity.filter(x=>x.optionSemantics.length===1&&x.visible).length!==expectedSemantics.length){
    const shot=path.join(output,'y1m04-q010-curricular-session-mismatch.png');
    await page.screenshot({path:shot,fullPage:false});
    report.gameplayDiagnostics={stage:'curricular-options-identity',requestedQuestionId:qid,requestedModule:'Y1M04',
      route:page.url(),expectedSemantics,actualSemantics,identity,
      reason:'VISIBLE_PLAYABLE_OPTIONS_DO_NOT_MATCH_CURRICULAR_QUESTION',
      screenshot:path.relative(root,shot).replaceAll('\\','/'),screenshotSha256:sha(await readFile(shot))};
    throw Error('CURRICULAR_SESSION_IDENTITY_MISMATCH:'+JSON.stringify(report.gameplayDiagnostics));
  }
  report.curricularOptionPreflight={questionId:qid,expectedSemantics,actualSemantics,
    targetCount:identity.length,targets:identity,pass:true,scope:'foreground playable option images only; not full pedagogy approval'};
  const initialImages=await visibleCandidateImages(page);
  if(!initialImages.some(i=>i.path===crayonPath&&i.visible))throw Error('Q010_CANDIDATE_CRAYON_NOT_VISIBLE');
  const wrongSemantic=wrong.semanticTarget||wrong.answerKey;
  await click(page,target(wrongSemantic),'select-wrong-'+wrong.answerKey,events);
  try {
    await page.waitForFunction(a=>[...document.querySelectorAll('.target-shooter-target')].some(t=>
      [...t.querySelectorAll('img')].some(i=>i.alt===a)&&['selected','incorrect'].includes(t.dataset.gameplayState)),wrongSemantic,{timeout:10000});
  } catch(error) {
    const state=await page.evaluate(expected=>({
      expected,
      gameState:document.querySelector('#game')?.dataset.duduqInteractionState||null,
      targets:[...document.querySelectorAll('.target-shooter-target')].map(t=>({alt:t.querySelector('img')?.alt||null,state:t.dataset.gameplayState||null,text:t.innerText,
        rect:(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))(t.getBoundingClientRect()),
        hit:(r=>{const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e?{tag:e.tagName,alt:e.closest('.target-shooter-target')?.querySelector('img')?.alt||null,className:String(e.className||'')}:null})(t.getBoundingClientRect())})),
      audio:[...document.querySelectorAll('.audio-button')].map(b=>({text:b.innerText,state:b.dataset.state||null,disabled:b.disabled}))
    }),wrongSemantic);
    const shot=path.join(output,'y1m04-q010-after-wrong-pointer-timeout.png');await page.screenshot({path:shot,fullPage:false}).catch(()=>{});
    report.gameplayDiagnostics={stage:'after-wrong-target-pointer',selectedSemantic:wrongSemantic,wrongOption:wrong,state,events:[...events],pageErrors:diag.errors,requestFailures:diag.failed,
      screenshot:path.relative(root,shot).replaceAll('\\\\','/'),screenshotSha256:await readFile(shot).then(sha).catch(()=>null)};
    throw new Error('WRONG_TARGET_SELECTION_TIMEOUT:'+JSON.stringify(report.gameplayDiagnostics));
  }
  // Some approved Target Shooter builds evaluate the choice immediately.
  // Do not press CONTINUAR as though it were CONFIRMAR.
  // Feedback may be asynchronous and the visible action can be intentionally
  // empty while the shot resolves. Never click an empty/invisible button.
  const wrongResolved=await page.waitForFunction(a=>{
    const t=[...document.querySelectorAll('.target-shooter-target')].find(x=>[...x.querySelectorAll('img')].some(i=>i.alt===a));
    const ribbon=document.querySelector('.feedback-ribbon');
    return t?.dataset.gameplayState==='incorrect'&&ribbon?.dataset.feedback==='incorrect'&&!ribbon.hidden;
  },wrongSemantic,{timeout:3000}).then(()=>true,()=>false);
  if(wrongResolved)events.push({label:'wrong-answer-auto-resolved',input:'visible target and ribbon DOM observation'});
  else {
    const action=page.locator('.feedback-action');
    const actionReady=await page.waitForFunction(()=>{
      const a=document.querySelector('.feedback-action');
      if(!a)return false;
      const s=getComputedStyle(a),r=a.getBoundingClientRect(),label=a.textContent?.trim()||'';
      return r.width>4&&r.height>4&&s.display!=='none'&&s.visibility!=='hidden'&&
        (document.querySelector('#game')?.dataset.duduqInteractionState==='AWAITING_CONFIRM')&&/confirmar/i.test(label);
    },null,{timeout:3000}).then(()=>true,()=>false);
    if(actionReady)await click(page,action,'confirm-wrong-answer',events);
    else events.push({label:'no-confirm-while-processing',input:'read-only DOM observation'});
  }
  await page.waitForFunction(a=>[...document.querySelectorAll('.target-shooter-target')].some(t=>
    [...t.querySelectorAll('img')].some(i=>i.alt===a)&&t.dataset.gameplayState==='incorrect')&&
    document.querySelector('.feedback-ribbon')?.dataset.feedback==='incorrect'&&!document.querySelector('.feedback-ribbon')?.hidden,
    wrong.semanticTarget||wrong.answerKey,{timeout:15000});
  const incorrectShot=path.join(output,'y1m04-q010-incorrect.png');await page.screenshot({path:incorrectShot,fullPage:false});
  const retry=page.locator('.feedback-action'),retryLabel=(await retry.innerText()).replace(/\s+/g,' ').trim();
  if(!/tentar novamente|tentar de novo|try again|retry/i.test(retryLabel))throw Error('VISIBLE_RETRY_CONTROL_MISSING:'+retryLabel);
  await click(page,retry,'retry-after-wrong-answer',events);
  try {
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&![...document.querySelectorAll('.target-shooter-target')].some(t=>t.dataset.gameplayState==='incorrect'),null,{timeout:15000});
  } catch(error) {
    const retryState=await page.evaluate(()=>({
      interactionState:document.querySelector('#game')?.dataset.duduqInteractionState||null,
      gameAttributes:document.querySelector('#game')?Object.fromEntries([...document.querySelector('#game').attributes].map(a=>[a.name,a.value])):{},
      targets:[...document.querySelectorAll('.target-shooter-target')].map(t=>({text:t.innerText,alt:t.querySelector('img')?.alt||null,state:t.dataset.gameplayState||null,rect:(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))(t.getBoundingClientRect())})),
      feedback:document.querySelector('.feedback-ribbon')?{state:document.querySelector('.feedback-ribbon').dataset.feedback,text:document.querySelector('.feedback-ribbon').innerText}:null,
      actions:[...document.querySelectorAll('.feedback-action')].map(b=>({text:b.innerText,disabled:b.disabled,visible:!!(b.offsetWidth||b.offsetHeight||b.getClientRects().length)})),
      audio:[...document.querySelectorAll('.audio-button')].map(b=>({text:b.innerText,state:b.dataset.state||null,disabled:b.disabled}))
    }));
    const shot=path.join(output,'y1m04-q010-after-retry-timeout.png');await page.screenshot({path:shot,fullPage:false}).catch(()=>{});
    report.gameplayDiagnostics={stage:'after-retry-reset-wait',state:retryState,events:[...events],pageErrors:diag.errors,requestFailures:diag.failed,
      screenshot:path.relative(root,shot).replaceAll('\\\\','/'),screenshotSha256:await readFile(shot).then(sha).catch(()=>null)};
    throw new Error('RETRY_RESET_STATE_TIMEOUT:'+JSON.stringify(retryState)+'; '+String(error?.message||error));
  }
  await click(page,target('crayon'),'select-correct-crayon',events);
  await page.waitForFunction(()=>[...document.querySelectorAll('.target-shooter-target')].some(t=>
    [...t.querySelectorAll('img')].some(i=>i.alt==='crayon')&&['selected','correct'].includes(t.dataset.gameplayState)),null,{timeout:10000});
  const correctResolved=await page.waitForFunction(()=>{
    const t=[...document.querySelectorAll('.target-shooter-target')].find(x=>[...x.querySelectorAll('img')].some(i=>i.alt==='crayon'));
    const ribbon=document.querySelector('.feedback-ribbon');
    return t?.dataset.gameplayState==='correct'&&ribbon?.dataset.feedback==='correct'&&!ribbon.hidden;
  },null,{timeout:3000}).then(()=>true,()=>false);
  if(correctResolved)events.push({label:'correct-answer-auto-resolved',input:'visible target and ribbon DOM observation'});
  else {
    const action=page.locator('.feedback-action');
    const actionReady=await page.waitForFunction(()=>{
      const a=document.querySelector('.feedback-action');
      if(!a)return false;
      const s=getComputedStyle(a),r=a.getBoundingClientRect(),label=a.textContent?.trim()||'';
      return r.width>4&&r.height>4&&s.display!=='none'&&s.visibility!=='hidden'&&
        document.querySelector('#game')?.dataset.duduqInteractionState==='AWAITING_CONFIRM'&&/confirmar/i.test(label);
    },null,{timeout:3000}).then(()=>true,()=>false);
    if(actionReady)await click(page,action,'confirm-correct-answer',events);
    else events.push({label:'no-confirm-while-processing',input:'read-only DOM observation'});
  }
  await page.waitForFunction(()=>[...document.querySelectorAll('.target-shooter-target')].some(t=>
    [...t.querySelectorAll('img')].some(i=>i.alt==='crayon')&&t.dataset.gameplayState==='correct')&&
    document.querySelector('.feedback-ribbon')?.dataset.feedback==='correct'&&!document.querySelector('.feedback-ribbon')?.hidden,null,{timeout:15000});
  const correctShot=path.join(output,'y1m04-q010-correct.png');await page.screenshot({path:correctShot,fullPage:false});
  const gameplay={questionId:qid,mechanicId:'target-shooter',candidateMediaId:crayon.mediaId,candidatePath:crayonPath,
    incorrectOption:wrong.answerKey,correctOption:'crayon',events,initialCandidateImages:initialImages,
    retryLabel,
    finalFeedback:await page.locator('.feedback-ribbon').getAttribute('data-feedback'),
    retryVisible:await page.locator('.feedback-action').isVisible(),pageErrors:diag.errors,requestFailures:diag.failed,
    screenshots:await Promise.all([incorrectShot,correctShot].map(async p=>({path:path.relative(root,p).replaceAll('\\','/'),sha256:sha(await readFile(p))})))};
  gameplay.pass=gameplay.finalFeedback==='correct'&&events.filter(e=>e.realMouse).length>=4&&!diag.errors.length&&!diag.failed.length;
  report.gameplay=gameplay;if(!gameplay.pass)throw Error('REAL_Q010_POINTER_GAMEPLAY_FAILED');
  await context.tracing.stop({path:tracePath});traceStopped=true;
  const video=page.video();await page.close();await context.close();
  report.gameplay.trace={path:path.relative(root,tracePath).replaceAll('\\','/'),sha256:sha(await readFile(tracePath))};
  const videoPath=path.join(output,'y1m04-q010-gameplay.webm');await video.saveAs(videoPath);
  report.gameplay.video={path:path.relative(root,videoPath).replaceAll('\\','/'),sha256:sha(await readFile(videoPath))};
  report.status='PASS_CANDIDATE_PREVIEW_ONLY';
}catch(error){report.status='FAIL';report.error=String(error?.stack||error);process.exitCode=1;}
finally{
  if(activeContext&&!traceStopped)await activeContext.tracing.stop({path:path.join(output,'y1m04-q010-playwright-trace-partial.zip')}).catch(()=>{});
  await activeContext?.close().catch(()=>{});
  await browser.close().catch(()=>{});report.finishedAt=new Date().toISOString();
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,routeChecks:report.questions.length,routePasses:report.questions.filter(q=>q.pass).length,
    gameplay:report.gameplay?.pass||false,output:path.relative(root,output).replaceAll('\\','/'),error:report.error||null},null,2));
}
