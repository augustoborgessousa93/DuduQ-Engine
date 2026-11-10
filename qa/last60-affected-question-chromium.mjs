#!/usr/bin/env node
/** Real Chromium route boots for 65 affected DUDUQ English question contracts.
 * Read only. This is NOT a correct-answer or interaction-complete certification.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_REQUIRED');
const report=JSON.parse(readFileSync('qa/results/last60-candidate-20261110.json','utf8'));
assert.equal(report.schema,'DUDUQ_LAST60_STAGING_QA_V1');
assert.equal(report.mediaIdsUpdated,60);
assert.equal(report.modules,30);
assert.equal(report.contracts,600);
assert.equal(report.provisionalSvgLinksInCandidate,0);
assert.equal(report.qaOnly,true);
const active=report.affectedQuestions;
assert.equal(active.length,65,'EXPECTED_65_ACTIVE_ITEMS');
const questionMap=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),mod='Y'+y+'M'+mm;
 const raw=JSON.parse(readFileSync('dist-pages/content/english/year-'+y+'/module-'+mm+'/questions.json','utf8'));
 assert.equal(raw.moduleId,mod);assert.equal(raw.items.length,20);
 for(const q of raw.items)questionMap.set(q.item_id,q);
}
assert.equal(questionMap.size,600,'QUESTION_IDS_NOT_UNIQUE');
const bindByQuestion=new Map();
for(const binding of report.bindings){
 for(const qid of binding.referencedQuestions){
  if(!bindByQuestion.has(qid))bindByQuestion.set(qid,[]);
  bindByQuestion.get(qid).push({id:binding.mediaId,url:binding.url,sha:binding.sha256});
 }
}
assert.deepEqual([...bindByQuestion.keys()].sort(),active.slice().sort(),'AFFECTED_QUESTION_MAP_DRIFT');
const base=process.env.BASE_URL||'http://127.0.0.1:4175';
const viewports=[{name:'desktop',width:1280,height:800},{name:'mobile',width:390,height:844}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const jobs=viewports.flatMap(view=>active.map(id=>({view,id,q:questionMap.get(id)})));
const output={schema:'DUDUQ_LAST60_REAL_CHROMIUM_AFFECTED_QUESTION_BOOT_V1',date:'2026-11-10',
 mediaIds:60,pngs:59,affectedQuestions:65,viewports:viewports.map(v=>v.name),
 expectedRouteBoots:jobs.length,results:[],failed:[],renderedMediaIds:[],allGameplayInteractionsTested:false,
 productionDeployed:false,pedagogicalQaApproved:false};
let cursor=0;
async function work(){
 while(cursor<jobs.length){
  const job=jobs[cursor++],{q,id,view}=job;
  assert(q,'MISSING_Q:'+id);
  const module=id.slice(0,5);
  const mech=q.mechanicId==='smart-sentence-complete'?'smart-sentence':q.mechanicId;
  const url=base+'/play/'+encodeURIComponent(mech)+'/?duduqModule='+module+'&duduqItem='+id+'&qaSeed=20261110';
  const page=await browser.newPage({viewport:{width:view.width,height:view.height},reducedMotion:'reduce'});
  const errors=[];const pngNetworkFailures=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,180)));
  page.on('response',r=>{if(r.url().includes('assets-duduq/')&&r.status()>=400)pngNetworkFailures.push({url:r.url(),status:r.status()});});
  const entry={id,module,mechanic:mech,viewport:view.name,url,expectedMediaIds:(bindByQuestion.get(id)||[]).map(x=>x.id),loadedMediaIds:[],brokenExpectedImages:[],httpStatus:null,gameRootFound:false,pageErrors:[],pass:false,error:null};
  try{
   const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
   entry.httpStatus=resp?.status()??null;
   await page.locator('#game').waitFor({state:'attached',timeout:20000});
   entry.gameRootFound=true;
   await page.waitForTimeout(1100);
   const expected=(bindByQuestion.get(id)||[]);
   const loaded=await page.locator('img').evaluateAll((nodes,values)=>{
    return nodes.map(node=>({src:node.getAttribute('src')||'',realSrc:node.currentSrc||'',complete:node.complete,loadedWidth:node.naturalWidth,visible:Boolean(node.getBoundingClientRect().width&&node.getBoundingClientRect().height)})).filter(x=>values.some(v=>x.src.includes(v.url)||x.realSrc.includes(v.url)));
   },expected);
   entry.loadedMediaIds=[...new Set(expected.filter(v=>loaded.some(x=>x.src.includes(v.url)||x.realSrc.includes(v.url))).map(x=>x.id))];
   entry.brokenExpectedImages=loaded.filter(x=>x.complete&&x.loadedWidth===0);
   entry.pageErrors=errors;
   entry.networkFailures=pngNetworkFailures;
   entry.pass=entry.httpStatus===200&&entry.gameRootFound&&entry.brokenExpectedImages.length===0&&pngNetworkFailures.length===0&&errors.length===0;
  }catch(e){entry.error=String(e.message).slice(0,450)}
  finally{await page.close()}
  output.results.push(entry);
  if(!entry.pass)output.failed.push({id,mechanic:mech,viewport:view.name,reason:entry.error||JSON.stringify({status:entry.httpStatus,pageErrors:entry.pageErrors,broken:entry.brokenExpectedImages,network:pngNetworkFailures}).slice(0,450)});
  console.log('DUDUQ_LAST60_QUESTION_BOOT='+JSON.stringify({id,viewport:view.name,pass:entry.pass,seen:entry.loadedMediaIds.length,error:entry.error}));
 }
}
try{await Promise.all(Array.from({length:3},work));}finally{await browser.close();}
output.passed=output.results.filter(x=>x.pass).length;
output.renderedMediaIds=[...new Set(output.results.flatMap(x=>x.loadedMediaIds))].sort();
const dest='qa/results/last60-affected-question-chromium-20261110.json';
mkdirSync('qa/results',{recursive:true});
writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
console.log('DUDUQ_LAST60_BOOT_SUMMARY='+JSON.stringify({
 tested:output.results.length,passed:output.passed,failed:output.failed.length,
 affected:active.length,renderedMediaIds:output.renderedMediaIds.length,
 pngs:59,realGameInteractions:false,report:dest}));
assert.equal(output.results.length,130,'INCOMPLETE_ROUTE_MATRIX');
assert.equal(output.failed.length,0,'AFFECTED_QUESTION_BROWSER_ROUTE_FAILURE');
