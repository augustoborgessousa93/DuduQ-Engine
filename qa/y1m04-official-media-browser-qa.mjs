#!/usr/bin/env node
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const out=path.join(root,'qa/results/y1m04-official-media-browser');
const reportPath=path.join(out,'report.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const questions=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/year-1/module-04/questions.json'),'utf8')).items;
const registry=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/media/media-registry.json'),'utf8'));
const bundle=JSON.parse(await readFile(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json'),'utf8'));
const bindingIds=new Set(bundle.assets.flatMap(x=>x.bindings.map(b=>b.mediaId)));
const registryById=new Map(registry.entries.map(x=>[x.mediaId,x]));
const expectedPaths=new Map();
for(const id of bindingIds){const entry=registryById.get(id);if(!entry)throw Error('MISSING_REGISTRY_ID:'+id);expectedPaths.set(entry.urlOrPath,entry.sha256);}
if(questions.length!==20||bindingIds.size!==84||expectedPaths.size!==18||new Set(expectedPaths.values()).size!==17)
  throw Error('STALE_Y1M04_BROWSER_QA_INPUT');

await mkdir(out,{recursive:true});
const views={desktop:{width:1366,height:768},tablet:{width:768,height:1024},mobile:{width:390,height:844}};
const routeFor=q=>'/play/'+(q.mechanicId==='smart-sentence-complete'?'smart-sentence':q.mechanicId)+'/?duduqModule=Y1M04&duduqItem='+q.item_id+'&qaSeed=20261030';
const report={schemaVersion:'DUDUQ_Y1M04_OFFICIAL_MEDIA_BROWSER_QA_V1',createdAt:new Date().toISOString(),
  status:'RUNNING',base,moduleId:'Y1M04',actualBrowser:'PLAYWRIGHT_CHROMIUM',nativePointerInput:true,
  sourcePendingIds:83,postSplitIds:84,usageRecords:85,uniquePngHashes:17,runtimePngPaths:18,
  productionDeployed:false,goldMastersModified:false,routes:[],transport:[],gameplay:null,screenshots:[],artifacts:{}};
let browser;
let diagnosticGameplayPage=null;

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
async function confirmWithPointerRetry(page,answerAlt,expectedState,label,events){
  const state=()=>page.locator('.target-shooter-target').filter({has:page.locator('img[alt='+answerAlt+']')}).getAttribute('data-gameplay-state');
  const observerKey=label.replace(/[^a-z0-9-]/gi,'-');
  await page.evaluate(({alt,key})=>{
    const target=[...document.querySelectorAll('.target-shooter-target')].find(x=>x.querySelector('.target-shooter-target__animal')?.alt===alt);
    const ribbon=document.querySelector('.feedback-ribbon');if(!target||!ribbon)throw Error('QA_VISIBLE_NODES_MISSING');
    const store=window.__duduqQaVisibleMutationLog ||= {},log=[];
    const snapshot=()=>{const r=target.getBoundingClientRect();log.push({at:performance.now(),targetState:target.dataset.gameplayState||null,
      targetClass:target.className,badge:target.querySelector('.target-status-badge')?.getAttribute('aria-label')||null,
      targetVisible:r.width>20&&r.height>20&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,
      ribbonHidden:ribbon.hidden,feedback:ribbon.dataset.feedback||null,feedbackText:ribbon.textContent.replace(/\s+/g,' ').trim(),
      rootState:document.querySelector('#game')?.dataset.duduqInteractionState||null});};
    const observer=new MutationObserver(snapshot);observer.observe(target,{attributes:true,subtree:true});observer.observe(ribbon,{attributes:true,subtree:true});
    store[key]={log,observer};snapshot();
  },{alt:answerAlt,key:observerKey});
  await page.waitForTimeout(250);
  await pointerClick(page,page.locator('.feedback-action'),label,events);
  const waitOutcome=timeout=>page.waitForFunction(([expected,key])=>window.__duduqQaVisibleMutationLog?.[key]?.log?.some(x=>x.targetState===expected),
    [expectedState,observerKey],{timeout});
  try{await waitOutcome(3000);}
  catch(error){
    const current=await state();
    if(current===expectedState){/* MutationObserver callback will run next. */}
    if(current==='selected')await pointerClick(page,page.locator('.feedback-action'),label+'-pointer-retry',events);
    else events?.push({label:label+'-processing',observedState:current,input:'no additional click while gameplay resolves'});
    await waitOutcome(15000);
  }
  return page.evaluate(key=>{const item=window.__duduqQaVisibleMutationLog[key];item.observer.disconnect();return item.log;},observerKey);
}
async function unlockTargetShooter(page,events){
  const audio=page.locator('.audio-button').first();
  await pointerClick(page,audio,'instruction-audio-recovery',events);await page.waitForTimeout(700);
  await pointerClick(page,audio,'instruction-audio-play',events);
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
    !document.querySelector('.target-shooter-target')?.hasAttribute('inert'),null,{timeout:25000});
}
async function unlockBubble(page,events){
  const audio=page.locator('.audio-button').first();
  await pointerClick(page,audio,'instruction-audio-recovery',events);await page.waitForTimeout(700);
  await pointerClick(page,audio,'instruction-audio-play',events);
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
    document.querySelector('.bubble-pop-playable img[src*="/chatgpt/"]'),null,{timeout:25000});
  const observation=await page.waitForFunction(()=>{
    const img=[...document.querySelectorAll('.bubble-pop-playable img[src*="/chatgpt/"]')].find(candidate=>{
      const r=candidate.getBoundingClientRect();return r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight;
    });
    if(!img)return false;const r=img.getBoundingClientRect();
    return {path:new URL(img.src).pathname.replace(/^\//,''),alt:img.alt,
      rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},observedWhileIntersectingViewport:true};
  },null,{timeout:20000});
  return observation.jsonValue();
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

try{
  browser=await chromium.launch({headless:true});
  const auditContext=await browser.newContext({viewport:views.desktop,reducedMotion:'reduce'});
  // Hash every bound runtime PNG through the same browser transport used by gameplay.
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
    const route=routeFor(question),url=base+route;
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForTimeout(650);
    const dynamicVisibility=question.mechanicId==='bubble-pop'?await unlockBubble(page,events):null;
    await page.waitForFunction(()=>[...document.images].some(x=>x.src.includes('/chatgpt/')&&x.complete&&x.naturalWidth>0),null,{timeout:15000});
    const images=await officialImages(page);for(const image of images)observed.add(image.path);
    const iframeCount=await page.locator('iframe').count();
    const overflowX=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
    const unknown=images.filter(x=>!expectedPaths.has(x.path)),broken=images.filter(x=>!x.visible),intersecting=images.filter(x=>x.intersectsViewport);
    const check={questionId:question.item_id,mechanicId:question.mechanicId,route,httpStatus:response?.status()??null,
      officialImageCount:images.length,intersectingImageCount:intersecting.length,images,dynamicVisibility,iframeCount,overflowX,
      pointerEvents:events,pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
      pass:response?.status()===200&&images.length>0&&(intersecting.length>0||dynamicVisibility?.observedWhileIntersectingViewport===true)&&!unknown.length&&!broken.length&&iframeCount===0&&
        overflowX===0&&!diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length};
    report.routes.push(check);await page.close();
    if(!check.pass)throw Error('QUESTION_ROUTE_MEDIA_QA_FAILED:'+question.item_id+':'+JSON.stringify(check).slice(0,1200));
  }
  await auditContext.close();
  const missing=[...expectedPaths.keys()].filter(x=>!observed.has(x));
  if(missing.length)throw Error('RUNTIME_PATHS_NOT_OBSERVED_ACROSS_20_QUESTIONS:'+missing.join(','));
  report.observedRuntimePaths=[...observed].sort();

  // Audio-heavy route inspection intentionally uses a separate browser
  // process. The recorded gameplay begins from a clean learner session.
  await browser.close();
  browser=await chromium.launch({headless:true});

  // Real incorrect -> visible retry -> correct flow, with native mouse input,
  // trace, video and an observable DOM/visual transition on official pixels.
  const rawVideoDir=path.join(out,'video-raw');await mkdir(rawVideoDir,{recursive:true});
  // Keep the real animation profile for gameplay evidence. Reduced-motion is
  // useful for static route inspection, but this interaction gate must follow
  // the same timing path a learner sees.
  const gameContext=await browser.newContext({viewport:views.desktop,recordVideo:{dir:rawVideoDir,size:views.desktop}});
  const page=await gameContext.newPage(),diag=diagnostics(page),events=[];
  diagnosticGameplayPage=page;
  const video=page.video();
  await page.goto(base+'/play/target-shooter/?duduqModule=Y1M04&duduqItem=Y1M04-Q002&qaSeed=20261030',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForTimeout(700);await unlockTargetShooter(page,events);
  const gameplayStartUrl=page.url(),mainFrameNavigations=[];
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())mainFrameNavigations.push({url:frame.url(),at:new Date().toISOString()});});
  report.gameplayNavigation={initialUrl:gameplayStartUrl,mainFrameNavigations};
  const gameplayInitialImages=await officialImages(page);
  const target=alt=>page.locator('.target-shooter-target').filter({has:page.locator('img[alt='+alt+']')});
  await pointerClick(page,target('blue'),'select-incorrect-blue',events);
  await page.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  const incorrectTransitions=await confirmWithPointerRetry(page,'blue','incorrect','confirm-incorrect-blue',events);
  const incorrectObserved=[...incorrectTransitions].reverse().find(x=>x.targetState==='incorrect'&&x.targetVisible);
  if(!incorrectObserved)throw Error('VISIBLE_INCORRECT_TRANSITION_NOT_OBSERVED');
  await page.waitForFunction(()=>document.querySelector('.feedback-ribbon')?.dataset.feedback==='incorrect'||
    document.querySelector('#game')?.dataset.duduqInteractionState==='AWAITING_RETRY',null,{timeout:18000});
  const incorrect={state:'incorrect',observed:incorrectObserved,transitions:incorrectTransitions,
    currentState:await target('blue').getAttribute('data-gameplay-state'),
    feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),
    interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
  if(incorrect.interactionState==='AWAITING_RETRY'&&!incorrect.feedback.hidden){
    await pointerClick(page,page.locator('.feedback-action'),'retry-after-incorrect',events);
  }
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
    ![...document.querySelectorAll('.target-shooter-target')].some(x=>x.dataset.gameplayState==='incorrect'),null,{timeout:15000});
  await pointerClick(page,target('red'),'select-correct-red',events);
  await page.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  let correctTransitions;
  try{correctTransitions=await confirmWithPointerRetry(page,'red','correct','confirm-correct-red',events);}
  catch(error){
    if(mainFrameNavigations.length||page.url()!==gameplayStartUrl)
      throw Error('UNEXPECTED_GAMEPLAY_NAVIGATION_AFTER_CORRECT_CONFIRM:'+JSON.stringify({from:gameplayStartUrl,to:page.url(),navigations:mainFrameNavigations,underlyingError:String(error)}));
    throw error;
  }
  if(mainFrameNavigations.length||page.url()!==gameplayStartUrl)
    throw Error('UNEXPECTED_GAMEPLAY_NAVIGATION_AFTER_CORRECT_CONFIRM:'+JSON.stringify({from:gameplayStartUrl,to:page.url(),navigations:mainFrameNavigations}));
  const correctObserved=[...correctTransitions].reverse().find(x=>x.targetState==='correct'&&x.targetVisible);
  if(!correctObserved)throw Error('VISIBLE_CORRECT_TRANSITION_NOT_OBSERVED');
  const correct={state:'correct',observed:correctObserved,transitions:correctTransitions,
    currentState:await target('red').getAttribute('data-gameplay-state')};
  await page.waitForFunction(()=>document.querySelector('.feedback-ribbon')?.dataset.feedback==='correct'||
    document.querySelector('#game')?.dataset.duduqInteractionState==='AWAITING_CONTINUE',null,{timeout:18000}).catch(()=>{});
  correct.feedback=await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()}));
  correct.interactionState=await page.locator('#game').getAttribute('data-duduq-interaction-state');
  const gameImages=gameplayInitialImages;
  report.gameplay={questionId:'Y1M04-Q002',mechanicId:'target-shooter',input:'native Playwright mouse move/down/up',
    incorrect,correct,pointerEvents:events,officialImages:gameImages,iframeCount:await page.locator('iframe').count(),
    pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
    pass:incorrect.state==='incorrect'&&incorrect.observed.targetVisible===true&&
      correct.state==='correct'&&correct.observed.targetVisible===true&&
      events.length>=6&&gameImages.length===4&&!diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length};
  if(!report.gameplay.pass)throw Error('REAL_POINTER_GAMEPLAY_QA_FAILED');
  await page.close();const videoPath=path.join(out,'y1m04-q002-pointer-gameplay.webm');await video.saveAs(videoPath);await gameContext.close();
  report.artifacts.video={path:path.relative(root,videoPath).replaceAll('\\','/'),sha256:hash(await readFile(videoPath)),bytes:(await stat(videoPath)).size};

  // A second clean context records the action trace. Running video and trace
  // simultaneously measurably perturbs this audio-timed mechanic; the video
  // above remains the visual proof, while this companion trace records real
  // pointer actions without snapshots or synthetic events.
  const traceContext=await browser.newContext({viewport:views.desktop});
  await traceContext.tracing.start({screenshots:false,snapshots:false,sources:false,title:'Y1M04 Q002 companion pointer action trace'});
  const tracePage=await traceContext.newPage(),traceEvents=[];
  await tracePage.goto(base+'/play/target-shooter/?duduqModule=Y1M04&duduqItem=Y1M04-Q002&qaSeed=20261030',{waitUntil:'domcontentloaded',timeout:40000});
  await tracePage.waitForTimeout(700);await unlockTargetShooter(tracePage,traceEvents);
  const traceTarget=alt=>tracePage.locator('.target-shooter-target').filter({has:tracePage.locator('img[alt='+alt+']')});
  await pointerClick(tracePage,traceTarget('blue'),'trace-select-incorrect-blue',traceEvents);
  await tracePage.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  await confirmWithPointerRetry(tracePage,'blue','incorrect','trace-confirm-incorrect-blue',traceEvents);
  const tracePath=path.join(out,'y1m04-q002-pointer-trace.zip');
  await traceContext.tracing.stop({path:tracePath});await tracePage.close();await traceContext.close();
  report.artifacts.trace={path:path.relative(root,tracePath).replaceAll('\\','/'),sha256:hash(await readFile(tracePath)),bytes:(await stat(tracePath)).size,
    scope:'Companion clean-context pointer trace through visible incorrect state',pointerEvents:traceEvents};

  // Three distinct responsive viewport screenshots, each with real official pixels.
  const screenshotCases=[
    {name:'desktop-1366x768',viewport:views.desktop,questionId:'Y1M04-Q002',unlock:true},
    {name:'tablet-768x1024',viewport:views.tablet,questionId:'Y1M04-Q007'},
    {name:'mobile-390x844',viewport:views.mobile,questionId:'Y1M04-Q008'}
  ];
  for(const test of screenshotCases){
    let file=test.existing,images=gameImages,overflowX=0,iframeCount=0;
    if(!file){
      const q=questions.find(x=>x.item_id===test.questionId),ctx=await browser.newContext({viewport:test.viewport,reducedMotion:'reduce'}),p=await ctx.newPage();
      await p.goto(base+routeFor(q),{waitUntil:'domcontentloaded',timeout:40000});await p.waitForTimeout(700);
      if(test.unlock)await unlockTargetShooter(p,[]);
      await p.waitForFunction(()=>[...document.images].some(x=>x.src.includes('/chatgpt/')&&x.complete&&x.naturalWidth>0),null,{timeout:15000});
      images=await officialImages(p);overflowX=await p.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));iframeCount=await p.locator('iframe').count();
      file=path.join(out,test.name+'-'+test.questionId.toLowerCase()+'.png');await p.screenshot({path:file,fullPage:false});await ctx.close();
    }
    const bytes=await readFile(file),record={name:test.name,viewport:test.viewport,questionId:test.questionId,
      path:path.relative(root,file).replaceAll('\\','/'),sha256:hash(bytes),bytes:bytes.length,officialImageCount:images.length,
      visibleOfficialImages:images.filter(x=>x.visible&&x.intersectsViewport).length,overflowX,iframeCount};
    record.fullyContainedOfficialImages=images.filter(x=>x.rect.x>=0&&x.rect.y>=0&&x.rect.right<=test.viewport.width&&x.rect.bottom<=test.viewport.height).length;
    record.pass=record.officialImageCount>0&&record.visibleOfficialImages===record.officialImageCount&&
      record.fullyContainedOfficialImages===record.officialImageCount&&overflowX===0&&iframeCount===0;report.screenshots.push(record);
    if(!record.pass)throw Error('RESPONSIVE_SCREENSHOT_QA_FAILED:'+test.name);
  }
  report.status='PASS';report.passedRoutes=report.routes.filter(x=>x.pass).length;
}catch(error){
  report.status='FAIL';report.error=String(error?.stack||error).slice(0,5000);process.exitCode=1;
  if(diagnosticGameplayPage&&!diagnosticGameplayPage.isClosed()){
    report.failurePage={url:diagnosticGameplayPage.url()};
    try{
      report.failurePage.dom=await diagnosticGameplayPage.evaluate(()=>({href:location.href,readyState:document.readyState,
        gameState:document.querySelector('#game')?.dataset.duduqInteractionState||null,
        feedback:document.querySelector('.feedback-ribbon')?.dataset.feedback||null}));
    }catch(e){report.failurePage.domError=String(e);}
    try{
      const file=path.join(out,'failure-gameplay-page.png');
      await diagnosticGameplayPage.screenshot({path:file,timeout:7000});
      report.failurePage.screenshot={path:path.relative(root,file).replaceAll('\\\\','/'),sha256:hash(await readFile(file))};
    }catch(e){report.failurePage.screenshotError=String(e);}
  }
}
finally{await browser?.close().catch(()=>{});report.finishedAt=new Date().toISOString();await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,report:path.relative(root,reportPath).replaceAll('\\','/'),routes:report.routes.length,
    passedRoutes:report.routes.filter(x=>x.pass).length,transport:report.transport.filter(x=>x.pass).length,
    gameplay:report.gameplay?.pass||false,screenshots:report.screenshots.length,error:report.error||null}));}
