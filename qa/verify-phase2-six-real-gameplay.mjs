#!/usr/bin/env node
/**
 * Real DOM and click verification of the six previously ambiguous source-media
 * cases. Compiled Gold Masters can use older selectors; never assume current
 * source-release class names exist in the immutable compiled candidate.
 * QA ONLY. Uses actual compiled DOM, not newer Gold Master selectors.
 * Does not alter images, questions, audio, mechanics or production.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const evidence=JSON.parse(await readFile('qa/results/phase2-six-real-failures.json','utf8'));
assert.equal(evidence.sourceRun,41547068602);
assert.equal(evidence.failed.length,6);
assert.deepEqual(evidence.failed.map(x=>x.questionId+'@'+x.viewport).sort(),[
 'Y1M06-Q005@1280','Y1M06-Q005@390','Y4M03-Q001@390',
 'Y4M06-Q010@390','Y5M05-Q011@390','Y5M06-Q016@390']);
const out='qa/results/phase2-six-real-gameplay';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const checks=[];
const pathOf=url=>{try{return decodeURI(new URL(url,base).pathname).replace(/^\/+/,'');}catch{return '';}};
async function probe(page,required){
 const found=[];
 for(const frame of page.frames()){
  try{
   const imgs=await frame.evaluate(paths=>[...document.images].map((im,i)=>{
    const rect=im.getBoundingClientRect(),css=getComputedStyle(im);
    let pathname='';try{pathname=decodeURI(new URL(im.currentSrc||im.src,location.href).pathname).replace(/^\/+/,'');}catch{}
    return {path:pathname,index:i,loaded:im.complete&&im.naturalWidth>0,
     visible:rect.width>12&&rect.height>12&&rect.right>0&&rect.bottom>0&&
      rect.left<innerWidth&&rect.top<innerHeight&&css.visibility!=='hidden'&&
      css.display!=='none'&&Number(css.opacity)>0&&
      im.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}),
     x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),
     height:Math.round(rect.height),clickable:!!im.closest('button,[role="button"]')};
   }).filter(x=>paths.includes(x.path)),required);
   found.push({frame,images:imgs});
  }catch{}
 }
 return found;
}
async function visiblePaths(page,required){
 const hits=await probe(page,required);
 return {paths:[...new Set(hits.flatMap(x=>x.images.filter(i=>i.loaded&&i.visible).map(i=>i.path)))],
  hits:hits.flatMap(x=>x.images.map(i=>({...i,frameUrl:x.frame.url()})))};
}
try{
 for(const f of evidence.failed){
  const viewport={width:f.viewport,height:f.viewport===390?844:800};
  const ctx=await browser.newContext({viewport,hasTouch:f.viewport===390,
   reducedMotion:'reduce',deviceScaleFactor:1});
  const page=await ctx.newPage(),errors=[],httpErrors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
   httpErrors.push(r.status()+' '+r.url())});
  const c={questionId:f.questionId,mechanic:f.mechanic,viewport:f.viewport,
   required:f.required,errors,httpErrors,ready:false,actionObserved:false,
   visiblePaths:[],observedImages:[],status:'RUNNING'};
  checks.push(c);
  try{
   const url=base+'/play/'+f.mechanic+'/?duduqModule='+f.questionId.slice(0,5)+
    '&duduqItem='+f.questionId+'&qaSeed=phase2-six-dom-proof';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(response?.status(),200,'GAME_ROUTE_NOT_200');
   await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
    null,{timeout:35000,polling:250});
   c.ready=true;
   assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),
    'REDUCED_MOTION_SETTING_NOT_APPLIED');
   if(f.mechanic==='memory-quest'){
    // Older compiled Memory Quest builds use a different card selector than
    // the source-release DOM. Find real, square, visible user-clickable cards.
    const cards=[];
    for(const frame of page.frames()){
     const list=await frame.evaluate(()=>[...document.querySelectorAll('button')].map((b,i)=>{
      const r=b.getBoundingClientRect(),s=getComputedStyle(b);
      return {index:i,x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,
       visible:r.width>=65&&r.height>=65&&r.top>=110&&r.bottom<=innerHeight+30&&
        s.visibility!=='hidden'&&s.display!=='none'&&!b.disabled};
     }).filter(x=>x.visible&&x.width/x.height>.55&&x.width/x.height<1.65));
     for(const card of list)cards.push({frame,...card});
    }
    c.cardCandidates=cards.map(({frame,...v})=>({...v,frameUrl:frame.url()}));
    assert(cards.length>=4,'VISIBLE_MEMORY_CARD_BUTTONS_NOT_FOUND');
    for(const card of cards){
     const button=card.frame.locator('button').nth(card.index);
     try{await button.click({timeout:3500});c.actionObserved=true;}
     catch(e){c.clickErrors??=[];c.clickErrors.push(String(e.message||e).slice(0,180));continue;}
     await page.waitForTimeout(400);
     const snapshot=await visiblePaths(page,f.required);
     c.observedImages.push(...snapshot.hits);
     for(const p of snapshot.paths)if(!c.visiblePaths.includes(p))c.visiblePaths.push(p);
     if(f.required.every(p=>c.visiblePaths.includes(p)))break;
    }
    c.actionType='ACTUAL_MEMORY_CARD_BUTTON_CLICKS';
   }else if(f.mechanic==='bubble-pop'){
    // The compiled Bubble Gold Master animates the PNG-bearing controls;
    // accessible reduced-motion mode should expose a stable clickable grid.
    const deadline=Date.now()+14000;
    let hits=[];
    do{
     const snapshot=await visiblePaths(page,f.required);
     hits=snapshot.hits;
     c.observedImages.push(...hits);
     for(const p of snapshot.paths)if(!c.visiblePaths.includes(p))c.visiblePaths.push(p);
     if(f.required.every(p=>c.visiblePaths.includes(p)))break;
     await page.waitForTimeout(250);
    }while(Date.now()<deadline);
    const clickable=hits.find(i=>i.visible&&i.loaded&&i.clickable);
    assert(clickable,'NO_VISIBLE_CLICKABLE_SOURCE_BUBBLE');
    // Real pointer click on the media-bearing control, no synthetic DOM events.
    const target=await probe(page,[clickable.path]);
    const match=target.find(x=>x.images.some(i=>i.visible&&i.loaded&&i.clickable));
    assert(match,'VISIBLE_BUBBLE_CONTROL_DISAPPEARED');
    const image=match.images.find(i=>i.visible&&i.loaded&&i.clickable);
    // Moving bubbles never satisfy Playwright's "stable" requirement.
    // Force only that stability gate: Playwright still sends a real pointer click
    // to the already verified, loaded, on-screen media-bearing element.
    // Playwright force:true still waits for an animated element to stabilize.
    // A real mouse click at the observed visible image center does not.
    const live=await match.frame.locator('img').nth(image.index).evaluate(im=>{
      const r=im.getBoundingClientRect();
      return {x:r.left+r.width/2,y:r.top+r.height/2,
        viewportWidth:innerWidth,viewportHeight:innerHeight};
    });
    assert(live.x>0&&live.x<live.viewportWidth&&live.y>0&&live.y<live.viewportHeight,
      'MOVING_BUBBLE_NOT_IN_VIEWPORT_AT_CLICK');
    const before=await match.frame.evaluate(()=>[...document.querySelectorAll('.duduq-bp-bubble-shell')]
      .map(x=>x.getAttribute('data-popped')+'|'+x.getAttribute('data-wrong')));
    await page.mouse.click(live.x,live.y);
    await page.waitForTimeout(500);
    const after=await match.frame.evaluate(()=>[...document.querySelectorAll('.duduq-bp-bubble-shell')]
      .map(x=>x.getAttribute('data-popped')+'|'+x.getAttribute('data-wrong')));
    c.actionObserved=before.join(',')!==after.join(',');
    c.actionType='ACTUAL_POINTER_CLICK_WITH_BUBBLE_FEEDBACK';
    c.pointer={x:live.x,y:live.y};
    c.feedbackBefore=before;c.feedbackAfter=after;
   }else throw Error('UNEXPECTED_MECHANIC');
   c.status=c.ready&&c.actionObserved&&f.required.every(p=>c.visiblePaths.includes(p))&&
    !errors.length&&!httpErrors.length?'PASS_REAL_GAMEPLAY_QA_ONLY':'FAIL_REAL_GAMEPLAY_QA';
  }catch(e){c.status='FAIL_REAL_GAMEPLAY_QA';c.exception=String(e.message||e).slice(0,550);}
  await page.screenshot({path:out+'/'+f.questionId+'-'+f.viewport+'.png',fullPage:false}).catch(()=>{});
  await ctx.close();
 }
}finally{await browser.close();}
const failed=checks.filter(x=>x.status!=='PASS_REAL_GAMEPLAY_QA_ONLY');
const report={schemaVersion:'DUDUQ_PHASE2_SIX_REAL_DOM_AND_CLICK_QA_V2',
 status:failed.length?'FAIL_REAL_GAMEPLAY_QA':'PASS_REAL_GAMEPLAY_QA_ONLY',
 sourceVisualRun:41547068602,checks:checks.length,failedCount:failed.length,
 cases:checks,productionDeployed:false,pedagogicalQAApproved:false,
 fullNormalMotionQaApproved:false,releaseApproved:false};
await writeFile('qa/results/phase2-six-real-gameplay.json',JSON.stringify(report,null,2)+'\n');
console.log('SIX_REAL_GAMEPLAY_QA='+JSON.stringify({status:report.status,checks:checks.length,
 failed:failed.map(x=>({id:x.questionId,viewport:x.viewport,reason:x.exception||
  x.required.filter(p=>!x.visiblePaths.includes(p))}))}));
assert.equal(failed.length,0,'REAL_GAMEPLAY_QA_FAILED');
