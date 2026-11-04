#!/usr/bin/env node
/** Native Bubble Pop real-input QA for six source-image dynamic cases.
 * No synthetic React state, no mechanic changes, no deployment.
 * Missing choices in finite random animation are recorded, not silently passed.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='http://127.0.0.1:4175',dist=path.resolve('dist-pages');
const bulk=JSON.parse(await readFile('qa/results/bulk/integration-evidence.json','utf8'));
const prev=JSON.parse(await readFile('qa/results/bulk/previous-visual-report.json','utf8'));
assert.equal(bulk.status,'BULK_QUALIFIED_ORIGINAL_IMAGES_APPLIED_QA_ONLY');
assert.equal(bulk.newMediaIds,150);
assert.equal(sha(await readFile(path.join(dist,'.duduq-pages-manifest'))),bulk.candidateManifestSha256);
assert.equal(prev.routesPassed,30);assert.equal(prev.sampleViews,36);
const pending=[...new Set(prev.visualSamples.filter(x=>x.missing?.length>0).map(x=>x.questionId))].sort();
assert.deepEqual(pending,['Y2M03-Q001','Y3M01-Q003','Y4M03-Q001','Y4M05-Q017','Y5M02-Q020','Y5M06-Q016']);
await mkdir('qa/results/bulk/bubble-interactions',{recursive:true});
const report={schemaVersion:'BULK_SIX_BUBBLE_REAL_POINTER_QA_V1',
 candidateManifestSha256:bulk.candidateManifestSha256,
 questionIds:pending,views:[],productionDeployed:false,pedagogicalApproval:'PENDING',
 completeAnswerFlowCertified:false,status:'IN_PROGRESS'};
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{name:'desktop',width:1366,height:768},{name:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
    hasTouch:viewport.name==='mobile',isMobile:viewport.name==='mobile'});
  for(const qid of pending){
   const expected=[...new Set(bulk.acceptedBindings.filter(x=>x.questionIds.includes(qid)).map(x=>x.assetPath))];
   assert(expected.length>=2,'NO_REAL_BINDINGS_IN_BUBBLE_QUESTION:'+qid);
   const page=await context.newPage(),errors=[],seen=new Map(),events=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   const route='/play/bubble-pop/?duduqModule='+qid.split('-Q')[0]+'&duduqItem='+qid+'&qaSeed=phase2-bulk-real-pointer';
   let http=0;
   try{const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});http=response?.status()||0;}
   catch(e){errors.push(String(e));}
   if(http===200)await page.evaluate(()=>{
    window.__duduqPointerQA=[];
    document.addEventListener('pointerdown',ev=>{
      const btn=ev.target?.closest?.('button.bubble-pop-playable');
      if(btn)window.__duduqPointerQA.push({
       at:performance.now(),bubbleId:btn.dataset.bubbleId,pointerType:ev.pointerType,isTrusted:ev.isTrusted});
    },true);
   });
   let engaged=false;
   const start=Date.now();
   while(Date.now()-start<26000){
    let media=[];
    try{media=await page.evaluate(paths=>[...document.images].map(img=>{
      let uri;try{uri=new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'');}catch{return null;}
      if(!paths.includes(uri))return null;
      const r=img.getBoundingClientRect(),st=getComputedStyle(img);
      const visible=img.complete&&img.naturalWidth>0&&r.width>8&&r.height>8&&
        r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&
        st.display!=='none'&&st.visibility!=='hidden'&&Number(st.opacity)>0;
      return{url:uri,visible,density:Math.min(img.naturalWidth/Math.max(1,r.width),img.naturalHeight/Math.max(1,r.height)),
        isInsidePlayable:!!img.closest('button.bubble-pop-playable')};
    }).filter(Boolean),expected);}
    catch(e){errors.push('IMAGE_INSPECTION:'+String(e).slice(0,140));}
    for(const x of media)if(x.visible&&!seen.has(x.url))seen.set(x.url,x);
    if(!engaged){
     const buttons=page.locator('button.bubble-pop-playable:not(:disabled)');
     let count=0;try{count=await buttons.count();}catch{}
     for(let i=0;i<Math.min(8,count);i++){
      try{
       const b=await buttons.nth(i).boundingBox();
       if(!b||b.width<16||b.height<16)continue;
       const x=b.x+b.width/2,y=b.y+b.height/2;
       if(x<12||y<12||x>viewport.width-12||y>viewport.height-12)continue;
       const before=await page.evaluate(()=>window.__duduqPointerQA?.length||0);
       if(viewport.name==='mobile')await page.touchscreen.tap(x,y);
       else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up();}
       await page.waitForTimeout(95);
       const snap=await page.evaluate(()=>({
         recorded:window.__duduqPointerQA?.slice(-4)||[],
         ring:document.querySelectorAll('.bubble-pop-visual[data-frame="ring"]').length,
         disabled:document.querySelectorAll('button.bubble-pop-playable:disabled').length}));
       const verified=snap.recorded.length>before&&snap.recorded.some(e=>e.isTrusted)&&snap.ring>0&&snap.disabled>0;
       events.push({verified,source:viewport.name,x:Math.round(x),y:Math.round(y),...snap});
       if(verified){engaged=true;break;}
      }catch(e){events.push({verified:false,error:String(e).slice(0,190)});}
     }
    }
    if(engaged&&seen.size===expected.length)break;
    await page.waitForTimeout(320);
   }
   await page.screenshot({path:'qa/results/bulk/bubble-interactions/'+viewport.name+'-'+qid+'.png',fullPage:true}).catch(()=>{});
   const missing=expected.filter(x=>!seen.has(x)),lowDensity=[...seen.values()].filter(x=>x.density<2);
   const interactionPass=http===200&&engaged&&errors.length===0&&lowDensity.length===0&&seen.size>0;
   report.views.push({questionId:qid,view:viewport.name,http,expectedImagePaths:expected,
      seenImages:[...seen.values()],missing,lowDensity,engaged,events,errors,interactionPass});
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close();}
const all=report.views.every(x=>x.interactionPass);
report.status=all?'REAL_POINTER_12_OF_12_PASS_DYNAMIC_IMAGE_COVERAGE_REVIEW_REQUIRED':
 'REAL_POINTER_QA_INCOMPLETE_DO_NOT_DEPLOY';
report.interactionPassCount=report.views.filter(x=>x.interactionPass).length;
report.fullImageCoverageCount=report.views.filter(x=>x.missing.length===0).length;
await writeFile('qa/results/bulk/bubble-interactions/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,interactionPass:report.interactionPassCount+'/12',
 fullyObservedImageSets:report.fullImageCoverageCount+'/12',
 visualCasesWithMissing:report.views.filter(x=>x.missing.length).map(x=>({q:x.questionId,view:x.view,missing:x.missing.length})),
 productionDeployed:false}));
if(!all)process.exitCode=1;
