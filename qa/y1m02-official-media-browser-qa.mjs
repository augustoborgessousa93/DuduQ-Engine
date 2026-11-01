#!/usr/bin/env node
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {bundleRel,sha256} from './y1m02-official-media-model.mjs';

const root=process.cwd(),base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,''),moduleId='Y1M02';
const out=path.join(root,'qa/results/y1m02-official-media-browser'),reportPath=path.join(out,'report.json');
const questions=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/year-1/module-02/questions.json'),'utf8')).items;
const registry=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/media/media-registry.json'),'utf8'));
const bundle=JSON.parse(await readFile(path.join(root,bundleRel,'batch-manifest.json'),'utf8'));
const bindingIds=new Set(bundle.assets.flatMap(x=>x.bindings.map(b=>b.mediaId))),registryById=new Map(registry.entries.map(x=>[x.mediaId,x])),expectedPaths=new Map();
for(const id of bindingIds){const entry=registryById.get(id);if(!entry)throw Error('MISSING_REGISTRY_ID:'+id);expectedPaths.set(entry.urlOrPath,entry.sha256);}
if(questions.length!==20||bindingIds.size!==93||expectedPaths.size!==10||new Set(expectedPaths.values()).size!==10)throw Error('STALE_Y1M02_BROWSER_QA_INPUT');

await mkdir(out,{recursive:true});
const views={desktop:{width:1366,height:768},tablet:{width:768,height:1024},mobile:{width:390,height:844}};
const routeFor=q=>'/play/'+(q.mechanicId==='smart-sentence-complete'?'smart-sentence':q.mechanicId)+`/?duduqModule=${moduleId}&duduqItem=${q.item_id}&qaSeed=20261030`;
const report={schemaVersion:'DUDUQ_Y1M02_OFFICIAL_MEDIA_BROWSER_QA_V1',createdAt:new Date().toISOString(),status:'RUNNING',base,moduleId,
  actualBrowser:'PLAYWRIGHT_CHROMIUM',nativePointerInput:true,sourcePendingIds:92,postSplitIds:93,usageRecords:94,
  uniquePngHashes:10,runtimePngPaths:10,productionDeployed:false,goldMastersModified:false,routes:[],transport:[],gameplay:null,
  responsiveGameplay:[],screenshots:[],artifacts:{}};
let browser;

