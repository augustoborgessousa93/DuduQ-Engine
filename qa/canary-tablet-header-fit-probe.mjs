#!/usr/bin/env node
/**
 * Read-only production/source probe of Canary R147 Core 1.0.12.
 * Candidate CSS is injected into the ephemeral Chromium document only.
 * Never changes the immutable Core/Gold Master, payload, gabarito, or deploy.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const OUT='qa/results/canary-tablet-header-fit';
const viewport={width:768,height:1024};
const patch=`
@media (min-width: 721px) and (max-width: 900px) {
  .duduq-engine-header.duduq-global-progress-header {
    box-sizing:border-box !important;
    display:grid !important;
    grid-template-columns:minmax(0, 1fr) auto !important;
    grid-template-rows:auto auto !important;
    align-items:center !important;
    gap:4px 10px !important;
    width:100% !important;
    max-width:100% !important;
    min-width:0 !important;
    height:auto !important;
  }
  .duduq-engine-header.duduq-global-progress-header > .duduq-engine-header-main {
    grid-column:1 !important;
    grid-row:1 !important;
    min-width:0 !important;
    position:relative !important;
    max-width:100% !important;
  }
  .duduq-engine-header.duduq-global-progress-header > .duduq-engine-toolbar {
    grid-column:2 !important;
    grid-row:1 !important;
    position:relative !important;
    justify-self:end !important;
    max-width:100% !important;
  }
  .duduq-engine-header.duduq-global-progress-header > .duduq-progress-trail {
    box-sizing:border-box !important;
    position:relative !important;
    grid-column:1 / -1 !important;
    grid-row:2 !important;
    left:auto !important; right:auto !important;
    top:auto !important; bottom:auto !important;
    transform:none !important;
    width:100% !important;
    max-width:100% !important;
    min-width:0 !important;
    margin:0 !important;
    justify-self:stretch !important;
  }
  .duduq-engine-header.duduq-global-progress-header .duduq-engine-fullscreen-button {
    position:relative !important;
    left:auto !important; right:auto !important;
    top:auto !important; bottom:auto !important;
    transform:none !important;
  }
}
`;
const browser=await chromium.launch({headless:true});
const report={schemaVersion:'DUDUQ_CANARY_COMPACT_HEADER_FIT_PROBE_V1',
  branch:'QA_ONLY',productionDeployed:false,goldMastersModified:false,
  modules:[],patch,createdAt:new Date().toISOString(),status:'RUNNING'};
await mkdir(OUT,{recursive:true});
try{
  for(const moduleNumber of [1,3]){
    const page=await browser.newPage({viewport});
    const errs=[],failures=[];
    page.on('pageerror',e=>errs.push(String(e)));
    page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))failures.push({status:r.status(),url:r.url()})});
    await page.route('**/engine/channels/canary-v1.json*',async route=>{
      const response=await route.fetch();const manifest=await response.json();
      manifest.core=JSON.parse(JSON.stringify(manifest.core)
        .replaceAll('/engine/releases/core/1.0.11/','/engine/releases/core/1.0.12/')
        .replaceAll('"release":"1.0.11"','"release":"1.0.12"'));
      manifest.status='candidate-core-1.0.12-shared-compact-surface';
      await route.fulfill({response,contentType:'application/json',body:JSON.stringify(manifest)});
    });
    const path='/content/english/year-1/module-'+String(moduleNumber).padStart(2,'0')+'/';
    const response=await page.goto(BASE+path+'?qa=tablet-header-fit-probe',{waitUntil:'domcontentloaded',timeout:35000});
    if(!response?.ok())throw Error('MODULE_HTTP_FAILED:'+path+':'+response?.status());
    await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
    await page.locator('.duduq-intro-start-button').click();
    await page.waitForFunction(()=>{const s=window.DuduQ?.getSession?.();return s&&!s.transitioning&&s.stepIndex===0&&document.querySelector('#root > .duduq-mechanic-frame iframe')?.contentDocument?.body},{timeout:35000});
    await page.waitForFunction((mod)=>{
      const d=document.querySelector('#root > .duduq-mechanic-frame iframe')?.contentDocument;
      return mod===1?d?.querySelectorAll('.duduq-ts-target').length===3:Boolean(d?.querySelector('.duduq-dd2-target[data-dd2-target-id]'));
    },moduleNumber,{timeout:15000});
    const sample=()=>page.evaluate(()=>{
      const f=document.querySelector('#root > .duduq-mechanic-frame iframe');
      const d=f?.contentDocument,v=d?.defaultView;
      if(!d||!v)return null;
      const selectors=['.duduq-engine-header','.duduq-engine-header-main','.duduq-engine-toolbar',
        '.duduq-progress-trail','.duduq-progress-track','.duduq-progress-copy',
        '.duduq-engine-fullscreen-button','.duduq-ts-instruction','.duduq-dd2-instruction'];
      const describe=el=>{
        const r=el.getBoundingClientRect(),s=v.getComputedStyle(el);
        return {node:el.tagName.toLowerCase()+'.'+String(el.className).trim().split(/\s+/).slice(0,3).join('.'),
          parent:el.parentElement?.className||null,x:+r.x.toFixed(1),y:+r.y.toFixed(1),
          right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
          display:s.display,position:s.position,cssLeft:s.left,cssRight:s.right,
          gridColumn:s.gridColumn,gridRow:s.gridRow,overflowX:s.overflowX};
      };
      const named=Object.fromEntries(selectors.map(sel=>[sel,[...d.querySelectorAll(sel)].map(describe)]));
      const header=d.querySelector('.duduq-engine-header');
      const children=header?[...header.children].map(describe):[];
      const controls=[...d.querySelectorAll('button')].filter(el=>el.offsetWidth&&el.offsetHeight).map(describe);
      const targets=[...d.querySelectorAll('.duduq-ts-target,.duduq-dd2-target[data-dd2-target-id]')].map(describe);
      return {viewportWidth:v.innerWidth,scrollWidth:d.body.scrollWidth,docClientWidth:d.documentElement.clientWidth,
        overflowX:Math.max(0,d.body.scrollWidth-d.documentElement.clientWidth),named,children,controls,targets,
        headerRect:header?describe(header):null};
    });
    const before=await sample();
    if(!before)throw Error('RUNTIME_DOCUMENT_MISSING:'+moduleNumber);
    await page.evaluate(css=>{
      const d=document.querySelector('#root > .duduq-mechanic-frame iframe')?.contentDocument;
      if(!d)throw Error('MISSING_IFRAME');
      const style=d.createElement('style');
      style.dataset.duduqQa='tablet-header-fit-v1';
      style.textContent=css;d.head.appendChild(style);
    },patch);
    await page.waitForTimeout(250);
    const after=await sample();
    const screenshot=OUT+'/y1m'+String(moduleNumber).padStart(2,'0')+'-tablet-after.png';
    await page.screenshot({path:screenshot,fullPage:false});
    const inside=el=>el.x>=-3&&el.right<=viewport.width+3;
    const headerItems=[...after.children,...after.controls].filter(x=>x.w>=3&&x.h>=3&&
      /progress|fullscreen|toolbar|header/.test(x.node));
    const visibleHeader=headerItems.every(inside);
    const targetsVisible=after.targets.every(el=>el.w>=44&&el.h>=44&&
      el.x>=-4&&el.right<=viewport.width+4);
    const record={module:'Y1M'+String(moduleNumber).padStart(2,'0'),
      before,after,headerItemsContained:visibleHeader,targetsContained:targetsVisible,
      pageErrors:errs,networkFailures:failures,screenshot,
      pass:after.overflowX<=6&&visibleHeader&&targetsVisible&&errs.length===0&&failures.length===0};
    report.modules.push(record);
    console.log(JSON.stringify({module:record.module,status:record.pass?'PASS':'FAIL',
      beforeOverflow:before.overflowX,afterOverflow:after.overflowX,
      headerItemsContained:visibleHeader,targetsContained:targetsVisible,
      beforeProgress:before.named['.duduq-progress-trail'],afterProgress:after.named['.duduq-progress-trail'],
      afterHeader:after.headerRect}));
    await page.close();
  }
  report.status=report.modules.every(r=>r.pass)?'PASS':'FAIL';
  if(report.status!=='PASS')process.exitCode=1;
}catch(error){
  report.status='FAIL';report.error=String(error?.stack||error);process.exitCode=1;
}finally{
  await browser.close();await writeFile(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,modules:report.modules.length,error:report.error||null}));
}
