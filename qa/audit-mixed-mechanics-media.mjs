#!/usr/bin/env node
/**
 * QA-only matrix: all 20 exercises in Y1M02/Y1M03/Y1M04/Y1M06.
 * Distinguishes image candidates that exist in the registry from images actually
 * rendered. Bubble Pop text/color bubbles are NOT expected to have PNGs.
 * No source questions, Gold Masters, production, or registry are modified.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';

const dist=path.resolve('dist-pages'),outDir=path.resolve('qa/results/assets-duduq-mixed-mechanics');
const modules=['Y1M02','Y1M03','Y1M04','Y1M06'];
const imageKeys=new Set(['assetId','mediaId','imageRef','image_ref']);
const mechanisms=new Set(['bubble-pop','drag-drop','drag-drop-multimedia']);
const sha=b=>createHash('sha256').update(b).digest('hex');
const load=async rel=>JSON.parse(await readFile(path.join(dist,rel),'utf8'));
const registry=await load('content/english/media/media-registry.json');
const byId=new Map(registry.entries.map(x=>[x.mediaId,x]));
assert.equal(byId.size,registry.entries.length,'DUPLICATED_MEDIA_IDS');
const result={schemaVersion:'DUDUQ_MIXED_MECHANICS_PER_QUESTION_V1',
 scope:modules,mode:'READ_ONLY_QA',productionUntouched:true,pedagogicalQA:'PENDING',
 checkedQuestions:0,checkedMechanicRoutes:0,checkedUniqueImageFiles:0,
 findings:[],render:[],questions:[],summary:{}};
const fileCache=new Map();
async function verifyCandidate(entry){
 const rel=String(entry.urlOrPath||'');
 if(!rel.startsWith('content/english/assets/images/assets-duduq-review/'))return null;
 if(!/^[a-f0-9]{64}$/.test(entry.sha256||''))return 'CANDIDATE_WITHOUT_SHA256';
 if(fileCache.has(rel))return fileCache.get(rel);
 let failure=null;
 try{
  const abs=path.resolve(dist,rel);
  if(!abs.startsWith(dist+path.sep))throw Error('PATH_ESCAPE');
  const bytes=await readFile(abs);
  if(sha(bytes)!==entry.sha256)failure='IMAGE_HASH_MISMATCH';
 }catch(e){failure='IMAGE_UNREADABLE:'+String(e.code||e.message||e);}
 fileCache.set(rel,failure);
 return failure;
}
function references(q){
 const refs=[];
 function walk(n){
  if(!n||typeof n!=='object')return;
  if(!Array.isArray(n)){
   for(const [k,v] of Object.entries(n)){
    if(!imageKeys.has(k)||typeof v!=='string'||!v.startsWith('IMG-'))continue;
    refs.push({id:v,role:String(n.role||''),concept:String(n.semanticTarget||''),
      expected:String(n.mustInclude||'')});
   }
  }
  for(const v of Object.values(n))if(v&&typeof v==='object')walk(v);
 }
 walk(q);return refs;
}
for(const mod of modules){
 const y=mod[1],mm=mod.slice(3);
 const doc=await load('content/english/year-'+y+'/module-'+mm+'/questions.json');
 assert.equal(doc.moduleId,mod,'WRONG_MODULE:'+mod);
 assert.equal(doc.items?.length,20,'WRONG_QUESTION_COUNT:'+mod);
 for(const q of doc.items){
  result.checkedQuestions++;
  const refs=references(q),images=[],missing=[];
  for(const ref of refs){
   const entry=byId.get(ref.id);
   if(!entry){missing.push(ref.id);result.findings.push({module:mod,question:q.item_id,kind:'MISSING_MEDIA_ID',id:ref.id});continue;}
   if(entry.kind!=='image'&&entry.type!=='image')continue;
   const candidate=String(entry.urlOrPath||'').includes('/assets-duduq-review/');
   const problem=await verifyCandidate(entry);
   if(problem)result.findings.push({module:mod,question:q.item_id,kind:problem,id:ref.id,path:entry.urlOrPath});
   images.push({id:ref.id,concept:ref.concept,role:ref.role,
    temporary:entry.temporary===true,candidate,src:entry.urlOrPath||'',problem});
  }
  result.questions.push({module:mod,id:q.item_id,mechanic:q.mechanicId||q.mechanic||q.delivery?.mechanic||'unknown',
    imageReferences:images.length,pinnedCandidateReferences:images.filter(x=>x.candidate).length,
    provisionalReferences:images.filter(x=>!x.candidate&&x.temporary).length,
    missingRefs:missing.length});
 }
}
assert.equal(result.checkedQuestions,80,'NOT_ALL_80_QUESTIONS');
result.checkedUniqueImageFiles=fileCache.size;
const browser=await chromium.launch({headless:true});
try{
 for(const q of result.questions){
  if(!mechanisms.has(q.mechanic))continue;
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const errors=[],brokenImages=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('response',r=>{
   if(r.status()>=400&&/content\/english\/assets\/images\//.test(r.url()))
    brokenImages.push({status:r.status(),url:r.url()});
  });
  const route='/play/'+q.mechanic+'/?duduqModule='+q.module+'&duduqItem='+q.id;
  try{
   const response=await page.goto('http://127.0.0.1:4175'+route,
     {waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(q.mechanic==='bubble-pop'?4800:1850);
   const visual=await page.evaluate(()=>{
    const relevant=[...document.querySelectorAll('img')]
     .filter(el=>(el.currentSrc||el.getAttribute('src')||'').includes('/assets-duduq-review/'));
    const loaded=relevant.filter(el=>el.complete&&el.naturalWidth>0);
    const placeholders=[...document.querySelectorAll('img')]
     .filter(el=>/provisional-semantic|placeholder/i.test(el.currentSrc||el.getAttribute('src')||''));
    return {imageCount:relevant.length,loadedImageCount:loaded.length,
      brokenCandidateImages:relevant.length-loaded.length,placeholderCount:placeholders.length,
      playableBubbleCount:document.querySelectorAll('.bubble-pop-playable').length,
      bubbleImageCount:document.querySelectorAll('.bubble-pop-content--image img').length,
      bubbleLikeNodes:[...document.querySelectorAll('[class*="bubble"],[data-bubble]')]
        .slice(0,14).map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,90),
          visible:Boolean(el.getClientRects().length),children:el.childElementCount})),
      frameCount:document.querySelectorAll('iframe').length,
      pageText:String(document.body?.innerText||'').slice(0,160)};
   });
   const row={module:q.module,id:q.id,mechanic:q.mechanic,
     route,status:response?.status()||0,pinnedRefs:q.pinnedCandidateReferences,
     ...visual,errors:errors.slice(0,3),brokenImages:brokenImages.slice(0,8)};
   result.render.push(row);result.checkedMechanicRoutes++;
   if(!response?.ok()||errors.length||brokenImages.length||visual.brokenCandidateImages){
    result.findings.push({module:q.module,question:q.id,kind:'BROWSER_IMAGE_OR_JS_ERROR',
      detail:{http:row.status,errors:row.errors,brokenImages:row.brokenImages,
        brokenCandidateImages:row.brokenCandidateImages}});
   }
   if(q.mechanic.startsWith('drag-drop')&&q.pinnedCandidateReferences>0&&visual.loadedImageCount===0)
    result.findings.push({module:q.module,question:q.id,kind:'DND_PINNED_IMAGE_NOT_RENDERED',
      detail:{pinnedRefs:q.pinnedCandidateReferences,route}});
   // Zero PNGs is NORMAL for Bubble Pop text/color bubbles. Empty interaction
   // area is NOT normal: the approved animation must spawn playable bubbles.
   if(q.mechanic==='bubble-pop'&&visual.playableBubbleCount===0)
    result.findings.push({module:q.module,question:q.id,kind:'BUBBLE_POP_NO_PLAYABLE_BUBBLES',detail:{route}});
  }catch(e){
   result.findings.push({module:q.module,question:q.id,kind:'BROWSER_PROBE_EXCEPTION',message:String(e.message||e).slice(0,350)});
  }finally{await page.close();}
 }
}finally{await browser.close();}
for(const m of modules){
 const questions=result.questions.filter(q=>q.module===m),browsed=result.render.filter(q=>q.module===m);
 result.summary[m]={questions:questions.length,probed:browsed.length,
  withPreviewCandidates:questions.filter(q=>q.pinnedCandidateReferences>0).length,
  withProvisionalRefs:questions.filter(q=>q.provisionalReferences>0).length,
  withNoCandidateVisible:browsed.filter(q=>q.pinnedRefs>0&&q.loadedImageCount===0).length,
  bubbleNoInteractive:browsed.filter(q=>q.mechanic==='bubble-pop'&&q.playableBubbleCount===0).length};
}
await mkdir(outDir,{recursive:true});
await writeFile(path.join(outDir,'report.json'),JSON.stringify(result,null,2)+'\n');
console.log('DUDUQ_MIXED_MECHANICS_80_QUESTIONS='+JSON.stringify({checked:result.checkedQuestions,
 probed:result.checkedMechanicRoutes,uniqueCandidateFiles:result.checkedUniqueImageFiles,
 summary:result.summary,findings:result.findings.slice(0,70)}));
const critical=new Set(['MISSING_MEDIA_ID','CANDIDATE_WITHOUT_SHA256','IMAGE_HASH_MISMATCH','BROWSER_IMAGE_OR_JS_ERROR',
 'DND_PINNED_IMAGE_NOT_RENDERED','BUBBLE_POP_NO_PLAYABLE_BUBBLES','BROWSER_PROBE_EXCEPTION']);
const fails=result.findings.filter(f=>critical.has(f.kind)||f.kind.startsWith('IMAGE_UNREADABLE:'));
if(fails.length){
 console.error('DUDUQ_MIXED_MECHANICS_GATE_FAILED='+JSON.stringify({count:fails.length,examples:fails.slice(0,25)}));
 process.exitCode=1;
}else console.log('DUDUQ_MIXED_MECHANICS_GATE_PASS=technical checks only; pedagogical QA pending');