function diagnostics(page){
  const pageErrors=[],httpFailures=[],requestFailures=[];page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('response',r=>{const u=new URL(r.url());if(u.origin===new URL(base).origin&&r.status()>=400&&!/favicon\.ico$/.test(u.pathname))httpFailures.push({url:r.url(),status:r.status()});});
  page.on('requestfailed',r=>{const u=new URL(r.url());if(u.origin===new URL(base).origin&&!String(r.failure()?.errorText).includes('ERR_ABORTED'))requestFailures.push({url:r.url(),failure:r.failure()?.errorText||'unknown'});});
  return {pageErrors,httpFailures,requestFailures};
}
async function pointerClick(page,locator,label,events){
  await locator.waitFor({state:'visible',timeout:10000});const box=await locator.boundingBox();if(!box||box.width<2||box.height<2)throw Error('POINTER_TARGET_NOT_VISIBLE:'+label);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(point.x,point.y,{steps:3});await page.mouse.down();await page.mouse.up();
  events?.push({label,point:{x:Number(point.x.toFixed(1)),y:Number(point.y.toFixed(1))},input:'Playwright mouse pointer'});
}
async function touchTap(page,locator,label,events){
  await locator.waitFor({state:'visible',timeout:10000});const box=await locator.boundingBox();
  if(!box||box.width<2||box.height<2)throw Error('TOUCH_TARGET_NOT_VISIBLE:'+label);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};await locator.tap({timeout:10000});
  events?.push({label,point:{x:Number(point.x.toFixed(1)),y:Number(point.y.toFixed(1))},input:'Playwright native touch tap'});
}
const targetByAlt=(page,alt)=>page.locator('.target-shooter-target').filter({has:page.locator(`img[alt="${alt}"]`)});
async function armVisibleResult(page,answerAlt,label){
  const key=label.replace(/[^a-z0-9-]/gi,'-');
  await page.evaluate(({alt,key})=>{
    const target=[...document.querySelectorAll('.target-shooter-target')].find(x=>x.querySelector('.target-shooter-target__animal')?.alt===alt);
    const ribbon=document.querySelector('.feedback-ribbon');if(!target||!ribbon)throw Error('QA_VISIBLE_NODES_MISSING');const store=window.__duduqQaVisibleMutationLog||={},log=[];
    const snapshot=()=>{const r=target.getBoundingClientRect();log.push({at:performance.now(),targetState:target.dataset.gameplayState||null,targetClass:target.className,
      badge:target.querySelector('.target-status-badge')?.getAttribute('aria-label')||null,targetVisible:r.width>20&&r.height>20&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,
      ribbonHidden:ribbon.hidden,feedback:ribbon.dataset.feedback||null,feedbackText:ribbon.textContent.replace(/\s+/g,' ').trim(),rootState:document.querySelector('#game')?.dataset.duduqInteractionState||null});};
    const observer=new MutationObserver(snapshot);observer.observe(target,{attributes:true,subtree:true});observer.observe(ribbon,{attributes:true,subtree:true});store[key]={log,observer};window.__duduqQaVisibleMutationLog=store;snapshot();
  },{alt:answerAlt,key});
  return key;
}
async function waitForVisibleResult(page,key,expectedState){
  await page.waitForFunction(([expected,key])=>window.__duduqQaVisibleMutationLog?.[key]?.log?.some(x=>x.targetState===expected&&x.targetVisible&&x.feedback===expected&&!x.ribbonHidden),[expectedState,key],{timeout:25000});
  return page.evaluate(key=>{const x=window.__duduqQaVisibleMutationLog[key];x.observer.disconnect();return x.log;},key);
}
async function unlockWithInstruction(page,mechanic,events,activate=pointerClick){
  const audio=page.locator('.audio-button').first();await activate(page,audio,mechanic+'-instruction-recovery',events);await page.waitForTimeout(700);
  await activate(page,audio,mechanic+'-instruction-play',events);
  // The second native activation can schedule the required-audio gate after
  // the click task.  Do not accept a stale READY value from the prior task.
  await page.waitForTimeout(600);
  if(mechanic==='target-shooter')await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&!document.querySelector('.target-shooter-target')?.hasAttribute('inert'),null,{timeout:25000});
  else await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&document.querySelector('.bubble-pop-playable img[src*="/chatgpt/"]'),null,{timeout:25000});
  await page.waitForTimeout(250);
  const stableReady=await page.evaluate(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY');
  if(!stableReady)throw Error('REQUIRED_AUDIO_GATE_NOT_STABLY_READY:'+mechanic);
}
async function officialImages(page){
  return page.locator('img').evaluateAll(images=>images.filter(img=>img.src.includes('/chatgpt/')).map(img=>{const r=img.getBoundingClientRect(),cs=getComputedStyle(img);
    return {path:new URL(img.src).pathname.replace(/^\//,''),alt:img.alt,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
      rect:{x:Number(r.x.toFixed(1)),y:Number(r.y.toFixed(1)),width:Number(r.width.toFixed(1)),height:Number(r.height.toFixed(1)),right:Number(r.right.toFixed(1)),bottom:Number(r.bottom.toFixed(1))},
      visible:img.complete&&img.naturalWidth>0&&cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>0&&r.width>=20&&r.height>=20,
      intersectsViewport:r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,objectFit:cs.objectFit};}));
}
async function waitForOfficialImageInViewport(page,timeout=15000){
  await page.waitForFunction(()=>[...document.images].some(img=>{
    if(!img.src.includes('/chatgpt/')||!img.complete||img.naturalWidth<1)return false;
    const r=img.getBoundingClientRect(),cs=getComputedStyle(img);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>0&&r.width>=20&&r.height>=20&&
      r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight;
  }),null,{timeout});
}

async function runTouchGameplay(browser,{name,viewport,route}){
  const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage(),diag=diagnostics(page),events=[];
  try{
    const response=await page.goto(route,{waitUntil:'domcontentloaded',timeout:40000});await page.waitForTimeout(700);
    await unlockWithInstruction(page,'target-shooter',events,touchTap);const images=await officialImages(page);
    const incorrectKey=await armVisibleResult(page,'seven',name+'-observe-incorrect-seven');
    await touchTap(page,targetByAlt(page,'seven'),name+'-select-incorrect-seven',events);
    await page.waitForFunction(()=>{
      const target=[...document.querySelectorAll('.target-shooter-target')].find(x=>x.querySelector('img[alt="seven"]'));
      return target&&['selected','incorrect'].includes(target.dataset.gameplayState||'');
    },null,{timeout:10000});
    const incorrectTransitions=await waitForVisibleResult(page,incorrectKey,'incorrect');
    const incorrectObserved=[...incorrectTransitions].reverse().find(x=>x.targetState==='incorrect'&&x.targetVisible&&x.feedback==='incorrect'&&!x.ribbonHidden);
    if(!incorrectObserved)throw Error('TOUCH_VISIBLE_INCORRECT_TRANSITION_NOT_OBSERVED:'+name);
    const incorrect={state:'incorrect',observed:incorrectObserved,transitions:incorrectTransitions,
      currentState:await targetByAlt(page,'seven').getAttribute('data-gameplay-state'),
      feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),
      interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
    if(incorrect.interactionState==='AWAITING_RETRY'&&!incorrect.feedback.hidden)
      await touchTap(page,page.locator('.feedback-action'),name+'-retry-after-incorrect',events);
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&
      ![...document.querySelectorAll('.target-shooter-target')].some(x=>x.dataset.gameplayState==='incorrect'),null,{timeout:15000});
    const correctKey=await armVisibleResult(page,'six',name+'-observe-correct-six');
    await touchTap(page,targetByAlt(page,'six'),name+'-select-correct-six',events);
    await page.waitForFunction(()=>{
      const target=[...document.querySelectorAll('.target-shooter-target')].find(x=>x.querySelector('img[alt="six"]'));
      return target&&['selected','correct'].includes(target.dataset.gameplayState||'');
    },null,{timeout:10000});
    const correctTransitions=await waitForVisibleResult(page,correctKey,'correct');
    const correctObserved=[...correctTransitions].reverse().find(x=>x.targetState==='correct'&&x.targetVisible&&x.feedback==='correct'&&!x.ribbonHidden);
    if(!correctObserved)throw Error('TOUCH_VISIBLE_CORRECT_TRANSITION_NOT_OBSERVED:'+name);
    const correct={state:'correct',observed:correctObserved,transitions:correctTransitions,
      currentState:await targetByAlt(page,'six').getAttribute('data-gameplay-state'),
      feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),
      interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
    const overflowX=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),iframeCount=await page.locator('iframe').count();
    const screenshotPath=path.join(out,name+'-touch-y1m02-q012-correct.png');await page.screenshot({path:screenshotPath,fullPage:false});
    const screenshotBytes=await readFile(screenshotPath),fullyContainedOfficialImages=images.filter(x=>
      x.rect.x>=0&&x.rect.y>=0&&x.rect.right<=viewport.width&&x.rect.bottom<=viewport.height).length;
    const result={name,viewport,questionId:'Y1M02-Q012',mechanicId:'target-shooter',input:'native Playwright locator touch tap',hasTouch:true,
      httpStatus:response?.status()??null,incorrect,correct,touchEvents:events,officialImages:images,overflowX,iframeCount,fullyContainedOfficialImages,
      pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
      screenshot:{path:path.relative(root,screenshotPath).replaceAll('\\','/'),sha256:sha256(screenshotBytes),bytes:screenshotBytes.length}};
    result.pass=response?.status()===200&&incorrect.observed.targetVisible===true&&correct.observed.targetVisible===true&&events.length>=5&&
      images.length>=4&&fullyContainedOfficialImages===images.length&&images.some(x=>x.alt==='six')&&images.some(x=>x.alt==='seven')&&
      overflowX===0&&iframeCount===0&&!diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length;
    return result;
  }finally{await page.close().catch(()=>{});await context.close().catch(()=>{});}
}

