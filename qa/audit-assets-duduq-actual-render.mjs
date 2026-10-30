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
  await page.waitForTimeout(2000);
  const dom=await page.evaluate(()=>{
    const imgs=[...document.images].map(e=>({src:e.currentSrc||e.getAttribute('src')||'',alt:e.alt||'',visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),loaded:e.complete&&e.naturalWidth>0}));
    const backgrounds=[...document.querySelectorAll('*')].map(e=>({el:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,70):'',bg:getComputedStyle(e).backgroundImage})).filter(x=>/url\(/.test(x.bg)).slice(0,90);
    return {title:document.title,url:location.href,text:(document.body?.innerText||'').slice(0,500),
      imgs,backgrounds};
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
    gameText:dom.text};
  report.results.push(item);
  await page.screenshot({path:path.join('qa/results/assets-duduq-rendered-media',mod+'-q001.png'),fullPage:true}).catch(()=>{});
  console.log('RENDERED_GAME_MEDIA='+JSON.stringify({module:mod,pinned: pinned.length,pinnedNetwork:pinnedNetwork.length,placeholders:placeholder.length,
   url:item.firstQuestionUrl,examples:pinned.slice(0,5).map(x=>x.src),placeholderSamples:placeholder.slice(0,4).map(x=>x.src),otherImgs:item.firstOtherImgs.slice(0,6).map(x=>x.src),err:errors}));
  await page.close();
 }
}finally{await browser.close()}
await writeFile('qa/results/assets-duduq-rendered-media/report.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_RENDERED_MEDIA_SUMMARY='+JSON.stringify(report.results.map(x=>({module:x.module,pngInDOM:x.actualPinnedImagesInDOM,
 pngRequests:x.actualPinnedNetworkRequests,placeholders:x.placeholderImageURLsInDOM,errors:x.errorCount}))));
