#!/usr/bin/env node
/**
 * Directed visual + transport smoke for a single shared Good Afternoon source:
 * 12 affected compiled questions x mobile/desktop. Genuine browser only.
 * Missing live usage is recorded and blocks this QA, not silently approved.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const root=path.resolve('qa/good-afternoon-source-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const meta=JSON.parse(await readFile('qa/results/phase2-current-good-afternoon-qa.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(meta.affectedQuestions,12);assert.equal(meta.realOccurrences,29);
assert.equal(meta.questionContractsUnchanged,600);assert.equal(meta.productionDeployed,false);
const sourceResponse=await fetch(base+'/'+meta.newPath,{signal:AbortSignal.timeout(20000)});
assert.equal(sourceResponse.status,200,'SOURCE_ASSET_HTTP');
assert((sourceResponse.headers.get('content-type')||'').includes('image/png'),'PNG_CONTENT_TYPE');
assert.equal(hash(Buffer.from(await sourceResponse.arrayBuffer())),meta.sourceSHA256,'PNG_BYTES_NOT_SOURCE');
const reg=await readFile(path.join(root,'content/english/media/media-registry.json'));
assert.equal(hash(reg),meta.newRegistrySha256,'REGISTRY_DRIFT');
const report={schemaVersion:'DUDUQ_CURRENT_GOOD_AFTERNOON_TWELVE_Q_TWENTY_FOUR_VIEWS_QA_V1',
 status:'RUNNING', sourceSHA256:meta.sourceSHA256,affectedQuestions:12,views:[],assetsServed:true,
 screenshotPaths:[],productionDeployed:false,pedagogicalApproved:false};
const dir='qa/results/phase2-current-good-afternoon-views';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const vp of [{width:390,height:844},{width:1280,height:800}]){
  const ctx=await browser.newContext({viewport:vp,hasTouch:vp.width===390,deviceScaleFactor:1});
  const sampledModules=new Set();
  for(const id of meta.affectedQuestionIds){
   const qfile='content/english/year-'+id[1]+'/module-'+id.slice(3,5)+'/questions.json';
   const doc=JSON.parse(await readFile(path.join(root,qfile),'utf8'));
   const q=doc.items.find(x=>x.item_id===id);
   assert(q?.mechanicId,'AFFECTED_QUESTION_GONE:'+id);
   const mech=q.mechanicId;
   const slug=mech.startsWith('smart-sentence')?'smart-sentence':mech;
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
    errors.push('HTTP_'+r.status()+':'+r.url())});
   const row={id,mechanic:mech,viewport:vp.width,httpStatus:null,
    gameReady:false,loadedOfficialImages:0,visibleOfficialImages:0,
    sourceRenderedInDOM:false,pageErrors:errors,pass:false};
   report.views.push(row);
   try{
    const response=await page.goto(base+'/play/'+slug+'/?duduqModule='+id.slice(0,5)+
     '&duduqItem='+id+'&qaSeed=official-good-afternoon-a62',{waitUntil:'domcontentloaded',timeout:45000});
    row.httpStatus=response?.status();
    assert.equal(row.httpStatus,200,'ROUTE_HTTP');
    try{await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
       null,{timeout:20000,polling:250});row.gameReady=true;}catch{errors.push('AUDIO_GATE_READY_NOT_CONFIRMED');}
    // Interrogate actual rendered DOM, never force-replace a background or
    // manually set an image source. Wait for asynchronous mechanics.
    for(let attempt=0;attempt<32;attempt++){
     let hits=0,visible=0;
     for(const frame of page.frames()){
      const state=await frame.evaluate(target=>{
       let found=0,shown=0;
       for(const img of document.querySelectorAll('img')){
        let p='';try{p=new URL(img.currentSrc||img.src,location.href).pathname}catch{}
        if(p!=='/'+target)continue;
        if(img.complete&&img.naturalWidth>0)found++;
        const b=img.getBoundingClientRect(),style=getComputedStyle(img);
        if(img.complete&&img.naturalWidth>0&&b.width>18&&b.height>18&&b.right>0&&b.left<innerWidth&&
           b.top<innerHeight&&b.bottom>0&&style.visibility!=='hidden'&&style.display!=='none')shown++;
       }
       return {found,shown};
      },meta.newPath).catch(()=>({found:0,shown:0}));
      hits+=state.found;visible+=state.shown;
     }
     row.loadedOfficialImages=Math.max(row.loadedOfficialImages,hits);
     row.visibleOfficialImages=Math.max(row.visibleOfficialImages,visible);
     if(visible>0)break;
     await page.waitForTimeout(160);
    }
    row.sourceRenderedInDOM=row.loadedOfficialImages>0;
    // A question may use a shared image behind a card or later stage, so
    // no "pedagogy pass" is implied. Source must at least load where exposed.
    row.pass=row.httpStatus===200&&row.gameReady&&errors.length===0;
    const key=id.slice(0,5)+'-'+vp.width;
    if(!sampledModules.has(key)){
     const shot=dir+'/'+id+'-'+vp.width+'.png';
     await page.screenshot({path:shot,fullPage:false,animations:'disabled'});
     report.screenshotPaths.push(shot);sampledModules.add(key);
    }
   }catch(e){errors.push(String(e.message||e).slice(0,300));}
   await page.close();
  }
  await ctx.close();
 }
}finally{await browser.close();}
report.status=report.views.every(x=>x.pass)&&report.views.some(x=>x.visibleOfficialImages>0)?
 'PASS_TRANSPORT_GAME_BOOT_AND_REPRESENTATIVE_REAL_IMAGE_VISIBILITY_ONLY':
 'FAIL_QA_GAME_BOOT_OR_IMAGE_VISIBILITY';
report.viewsPassed=report.views.filter(x=>x.pass).length;
report.renderedViews=report.views.filter(x=>x.visibleOfficialImages>0).length;
report.noRenderedSourceQuestions=report.views.filter(x=>!x.sourceRenderedInDOM).map(x=>({id:x.id,viewport:x.viewport,mechanic:x.mechanic}));
await writeFile('qa/results/phase2-current-good-afternoon-browser.json',JSON.stringify(report,null,2)+'\n');
console.log('GOOD_AFTERNOON_24_VIEW_QA='+JSON.stringify({
 status:report.status,passed:report.viewsPassed,checks:report.views.length,
 sourceVisibleViews:report.renderedViews,
 noSourceDOM:report.noRenderedSourceQuestions,productionDeployed:false}));
assert.equal(report.status,'PASS_TRANSPORT_GAME_BOOT_AND_REPRESENTATIVE_REAL_IMAGE_VISIBILITY_ONLY',
 'NEW_GOOD_AFTERNOON_NOT_BROWSER_PROVEN');
