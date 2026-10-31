#!/usr/bin/env node
/**
 * Native Chromium post-packaging gate: prove FINAL distribution loads
 * V27 adapter without any QA-injected inline CSS. This is NOT a substitute
 * for existing 20-question per-module gameplay and semantic QA.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const cssPath='core/adapters/v27/target-shooter-mobile-containment.css';
const checksum=b=>createHash('sha256').update(b).digest('hex');
const manifest=await readFile('dist-pages/.duduq-pages-manifest','utf8');
const item=manifest.trimEnd().split(/\r?\n/).find(line=>line.startsWith(cssPath+' '));
assert(item,'VERSIONED_MOBILE_ADAPTER_NOT_IN_DISTRIBUTION_MANIFEST');
assert.equal(item.slice(cssPath.length+1),checksum(await readFile(path.join('dist-pages',cssPath))));
const distribution=JSON.parse(await readFile('qa/results/duduq-distribution-candidate.json','utf8'));
assert.equal(distribution.status,'COMPILED_DISTRIBUTION_READY_FOR_RELEASE_GATES_NOT_APPROVED');
assert.equal(distribution.sourceMediaIdsIntegrated,185);
assert.equal(distribution.mobileContainmentLoadedFromVersionedV27,true);
const browser=await chromium.launch({headless:true});
const cases=[],errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 for(const id of ['Y1M04-Q010','Y1M04-Q015','Y1M04-Q020']){
  const page=await context.newPage();
  const localErrors=[];page.on('pageerror',e=>localErrors.push(String(e?.message||e)));
  page.on('response',r=>{
   if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
     localErrors.push('HTTP_'+r.status()+':'+r.url());
  });
  const url=base+'/play/target-shooter/?duduqModule=Y1M04&duduqItem='+id+'&qaSeed=postcompiled-v27';
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response?.status(),200,id+':ROUTE_HTTP_NOT_200');
  await page.waitForFunction(()=>{
   const link=document.querySelector('link[data-duduq-release="v27-target-shooter-mobile"]');
   const targets=[...document.querySelectorAll('.target-shooter-target')];
   return Boolean(link?.sheet&&targets.length===4&&
       targets.every(x=>x.getBoundingClientRect().width>20));
  },null,{timeout:20000});
  const result=await page.evaluate(()=>{
   const link=document.querySelector('link[data-duduq-release="v27-target-shooter-mobile"]');
   const cssLoaded=Boolean(link?.href.includes('/core/adapters/v27/target-shooter-mobile-containment.css')
     &&link.sheet?.cssRules?.length>0);
   const targets=[...document.querySelectorAll('.target-shooter-target')].map(el=>{
    const r=el.getBoundingClientRect();
    const clipX=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0));
    const clipY=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
    return {w:r.width,h:r.height,ratio:clipX*clipY/Math.max(1,r.width*r.height)};
   });
   const images=[...document.querySelectorAll('.target-shooter-target img')].map(img=>({
    alt:img.alt,loaded:img.complete&&img.naturalWidth>0
   }));
   return {cssLoaded,targets,images,qaInlineStylePresent:Boolean(document.querySelector('style[data-duduq-review]')),
    scrollOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
  });
  assert(result.cssLoaded,id+':VERSIONED_CSS_NOT_LOADED');
  assert(!result.qaInlineStylePresent,id+':EPHEMERAL_QA_STYLE_STILL_IN_PRODUCT');
  assert.equal(result.targets.length,4,id+':MISSING_OPTIONS');
  assert(result.targets.every(t=>t.w>=44&&t.h>=44&&t.ratio>=0.98),
    id+':CLIPPED_TARGETS:'+JSON.stringify(result.targets));
  assert.equal(result.scrollOverflow,0,id+':HORIZONTAL_OVERFLOW');
  assert(result.images.length>=4&&result.images.every(i=>i.loaded),id+':MISSING_OPTION_IMAGE');
  assert.equal(localErrors.length,0,id+':BROWSER_ERRORS:'+localErrors.join('|'));
  cases.push({questionId:id,pass:true,...result});
  await page.close();
 }
 await context.close();
}finally{await browser.close();}
const result={schemaVersion:'DUDUQ_V27_POST_COMPILE_BROWSER_QA_V1',
 status:'PASS_VERSIONED_MOBILE_CSS_AND_IMAGE_RENDER_ONLY',
 reviewedQuestions:cases.length,viewport:{width:390,height:844},cases,
 releaseApproved:false,productionDeployed:false};
const out='qa/results/duduq-distribution-browser-verification.json';
await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
