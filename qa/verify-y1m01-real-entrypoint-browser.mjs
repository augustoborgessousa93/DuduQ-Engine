#!/usr/bin/env node
/**
 * DUDUQ — SOURCE OF TRUTH / ACTUAL STUDENT PATH TEST.
 *
 * Distinguish /play/english/year-1/module-01/ from /play/target-shooter/.
 * Diagnose whether the 20-item questions.json is wired to the real player.
 * Collect screenshots and request evidence, NEVER claim a successful question
 * session without actual image/identity observations. QA only, no mutations.
 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const root='qa/fast-bilingual-immutable-candidate';
const qdoc=JSON.parse(await readFile(root+'/content/english/year-1/module-01/questions.json','utf8'));
const registry=JSON.parse(await readFile(root+'/content/english/media/media-registry.json','utf8'));
const media=new Map(registry.entries.map(x=>[x.mediaId,x]));
const qids=['Y1M01-Q001','Y1M01-Q003','Y1M01-Q004'];
const expected={
 'Y1M01-Q001':['IMG-Y1M01-Q001-HELLO-FOCUSED-20261104'],
 'Y1M01-Q003':[
  'IMG-Y1M01-Q003-ALTERNATE-AFTERNOON-AFTERNOON-20261105',
  'IMG-Y1M01-Q003-ALTERNATE-NIGHT-NIGHT-20261105',
  'IMG-Y1M01-Q003-ALTERNATE-SLEEP-FAREWELL-20261105',
  'IMG-Y1M01-Q003-ALTERNATE-MORNING-MORNING-20261105'],
 'Y1M01-Q004':[
  'IMG-Y1M01-Q003-Q004-MORNING-OFFICIAL-20261104',
  'IMG-Y1M01-Q003-Q004-AFTERNOON-OFFICIAL-20261104',
  'IMG-Y1M01-Q003-Q004-NIGHT-OFFICIAL-20261104']
};
for(const qid of qids){
 const item=qdoc.items.find(x=>x.item_id===qid);
 assert(item,'QUESTION_MISSING:'+qid);
 for(const id of expected[qid])assert(
  media.has(id)&&JSON.stringify(item).includes(id),'QUESTION_NOT_BOUND_TO_MEDIA:'+qid+':'+id);
}
assert.equal(qdoc.items.length,20);
await mkdir('qa/results/y1m01-real-entrypoint', {recursive:true});
const screenshotDir='qa/results/y1m01-real-entrypoint';
const browser=await chromium.launch({headless:true});
const routes=[
 {slug:'student-module',path:'/play/english/year-1/module-01/'},
 {slug:'direct-target-q003',path:'/play/target-shooter/?duduqModule=Y1M01&duduqItem=Y1M01-Q003&duduqStart=Y1M01'}
];
const observations=[];
async function inspect(frame){
 return frame.evaluate(()=>{
  const mod=window.DUDUQ_CONTENT?.english?.year1?.module01;
  const activities=Array.isArray(mod?.activities)?mod.activities:[];
  const imgs=[...document.images].map(img=>{
   const rect=img.getBoundingClientRect(),style=getComputedStyle(img);
   let path='';
   try{path=new URL(img.currentSrc||img.src,document.baseURI).pathname}catch{}
   return {path:path.slice(0,180),alt:(img.alt||'').slice(0,100),
    loaded:Boolean(img.complete&&img.naturalWidth>0),
    visible:Boolean(img.complete&&img.naturalWidth>0&&rect.width>16&&rect.height>16&&
     rect.right>0&&rect.bottom>0&&rect.left<innerWidth&&rect.top<innerHeight&&
     style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0),
    dimensions:[Math.round(rect.width),Math.round(rect.height)]};
  });
  const scriptSources=[...document.scripts].map(x=>x.src).filter(Boolean)
   .map(url=>{try{return new URL(url).pathname}catch{return url}}).slice(0,45);
  const controls=[...document.querySelectorAll('button,a,[role=button]')]
    .map(e=>({text:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,85),
      aria:(e.getAttribute('aria-label')||'').slice(0,85),
      tag:e.tagName,
      visible:(()=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);
       return r.width>10&&r.height>10&&s.visibility!=='hidden'&&s.display!=='none'})()}))
    .filter(x=>x.text||x.aria).slice(0,35);
  return {title:document.title,pathname:location.pathname,query:location.search,
   scriptSources,rootText:(document.querySelector('#root')?.innerText||'').slice(0,900),
   bodyText:(document.body?.innerText||'').replace(/\s+/g,' ').slice(0,1300),
   controls,
   duduqLoaded:Boolean(window.DUDUQ_ENGINE_READY),
   moduleDefinition:{loaded:!!mod,
    activities:activities.length,
    questions:activities.reduce((n,a)=>n+(a.questions?.length||0),0),
    questionIds:activities.flatMap(a=>(a.questions||[]).map(q=>q.id)).slice(0,24)},
   images:imgs.slice(0,75),
   imgTotals:{all:imgs.length,loaded:imgs.filter(x=>x.loaded).length,
    visible:imgs.filter(x=>x.visible).length}
  };
 });
}
async function frameSnapshot(page,label){
 const frames=[];
 for(const f of page.frames()){
  try{frames.push({url:f.url().slice(0,300),frameName:f.name(),snapshot:await inspect(f)})}
  catch(e){frames.push({url:f.url().slice(0,300),error:String(e).slice(0,220)})}
 }
 const allImages=frames.flatMap(f=>f.snapshot?.images||[]);
 const targets=Object.fromEntries(Object.entries(expected).map(([qid,ids])=>[
  qid,ids.map(id=>{
   const p=String(media.get(id)?.urlOrPath||'').replace(/^\/+/,'');
   const matching=allImages.filter(i=>decodeURIComponent(i.path).replace(/^\/+/,'')===p);
   return {mediaId:id,path:p,rendered:matching.some(i=>i.visible),loaded:matching.some(i=>i.loaded)}
  })
 ]));
 return {label,frames,targets};
}
const clickTerms=/começar|comecar|jogar|iniciar|start|continuar|comece a aventura|entrar/i;
async function pressStart(page){
 for(const frame of page.frames()){
  try{
   const locator=frame.locator('button,a,[role="button"]');
   const count=Math.min(await locator.count(),40);
   for(let i=0;i<count;i++){
    const el=locator.nth(i);
    const visible=await el.isVisible().catch(()=>false);
    if(!visible)continue;
    const text=[await el.innerText({timeout:500}).catch(()=>''),await el.getAttribute('aria-label').catch(()=>null)]
      .filter(Boolean).join(' ');
    if(!clickTerms.test(text))continue;
    // Only enter the intro; do not choose or complete an answer in a live game.
    await el.click({timeout:4000}).catch(()=>{});
    return {clicked:true,frame:frame.url().slice(0,180),control:text.slice(0,100)};
   }
  }catch{}
 }
 return {clicked:false};
}
try{
 for(const viewport of [{id:'desktop',width:1366,height:768},{id:'mobile',width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
   reducedMotion:'reduce',deviceScaleFactor:1});
  for(const route of routes){
   const page=await ctx.newPage(),net=[],errors=[];
   page.on('response',r=>{
    try{
     if(!r.url().startsWith(base))return;
     if(net.length>300)return;
     net.push({path:new URL(r.url()).pathname.slice(0,230),status:r.status(),
      type:r.request().resourceType()});
    }catch{}
   });
   page.on('pageerror',e=>errors.push(String(e?.message||e).slice(0,300)));
   const result={route:route.slug,viewport:viewport.id,url:base+route.path,
    status:null,errors,requests:net,steps:[],screenshots:[]};
   observations.push(result);
   try{
    const res=await page.goto(base+route.path,{waitUntil:'domcontentloaded',timeout:25000});
    result.status=res?.status()??null;
    await page.waitForTimeout(3000);
    result.steps.push(await frameSnapshot(page,'after-boot'));
    const shot1=screenshotDir+'/'+route.slug+'-'+viewport.id+'-boot.png';
    try{await page.screenshot({path:shot1,timeout:10000});result.screenshots.push(shot1)}catch(e){result.screenshotFailure=String(e).slice(0,170)}
    if(route.slug==='student-module'){
     result.start=await pressStart(page);
     await page.waitForTimeout(result.start.clicked?4500:500);
     result.steps.push(await frameSnapshot(page,'after-intro-attempt'));
     const shot2=screenshotDir+'/'+route.slug+'-'+viewport.id+'-after-intro.png';
     try{await page.screenshot({path:shot2,timeout:10000});result.screenshots.push(shot2)}catch(e){result.screenshotAfterFailure=String(e).slice(0,170)}
    }
   }catch(e){result.navigationError=String(e?.message||e).slice(0,350)}
   finally{await page.close()}
  }
  await ctx.close();
 }
}finally{await browser.close()}
const student=observations.filter(x=>x.route==='student-module');
const initialNetwork=student.map(x=>({
 screen:x.viewport,
 questionsJsonLoaded:x.requests.some(r=>r.path.endsWith('/content/english/year-1/module-01/questions.json')),
 contentScriptLoaded:x.requests.some(r=>r.path.endsWith('/content/english/year-1/module-01/module-01.js')),
 scripts:x.steps.flatMap(s=>s.frames.flatMap(f=>f.snapshot?.scriptSources||[]))
  .filter(s=>s.includes('module-01')||s.includes('english')).slice(0,12),
 moduleDefinitions:x.steps.flatMap(s=>s.frames.map(f=>f.snapshot?.moduleDefinition).filter(x=>x?.loaded)),
 introClicked:x.start?.clicked??false,
 visibleImages:x.steps.map(s=>s.frames.reduce((n,f)=>n+(f.snapshot?.imgTotals?.visible||0),0))
}));
const confirmed=observations.some(o=>o.route==='student-module'&&o.steps.some(s=>s.frames.some(f=>
 f.snapshot?.moduleDefinition?.questions===20&&
 s.targets['Y1M01-Q003'].some(x=>x.rendered))));
const sourceProof=initialNetwork.some(x=>x.questionsJsonLoaded);
const report={schemaVersion:'Y1M01_REAL_STUDENT_ENTRYPOINT_PROBE_V1',
 mode:'READ_ONLY_BROWSER_QA',productionDeployed:false,
 sourceOfTruth:'REAL_GAME_ROUTE_NOT_DIRECT_MECHANIC',compiledContracts:20,
 observed:observations,sourceProbes:initialNetwork,
 q003GameImageSessionConfirmed:confirmed,
 q003JsonRequestedByStudentRoute:sourceProof,
 status:confirmed?'REAL_SESSION_SOURCE_AND_MEDIA_PROVEN':
  'REAL_SESSION_OR_SOURCE_NOT_PROVEN_NEEDS_INTEGRATION_AUDIT',
 pedagogicalApproval:'PENDING'};
await writeFile('qa/results/y1m01-real-entrypoint-browser.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_REAL_STUDENT_ROUTE_PROOF='+JSON.stringify({
 status:report.status,qaOnly:true,declaredContracts:20,sourceProbes:initialNetwork,
 q003GameImageSessionConfirmed:confirmed,
 directMechanicDoesNotCertifyModule:true,
 navigation:observations.map(x=>({route:x.route,viewport:x.viewport,status:x.status,
  start:x.start,errors:x.errors.slice(0,3),screenshots:x.screenshots}))}));
assert(observations.every(x=>x.status===200),'REAL_STUDENT_ENTRYPOINT_UNAVAILABLE');
