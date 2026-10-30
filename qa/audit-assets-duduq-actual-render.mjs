#!/usr/bin/env node
/** QA PREVIEW - diagnostic of media actually rendered inside gameplay.
 * Uses four real 1st question entrypoints. Reports URLs from DOM and network;
 * does not approve pedagogy, images or modify any canonical contracts.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const modules=['Y1M02','Y1M03','Y1M04','Y1M06'];
const report={schemaVersion:'DUDUQ_RENDERED_MEDIA_BROWSER_PROBE_V1',base,
 mode:'READ_ONLY_QA',timestamp:new Date().toISOString(),results:[]};
await mkdir('qa/results/assets-duduq-rendered-media',{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const mod of modules){
  const mm=mod.slice(3),page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const networkImages=[],failures=[],errors=[];
  page.on('response',r=>{if(/\.(png|svg|webp|jpe?g)(?:\?|$)/i.test(r.url()))networkImages.push({url:r.url(),status:r.status()});});
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('requestfailed',r=>{if(!r.failure()?.errorText?.includes('ERR_ABORTED'))failures.push(r.url());});
  const route='/play/english/year-1/module-'+mm+'/';
  const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
  const start=page.getByRole('button',{name:/iniciar jogo/i}).first();
  await start.waitFor({state:'visible',timeout:20000});
  await start.click({timeout:10000});
  await page.waitForURL(url=>url.pathname.includes('/play/')&&!url.pathname.includes('/english/year-1/module-'),{timeout:20000});
  await page.waitForTimeout(mod==='Y1M03'?4500:2000);
  const dom=await page.evaluate(()=>{
    const imgs=[...document.images].map(e=>({src:e.currentSrc||e.getAttribute('src')||'',alt:e.alt||'',visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),loaded:e.complete&&e.naturalWidth>0}));
    const backgrounds=[...document.querySelectorAll('*')].map(e=>({el:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,70):'',bg:getComputedStyle(e).backgroundImage})).filter(x=>/url\(/.test(x.bg)).slice(0,90);
    return {title:document.title,url:location.href,text:(document.body?.innerText||'').slice(0,500),
      imgs,backgrounds,bubbleCount:document.querySelectorAll('.bubble-pop-playable').length,bubbleText:[...document.querySelectorAll('.bubble-pop-playable')].slice(0,12).map(e=>e.innerText)};
  });
  let pinned=dom.imgs.filter(x=>x.src.includes('assets-duduq-review/')),placeholder=dom.imgs.filter(x=>/provisional-semantic|placeholder/.test(x.src));
  let pinnedNetwork=networkImages.filter(x=>x.url.includes('assets-duduq-review/'));
  const item={module:mod,route,firstQuestionUrl:page.url(),httpStatus:response?.status(),
    imageCount:dom.imgs.length,actualPinnedImagesInDOM:pinned.length,
    actualPinnedNetworkRequests:pinnedNetwork.length,placeholderImageURLsInDOM:placeholder.length,
    pinned:pinned.slice(0,15),placeholder:placeholder.slice(0,10),
    networkPinned:pinnedNetwork.slice(0,15),
    firstOtherImgs:dom.imgs.filter(x=>!x.src.includes('core/assets/')).slice(0,30),
    firstBackgrounds:dom.backgrounds.slice(0,20),errorCount:errors.length,
    errors:errors.slice(0,5),networkFailureCount:failures.length,
    gameText:dom.text,bubbleCount:dom.bubbleCount,bubbleText:dom.bubbleText};
  report.results.push(item);
  await page.screenshot({path:path.join('qa/results/assets-duduq-rendered-media',mod+'-q001.png'),fullPage:true}).catch(()=>{});
  console.log('RENDERED_GAME_MEDIA='+JSON.stringify({module:mod,pinned: pinned.length,pinnedNetwork:pinnedNetwork.length,placeholders:placeholder.length,
   url:item.firstQuestionUrl,examples:pinned.slice(0,5).map(x=>x.src),placeholderSamples:placeholder.slice(0,4).map(x=>x.src),otherImgs:item.firstOtherImgs.slice(0,6).map(x=>x.src),gameText:item.gameText,bubbleCount:item.bubbleCount,bubbleText:item.bubbleText,backgrounds:item.firstBackgrounds.slice(0,10),err:errors}));
  await page.close();
 }

 // Verify a color question that uses an image-capable Drag & Drop mechanic;
 // Bubble Pop may display color discs without requesting its media images.
 {
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const url=base+'/play/drag-drop-multimedia/?duduqModule=Y1M03&duduqItem=Y1M03-Q004';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(2600);
  const q=await page.evaluate(()=>({text:(document.body?.innerText||'').slice(0,350),
    urls:[...document.images].map(e=>e.currentSrc||e.getAttribute('src')||''),
    loadedPngs:[...document.images].filter(e=>(e.currentSrc||e.getAttribute('src')||'').includes('assets-duduq-review/')&&e.complete&&e.naturalWidth>0).length,
    title:document.title}));
  const pngs=q.urls.filter(u=>u.includes('assets-duduq-review/'));
  const placeholders=q.urls.filter(u=>/provisional-semantic/.test(u));
  console.log('COLORS_IMAGE_MECHANIC_Q004='+JSON.stringify({url:page.url(),pngs:pngs.length,placeholders:placeholders.length,samples:pngs.slice(0,8),text:q.text}));
  report.additionalColorsQ004={url:page.url(),pngs,loadedPngs:q.loadedPngs,placeholders,text:q.text};
  await page.close();
 }
}finally{await browser.close()}
await writeFile('qa/results/assets-duduq-rendered-media/report.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_RENDERED_MEDIA_SUMMARY='+JSON.stringify(report.results.map(x=>({module:x.module,pngInDOM:x.actualPinnedImagesInDOM,
 pngRequests:x.actualPinnedNetworkRequests,placeholders:x.placeholderImageURLsInDOM,errors:x.errorCount}))));


// A diagnostic workflow must not finish green when its sampled gameplay images
// are missing, broken, or still showing placeholders. These are *technical*
// thresholds for the sampled questions, NOT pedagogical approval or 80-question QA.
// Y1M03-Q001 uses colored bubbles rather than IMG elements, so assert Q004 instead.
const expectedFirstQuestion = new Map([['Y1M02',4],['Y1M04',7],['Y1M06',4]]);
const failures=[];
for(const item of report.results){
 const expected=expectedFirstQuestion.get(item.module);
 if(item.httpStatus!==200)failures.push(item.module+':MODULE_HTTP_'+item.httpStatus);
 if(item.errorCount>0||item.networkFailureCount>0)
  failures.push(item.module+':BROWSER_OR_NETWORK_ERRORS');
 if(item.placeholderImageURLsInDOM!==0)
  failures.push(item.module+':PLACEHOLDER_VISIBLE');
 if(item.pinned.some(x=>!x.loaded)||item.networkPinned.some(x=>x.status!==200))
  failures.push(item.module+':PINNED_IMAGE_NOT_LOADED');
 if(expected!==undefined){
  if(item.actualPinnedImagesInDOM<expected)
   failures.push(item.module+':INSUFFICIENT_PINNED_IMAGES_'+item.actualPinnedImagesInDOM+'_OF_'+expected);
  if(item.actualPinnedNetworkRequests<expected)
   failures.push(item.module+':INSUFFICIENT_PINNED_REQUESTS_'+item.actualPinnedNetworkRequests+'_OF_'+expected);
 }
}
const colors=report.additionalColorsQ004;
if(!colors||colors.pngs.length<4||colors.loadedPngs<4||colors.placeholders.length!==0)
 failures.push('Y1M03-Q004:COLORS_IMAGES_MISSING_OR_UNLOADED');
if(failures.length){
 console.error('DUDUQ_RENDERED_MEDIA_GATE_FAIL='+JSON.stringify(failures));
 process.exitCode=1;
}else{
 console.log('DUDUQ_RENDERED_MEDIA_GATE_PASS=sampled PNGs loaded, no sampled placeholders or JS/network errors; PEDAGOGICAL_QA_PENDING');
}
