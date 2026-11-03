#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
const base='http://127.0.0.1:4175',root=path.resolve('dist-pages');
const details=JSON.parse(await readFile('qa/results/y1-greetings-batch/report.json','utf8'));
assert.equal(details.questions,600);assert.equal(details.year1Questions,120);assert.equal(details.answerKeysChanged,0);
const reg=JSON.parse(await readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const index=new Map(reg.entries.map(e=>[e.mediaId,e]));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(await readFile(path.join(root,'content/english/media/media-registry.json'))),details.registryHash);
assert.equal(sha(await readFile(path.join(root,'.duduq-pages-manifest'))),details.manifestHash);
const reference={
 morning:'IMG-Y1M01-GREETING-MORNING-ORIGINAL-20261103',
 school:'IMG-Y1M01-MORNING-SCHOOL-ARRIVAL-20261103',
 afternoon:'IMG-Y1M01-GREETING-AFTERNOON-OFFICIAL-20261103',
 night:'IMG-Y1M01-NIGHT-OFFICIAL-20261103',
 sleep:'IMG-Y1M01-SLEEP-OFFICIAL-20261103',
 orange:'IMG-Y1M03-Q016-ORANGE'};
const resolved={};
for(const [name,id] of Object.entries(reference)){
 const entry=index.get(id);assert(entry?.urlOrPath?.endsWith('.png'),'SOURCE_MISSING_'+name);
 const bytes=await readFile(path.join(root,entry.urlOrPath));assert.equal(sha(bytes),entry.sha256,'SHA_MISMATCH_'+name);
 const r=await fetch(base+'/'+entry.urlOrPath,{signal:AbortSignal.timeout(22000)});
 assert.equal(r.status,200,'SOURCE_HTTP_'+name);
 assert.equal(sha(Buffer.from(await r.arrayBuffer())),entry.sha256,'HTTP_SHA_'+name);
 resolved[name]='/'+entry.urlOrPath;
}
const tests=[
{id:'Y1M01-Q003',mechanic:'target-shooter',screen:[1366,768],expected:['school','afternoon','night']},
{id:'Y1M01-Q004',mechanic:'target-shooter',screen:[390,844],expected:['morning','afternoon','night','sleep']},
{id:'Y1M01-Q004',mechanic:'target-shooter',screen:[1366,768],expected:['morning','afternoon','night','sleep']},
{id:'Y1M01-Q006',mechanic:'drag-drop-multimedia',screen:[1366,768],expected:['morning','afternoon']},
{id:'Y1M03-Q016',mechanic:'target-shooter',screen:[390,844],expected:['orange']}
];
const results={schemaVersion:'DUDUQ_Y1_GREETINGS_VISUAL_QA_V1',status:'RUNNING',
sourceCommit:details.sourceCommit,productionDeployed:false,releaseApproved:false,
verifiedSources:Object.keys(resolved).length,year1Questions:120,contracts:600,cases:[]};
await mkdir('qa/results/y1-greetings-browser',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const t of tests){
  const ctx=await browser.newContext({viewport:{width:t.screen[0],height:t.screen[1]},hasTouch:t.screen[0]<500,reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[],httpErrors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,180)));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon'))httpErrors.push(r.status()+':'+r.url())});
  const row={id:t.id,mechanic:t.mechanic,viewport:t.screen[0],expected:t.expected,found:[],errors,httpErrors};
  try{
   const url=base+'/play/'+t.mechanic+'/?duduqModule='+t.id.slice(0,5)+'&duduqItem='+t.id+'&qaSeed=y1-source-correct';
   const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(r?.status(),200);
   await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:35000});
   const targets=t.expected.map(k=>resolved[k]);
   for(let tick=0;tick<75;tick++){
    const found=new Set();
    for(const frame of page.frames()){
     const visible=await frame.evaluate(paths=>{
      const imgs=[...document.querySelectorAll('img')];
      return paths.filter(target=>imgs.some(img=>{
       let loc;try{loc=new URL(img.currentSrc||img.src,location.href).pathname}catch{return false}
       if(loc!==target||!img.complete||img.naturalWidth===0)return false;
       const r=img.getBoundingClientRect(),cs=getComputedStyle(img);
       return r.width>12&&r.height>12&&cs.visibility!=='hidden'&&cs.display!=='none';
      }));
     },targets).catch(()=>[]);
     for(const v of visible)found.add(v);
    }
    row.found=[...found];
    if(found.size===targets.length)break;
    await page.waitForTimeout(250);
   }
   row.screenshot='qa/results/y1-greetings-browser/'+t.id+'-'+t.screen[0]+'.png';
   await page.screenshot({path:row.screenshot,animations:'disabled'});
   row.pass=row.found.length===targets.length&&!errors.length&&!httpErrors.length;
  }catch(e){row.error=String(e.message||e).slice(0,280);row.pass=false;}
  results.cases.push(row);await ctx.close();
 }
}finally{await browser.close()}
results.status=results.cases.every(x=>x.pass)?'PASS_REAL_Y1_IMAGES_VISIBLY_RENDERED':'FAIL_REAL_Y1_IMAGES_VISIBLY_RENDERED';
await writeFile('qa/results/y1-greetings-browser.json',JSON.stringify(results,null,2)+'\n');
console.log('DUDUQ_Y1_BROWSER='+JSON.stringify({status:results.status,scenes:results.cases.length,passed:results.cases.filter(x=>x.pass).length,failed:results.cases.filter(x=>!x.pass).map(x=>({id:x.id,screen:x.viewport,missing:x.expected.filter(k=>!x.found.includes(resolved[k])),error:x.error})),productionDeployed:false}));
assert.equal(results.status,'PASS_REAL_Y1_IMAGES_VISIBLY_RENDERED','KEEP_QUESTION_REVIEW_ISOLATED');
