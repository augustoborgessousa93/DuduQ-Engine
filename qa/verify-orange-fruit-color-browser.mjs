#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
const dir=path.resolve('dist-pages'),base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const split=JSON.parse(await readFile('qa/results/split-report.json','utf8'));
const registry=JSON.parse(await readFile(path.join(dir,'content/english/media/media-registry.json'),'utf8'));
const getId=id=>registry.entries.find(x=>x.mediaId===id);
const fruit=getId(split.fruitMediaId),color=getId(split.colorMediaId);
assert(fruit&&color&&fruit.urlOrPath!==color.urlOrPath);
assert.equal(fruit.sha256,split.sourceSha256);
assert.equal(fruit.provenance.sourcePath,'Imagens Ilustrativa/Orange Fruit -laranja fruta.png');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={status:'RUNNING',contractCount:600,fruitUses:15,colorUses:6,pngIntegrity:[],cases:[],productionDeployed:false,releaseApproved:false};
const manifest=(await readFile(path.join(dir,'.duduq-pages-manifest'),'utf8')).trimEnd().split(/\r?\n/);
assert.equal(hash(await readFile(path.join(dir,'.duduq-pages-manifest'))),split.manifestSha256);
for(const entry of [fruit,color]){
 const bytes=await readFile(path.join(dir,entry.urlOrPath));
 assert.equal(hash(bytes),entry.sha256);
 const res=await fetch(base+'/'+entry.urlOrPath,{signal:AbortSignal.timeout(20000)});
 assert.equal(res.status,200);
 assert.equal(hash(Buffer.from(await res.arrayBuffer())),entry.sha256);
 report.pngIntegrity.push({id:entry.mediaId,path:entry.urlOrPath,sha256:entry.sha256,http:200});
}
let questions=0,fruits=new Set(),colors=new Set();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const doc=JSON.parse(await readFile(path.join(dir,rel),'utf8'));
 assert.equal(doc.items.length,20);questions+=20;
 for(const q of doc.items){
  const json=JSON.stringify(q);
  const hasFruit=json.includes('"'+split.fruitMediaId+'"'),hasColor=json.includes('"'+split.colorMediaId+'"');
  if(hasFruit){assert(split.fruitUsedBy.includes(q.item_id),'UNCLASSIFIED_FRUIT:'+q.item_id);fruits.add(q.item_id);}
  if(hasColor){assert(split.colorUsedBy.includes(q.item_id),'UNCLASSIFIED_COLOR:'+q.item_id);colors.add(q.item_id);}
  assert(!(hasFruit&&hasColor),'AMBIGUOUS_SINGLE_QUESTION:'+q.item_id);
 }
}
assert.equal(questions,600);assert.equal(fruits.size,15);assert.equal(colors.size,6);
await mkdir('qa/results/orange-release-browser',{recursive:true});
const tests=[
 {id:'Y2M02-Q017',mechanic:'target-shooter',asset:color,viewport:{width:1366,height:768}},
 {id:'Y2M06-Q002',mechanic:'matching',asset:fruit,viewport:{width:1366,height:768}},
 {id:'Y3M06-Q005',mechanic:'drag-drop',asset:fruit,viewport:{width:390,height:844}},
 {id:'Y3M06-Q018',mechanic:'smart-sentence',asset:fruit,viewport:{width:1366,height:768}}
];
const browser=await chromium.launch({headless:true});
try{
 for(const t of tests){
  const ctx=await browser.newContext({viewport:t.viewport,hasTouch:t.viewport.width<500,reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[],net=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,220)));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon'))net.push(r.status()+':'+r.url())});
  const row={id:t.id,mechanic:t.mechanic,viewport:t.viewport.width,expectedPath:'/'+t.asset.urlOrPath,seen:false,loaded:false,errors,net};
  try{
   const resp=await page.goto(base+'/play/'+t.mechanic+'/?duduqModule='+t.id.slice(0,5)+'&duduqItem='+t.id+'&qaSeed=fruit-corrected',{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(resp?.status(),200);
   await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:35000});
   // The source image may be hidden until gameplay; assert real DOM usage and loaded media,
   // not unrelated mascot/background. We do not claim human pedagogical signoff from this.
   for(let i=0;i<80&&!row.loaded;i++){
    for(const frame of page.frames()){
     const state=await frame.evaluate(expected=>{
      const all=[...document.querySelectorAll('img')].filter(x=>{try{return new URL(x.currentSrc||x.src,location.href).pathname===expected}catch{return false}});
      const valid=all.filter(x=>x.complete&&x.naturalWidth>0);
      const visible=valid.filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>6&&r.height>6&&s.visibility!=='hidden'&&s.display!=='none'});
      return {seen:all.length,loaded:valid.length,visible:visible.length};
     },row.expectedPath).catch(()=>({seen:0,loaded:0,visible:0}));
     if(state.seen)row.seen=true;
     if(state.visible){row.loaded=true;row.visibleCount=state.visible;break}
    }
    if(!row.loaded)await page.waitForTimeout(250);
   }
   const p='qa/results/orange-release-browser/'+t.id+'-'+t.viewport.width+'.png';
   await page.screenshot({path:p,animations:'disabled'});
   row.screenshot=p;
  }catch(e){errors.push(String(e.message||e).slice(0,250))}
  row.pass=row.loaded&&!errors.length&&!net.length;
  report.cases.push(row);
  await ctx.close();
 }
}finally{await browser.close()}
report.status=report.cases.every(x=>x.pass)?'PASS_ORANGE_COLOR_FRUIT_DELTA_BROWSER':'FAIL_ORANGE_COLOR_FRUIT_DELTA_BROWSER';
await writeFile('qa/results/orange-release-browser.json',JSON.stringify(report,null,2)+'\n');
console.log('ORANGE_CONTEXT_BROWSER='+JSON.stringify({status:report.status,cases:report.cases.map(x=>({id:x.id,pass:x.pass,seen:x.seen,loaded:x.loaded,errors:x.errors})),questions,productionDeployed:false}));
assert.equal(report.status,'PASS_ORANGE_COLOR_FRUIT_DELTA_BROWSER','MUST_FIX_FOCUSED_CONTEXT_BEFORE_RELEASE');
