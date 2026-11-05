#!/usr/bin/env node
/**
 * Y1M01 — REAL sequence smoke (never a synthetic direct Q003 link).
 * Attempts Q001 -> Q002 -> Q003 via allowed clicks in the actual player.
 * Preserve actual screenshot/evidence even if a required interaction stalls.
 * Read-only student gameplay; no production mutation or QA auto-approval.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
assert(['127.0.0.1','localhost'].includes(new URL(root).hostname));
const registry=JSON.parse(await readFile('qa/fast-bilingual-immutable-candidate/content/english/media/media-registry.json','utf8'));
const questions=JSON.parse(await readFile('qa/fast-bilingual-immutable-candidate/content/english/year-1/module-01/questions.json','utf8'));
const m=new Map(registry.entries.map(x=>[x.mediaId,x]));
const expectedIds={
 Q003:['IMG-Y1M01-Q003-ALTERNATE-MORNING-MORNING-20261105',
 'IMG-Y1M01-Q003-ALTERNATE-AFTERNOON-AFTERNOON-20261105',
 'IMG-Y1M01-Q003-ALTERNATE-NIGHT-NIGHT-20261105',
 'IMG-Y1M01-Q003-ALTERNATE-SLEEP-FAREWELL-20261105'],
 Q004:['IMG-Y1M01-Q003-Q004-MORNING-OFFICIAL-20261104',
 'IMG-Y1M01-Q003-Q004-AFTERNOON-OFFICIAL-20261104',
 'IMG-Y1M01-Q003-Q004-NIGHT-OFFICIAL-20261104']
};
assert.equal(questions.items.length,20);
for(const [k,ids] of Object.entries(expectedIds)){
 const q=questions.items.find(x=>x.item_id==='Y1M01-'+k);
 assert(q,'Q_MISSING_'+k);
 for(const id of ids)assert(m.has(id)&&JSON.stringify(q).includes(id),'MISSING_RELATED_MEDIA:'+id);
}
await mkdir('qa/results/y1m01-real-sequence',{recursive:true});
const browsers=await chromium.launch({headless:true});
const results=[];
async function poll(page,fn,maxMs=8500){
 const expires=Date.now()+maxMs;
 while(Date.now()<expires){
  if(await fn())return true;
  await page.waitForTimeout(300);
 }
 return false;
}
async function active(page){
 return page.evaluate(()=>{
  const counter=(document.body?.innerText||'').match(/(\d+)\s*\/\s*20/);
  return {path:location.pathname,query:location.search,
   counter:counter?Number(counter[1]):null,
   title:(document.body?.innerText||'').replace(/\s+/g,' ').slice(0,300),
   visibleControls:[...document.querySelectorAll('button,article[aria-label],[role="button"]')]
   .filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);
    return r.width>5&&r.height>5&&s.display!=='none'&&s.visibility!=='hidden'})
   .map(x=>({tag:x.tagName,text:(x.innerText||'').trim().slice(0,70),
    aria:x.getAttribute('aria-label')||'',cl:x.className||''})).slice(0,35)};
 });
}
async function correctTarget(page,keyword){
 const l=page.locator('article[aria-label]').filter({has:page.locator('img')});
 const pattern=new RegExp('alvo\\s+'+keyword+'$','i');
 const count=await l.count();
 for(let i=0;i<count;i++){
  const el=l.nth(i);
  const aria=await el.getAttribute('aria-label').catch(()=>null);
  if(aria&&pattern.test(aria)){
   if(await el.isVisible()){
    await el.click({timeout:3500});
    return {clicked:true,aria,method:'target-article-click'};
   }
  }
 }
 return {clicked:false,reason:'TARGET_NOT_VISIBLE'};
}
async function feedbackVisible(page){
 return page.locator('.feedback-ribbon:not([hidden])').count().then(n=>n>0).catch(()=>false);
}
async function nextBtn(page){
 const v=page.getByRole('button',{name:/continuar|tentar de novo|pr[oó]ximo/i}).filter({visible:true});
 if(await v.count()){await v.first().click({timeout:4000});return true}
 return false;
}
async function byExpectedImages(page,ids){
 const expected=ids.map(id=>({id,rel:m.get(id).urlOrPath.replace(/^\/+/,'')}));
 return page.evaluate(paths=>{
  const values=[];
  for(const e of paths){
   const found=[];
   for(const i of document.images){
    const u=i.currentSrc||i.src;
    if(!u)continue;
    let current='';try{current=decodeURIComponent(new URL(u,document.baseURI).pathname).replace(/^\/+/,'')}catch{}
    if(current!==e.rel)continue;
    const r=i.getBoundingClientRect(),s=getComputedStyle(i);
    found.push({loaded:i.complete&&i.naturalWidth>0,
      visible:r.width>15&&r.height>15&&r.right>0&&r.bottom>0&&r.left<innerWidth&&
        r.top<innerHeight&&s.display!=='none'&&s.visibility!=='hidden',
      wh:[Math.round(r.width),Math.round(r.height)]});
   }
   values.push({id:e.id,loaded:found.some(x=>x.loaded),visible:found.some(x=>x.visible),found});
  }
  return values;
 },expected);
}
async function capture(page,record,label){
 record.steps.push({label,...await active(page)});
 const path='qa/results/y1m01-real-sequence/'+record.viewport+'-'+label+'.png';
 try{await page.screenshot({path,timeout:12000});record.screenshots.push(path)}
 catch(e){record.screenshotFailures.push({label,message:String(e).slice(0,180)})}
}
try{
 for(const viewport of [{id:'desktop',width:1366,height:768},{id:'mobile',width:390,height:844}]){
  const ctx=await browsers.newContext({viewport:{width:viewport.width,height:viewport.height},
   deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  const record={viewport:viewport.id,steps:[],actions:[],screenshots:[],screenshotFailures:[],
   errors:[],httpFailures:[],q003Visible:null,q004Visible:null};
  results.push(record);
  page.on('pageerror',e=>record.errors.push(String(e.message||e).slice(0,300)));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(root))
   record.httpFailures.push({status:r.status(),path:new URL(r.url()).pathname})});
  try{
   const response=await page.goto(root+'/play/english/year-1/module-01/',{
     waitUntil:'domcontentloaded',timeout:30000});
   record.status=response?.status();
   await page.waitForTimeout(1600);
   await capture(page,record,'intro');
   const start=page.getByRole('button',{name:/iniciar jogo|começar|comecar/i});
   if(await start.count()&&await start.first().isVisible()){
    await start.first().click({timeout:4500});record.actions.push('INTRO_START_CLICK');
   }else record.actions.push('INTRO_START_BUTTON_NOT_FOUND');
   await poll(page,async()=>page.url().includes('duduqItem=Y1M01-Q001'),14000);
   await page.waitForTimeout(1200);
   await capture(page,record,'q001');
   if(!page.url().includes('duduqItem=Y1M01-Q001')){
    record.blocker='FAILED_TO_ENTER_REAL_Q001';
    continue;
   }
   const correctEl=page.locator('article[aria-label="Alvo hello"]');
   const gate=async()=>{
    if(!await correctEl.count())return false;
    return await correctEl.evaluate(el=>!el.hasAttribute('inert')&&
     el.getAttribute('aria-disabled')!=='true'&&
     !el.classList.contains('duduq-interaction-locked')).catch(()=>false);
   };
   let unlocked=await poll(page,gate,9000);
   if(!unlocked){
    record.actions.push('Q001_INTERACTION_GATE_LOCKED_AFTER_9S');
    const audio=page.getByRole('button',{name:/play instruction|reproduzir|ouvir|áudio|audio/i}).first();
    if(await audio.count()&&await audio.isVisible()){
     await audio.click({timeout:4500}).catch(e=>
      record.actions.push('Q001_AUDIO_CLICK_ERROR:'+String(e).slice(0,180)));
     record.actions.push('Q001_AUDIO_INSTRUCTION_REPLAY_CLICK');
     unlocked=await poll(page,gate,12000);
    }else record.actions.push('Q001_AUDIO_BUTTON_MISSING');
   }
   record.actions.push('Q001_INTERACTION_UNLOCKED='+unlocked);
   if(!unlocked){
    record.blocker='Q001_PEDAGOGICAL_AUDIO_INTERACTION_GATE_STILL_LOCKED';
    record.q001LockedDom=await correctEl.evaluate(el=>({
      outerHTML:el.outerHTML.slice(0,1300),
      inert:el.hasAttribute('inert'),
      ariaDisabled:el.getAttribute('aria-disabled'),
      className:el.className,
      state:el.getAttribute('data-gameplay-state')
    })).catch(()=>null);
    await capture(page,record,'q001-locked-after-audio');
    continue;
   }
   let shot=await correctTarget(page,'hello');
   record.actions.push('Q001:'+JSON.stringify(shot));
   if(shot.clicked){
    let feedback=await poll(page,()=>feedbackVisible(page),4500);
    if(!feedback){
     // Target Shooter may require a slingshot gesture instead of direct
     // clicks. Use only if click did not already trigger feedback.
     const sling=page.locator('.duduq-magic-slingshot').first(),
       target=page.locator('article[aria-label="Alvo hello"]').first();
     const from=await sling.boundingBox().catch(()=>null),
       to=await target.boundingBox().catch(()=>null);
     if(from&&to){
      await page.mouse.move(from.x+from.width/2,from.y+from.height/2);
      await page.mouse.down();
      await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:15});
      await page.mouse.up();
      record.actions.push('Q001:SHOOT_GESTURE');
      feedback=await poll(page,()=>feedbackVisible(page),4200);
     }
    }
    record.actions.push('Q001:FEEDBACK='+feedback);
   }
   await capture(page,record,'q001-after-action');
   let next=await nextBtn(page).catch(()=>false);
   record.actions.push('Q001:CONTINUE='+next);
   if(!next){
    record.blocker='Q001_NOT_ADVANCING_AFTER_CORRECT_ANSWER';
    continue;
   }
   await poll(page,async()=>page.url().includes('Y1M01-Q002'),12000);
   await page.waitForTimeout(1100);
   await capture(page,record,'q002');
   if(!page.url().includes('Y1M01-Q002')){
    record.blocker='NEXT_AFTER_Q001_NOT_Q002';
    continue;
   }
   // Bubble Pop moves its bubbles into the arena after a spawn animation.
   // It may NOT expose an optionId aria-label; use the exact registry PNG
   // corresponding to the correct "informal-greeting" option, never guess.
   const q2=questions.items.find(q=>q.item_id==='Y1M01-Q002');
   const correct=q2?.options?.find(o=>o.correct);
   assert.equal(correct?.optionId,'informal-greeting','Q002_CORRECT_OPTION_CHANGED');
   const targetPath=m.get(correct.mediaId)?.urlOrPath?.replace(/^\\/+/, '');
   assert(targetPath,'Q002_REGISTRY_MEDIA_MISSING');
   async function locateBubble(){
    return page.evaluate(path=>{
     const images=[...document.images].filter(img=>{
      try{return decodeURIComponent(new URL(img.currentSrc||img.src,document.baseURI).pathname)
       .replace(/^\\+/,'')===path}catch{return false}
     });
     return images.map(img=>{
      const r=img.getBoundingClientRect(),parent=img.closest('[data-bubble-id],.bubble,.bubble-pop-bubble,[role="button"]')||img.parentElement;
      const p=parent?.getBoundingClientRect(),s=getComputedStyle(parent||img);
      const visible=img.complete&&img.naturalWidth>0&&r.width>16&&r.height>16&&
       r.right>8&&r.bottom>8&&r.left<innerWidth-8&&r.top<innerHeight-8&&
       s.display!=='none'&&s.visibility!=='hidden';
      return {loaded:img.complete&&img.naturalWidth>0,visible,
       center:[Math.max(12,Math.min(innerWidth-12,r.left+r.width/2)),
        Math.max(12,Math.min(innerHeight-12,r.top+r.height/2))],
       parentClass:typeof parent?.className==='string'?parent.className:'',disabled:Boolean(parent?.hasAttribute('inert')||
        parent?.getAttribute('aria-disabled')==='true')};
     });
    },targetPath).catch(()=>[]);
   }
   let candidates=[],clicked=false,audioReplayed=false;
   const expires=Date.now()+24000;
   while(Date.now()<expires){
    candidates=await locateBubble();
    const hit=candidates.find(x=>x.visible&&!x.disabled);
    if(hit){
     await page.mouse.click(hit.center[0],hit.center[1]).catch(()=>{});
     clicked=true;break;
    }
    if(!audioReplayed&&Date.now()>expires-15000){
     const audio=page.getByRole('button',{name:/play instruction|reproduzir|ouvir|audio|áudio/i}).first();
     if(await audio.count()){
      await audio.click({timeout:3000}).catch(()=>{});
      record.actions.push('Q002_AUDIO_REPLAY');
     }
     audioReplayed=true;
    }
    await page.waitForTimeout(420);
   }
   record.bubbleCandidates=candidates;
   record.actions.push('Q002_CORRECT_CLICK='+clicked);
   await capture(page,record,'q002-after-action');
   if(!clicked)continue;
   await poll(page,async()=>feedbackVisible(page),4500);
   next=await nextBtn(page).catch(()=>false);
   record.actions.push('Q002_CONTINUE='+next);
   if(!next){
    record.blocker='Q002_NOT_ADVANCING_AFTER_CORRECT_ANSWER';
    continue;
   }
   await poll(page,async()=>page.url().includes('Y1M01-Q003'),12000);
   await page.waitForTimeout(1000);
   await capture(page,record,'q003');
   record.q003Visible=await byExpectedImages(page,expectedIds.Q003);
   if(!record.q003Visible.every(x=>x.visible)){
    record.blocker='Q003_IMAGE_SET_NOT_VISIBLE_DURING_REAL_SESSION';
   }
  }catch(e){record.blocker=String(e.message||e).slice(0,400)}
  finally{await page.close();await ctx.close();}
 }
}finally{await browsers.close()}
const resultsSummary=results.map(r=>({viewport:r.viewport,status:r.status,
 blocker:r.blocker||null,actions:r.actions,visited:r.steps.map(s=>({label:s.label,
 path:s.path,query:s.query,counter:s.counter,controls:s.visibleControls.slice(0,17)})),
 q003Visible:r.q003Visible,errors:r.errors.slice(0,3),screenshots:r.screenshots}));
const confirmed=results.every(r=>r.q003Visible?.every(x=>x.visible));
const report={schemaVersion:'Y1M01_REAL_SEQUENTIAL_GAMEPLAY_V1',
 mode:'QA_ONLY_REAL_STUDENT_SESSION',status:confirmed?'Q003_REAL_SESSION_VISUAL_PROVEN':
 'REAL_GAMEPLAY_PROBE_INCOMPLETE',q003Certified:confirmed,
 productionDeployed:false,ownerApprovalNeeded:true,results};
await writeFile('qa/results/y1m01-real-sequence.json',JSON.stringify(report,null,2)+'\n');
console.log('Y1M01_REAL_SEQUENCE_PROBE='+JSON.stringify({
 status:report.status,certified:confirmed,results:resultsSummary
}));
assert(results.every(r=>r.status===200),'REAL_MODULE_CANNOT_BE_OPENED');
