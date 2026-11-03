#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base='https://duduq-engine-13a.pages.dev';
assert.equal(process.env.DUDUQ_PRODUCTION_QA,'1');
const sha=b=>createHash('sha256').update(b).digest('hex');
const get=async(p)=>{const r=await fetch(base+p,{signal:AbortSignal.timeout(40000),redirect:'follow'});assert.equal(r.status,200,'HTTP_'+r.status+':'+p);return {b:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')||''}};
const report={schemaVersion:'DUDUQ_PHASE2_ORANGE_CDN_DELIVERY_V1',deploymentId:'709a2477-4cfe-4330-b633-7293a35dc1ee',url:base,modules:[],contracts:0,sourcePngs:[],fruitQuestions:[],colorQuestions:[],browser:[],status:'RUNNING',productionDeployed:true};
const OLD='IMG-Y1M03-Q001-ORANGE',FRUIT='IMG-ASSETS-DUDUQ-ORANGE-FRUIT-PHASE2';
const cids=new Set(['Y1M03-Q001','Y2M02-Q015','Y2M02-Q017','Y2M04-Q017','Y2M05-Q007','Y3M05-Q015']);
const fids=new Set(['Y2M06-Q002','Y2M06-Q003','Y2M06-Q009','Y2M06-Q011','Y2M06-Q016','Y3M06-Q001','Y3M06-Q002','Y3M06-Q003','Y3M06-Q005','Y3M06-Q006','Y3M06-Q010','Y3M06-Q012','Y3M06-Q017','Y3M06-Q018','Y4M05-Q003']);
try{
 for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
  const mm=String(m).padStart(2,'0'),route='/play/english/year-'+y+'/module-'+mm+'/';
  const html=await get(route);assert(html.type.includes('text/html')&&html.b.length>500,'BAD_HTML:'+route);
  const q=JSON.parse((await get('/content/english/year-'+y+'/module-'+mm+'/questions.json')).b);
  assert.equal(q.items.length,20,'NOT_20_QUESTIONS:'+route);report.contracts+=20;
  for(const item of q.items){
   const str=JSON.stringify(item),hasFruit=str.includes('"'+FRUIT+'"'),hasColor=str.includes('"'+OLD+'"');
   if(hasFruit){assert(fids.has(item.item_id),'FRUIT_WRONG_CONTEXT:'+item.item_id);report.fruitQuestions.push(item.item_id);}
   if(hasColor){assert(cids.has(item.item_id),'COLOR_WRONG_CONTEXT:'+item.item_id);report.colorQuestions.push(item.item_id);}
   assert(!(hasColor&&hasFruit),'COLOR_FRUIT_COLLISION:'+item.item_id);
  }
  report.modules.push(route);
 }
 assert.equal(report.contracts,600);assert.equal(report.modules.length,30);
 assert.deepEqual(report.fruitQuestions.sort(),[...fids].sort());
 assert.deepEqual(report.colorQuestions.sort(),[...cids].sort());
 const reg=JSON.parse((await get('/content/english/media/media-registry.json')).b);
 const fruit=reg.entries.find(e=>e.mediaId===FRUIT),color=reg.entries.find(e=>e.mediaId===OLD);
 assert(fruit&&color&&fruit.urlOrPath!==color.urlOrPath);
 assert.equal(fruit.sha256,'2e10214ac0eff4ba89f3a967907a909fe400da8566cfb155e392a395b6ceafa6');
 assert.equal(color.sha256,'3483524a715d0c3bc7ab8938a0f251a64bcae69f90031d59cfb54641f9939b36');
 assert.equal(fruit.provenance.sourcePath,'Imagens Ilustrativa/Orange Fruit -laranja fruta.png');
 const sourced=reg.entries.filter(e=>e.urlOrPath?.startsWith('content/english/assets/images/assets-duduq/'));
 assert.equal(sourced.length,471,'SOURCE_MEDIA_CANDIDATE_DIFF');
 for(const item of [fruit,color]){
  const d=(await get('/'+item.urlOrPath)).b;assert.equal(sha(d),item.sha256);
  report.sourcePngs.push({path:item.urlOrPath,sha256:item.sha256,bytes:d.length});
 }
 const browser=await chromium.launch({headless:true});
 try{
  for(const test of [
   {id:'Y2M02-Q017',slug:'target-shooter',asset:color,viewport:{width:1366,height:768}},
   {id:'Y3M06-Q005',slug:'drag-drop',asset:fruit,viewport:{width:390,height:844}}
  ]){
   const ctx=await browser.newContext({viewport:test.viewport,hasTouch:test.viewport.width<500,reducedMotion:'reduce'});
   const page=await ctx.newPage(),errs=[],row={id:test.id,screen:test.viewport.width,source:test.asset.urlOrPath,pass:false};
   page.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
   try{
    const r=await page.goto(base+'/play/'+test.slug+'/?duduqModule='+test.id.slice(0,5)+'&duduqItem='+test.id+'&qaSeed=orange-cdn',{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(r?.status(),200);
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:35000});
    for(let i=0;i<90&&!row.pass;i++){
     for(const f of page.frames()){
      const good=await f.evaluate(p=>[...document.querySelectorAll('img')].some(im=>{
       const rect=im.getBoundingClientRect(),st=getComputedStyle(im);
       try{return new URL(im.currentSrc||im.src,location.href).pathname===p&&im.complete&&im.naturalWidth>0&&rect.width>8&&rect.height>8&&st.visibility!=='hidden'&&st.display!=='none'}catch{return false}
      }),'/'+test.asset.urlOrPath).catch(()=>false);
      if(good){row.pass=true;break}
     }
     if(!row.pass)await page.waitForTimeout(250);
    }
    await mkdir('qa/results/orange-production-browser',{recursive:true});
    await page.screenshot({path:'qa/results/orange-production-browser/'+test.id+'-'+test.viewport.width+'.png',animations:'disabled'});
    assert.equal(errs.length,0);assert(row.pass,'EXPECTED_IMAGE_NOT_RENDERED');
   }catch(e){row.error=String(e.message||e).slice(0,300);row.pass=false}
   report.browser.push(row);await ctx.close();
  }
 }finally{await browser.close()}
 assert(report.browser.every(x=>x.pass),'REAL_CDN_GAMEPLAY_FAIL');
 report.status='PASS_REAL_CLOUDFLARE_PRODUCTION';
}catch(e){report.status='FAIL_REAL_CLOUDFLARE_PRODUCTION';report.error=String(e.stack||e);process.exitCode=1}
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/orange-production-delivery.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_CLOUDFLARE_PRODUCTION='+JSON.stringify({status:report.status,routes:report.modules.length,contracts:report.contracts,fruit:report.fruitQuestions.length,color:report.colorQuestions.length,screens:report.browser.length,pass:report.browser.filter(x=>x.pass).length,productionDeployed:true}));
assert.equal(report.status,'PASS_REAL_CLOUDFLARE_PRODUCTION');
