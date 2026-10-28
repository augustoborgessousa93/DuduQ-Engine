import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const get=p=>readFileSync(p,'utf8');
const middleware=get('functions/play/english/_middleware.js');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(middleware).toString('base64'));
const host='https://duduq-engine-13a.pages.dev';
let tested=0;
for(const year of [1,2,3,4,5])for(let module=1;module<=6;module++){
 const id='Y'+year+'M'+String(module).padStart(2,'0');
 const path='/play/english/year-'+year+'/module-'+String(module).padStart(2,'0')+'/?duduqModule='+id+'&__duduq_fit=1';
 for(const mode of ['document','iframe']){
  const req=new Request(host+path,{headers:{'Sec-Fetch-Dest':mode}});
  let through=0;
  const res=await onRequest({request:req,next:()=>{through++;return new Response('ORIGINAL')}});
  const html=await res.text();
  if(mode==='document'){
   assert.equal(through,1,id+' direct navigation must retain full bleed');
   assert.equal(html,'ORIGINAL');
  } else {
   assert.equal(through,0,id+' iframe must use Fit');
   assert.equal(res.headers.get('X-DUDUQ-Fit'),'1');
   assert.match(html,/dataset\.fitMode='adaptive-fill'/);
   assert.doesNotMatch(html,/translate3d\(/);
  }
  tested++;
 }
}
const req=new Request(host+'/play/english/year-1/module-01/?__duduq_fit=1',{headers:{'Sec-Fetch-Dest':'iframe'}});
const html=await (await onRequest({request:req,next:()=>new Response('SHOULD_NOT_GET')})).text();
const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(code,'fit script not found');
for(const [width,height]of [[1500,785],[1395,785],[900,800],[768,1366],[1366,768],[1920,1080]]){
 const iframe={style:{}},viewport={clientWidth:width,clientHeight:height,dataset:{}};
 const document={getElementById:id=>id==='fit-game'?iframe:viewport};
 class ResizeObserver {observe(){}}
 vm.runInNewContext(code,{document,window:{visualViewport:null},ResizeObserver,addEventListener:()=>{}});
 const scale=Number(iframe.style.transform.match(/^scale\(([\d.e+-]+)\)$/)?.[1]);
 assert.ok(Number.isFinite(scale),'no uniform scale '+width+'x'+height);
 const renderedW=parseFloat(iframe.style.width)*scale,renderedH=parseFloat(iframe.style.height)*scale;
 assert.ok(Math.abs(renderedW-width)<.01,'horizontal letterbox '+width+'x'+height+': '+renderedW);
 assert.ok(Math.abs(renderedH-height)<.01,'vertical letterbox '+width+'x'+height+': '+renderedH);
 assert.equal(viewport.dataset.fitMode,'adaptive-fill');
 tested++;
}
const match=get('dist-pages/play/matching/index.html');
assert.match(match,/<button\s+class="primary-action matching-confirm-action"\s+type="button"\s+disabled\s+hidden\s+aria-hidden="true"/);
assert.match(match,/#game \.matching-action-area \.matching-confirm-action\[hidden\] \{/);
assert.match(match,/display: none !important;/);
assert.match(match,/visibility: hidden !important;/);
const hud=get('dist-pages/core/ui/duduq-canonical-question-hud.js');
assert.match(hud,/window\.location\.pathname\.startsWith\("\/play\/drag-drop\/"\)/);
assert.match(hud,/window\.location\.pathname\.startsWith\("\/play\/drag-drop-multimedia\/"\)/);
assert.ok(hud.includes('releaseFeedback(feedback, token);'));
assert.ok(hud.includes('feedbackTimer = window.setTimeout(() => releaseFeedback(feedback, token), 15000)'),'other mechanics audio gate intact');
const grouping=get('dist-pages/play/drag-drop/drag-drop.js');
assert.ok(grouping.indexOf('showValidationFeedback("correct");')<grouping.indexOf('speakFeedback("PLACEMENT_CORRECT"'),'Grouping Continue must precede voice');
assert.ok(grouping.indexOf('showValidationFeedback("incorrect");')<grouping.indexOf('speakGroupingWrong(incorrectCount)'),'Grouping Retry must precede voice');
assert.ok(grouping.includes('retryIncorrectItems();\n      // The reminder remains audible'),'retry should start without waiting for reminder');
const multimedia=get('dist-pages/play/drag-drop-multimedia/drag-drop-multimedia-gameplay.js');
assert.ok(multimedia.indexOf('Feedback(feedback, window.DuduQAssets?.assets, "correct", continueActivity)')<multimedia.indexOf('speakFeedback("SUCCESS_SHORT"'),'Multimedia Continue must precede narration');
assert.ok(multimedia.indexOf('Feedback(feedback, window.DuduQAssets?.assets, "incorrect"')<multimedia.indexOf('speakFeedback("ERROR_SHORT"'),'Multimedia Retry must precede narration');
assert.ok(multimedia.includes('successRecapGeneration++'),'cancel recap on Continue');
console.log('V21_INTEGRITY_30_MODULE_ROUTES=PASS:60');
console.log('V21_FIT_NO_GUTTERS=PASS:6_SIZES');
console.log('V21_MATCHING_EARLY_BUTTON_HIDDEN=PASS');
console.log('V21_GROUPING_MULTIMEDIA_IMMEDIATE_ACTIONS=PASS');
console.log('V21_TESTS_TOTAL=PASS:'+tested);
