#!/usr/bin/env node
/** Check real new-source media on the isolated compiled Pages candidate. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';

const dist=path.resolve('qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const hash=b=>createHash('sha256').update(b).digest('hex');
const batch=process.env.DUDUQ_PHASE2_BATCH==='multilingual'?'multilingual':'new-source';
const reportPrefix=batch==='multilingual'?'phase2-multilingual-source':'phase2-new-source';
const patch=JSON.parse(await readFile('qa/results/'+reportPrefix+'-qa-patch.json','utf8'));
assert.equal(patch.status,'ISOLATED_MEDIA_UPDATED_VISUAL_AND_PEDAGOGICAL_QA_PENDING');
assert.equal(patch.verifiedContracts,600);
assert(!patch.releaseApproved&&!patch.pedagogicalQAApproved&&!patch.productionDeployed);
const registry=JSON.parse(await readFile(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
const lines=(await readFile(path.join(dist,'.duduq-pages-manifest'),'utf8')).trim().split(/\r?\n/);
const integrity=new Map(lines.map(l=>{const i=l.lastIndexOf(' ');return [l.slice(0,i),l.slice(i+1)];}));
for(const b of patch.bindings){
 const e=byId.get(b.mediaId);
 assert(e?.urlOrPath===b.sourcePath&&e?.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING',
  'NEW_SOURCE_BINDING_NOT_ACTIVE:'+b.mediaId);
}
for(const image of patch.images){
 const bytes=await readFile(path.join(dist,image.assetPath));
 assert.equal(hash(bytes),image.sha256,'NEW_SOURCE_LOCAL_PNG_CHANGED:'+image.assetPath);
 assert.equal(integrity.get(image.assetPath),image.sha256,'NEW_SOURCE_MANIFEST_MISMATCH:'+image.assetPath);
 const response=await fetch(base+'/'+image.assetPath);
 assert.equal(response.status,200,'NEW_SOURCE_HTTP_NOT_200:'+image.assetPath);
 assert((response.headers.get('content-type')||'').includes('image/png'),'NEW_SOURCE_NOT_PNG:'+image.assetPath);
 assert.equal(hash(Buffer.from(await response.arrayBuffer())),image.sha256,'NEW_SOURCE_HTTP_HASH_MISMATCH');
}
const out='qa/results/'+reportPrefix+'-browser';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[];
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  const ids=batch==='multilingual'?
   [...new Set(patch.bindings.map(b=>b.questionIds[0]))].sort():patch.changedQuestionIds;
  for(const questionId of ids){
   const data=JSON.parse(await readFile(path.join(dist,
    'content/english/year-'+questionId[1]+'/module-'+questionId.slice(3,5)+'/questions.json'),'utf8'));
   const q=data.items.find(x=>x.item_id===questionId);
   assert(q?.mechanicId,'MISSING_MECHANIC:'+questionId);
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const required=[...new Set(patch.bindings.filter(b=>b.questionIds.includes(questionId)).map(b=>b.sourcePath))];
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
    errors.push('HTTP_'+r.status()+':'+r.url())});
   const response=await page.goto(base+'/play/'+slug+'/?duduqModule='+questionId.slice(0,5)+
    '&duduqItem='+questionId+'&qaSeed=phase2-new-source',{waitUntil:'domcontentloaded',timeout:45000});
   // The released Bubble Pop Gold Master renders inside a child iframe, and its
   // bubbles animate into view. A top-document-only, instantaneous screenshot
   // produces false "missing image" results. Accumulate real visibility over
   // time across ALL frames, without changing the mechanic or audio gates.
   const isBubble=q.mechanicId==='bubble-pop';
   const seenLoaded=new Set(),seenVisible=new Set(),frameDiagnostics=[];
   const probe=async()=>{
    const frames=page.frames(),snapshots=[];
    for(const frame of frames){
     try{
      const snapshot=await frame.evaluate(paths=>{
       const matched=[];
       for(const img of document.images){
        try{
         const url=new URL(img.currentSrc||img.src,document.baseURI);
         const found=decodeURI(url.pathname).replace(/^\/+/,'');
         if(!paths.includes(found))continue;
         const box=img.getBoundingClientRect(),css=getComputedStyle(img);
         const loaded=img.complete&&img.naturalWidth>0;
         const visible=loaded&&box.width>12&&box.height>12&&
          box.right>0&&box.bottom>0&&box.left<innerWidth&&box.top<innerHeight&&
          css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity)>0&&
          img.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
         matched.push({path:found,loaded,visible,box:{x:Math.round(box.x),
          y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)}});
        }catch{}
       }
       return {url:location.href,matching:matched,
        stageState:document.querySelector('#game')?.dataset.duduqInteractionState||null,
        bubbleImages:document.querySelectorAll('.duduq-bp-media').length,
        bubbleArena:document.querySelectorAll('.duduq-bp-arena').length};
      },required);
      snapshots.push(snapshot);
     }catch(e){snapshots.push({url:frame.url(),error:String(e.message||e).slice(0,160),matching:[]});}
    }
    for(const f of snapshots)for(const m of f.matching||[]){
     if(m.loaded)seenLoaded.add(m.path);
     if(m.visible)seenVisible.add(m.path);
    }
    frameDiagnostics.splice(0,frameDiagnostics.length,...snapshots);
    return {loadedPaths:[...seenLoaded],visiblePaths:[...seenVisible],
     frames:snapshots.length,bubbleFrameSeen:snapshots.some(f=>f.bubbleArena>0),
     bubbleImageElements:snapshots.reduce((a,f)=>a+(f.bubbleImages||0),0),
     mainInteractionState:snapshots[0]?.stageState||null,
     textLength:await page.evaluate(()=>document.body?.innerText?.length||0)};
   };
   // The required instruction narration may temporarily lock the board. Do
   // not mistake the audio gate for a blank mechanic. This only waits; it does
   // not skip, mute or alter the student's instructional audio.
   if(isBubble){
    try{
     await page.waitForFunction(()=>
      document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
      null,{timeout:12000,polling:250});
    }catch{}
   }
   const deadline=Date.now()+(isBubble?18000:10000);
   let state;
   do{
    state=await probe();
    const allLoaded=required.every(p=>seenLoaded.has(p));
    const allVisible=required.every(p=>seenVisible.has(p));
    if(allLoaded&&allVisible)break;
    if(Date.now()>=deadline)break;
    await page.waitForTimeout(isBubble?300:250);
   }while(true);
   const filename=out+'/'+questionId+'-'+viewport.width+'.png';
   await page.screenshot({path:filename,fullPage:false});
   checks.push({questionId,mechanic:q.mechanicId,viewport:viewport.width,status:response?.status(),
    required,errors,...state,frameDiagnostics,screenshot:filename});
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
const failed=checks.filter(c=>c.status!==200||c.errors.length>0||c.textLength<20||
 c.required.some(p=>!c.visiblePaths.includes(p)));
const report={status:failed.length?'FAIL_NEW_SOURCE_REAL_BROWSER':'PASS_NEW_SOURCE_REAL_BROWSER_QA_ONLY',
 sourceCommit:patch.sourceCommit,mediaIds:patch.changedMediaIds,images:patch.images.length,
 questions:patch.changedQuestionCount,checks:checks.length,failed:failed.map(c=>({
 questionId:c.questionId,viewport:c.viewport,errors:c.errors,
 missing:c.required.filter(p=>!c.visiblePaths.includes(p))})),
 cases:checks,productionDeployed:false,releaseApproved:false,pedagogicalQAApproved:false};
await writeFile('qa/results/'+reportPrefix+'-browser.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,mediaIds:report.mediaIds,images:report.images,
 checks:report.checks,failures:failed.length}));
assert.equal(failed.length,0,'NEW_SOURCE_VISIBILITY_NOT_FULLY_VERIFIED');
