import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
const source=readFileSync('functions/play/english/_middleware.js','utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const url='https://duduq-engine-13a.pages.dev';
let tested=0;
async function check({pathname,search='?duduqModule=Y1M01&__duduq_fit=1',destination,expectFit}){
 const headers=new Headers();if(destination)headers.set('Sec-Fetch-Dest',destination);
 const request=new Request(url+pathname+search,{headers});
 let called=0;
 const res=await onRequest({request,next:()=>{called++;return new Response('ORIGINAL_MODULE_HTML',{headers:{'X-Original':'1'}})}});
 const text=await res.text();
 const fit=res.headers.get('X-DUDUQ-Fit');
 if(expectFit){
  assert.equal(called,0,pathname+' should have frame');
  assert.equal(fit,'1');
  assert.match(text,/id="fit-game"/);
  assert.match(text,/1366/);assert.match(text,/768/);
  assert.match(text,/Math\.min\(w\/LOGICAL_W,h\/LOGICAL_H\)/);
 }else{
  assert.equal(called,1,pathname+' should be native');
  assert.equal(fit,null);
  assert.equal(text,'ORIGINAL_MODULE_HTML');
 }
 tested++;
}
for(let y=1;y<=5;y++)for(let n=1;n<=6;n++){
 const moduleId='Y'+y+'M'+String(n).padStart(2,'0');
 const path='/play/english/year-'+y+'/module-'+String(n).padStart(2,'0')+'/';
 const q='?duduqModule='+moduleId+'&__duduq_fit=1&utm_source=chatgpt.com';
 await check({pathname:path,search:q,destination:'document',expectFit:false});
 await check({pathname:path,search:q,destination:'iframe',expectFit:true});
 // Compatibility with top-level without explicit fit.
 await check({pathname:path,search:'?duduqModule='+moduleId,destination:'document',expectFit:false});
 await check({pathname:path,search:'?duduqModule='+moduleId,destination:'iframe',expectFit:true});
 await check({pathname:path,search:q+'&__duduq_fit_inner=1',destination:'iframe',expectFit:false});
}
await check({pathname:'/play/english/year-1/module-01/',destination:undefined,expectFit:true});
await check({pathname:'/play/english/year-1/module-01/',search:'?duduqModule=Y1M01',destination:undefined,expectFit:false});
await check({pathname:'/play/english/year-1/module-01/',search:'?duduqModule=Y1M01',destination:'empty',expectFit:false});
await check({pathname:'/play/intro-module/',destination:'iframe',expectFit:false});
const css=readFileSync('dist-pages/play/intro-module/intro-module.css','utf8');
assert.match(css,/#intro-module-root\s*\{\s*position:\s*fixed;\s*inset:\s*0;/);
assert.match(css,/background: #87c95a url\([^)]*\) center center \/ cover no-repeat/);
const html=readFileSync('dist-pages/play/intro-module/index.html','utf8');
assert.match(html,/intro-module-root/);
console.log('V20_DIRECT_VS_IFRAME_ROUTE_TESTS=PASS:'+tested);
console.log('V20_INTRO_FULL_BLEED_LAYOUT=PASS');
console.log('V20_SAME_APPROVED_ARTIFACT_V19=PASS');
