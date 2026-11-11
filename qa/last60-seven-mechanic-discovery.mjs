#!/usr/bin/env node
/**
 * DUDUQ Last60 - structural & interaction discovery for seven LIVE game mechanics.
 * Runs strictly on a pinned isolated V29 compiled distribution, no mutations.
 * No synthetic question answers and NO false "gameplay passed" claims.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const prior=JSON.parse(readFileSync('qa/results/last60-candidate-20261110.json','utf8'));
assert.equal(prior.mediaIdsUpdated,60);assert.equal(prior.affectedQuestions.length,65);
const all=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),data=JSON.parse(readFileSync('dist-pages/content/english/year-'+y+'/module-'+mm+'/questions.json','utf8'));
 for(const item of data.items)all.set(item.item_id,item);
}
assert.equal(all.size,600);
const preferred=[
 ['matching','Y1M06-Q009'],['bubble-pop','Y1M06-Q003'],
 ['target-shooter','Y3M05-Q001'],['drag-drop-multimedia','Y1M06-Q011'],
 ['memory-quest','Y2M05-Q004'],['smart-sentence','Y1M06-Q008'],['drag-drop','Y1M06-Q019']
];
const selectors=[
 'button','[role="button"]','.feedback-ribbon','.feedback-action',
 '.target-shooter-target','.matching-option','.matching-card','.bubble-pop-playable',
 '[data-memory-card-component]','.memory-quest-card',
 '.dnd-multimedia-item','.dnd-multimedia-target','.dnd-multimedia-audio-item',
 '.dnd-option-image-card','.dnd-confirm-action',
 '.smart-sentence-option','.smart-sentence-confirm-action',
 '[data-item-id]','[data-target-id]','.audio-button'
];
const report={schema:'DUDUQ_LAST60_SEVEN_MECHANIC_INTERACTION_DISCOVERY_V1',runDate:'2026-11-10',
 qaOnly:true,productionDeployed:false,gameplayCompleted:false,
 originalMediaBindings:60,originalQuestions:600,affectedQuestions:65,checks:[],failed:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('qa/results/last60-gameplay-discovery/screenshots',{recursive:true});
try{
 for(const [mechanic,id] of preferred){
  const q=all.get(id);
  assert(q&&q.mechanicId===mechanic,'CANONICAL_MECHANIC_CHANGED:'+id);
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e).slice(0,240)));
  const route='/play/'+(mechanic==='smart-sentence-complete'?'smart-sentence':mechanic)+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+'&qaSeed=20261110';
  const entry={id,mechanic,route,question:{id:q.item_id,answerKey:q.answerKey,mechanicMode:q.mechanicMode,semanticTarget:q.semanticTarget,options:(q.options||[]).map(o=>({answerKey:o.answerKey,label:o.label,semanticTarget:o.semanticTarget,mediaId:o.mediaId,role:o.role}))},
   selectors:{},pageErrors:[],imageResults:[],feedbackState:null,gameState:null,passBoot:false,needsHumanGameplayQA:true};
  try{
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(response.status(),200,'HTTP_ROUTE_NOT_200');
   await page.locator('#game').waitFor({state:'attached',timeout:18000});
   await page.waitForTimeout(2400);
   entry.url=page.url();
   entry.gameState=await page.locator('#game').getAttribute('data-duduq-interaction-state');
   entry.selectors=await page.evaluate(selectors=>{
    const o={};
    for(const s of selectors){
     const items=[...document.querySelectorAll(s)];
     if(items.length)o[s]=items.slice(0,20).map(el=>{
       const b=el.getBoundingClientRect(),css=getComputedStyle(el);
       return {tag:el.tagName,cls:String(el.className||'').slice(0,130),aria:el.getAttribute('aria-label'),
        title:el.getAttribute('title'),text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,90),
        data:{...el.dataset},visible:b.width>4&&b.height>4&&css.display!=='none'&&css.visibility!=='hidden',
        hit:b.width>4&&b.height>4&&(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)===el||el.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2))),
        rect:{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}};
     });
    }
    return o;
   },selectors);
   entry.imageResults=await page.locator('img').evaluateAll(images=>images.slice(0,45).map(i=>({
    src:(i.getAttribute('src')||'').slice(0,220),alt:i.alt,complete:i.complete,w:i.naturalWidth,
    visible:!!i.getBoundingClientRect().width&&!!i.getBoundingClientRect().height
   })));
   entry.feedbackState=await page.locator('.feedback-ribbon').count()?{
    hidden:await page.locator('.feedback-ribbon').first().getAttribute('hidden'),
    state:await page.locator('.feedback-ribbon').first().getAttribute('data-feedback')
   }:null;
   entry.pageErrors=errors;
   entry.passBoot=!errors.length;
   await page.screenshot({path:'qa/results/last60-gameplay-discovery/screenshots/'+mechanic+'-'+id+'.png',fullPage:false});
  }catch(error){entry.error=String(error?.message||error).slice(0,700);report.failed.push({id,mechanic,error:entry.error});}
  finally{await page.close();}
  report.checks.push(entry);
  console.log('MECHANIC_DISCOVERY='+JSON.stringify({mechanic,id,passBoot:entry.passBoot,gameState:entry.gameState,dom:Object.fromEntries(Object.entries(entry.selectors).map(([k,v])=>[k,v.length])),errors:entry.pageErrors,error:entry.error||null}));
 }
}finally{await browser.close();}
report.passBoots=report.checks.filter(x=>x.passBoot).length;
writeFileSync('qa/results/last60-gameplay-discovery/report.json',JSON.stringify(report,null,2)+'\n');
console.log('SEVEN_MECHANIC_DISCOVERY_SUMMARY='+JSON.stringify({boots:report.checks.length,passed:report.passBoots,failed:report.failed.length,qaOnly:true,interactionCertification:false}));
assert.equal(report.checks.length,7);
assert.equal(report.failed.length,0,'MECHANIC_DISCOVERY_ROUTE_FAILED');
