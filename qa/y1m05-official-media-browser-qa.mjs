#!/usr/bin/env node
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const moduleId=process.env.DUDUQ_BROWSER_QA_MODULE||'Y1M05';
const configurations={
  Y1M05:{modulePath:'year-1/module-05',bundle:'y1m05-official-20261030',slug:'y1m05',schemaVersion:'DUDUQ_Y1M05_OFFICIAL_MEDIA_BROWSER_QA_V2',
    sourcePendingIds:101,postSplitIds:101,usageRecords:101,uniquePngs:10,gameplayQuestionId:'Y1M05-Q001',
    incorrectAlt:'hands',correctAlt:'head',screenshots:['Y1M05-Q001','Y1M05-Q003','Y1M05-Q006']},
  Y1M06:{modulePath:'year-1/module-06',bundle:'y1m06-official-20261030',slug:'y1m06',schemaVersion:'DUDUQ_Y1M06_OFFICIAL_MEDIA_BROWSER_QA_V1',
    sourcePendingIds:93,postSplitIds:93,usageRecords:93,uniquePngs:22,gameplayQuestionId:'Y1M06-Q004',
    incorrectAlt:'fish',correctAlt:'cat',screenshots:['Y1M06-Q004','Y1M06-Q014','Y1M06-Q008']}
};
const qa=configuration(moduleId);
function configuration(id){const value=configurations[id];if(!value)throw Error('UNSUPPORTED_MEDIA_BROWSER_QA_MODULE:'+id);return value;}
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const out=path.join(root,`qa/results/${qa.slug}-official-media-browser`);
const reportPath=path.join(out,'report.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const questions=JSON.parse(await readFile(path.join(root,`dist-pages/content/english/${qa.modulePath}/questions.json`),'utf8')).items;
const registry=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/media/media-registry.json'),'utf8'));
const bundle=JSON.parse(await readFile(path.join(root,`qa/media-candidates/${qa.bundle}/batch-manifest.json`),'utf8'));
const bindingIds=new Set(bundle.assets.flatMap(x=>x.bindings.map(b=>b.mediaId)));
const registryById=new Map(registry.entries.map(x=>[x.mediaId,x]));
const expectedPaths=new Map(),expectedPathsByQuestion=new Map(questions.map(question=>[question.item_id,new Set()]));
for(const asset of bundle.assets)for(const binding of asset.bindings){
  const entry=registryById.get(binding.mediaId);if(!entry)throw Error('MISSING_REGISTRY_ID:'+binding.mediaId);
  expectedPaths.set(entry.urlOrPath,entry.sha256);
  const questionPaths=expectedPathsByQuestion.get(binding.questionId);
  if(!questionPaths)throw Error('BINDING_QUESTION_OUTSIDE_MODULE:'+binding.questionId);
  questionPaths.add(entry.urlOrPath);
}
if(questions.length!==20||bindingIds.size!==qa.postSplitIds||expectedPaths.size!==qa.uniquePngs||new Set(expectedPaths.values()).size!==qa.uniquePngs)
  throw Error('STALE_'+moduleId+'_BROWSER_QA_INPUT');
if([...expectedPathsByQuestion.values()].some(paths=>paths.size===0))throw Error('QUESTION_WITHOUT_EXPECTED_OFFICIAL_MEDIA');

await mkdir(out,{recursive:true});
const views={desktop:{width:1366,height:768},tablet:{width:768,height:1024},mobile:{width:390,height:844}};
const routeFor=(q,seed='20261030')=>'/play/'+(q.mechanicId==='smart-sentence-complete'?'smart-sentence':q.mechanicId)+`/?duduqModule=${moduleId}&duduqItem=${q.item_id}&qaSeed=${seed}`;
const report={schemaVersion:qa.schemaVersion,createdAt:new Date().toISOString(),
  status:'RUNNING',base,moduleId,actualBrowser:'PLAYWRIGHT_CHROMIUM',nativePointerInput:true,nativeTouchInput:true,
  sourcePendingIds:qa.sourcePendingIds,postSplitIds:qa.postSplitIds,usageRecords:qa.usageRecords,uniquePngHashes:qa.uniquePngs,runtimePngPaths:qa.uniquePngs,
  productionDeployed:false,goldMastersModified:false,routes:[],dynamicCoverage:[],transport:[],gameplay:null,responsiveGameplay:[],screenshots:[],artifacts:{}};
let browser;

function diagnostics(page){
  const pageErrors=[],httpFailures=[],requestFailures=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('response',r=>{const u=new URL(r.url());if(u.origin===new URL(base).origin&&r.status()>=400&&!/favicon\.ico$/.test(u.pathname))httpFailures.push({url:r.url(),status:r.status()});});
  page.on('requestfailed',r=>{const u=new URL(r.url());if(u.origin===new URL(base).origin&&!String(r.failure()?.errorText).includes('ERR_ABORTED'))requestFailures.push({url:r.url(),failure:r.failure()?.errorText||'unknown'});});
  return {pageErrors,httpFailures,requestFailures};
}
async function pointerClick(page,locator,label,events){
  await locator.waitFor({state:'visible',timeout:10000});
  const box=await locator.boundingBox();
  if(!box||box.width<2||box.height<2)throw Error('POINTER_TARGET_NOT_VISIBLE:'+label);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  await page.mouse.move(point.x,point.y,{steps:3});await page.mouse.down();await page.mouse.up();
  events?.push({label,point:{x:Number(point.x.toFixed(1)),y:Number(point.y.toFixed(1))},input:'Playwright mouse pointer'});
}
async function touchTap(page,locator,label,events){
  await locator.waitFor({state:'visible',timeout:10000});
  await locator.scrollIntoViewIfNeeded();
  const box=await locator.boundingBox();
  if(!box||box.width<2||box.height<2)throw Error('TOUCH_TARGET_NOT_VISIBLE:'+label);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  await locator.tap({position:{x:box.width/2,y:box.height/2}});
  events?.push({label,point:{x:Number(point.x.toFixed(1)),y:Number(point.y.toFixed(1))},input:'Playwright locator touch tap'});
}
const targetByAlt=(page,alt)=>page.locator('.target-shooter-target').filter({has:page.locator(`img[alt="${alt}"]`)});
async function observeVisibleResult(page,answerAlt,expectedState,label){
  const observerKey=label.replace(/[^a-z0-9-]/gi,'-');
  await page.evaluate(({alt,key})=>{
    const target=[...document.querySelectorAll('.target-shooter-target')].find(x=>x.querySelector('.target-shooter-target__animal')?.alt===alt);
    const ribbon=document.querySelector('.feedback-ribbon');if(!target||!ribbon)throw Error('QA_VISIBLE_NODES_MISSING');
    const store=window.__duduqQaVisibleMutationLog ||= {},log=[];
    const snapshot=()=>{const r=target.getBoundingClientRect();log.push({at:performance.now(),targetState:target.dataset.gameplayState||null,
      targetClass:target.className,badge:target.querySelector('.target-status-badge')?.getAttribute('aria-label')||null,
      targetVisible:r.width>20&&r.height>20&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,
      ribbonHidden:ribbon.hidden,feedback:ribbon.dataset.feedback||null,feedbackText:ribbon.textContent.replace(/\s+/g,' ').trim(),
      actionText:ribbon.querySelector('.feedback-action')?.textContent.replace(/\s+/g,' ').trim()||null,
      rootState:document.querySelector('#game')?.dataset.duduqInteractionState||null});};
    const observer=new MutationObserver(snapshot);observer.observe(target,{attributes:true,subtree:true});observer.observe(ribbon,{attributes:true,subtree:true});
    store[key]={log,observer};snapshot();
  },{alt:answerAlt,key:observerKey});
  const expectedAction=expectedState==='correct'?'CONTINUAR':'TENTAR DE NOVO';
  await page.waitForFunction(([expected,action,key])=>window.__duduqQaVisibleMutationLog?.[key]?.log?.some(x=>
    x.targetState===expected&&x.targetVisible===true&&x.feedback===expected&&x.ribbonHidden===false&&x.actionText===action),
    [expectedState,expectedAction,observerKey],{timeout:25000});
  return page.evaluate(key=>{const item=window.__duduqQaVisibleMutationLog[key];item.observer.disconnect();return item.log;},observerKey);
}
async function unlockTargetShooter(page,events,activate=pointerClick){
  const audio=page.locator('.audio-button').first();
  await activate(page,audio,'instruction-audio-recovery',events);await page.waitForTimeout(700);
  await activate(page,audio,'instruction-audio-play',events);
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
    !document.querySelector('.target-shooter-target')?.hasAttribute('inert'),null,{timeout:25000});
}
async function unlockBubble(page,events,expectedQuestionPaths){
  await page.evaluate(expected=>{
    const state={expected:[...expected],loaded:{},observations:{}};
    window.__duduqQaBubbleCoverage=state;
    window.__duduqQaSampleBubbleCoverage=()=>{
      for(const image of document.querySelectorAll('.bubble-pop-playable img[src*="/chatgpt/"]')){
        const path=new URL(image.src).pathname.replace(/^\//,''),rect=image.getBoundingClientRect(),style=getComputedStyle(image);
        if(!state.expected.includes(path))continue;
        state.loaded[path]={naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight};
        const fullyContained=image.complete&&image.naturalWidth>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0&&
          rect.width>=20&&rect.height>=20&&rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight;
        if(fullyContained&&!state.observations[path])state.observations[path]={path,alt:image.alt,
          rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom},
          observedWhileFullyContained:true,at:performance.now()};
      }
      return state.expected.every(path=>state.observations[path]);
    };
  },expectedQuestionPaths);
  const audio=page.locator('.audio-button').first();
  await pointerClick(page,audio,'instruction-audio-recovery',events);await page.waitForTimeout(700);
  await pointerClick(page,audio,'instruction-audio-play',events);
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
    document.querySelector('.bubble-pop-playable img[src*="/chatgpt/"]'),null,{timeout:25000});
  await page.waitForFunction(()=>window.__duduqQaSampleBubbleCoverage?.(),null,{timeout:50000,polling:100}).catch(()=>null);
  return page.evaluate(()=>{
    window.__duduqQaSampleBubbleCoverage?.();
    const state=window.__duduqQaBubbleCoverage,observations=Object.values(state?.observations||{});
    const missingPaths=(state?.expected||[]).filter(path=>!state.observations[path]);
    return {expectedPaths:state?.expected||[],observations,loaded:state?.loaded||{},missingPaths,
      allFullyContained:missingPaths.length===0&&observations.every(item=>item.observedWhileFullyContained===true)};
  });
}
async function officialImages(page){
  return page.locator('img').evaluateAll(images=>images.filter(img=>img.src.includes('/chatgpt/')).map(img=>{
    const r=img.getBoundingClientRect(),cs=getComputedStyle(img);
    return {path:new URL(img.src).pathname.replace(/^\//,''),alt:img.alt,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
      rect:{x:Number(r.x.toFixed(1)),y:Number(r.y.toFixed(1)),width:Number(r.width.toFixed(1)),height:Number(r.height.toFixed(1)),right:Number(r.right.toFixed(1)),bottom:Number(r.bottom.toFixed(1))},
      visible:img.complete&&img.naturalWidth>0&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>0&&r.width>=20&&r.height>=20,
      intersectsViewport:r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,objectFit:cs.objectFit};
  }));
}

async function runTouchGameplay(browser,{name,viewport,route}){
  const context=await browser.newContext({viewport,hasTouch:true});
  const page=await context.newPage(),diag=diagnostics(page),events=[];
  try{
    const response=await page.goto(route,{waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForTimeout(700);await unlockTargetShooter(page,events,touchTap);
    const images=await officialImages(page);

    await touchTap(page,targetByAlt(page,qa.incorrectAlt),name+'-select-incorrect-'+qa.incorrectAlt,events);
    await page.waitForFunction(alt=>{
      const target=[...document.querySelectorAll('.target-shooter-target')].find(x=>x.querySelector('.target-shooter-target__animal')?.alt===alt);
      return target&&['selected','incorrect'].includes(target.dataset.gameplayState||'');
    },qa.incorrectAlt,{timeout:10000});
    const incorrectTransitions=await observeVisibleResult(page,qa.incorrectAlt,'incorrect',name+'-observe-incorrect-'+qa.incorrectAlt);
    const incorrectObserved=[...incorrectTransitions].reverse().find(x=>x.targetState==='incorrect'&&x.targetVisible&&x.feedback==='incorrect'&&!x.ribbonHidden);
    if(!incorrectObserved)throw Error('TOUCH_VISIBLE_INCORRECT_TRANSITION_NOT_OBSERVED:'+name);
    const incorrect={state:'incorrect',observed:incorrectObserved,transitions:incorrectTransitions,
      currentState:await targetByAlt(page,qa.incorrectAlt).getAttribute('data-gameplay-state'),
      feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),
      interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
    if(incorrect.interactionState==='AWAITING_RETRY'&&!incorrect.feedback.hidden)
      await touchTap(page,page.locator('.feedback-action'),name+'-retry-after-incorrect',events);
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
      ![...document.querySelectorAll('.target-shooter-target')].some(x=>x.dataset.gameplayState==='incorrect'),null,{timeout:15000});

    await touchTap(page,targetByAlt(page,qa.correctAlt),name+'-select-correct-'+qa.correctAlt,events);
    await page.waitForFunction(alt=>{
      const target=[...document.querySelectorAll('.target-shooter-target')].find(x=>x.querySelector('.target-shooter-target__animal')?.alt===alt);
      return target&&['selected','correct'].includes(target.dataset.gameplayState||'');
    },qa.correctAlt,{timeout:10000});
    const correctTransitions=await observeVisibleResult(page,qa.correctAlt,'correct',name+'-observe-correct-'+qa.correctAlt);
    const correctObserved=[...correctTransitions].reverse().find(x=>x.targetState==='correct'&&x.targetVisible&&x.feedback==='correct'&&!x.ribbonHidden);
    if(!correctObserved)throw Error('TOUCH_VISIBLE_CORRECT_TRANSITION_NOT_OBSERVED:'+name);
    const correct={state:'correct',observed:correctObserved,transitions:correctTransitions,
      currentState:await targetByAlt(page,qa.correctAlt).getAttribute('data-gameplay-state'),
      feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),
      interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
    const overflowX=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),iframeCount=await page.locator('iframe').count();
    const screenshotPath=path.join(out,name+'-touch-'+qa.gameplayQuestionId.toLowerCase()+'-correct.png');
    await page.screenshot({path:screenshotPath,fullPage:false});
    const screenshotBytes=await readFile(screenshotPath);
    const fullyContainedOfficialImages=images.filter(x=>x.rect.x>=0&&x.rect.y>=0&&x.rect.right<=viewport.width&&x.rect.bottom<=viewport.height).length;
    const result={name,viewport,questionId:qa.gameplayQuestionId,mechanicId:'target-shooter',input:'native Playwright locator touch tap',
      hasTouch:true,httpStatus:response?.status()??null,incorrect,correct,touchEvents:events,officialImages:images,overflowX,iframeCount,
      fullyContainedOfficialImages,
      pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
      screenshot:{path:path.relative(root,screenshotPath).replaceAll('\\','/'),sha256:hash(screenshotBytes),bytes:screenshotBytes.length}};
    result.pass=response?.status()===200&&incorrect.observed.targetVisible===true&&correct.observed.targetVisible===true&&events.length>=5&&
      images.length>=4&&fullyContainedOfficialImages===images.length&&images.some(x=>x.alt===qa.correctAlt)&&images.some(x=>x.alt===qa.incorrectAlt)&&overflowX===0&&iframeCount===0&&
      !diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length;
    return result;
  }finally{await page.close().catch(()=>{});await context.close().catch(()=>{});}
}

try{
  browser=await chromium.launch({headless:true});
  const auditContext=await browser.newContext({viewport:views.desktop,reducedMotion:'reduce'});
  for(const [assetPath,sha256] of [...expectedPaths].sort(([a],[b])=>a.localeCompare(b))){
    const response=await auditContext.request.get(base+'/'+assetPath,{timeout:30000});
    const body=await response.body(),actual=hash(body),contentType=response.headers()['content-type']||'';
    const check={path:assetPath,status:response.status(),sha256:actual,expectedSha256:sha256,contentType,
      pass:response.status()===200&&actual===sha256&&contentType.startsWith('image/png')};
    report.transport.push(check);if(!check.pass)throw Error('RUNTIME_PNG_TRANSPORT_FAILED:'+assetPath);
  }
  const observed=new Set();
  for(const question of questions){
    const page=await auditContext.newPage(),diag=diagnostics(page),events=[];
    const route=routeFor(question),response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForTimeout(650);
    const expectedQuestionPaths=[...(expectedPathsByQuestion.get(question.item_id)||[])].sort();
    const dynamicVisibility=question.mechanicId==='bubble-pop'?await unlockBubble(page,events,expectedQuestionPaths):null;
    await page.waitForFunction(()=>[...document.images].some(x=>x.src.includes('/chatgpt/')&&x.complete&&x.naturalWidth>0),null,{timeout:15000});
    const images=await officialImages(page);for(const image of images)observed.add(image.path);
    for(const observation of dynamicVisibility?.observations||[])if(expectedPaths.has(observation.path))observed.add(observation.path);
    const iframeCount=await page.locator('iframe').count();
    const overflowX=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
    const unknown=images.filter(x=>!expectedPaths.has(x.path)),broken=images.filter(x=>!x.visible),
      unloaded=images.filter(x=>x.naturalWidth<1||x.naturalHeight<1),intersecting=images.filter(x=>x.intersectsViewport);
    const temporalDynamic=question.mechanicId==='bubble-pop'&&dynamicVisibility?.allFullyContained===true&&
      dynamicVisibility.expectedPaths.length===expectedQuestionPaths.length&&dynamicVisibility.missingPaths.length===0;
    const staticVisibility=question.mechanicId!=='bubble-pop'&&intersecting.length>0&&!broken.length;
    const check={questionId:question.item_id,mechanicId:question.mechanicId,route,httpStatus:response?.status()??null,
      expectedQuestionPaths,officialImageCount:images.length,intersectingImageCount:intersecting.length,images,dynamicVisibility,iframeCount,overflowX,
      pointerEvents:events,pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
      pass:response?.status()===200&&images.length>0&&(question.mechanicId==='bubble-pop'?temporalDynamic:staticVisibility)&&
        !unknown.length&&!unloaded.length&&iframeCount===0&&overflowX===0&&!diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length};
    if(dynamicVisibility)report.dynamicCoverage.push({questionId:question.item_id,route,...dynamicVisibility});
    report.routes.push(check);await page.close();
    await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({stage:'QUESTION_ROUTE',moduleId,questionId:question.item_id,pass:check.pass,
      dynamicObserved:dynamicVisibility?.observations?.length||0,dynamicExpected:dynamicVisibility?.expectedPaths?.length||0}));
    if(!check.pass)throw Error('QUESTION_ROUTE_MEDIA_QA_FAILED:'+question.item_id+':'+JSON.stringify(check).slice(0,1200));
  }
  const missing=[...expectedPaths.keys()].filter(x=>!observed.has(x));
  await auditContext.close();
  if(missing.length)throw Error('RUNTIME_PATHS_NOT_OBSERVED_ACROSS_20_QUESTIONS:'+missing.join(','));
  report.observedRuntimePaths=[...observed].sort();

  await browser.close();browser=await chromium.launch({headless:true});
  const rawVideoDir=path.join(out,'video-raw');await mkdir(rawVideoDir,{recursive:true});
  const gameContext=await browser.newContext({viewport:views.desktop,recordVideo:{dir:rawVideoDir,size:views.desktop}});
  const page=await gameContext.newPage(),diag=diagnostics(page),events=[],video=page.video();
  const gameplayRoute=base+`/play/target-shooter/?duduqModule=${moduleId}&duduqItem=${qa.gameplayQuestionId}&qaSeed=20261030`;
  await page.goto(gameplayRoute,{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForTimeout(700);await unlockTargetShooter(page,events);
  const gameplayInitialImages=await officialImages(page);
  await pointerClick(page,targetByAlt(page,qa.incorrectAlt),'select-incorrect-'+qa.incorrectAlt,events);
  await page.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  const incorrectTransitions=await observeVisibleResult(page,qa.incorrectAlt,'incorrect','observe-incorrect-'+qa.incorrectAlt);
  const incorrectObserved=[...incorrectTransitions].reverse().find(x=>x.targetState==='incorrect'&&x.targetVisible&&x.feedback==='incorrect'&&!x.ribbonHidden);
  if(!incorrectObserved)throw Error('VISIBLE_INCORRECT_TRANSITION_NOT_OBSERVED');
  await page.waitForFunction(()=>document.querySelector('.feedback-ribbon')?.dataset.feedback==='incorrect'||
    document.querySelector('#game')?.dataset.duduqInteractionState==='AWAITING_RETRY',null,{timeout:18000});
  const incorrect={state:'incorrect',observed:incorrectObserved,transitions:incorrectTransitions,
    currentState:await targetByAlt(page,qa.incorrectAlt).getAttribute('data-gameplay-state'),
    feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),
    interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
  if(incorrect.interactionState==='AWAITING_RETRY'&&!incorrect.feedback.hidden)await pointerClick(page,page.locator('.feedback-action'),'retry-after-incorrect',events);
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
    ![...document.querySelectorAll('.target-shooter-target')].some(x=>x.dataset.gameplayState==='incorrect'),null,{timeout:15000});
  await pointerClick(page,targetByAlt(page,qa.correctAlt),'select-correct-'+qa.correctAlt,events);
  await page.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  const correctTransitions=await observeVisibleResult(page,qa.correctAlt,'correct','observe-correct-'+qa.correctAlt);
  const correctObserved=[...correctTransitions].reverse().find(x=>x.targetState==='correct'&&x.targetVisible&&x.feedback==='correct'&&!x.ribbonHidden);
  if(!correctObserved)throw Error('VISIBLE_CORRECT_TRANSITION_NOT_OBSERVED');
  const correct={state:'correct',observed:correctObserved,transitions:correctTransitions,
    currentState:await targetByAlt(page,qa.correctAlt).getAttribute('data-gameplay-state')};
  correct.feedback=await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()}));
  correct.interactionState=await page.locator('#game').getAttribute('data-duduq-interaction-state');
  report.gameplay={questionId:qa.gameplayQuestionId,mechanicId:'target-shooter',input:'native Playwright mouse move/down/up',
    incorrect,correct,pointerEvents:events,officialImages:gameplayInitialImages,iframeCount:await page.locator('iframe').count(),
    pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
    pass:incorrect.observed.targetVisible===true&&correct.observed.targetVisible===true&&events.length>=5&&
      gameplayInitialImages.length>=4&&gameplayInitialImages.some(x=>x.alt===qa.correctAlt)&&gameplayInitialImages.some(x=>x.alt===qa.incorrectAlt)&&
      !diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length};
  if(!report.gameplay.pass)throw Error('REAL_POINTER_GAMEPLAY_QA_FAILED');
  await page.close();const videoPath=path.join(out,qa.gameplayQuestionId.toLowerCase()+'-pointer-gameplay.webm');await video.saveAs(videoPath);await gameContext.close();
  report.artifacts.video={path:path.relative(root,videoPath).replaceAll('\\','/'),sha256:hash(await readFile(videoPath)),bytes:(await stat(videoPath)).size};

  for(const touchCase of [
    {name:'tablet-768x1024',viewport:views.tablet},
    {name:'mobile-390x844',viewport:views.mobile}
  ]){
    const touchResult=await runTouchGameplay(browser,{...touchCase,route:gameplayRoute});report.responsiveGameplay.push(touchResult);
    if(!touchResult.pass)throw Error('REAL_TOUCH_GAMEPLAY_QA_FAILED:'+touchCase.name+':'+JSON.stringify(touchResult).slice(0,2400));
  }

  const traceContext=await browser.newContext({viewport:views.desktop});
  await traceContext.tracing.start({screenshots:false,snapshots:false,sources:false,title:qa.gameplayQuestionId+' companion pointer action trace'});
  const tracePage=await traceContext.newPage(),traceEvents=[];
  await tracePage.goto(gameplayRoute,{waitUntil:'domcontentloaded',timeout:40000});await tracePage.waitForTimeout(700);
  await unlockTargetShooter(tracePage,traceEvents);
  await pointerClick(tracePage,targetByAlt(tracePage,qa.incorrectAlt),'trace-select-incorrect-'+qa.incorrectAlt,traceEvents);
  await tracePage.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  await observeVisibleResult(tracePage,qa.incorrectAlt,'incorrect','trace-observe-incorrect-'+qa.incorrectAlt);
  await pointerClick(tracePage,tracePage.locator('.feedback-action'),'trace-retry-after-incorrect',traceEvents);
  const tracePath=path.join(out,qa.gameplayQuestionId.toLowerCase()+'-pointer-trace.zip');
  await traceContext.tracing.stop({path:tracePath});await tracePage.close();await traceContext.close();
  report.artifacts.trace={path:path.relative(root,tracePath).replaceAll('\\','/'),sha256:hash(await readFile(tracePath)),bytes:(await stat(tracePath)).size,
    scope:'Companion clean-context pointer trace through visible incorrect state',pointerEvents:traceEvents};

  const screenshotCases=[
    {name:'desktop-1366x768',viewport:views.desktop,questionId:qa.screenshots[0],unlock:true},
    {name:'tablet-768x1024',viewport:views.tablet,questionId:qa.screenshots[1]},
    {name:'mobile-390x844',viewport:views.mobile,questionId:qa.screenshots[2]}
  ];
  for(const test of screenshotCases){
    const q=questions.find(x=>x.item_id===test.questionId),ctx=await browser.newContext({viewport:test.viewport,reducedMotion:'reduce'}),p=await ctx.newPage();
    await p.goto(base+routeFor(q),{waitUntil:'domcontentloaded',timeout:40000});await p.waitForTimeout(700);
    if(test.unlock)await unlockTargetShooter(p,[]);
    await p.waitForFunction(()=>[...document.images].some(x=>x.src.includes('/chatgpt/')&&x.complete&&x.naturalWidth>0),null,{timeout:15000});
    const images=await officialImages(p),overflowX=await p.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),iframeCount=await p.locator('iframe').count();
    const file=path.join(out,test.name+'-'+test.questionId.toLowerCase()+'.png');await p.screenshot({path:file,fullPage:false});await ctx.close();
    const bytes=await readFile(file),record={name:test.name,viewport:test.viewport,questionId:test.questionId,
      path:path.relative(root,file).replaceAll('\\','/'),sha256:hash(bytes),bytes:bytes.length,officialImageCount:images.length,
      visibleOfficialImages:images.filter(x=>x.visible&&x.intersectsViewport).length,overflowX,iframeCount};
    record.fullyContainedOfficialImages=images.filter(x=>x.rect.x>=0&&x.rect.y>=0&&x.rect.right<=test.viewport.width&&x.rect.bottom<=test.viewport.height).length;
    record.pass=record.officialImageCount>0&&record.visibleOfficialImages===record.officialImageCount&&
      record.fullyContainedOfficialImages===record.officialImageCount&&overflowX===0&&iframeCount===0;
    report.screenshots.push(record);if(!record.pass)throw Error('RESPONSIVE_SCREENSHOT_QA_FAILED:'+test.name);
  }
  report.status='PASS';report.passedRoutes=report.routes.filter(x=>x.pass).length;
}catch(error){report.status='FAIL';report.error=String(error?.stack||error).slice(0,5000);process.exitCode=1;}
finally{
  await browser?.close().catch(()=>{});report.finishedAt=new Date().toISOString();await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,report:path.relative(root,reportPath).replaceAll('\\','/'),routes:report.routes.length,
    passedRoutes:report.routes.filter(x=>x.pass).length,transport:report.transport.filter(x=>x.pass).length,
    gameplay:report.gameplay?.pass||false,touchGameplay:report.responsiveGameplay.filter(x=>x.pass).length,
    screenshots:report.screenshots.length,error:report.error||null}));
}
