#!/usr/bin/env node
/**
 * Real pointer/touch on native Bubble Pop playable controls (not historical iframe).
 * Uses the existing audited 3-source-PNG/8-binding overlay (no regeneration).
 * No production deployment, no source/gameplay changes, no pedagogical approval.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const hash=b=>createHash('sha256').update(b).digest('hex');
const root=process.cwd(), dist=path.resolve('dist-pages'), base='http://127.0.0.1:4175';
const evidence=JSON.parse(await readFile('qa/results/y4m03-seasons-evidence.json','utf8'));
assert.equal(evidence.status,'SEASON_IMAGES_APPLIED_IN_ISOLATED_QA_NO_DEPLOY');
assert.equal(evidence.questionsVerified,600);
assert.equal(evidence.changedMediaIds,8);
assert.equal(evidence.sourceUniquePNGs,3);
assert.equal(evidence.baselineProductionDeployment,'709a2477-4cfe-4330-b633-7293a35dc1ee');
const manifest=await readFile(path.join(dist,'.duduq-pages-manifest'));
assert.equal(hash(manifest),evidence.candidateManifestSha256,'NOT_PREVIOUS_IMMUTABLE_QA_DELTA');
const reg=JSON.parse(await readFile(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const byId=new Map(reg.entries.map(e=>[e.mediaId,e]));
const changes=evidence.changes.filter(c=>c.affectedQuestionIds.includes('Y4M03-Q006'));
assert(changes.length>=2,'EXPECTED_SEASONS_Q006_BINDINGS');
const paths=[...new Set(changes.map(c=>c.assetPath))];
assert.equal(paths.length,2,'EXPECTED_SUMMER_AND_AUTUMN');
for(const c of changes){
  const entry=byId.get(c.mediaId);
  assert.equal(entry?.urlOrPath,c.assetPath,'BINDING_NOT_IN_TESTED_QA_DELTA');
  assert.equal(entry?.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
  assert.equal(hash(await readFile(path.join(dist,c.assetPath))),c.sha256);
}
const questions=JSON.parse(await readFile(path.join(dist,'content/english/year-4/module-03/questions.json'),'utf8')).items;
const question=questions.find(q=>q.item_id==='Y4M03-Q006');
assert.equal(question?.mechanicId,'bubble-pop','MUST_TEST_REAL_BUBBLE_POP');
await mkdir('qa/results/y4m03-iframe-pointer',{recursive:true});
const report={
  schemaVersion:'DUDUQ_Y4M03_Q006_NESTED_IFRAME_REAL_INPUT_QA_V1',
  baselineRelease:'duduq-phase2-orange-fruit-color-corrected-20261103',
  baselineDeployment:evidence.baselineProductionDeployment,
  candidateManifestSha256:evidence.candidateManifestSha256,
  questionId:question.item_id,
  questionCountPreserved:600,
  originalAssetPaths:paths,
  mediaIds:changes.map(c=>c.mediaId),
  viewports:[], sourceSha256Passed:true, sourceImageBytesUnchanged:true,
  productionDeployed:false, answersModified:false, goldMastersModified:false,
  pedagogicallyApproved:false, fullBubblePopInteractionCertified:false,
  status:'RUNNING'
};
const browser=await chromium.launch({headless:true});
let success=true;
async function inspect(page){
  const out=[];
  for(const frame of page.frames()){
    try{
      const data=await frame.evaluate(assets=>{
        const allImgs=[...document.images], icons=[];
        for(const img of allImgs){
          let url; try{url=new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'');}catch{continue;}
          if(!assets.includes(url))continue;
          const rect=img.getBoundingClientRect(),css=getComputedStyle(img),parent=img.closest('button.bubble-pop-playable');
          const inViewport=rect.right>0&&rect.bottom>0&&rect.left<innerWidth&&rect.top<innerHeight;
          const visible=img.complete&&img.naturalWidth>0&&rect.width>8&&rect.height>8&&
            css.visibility!=='hidden'&&css.display!=='none'&&Number(css.opacity)>0&&inViewport;
          icons.push({path:url,visible,width:rect.width,height:rect.height,naturalWidth:img.naturalWidth,
             naturalHeight:img.naturalHeight,density:Math.min(img.naturalWidth/Math.max(1,rect.width),img.naturalHeight/Math.max(1,rect.height)),
             insideBubbleButton:!!parent,
             buttonDisabled:parent?.disabled??null});
        }
        return {url:location.href,rootFound:!!document.querySelector('.bubble-pop-screen'),
          bubbleCount:document.querySelectorAll('button.bubble-pop-playable').length,
          wrongCount:document.querySelectorAll('.feedback-ribbon[data-feedback="incorrect"]:not([hidden])').length,
          poppedCount:document.querySelectorAll('.bubble-pop-visual[data-frame="ring"]').length,
          recordedClicks:Array.isArray(window.__duduqQaPointerEvents)?window.__duduqQaPointerEvents:[],
          images:icons};
      },paths);
      out.push({...data,frameUrl:frame.url()});
    }catch(e){out.push({frameUrl:frame.url(),error:String(e).slice(0,300)});}
  }
  return out;
}
async function actualPointer(page,mode){
  const results=[];
  for(let attempt=0;attempt<8;attempt++){
    for(const fr of page.frames()){
      let count=0;
      try{count=await fr.locator('button.bubble-pop-playable:not(:disabled)').count();}catch{continue;}
      if(!count)continue;
      await fr.evaluate(()=>{
        if(!Array.isArray(window.__duduqQaPointerEvents)){
          window.__duduqQaPointerEvents=[];
          document.addEventListener('pointerdown',e=>{
            const btn=e.target?.closest?.('button.bubble-pop-playable');
            if(btn)window.__duduqQaPointerEvents.push({
              bubbleId:btn.dataset.bubbleId,aria:btn.getAttribute('aria-label'),
              pointerType:e.pointerType,isTrusted:e.isTrusted,time:Date.now()});
          },true);
        }
      });
      for(let i=0;i<Math.min(count,10);i++){
        const button=fr.locator('button.bubble-pop-playable:not(:disabled)').nth(i);
        try{
          const b=await button.boundingBox();
          if(!b||b.width<16||b.height<16)continue;
          const x=b.x+b.width/2,y=b.y+b.height/2,vp=page.viewportSize();
          if(x<10||y<10||x>vp.width-10||y>vp.height-10)continue;
          const before=await fr.evaluate(()=>window.__duduqQaPointerEvents.length);
          if(mode==='touch')await page.touchscreen.tap(x,y);
          else {await page.mouse.move(x,y,{steps:2});await page.mouse.down();await page.mouse.up();}
          await page.waitForTimeout(150);
          const reaction=await fr.evaluate(()=>({
            pointerEvents:window.__duduqQaPointerEvents.length,
            poppingRings:document.querySelectorAll('.bubble-pop-visual[data-frame="ring"]').length,
            disabledButtons:document.querySelectorAll('button.bubble-pop-playable:disabled').length
          }));
          const after=reaction.pointerEvents;
          const engineReacted=reaction.poppingRings>0&&reaction.disabledButtons>0;
          results.push({mode,attempt,frameUrl:fr.url(),x:Math.round(x),y:Math.round(y),
            observedPointerDown:after>before,engineReacted,reaction,
            events:await fr.evaluate(()=>window.__duduqQaPointerEvents.slice(-3))});
          if(after>before&&engineReacted)return{confirmed:true,results};
        }catch(e){results.push({mode,attempt,error:String(e).slice(0,180)});}
      }
    }
    await page.waitForTimeout(420);
  }
  return{confirmed:false,results};
}
try{
  for(const view of [{name:'desktop',width:1366,height:768,input:'mouse'},
                     {name:'mobile',width:390,height:844,input:'touch'}]){
    const ctx=await browser.newContext({viewport:{width:view.width,height:view.height},
      hasTouch:view.input==='touch',isMobile:view.input==='touch',deviceScaleFactor:1});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e.message||e)));
    const route='/play/bubble-pop/?duduqModule=Y4M03&duduqItem=Y4M03-Q006&qaSeed=seasons-pointer-qa';
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response.status(),200,'TARGET_ROUTE_NOT_200');
    const seen=new Map(),frameKinds=new Set(),samples=[];
    for(let i=0;i<68;i++){
      const snapshot=await inspect(page);
      const now=[];
      for(const f of snapshot){
        if(f.rootFound)frameKinds.add(f.frameUrl);
        for(const img of f.images||[]){
          now.push({path:img.path,frame:f.frameUrl,visible:img.visible});
          if(img.visible){
            const prior=seen.get(img.path);
            if(!prior||(!prior.insideBubbleButton&&img.insideBubbleButton))
              seen.set(img.path,{...img,frameUrl:f.frameUrl,atSample:i});
          }
        }
      }
      if(i%5===0)samples.push({sample:i,frames:snapshot.map(x=>({url:x.frameUrl,bubbles:x.bubbleCount,images:x.images?.length,error:x.error})),images:now});
      if(paths.every(p=>seen.get(p)?.insideBubbleButton))break;
      await page.waitForTimeout(350);
    }
    await page.screenshot({path:'qa/results/y4m03-iframe-pointer/'+view.name+'-before-click.png',fullPage:true});
    const action=await actualPointer(page,view.input);
    await page.waitForTimeout(600);
    const after=await inspect(page);
    for(const f of after)for(const img of f.images||[])if(img.visible&&!seen.has(img.path))
      seen.set(img.path,{...img,frameUrl:f.frameUrl,afterClick:true});
    await page.screenshot({path:'qa/results/y4m03-iframe-pointer/'+view.name+'-after-click.png',fullPage:true});
    const missing=paths.filter(p=>!seen.has(p));
    const inActiveNativeBubble=paths.filter(p=>seen.get(p)?.insideBubbleButton);
    const insufficientDensity=[...seen.values()].filter(x=>x.density<2).map(x=>({path:x.path,density:x.density}));
    const pass=missing.length===0&&inActiveNativeBubble.length===paths.length&&
      insufficientDensity.length===0&&action.confirmed&&errors.length===0;
    if(!pass)success=false;
    report.viewports.push({view:view.name,input:view.input,route,http:response.status(),pass,
      iframeUrls:[...frameKinds],frameCount:page.frames().length,
      observedOriginalImages:[...seen.values()],missing,inActiveNativeBubble,insufficientDensity,
      action,afterInteraction:after.map(f=>({frameUrl:f.frameUrl,bubbleCount:f.bubbleCount,
        wrongCount:f.wrongCount,poppedCount:f.poppedCount,
        recordedClicks:f.recordedClicks})),samples,errors});
    await ctx.close();
  }
}finally{await browser.close();}
report.status=success?'PASS_NATIVE_BUBBLE_POINTERDOWN_AND_BOTH_SEASONS_VISIBLE_PEDAGOGICAL_REVIEW_PENDING':
  'INCOMPLETE_NATIVE_BUBBLE_POINTER_QA_NOT_APPROVED';
await writeFile('qa/results/y4m03-iframe-pointer/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:report.viewports.map(v=>({
 view:v.view,pass:v.pass,observed:v.observedOriginalImages.map(x=>({path:x.path,frame:x.frameUrl,
 insideBubbleButton:x.insideBubbleButton,density:x.density})),missing:v.missing,
 actionConfirmed:v.action.confirmed,frames:v.frameCount})),productionDeployed:false}));
if(!success)process.exitCode=1;