try{
  browser=await chromium.launch({headless:true});const auditContext=await browser.newContext({viewport:views.desktop});
  for(const [assetPath,expectedSha] of [...expectedPaths].sort(([a],[b])=>a.localeCompare(b))){
    const response=await auditContext.request.get(base+'/'+assetPath,{timeout:30000}),body=await response.body(),actual=sha256(body),contentType=response.headers()['content-type']||'';
    const check={path:assetPath,status:response.status(),sha256:actual,expectedSha256:expectedSha,contentType,pass:response.status()===200&&actual===expectedSha&&contentType.startsWith('image/png')};
    report.transport.push(check);if(!check.pass)throw Error('RUNTIME_PNG_TRANSPORT_FAILED:'+assetPath);
  }
  const observed=new Set();
  for(const question of questions){
    const page=await auditContext.newPage(),diag=diagnostics(page),events=[],route=routeFor(question),response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:40000});await page.waitForTimeout(650);
    if(question.mechanicId==='bubble-pop')await unlockWithInstruction(page,'bubble-pop',events);
    await waitForOfficialImageInViewport(page,question.mechanicId==='bubble-pop'?25000:15000);
    const images=await officialImages(page);for(const image of images)observed.add(image.path);const iframeCount=await page.locator('iframe').count();
    const overflowX=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),unknown=images.filter(x=>!expectedPaths.has(x.path)),broken=images.filter(x=>!x.visible),intersecting=images.filter(x=>x.intersectsViewport);
    const check={questionId:question.item_id,mechanicId:question.mechanicId,route,httpStatus:response?.status()??null,officialImageCount:images.length,
      intersectingImageCount:intersecting.length,images,iframeCount,overflowX,pointerEvents:events,pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
      pass:response?.status()===200&&images.length>0&&intersecting.length>0&&!unknown.length&&!broken.length&&iframeCount===0&&overflowX===0&&!diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length};
    report.routes.push(check);await page.close();if(!check.pass)throw Error('QUESTION_ROUTE_MEDIA_QA_FAILED:'+question.item_id+':'+JSON.stringify(check).slice(0,1500));
  }
  await auditContext.close();const missing=[...expectedPaths.keys()].filter(x=>!observed.has(x));if(missing.length)throw Error('RUNTIME_PATHS_NOT_OBSERVED:'+missing.join(','));report.observedRuntimePaths=[...observed].sort();

  await browser.close();browser=await chromium.launch({headless:true});const rawVideo=path.join(out,'video-raw');await mkdir(rawVideo,{recursive:true});
  const gameContext=await browser.newContext({viewport:views.desktop,recordVideo:{dir:rawVideo,size:views.desktop}}),page=await gameContext.newPage(),diag=diagnostics(page),events=[],video=page.video();
  const gameplayRoute=base+'/play/target-shooter/?duduqModule=Y1M02&duduqItem=Y1M02-Q012&qaSeed=20261030';
  await page.goto(gameplayRoute,{waitUntil:'domcontentloaded',timeout:40000});await page.waitForTimeout(700);await unlockWithInstruction(page,'target-shooter',events);const gameplayImages=await officialImages(page);
  const incorrectKey=await armVisibleResult(page,'seven','observe-incorrect-seven');
  await pointerClick(page,targetByAlt(page,'seven'),'select-incorrect-seven',events);await page.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  const incorrectTransitions=await waitForVisibleResult(page,incorrectKey,'incorrect'),incorrectObserved=[...incorrectTransitions].reverse().find(x=>x.targetState==='incorrect'&&x.targetVisible&&x.feedback==='incorrect'&&!x.ribbonHidden);
  if(!incorrectObserved)throw Error('VISIBLE_INCORRECT_TRANSITION_NOT_OBSERVED');
  const incorrect={state:'incorrect',observed:incorrectObserved,transitions:incorrectTransitions,currentState:await targetByAlt(page,'seven').getAttribute('data-gameplay-state'),
    feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
  if(incorrect.interactionState==='AWAITING_RETRY'&&!incorrect.feedback.hidden)await pointerClick(page,page.locator('.feedback-action'),'retry-after-incorrect',events);
  await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY'&&![...document.querySelectorAll('.target-shooter-target')].some(x=>x.dataset.gameplayState==='incorrect'),null,{timeout:15000});
  const correctKey=await armVisibleResult(page,'six','observe-correct-six');
  await pointerClick(page,targetByAlt(page,'six'),'select-correct-six',events);await page.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));
  const correctTransitions=await waitForVisibleResult(page,correctKey,'correct'),correctObserved=[...correctTransitions].reverse().find(x=>x.targetState==='correct'&&x.targetVisible&&x.feedback==='correct'&&!x.ribbonHidden);
  if(!correctObserved)throw Error('VISIBLE_CORRECT_TRANSITION_NOT_OBSERVED');
  const correct={state:'correct',observed:correctObserved,transitions:correctTransitions,currentState:await targetByAlt(page,'six').getAttribute('data-gameplay-state'),
    feedback:await page.locator('.feedback-ribbon').evaluate(e=>({hidden:e.hidden,type:e.dataset.feedback,text:e.textContent.replace(/\s+/g,' ').trim()})),interactionState:await page.locator('#game').getAttribute('data-duduq-interaction-state')};
  report.gameplay={questionId:'Y1M02-Q012',mechanicId:'target-shooter',input:'native Playwright mouse move/down/up',incorrect,correct,pointerEvents:events,
    officialImages:gameplayImages,iframeCount:await page.locator('iframe').count(),pageErrors:diag.pageErrors,httpFailures:diag.httpFailures,requestFailures:diag.requestFailures,
    pass:incorrect.observed.targetVisible===true&&correct.observed.targetVisible===true&&events.length>=5&&gameplayImages.length>=4&&gameplayImages.some(x=>x.alt==='six')&&gameplayImages.some(x=>x.alt==='seven')&&!diag.pageErrors.length&&!diag.httpFailures.length&&!diag.requestFailures.length};
  if(!report.gameplay.pass)throw Error('REAL_POINTER_GAMEPLAY_QA_FAILED');await page.close();
  const videoPath=path.join(out,'y1m02-q012-pointer-gameplay.webm');await video.saveAs(videoPath);await gameContext.close();
  report.artifacts.video={path:path.relative(root,videoPath).replaceAll('\\','/'),sha256:sha256(await readFile(videoPath)),bytes:(await stat(videoPath)).size};

  for(const touchCase of [
    {name:'tablet-768x1024',viewport:views.tablet},
    {name:'mobile-390x844',viewport:views.mobile}
  ]){
    const touchResult=await runTouchGameplay(browser,{...touchCase,route:gameplayRoute});report.responsiveGameplay.push(touchResult);
    if(!touchResult.pass)throw Error('REAL_TOUCH_GAMEPLAY_QA_FAILED:'+touchCase.name+':'+JSON.stringify(touchResult).slice(0,2600));
  }

  const traceContext=await browser.newContext({viewport:views.desktop});await traceContext.tracing.start({screenshots:false,snapshots:false,sources:false,title:'Y1M02 Q012 pointer evidence'});
  const tracePage=await traceContext.newPage(),traceEvents=[];await tracePage.goto(gameplayRoute,{waitUntil:'domcontentloaded',timeout:40000});await tracePage.waitForTimeout(700);
  await unlockWithInstruction(tracePage,'target-shooter',traceEvents);const traceIncorrectKey=await armVisibleResult(tracePage,'seven','trace-observe-incorrect-seven');
  await pointerClick(tracePage,targetByAlt(tracePage,'seven'),'trace-select-incorrect-seven',traceEvents);
  await tracePage.waitForFunction(()=>document.querySelector('.target-shooter-target[data-gameplay-state="selected"]'));await waitForVisibleResult(tracePage,traceIncorrectKey,'incorrect');
  await pointerClick(tracePage,tracePage.locator('.feedback-action'),'trace-retry-after-incorrect',traceEvents);const tracePath=path.join(out,'y1m02-q012-pointer-trace.zip');
  await traceContext.tracing.stop({path:tracePath});await tracePage.close();await traceContext.close();report.artifacts.trace={path:path.relative(root,tracePath).replaceAll('\\','/'),sha256:sha256(await readFile(tracePath)),bytes:(await stat(tracePath)).size,scope:'Native pointer trace through visible incorrect state',pointerEvents:traceEvents};

  const screenshotCases=[
    {name:'desktop-1366x768',viewport:views.desktop,questionId:'Y1M02-Q012',unlock:'target-shooter'},
    {name:'tablet-768x1024',viewport:views.tablet,questionId:'Y1M02-Q010'},
    {name:'mobile-390x844',viewport:views.mobile,questionId:'Y1M02-Q018'}
  ];
  for(const test of screenshotCases){
    const q=questions.find(x=>x.item_id===test.questionId),ctx=await browser.newContext({viewport:test.viewport,reducedMotion:'reduce'}),p=await ctx.newPage();
    await p.goto(base+routeFor(q),{waitUntil:'domcontentloaded',timeout:40000});await p.waitForTimeout(700);if(test.unlock)await unlockWithInstruction(p,test.unlock,[]);
    await p.waitForFunction(()=>[...document.images].some(x=>x.src.includes('/chatgpt/')&&x.complete&&x.naturalWidth>0),null,{timeout:15000});const images=await officialImages(p);
    const overflowX=await p.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth)),iframeCount=await p.locator('iframe').count(),file=path.join(out,test.name+'-'+test.questionId.toLowerCase()+'.png');
    await p.screenshot({path:file,fullPage:false});await ctx.close();const bytes=await readFile(file),record={name:test.name,viewport:test.viewport,questionId:test.questionId,
      path:path.relative(root,file).replaceAll('\\','/'),sha256:sha256(bytes),bytes:bytes.length,officialImageCount:images.length,
      visibleOfficialImages:images.filter(x=>x.visible&&x.intersectsViewport).length,overflowX,iframeCount};
    record.fullyContainedOfficialImages=images.filter(x=>x.rect.x>=0&&x.rect.y>=0&&x.rect.right<=test.viewport.width&&x.rect.bottom<=test.viewport.height).length;
    record.pass=record.officialImageCount>0&&record.visibleOfficialImages===record.officialImageCount&&record.fullyContainedOfficialImages===record.officialImageCount&&overflowX===0&&iframeCount===0;
    report.screenshots.push(record);if(!record.pass)throw Error('RESPONSIVE_SCREENSHOT_QA_FAILED:'+test.name+':'+JSON.stringify(record));
  }
  report.status='PASS';report.passedRoutes=report.routes.filter(x=>x.pass).length;
}catch(error){report.status='FAIL';report.error=String(error?.stack||error).slice(0,5000);process.exitCode=1;}
finally{
  await browser?.close().catch(()=>{});report.finishedAt=new Date().toISOString();await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,report:path.relative(root,reportPath).replaceAll('\\','/'),routes:report.routes.length,
    passedRoutes:report.routes.filter(x=>x.pass).length,transport:report.transport.filter(x=>x.pass).length,gameplay:report.gameplay?.pass||false,
    responsiveGameplay:report.responsiveGameplay.filter(x=>x.pass).length,screenshots:report.screenshots.length,error:report.error||null}));
}
