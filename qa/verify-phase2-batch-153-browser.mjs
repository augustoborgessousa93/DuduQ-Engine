#!/usr/bin/env node
// Browser QA of the NEW 153-ID candidate ONLY; no deploy, no content changes.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
const root=path.resolve('qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const meta=JSON.parse(await readFile('qa/results/phase2-batch-source-integration.json','utf8'));
assert.equal(meta.newMediaIds,153);assert.equal(meta.newPngs,69);assert.equal(meta.answerKeysChanged,0);
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(hash(await readFile(path.join(root,'content/english/media/media-registry.json'))),meta.sha256Registry);
assert.equal(hash(await readFile(path.join(root,'.duduq-pages-manifest'))),meta.sha256Manifest);
const paths=new Map();
for(const binding of meta.bindings){
 if(paths.has(binding.destination))assert.equal(paths.get(binding.destination),binding.sha256);
 paths.set(binding.destination,binding.sha256);
}
assert.equal(paths.size,69);
const out={status:'RUNNING',sourceMediaIds:153,sourceImages:69,contracts:600,productionDeployed:false,releaseApproved:false,pedagogicallyApproved:false,delivery:[],browser:[]};
for(const [rel,sha] of paths){
 assert.equal(hash(await readFile(path.join(root,rel))),sha,'LOCAL_SHA_'+rel);
 const res=await fetch(base+'/'+rel,{signal:AbortSignal.timeout(20000)});
 assert.equal(res.status,200,'HTTP_'+rel);
 assert.equal(hash(Buffer.from(await res.arrayBuffer())),sha,'CDN_SHA_'+rel);
 out.delivery.push({path:rel,pass:true});
}
const questions=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const p='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const data=JSON.parse(await readFile(path.join(root,p),'utf8'));
 assert.equal(data.items.length,20);
 for(const q of data.items)if(meta.affectedQuestionIds.includes(q.item_id))questions.set(q.item_id,q);
}
assert.equal(questions.size,meta.affectedQuestionIds.length);
const focus=['Y1M03-Q001','Y1M06-Q005','Y2M03-Q001','Y3M06-Q003','Y4M05-Q002','Y5M06-Q001','Y2M06-Q001','Y4M06-Q001'];
let ids=focus.filter(x=>questions.has(x));
const mechanicCoverage=new Set(ids.map(x=>questions.get(x).mechanicId));
for(const [id,q] of questions){if(!mechanicCoverage.has(q.mechanicId)){ids.push(id);mechanicCoverage.add(q.mechanicId)}if(ids.length>=9)break}
await mkdir('qa/results/phase2-153-directed-visual',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:390,height:844},{width:1366,height:768}]){
  const ctx=await browser.newContext({viewport,hasTouch:viewport.width<500,reducedMotion:'reduce'});
  for(const id of ids){
   const q=questions.get(id),mech=q.mechanicId,slug=mech.startsWith('smart-sentence')?'smart-sentence':mech;
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,250)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon'))errors.push('HTTP_'+r.status())});
   const row={id,mechanic:mech,viewport:viewport.width,loaded:false,ready:false,visibleImages:0,errors};
   try{
    const response=await page.goto(base+'/play/'+slug+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+'&qaSeed=batch-153',{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response?.status(),200);
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:35000,polling:250});
    row.ready=true;
    const rect=await page.locator('#game').boundingBox();
    assert(rect&&rect.width>240&&rect.height>210);
    await page.waitForTimeout(600);
    for(const f of page.frames())row.visibleImages+=await f.evaluate(()=>[...document.images].filter(im=>{const r=im.getBoundingClientRect(),css=getComputedStyle(im);return im.complete&&im.naturalWidth>0&&r.width>=14&&r.height>=14&&css.display!=='none'&&css.visibility!=='hidden'}).length).catch(()=>0);
    row.loaded=true;
    row.screenshot='qa/results/phase2-153-directed-visual/'+id+'-'+viewport.width+'.png';
    await page.screenshot({path:row.screenshot,animations:'disabled'});
   }catch(e){errors.push(String(e.message||e).slice(0,300))}
   row.pass=row.loaded&&row.ready&&errors.length===0;
   out.browser.push(row);await page.close();
  }
  await ctx.close();
 }
}finally{await browser.close()}
out.status=out.browser.every(x=>x.pass)?'PASS_DIRECTED_DELTA_SMOKE_ONLY':'FAIL_DIRECTED_DELTA_SMOKE';
await writeFile('qa/results/phase2-153-directed-visual-qa.json',JSON.stringify(out,null,2)+'\n');
console.log('PHASE2_DIRECTED_VISUAL='+JSON.stringify({status:out.status,pngs:out.delivery.length,browserPassed:out.browser.filter(x=>x.pass).length,total:out.browser.length,productionDeployed:false}));
assert.equal(out.status,'PASS_DIRECTED_DELTA_SMOKE_ONLY');
