import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.DUDUQ_EDGE_ORIGIN || 'https://3167014e.duduq-v20-fullscreen-qa.pages.dev';
const rows=[],problems=[];
const cases=[];
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const id='Y'+year+'M'+String(module).padStart(2,'0');
 const path='/play/english/year-'+year+'/module-'+String(module).padStart(2,'0')+'/';
 cases.push({id,path,url:origin+path+'?duduqModule='+id+'&__duduq_fit=1&utm_source=chatgpt.com'});
}
async function open(url,dest){
 let error;
 for(let n=0;n<3;n++)try{
  const r=await fetch(url,{headers:{'Sec-Fetch-Dest':dest,'Accept':'text/html'},signal:AbortSignal.timeout(18000)});
  const html=await r.text();
  if(!r.ok)throw Error('HTTP_'+r.status+':'+url);
  return {r,html};
 }catch(e){error=e;if(n<2)await new Promise(ok=>setTimeout(ok,300*(n+1)));}
 throw error;
}
let next=0;
await Promise.all(Array.from({length:5},async()=>{
 while(next<cases.length){
  const c=cases[next++];
  try{
   const direct=await open(c.url,'document');
   assert.equal(direct.r.headers.get('x-duduq-fit'),null,c.id+' DIRECT MUST SKIP FIT');
   assert.match(direct.html,/data-duduq-ano=|DUDUQ_MODULE_FLOW|duduqModule|duduq-module-flow\.js/i,c.id+' expected native entry');
   assert.doesNotMatch(direct.html,/id="fit-game"/,c.id+' unexpected iframe');
   const iframe=await open(c.url,'iframe');
   assert.equal(iframe.r.headers.get('x-duduq-fit'),'1',c.id+' EMBED MUST KEEP FIT');
   assert.match(iframe.html,/id="fit-game"/);
   assert.match(iframe.html,/Math\.min\(w\/LOGICAL_W,h\/LOGICAL_H\)/);
   assert.match(iframe.html,/1366/);assert.match(iframe.html,/768/);
   rows.push({id:c.id,direct:'FULL_BLEED_ENTRY',embed:'PROPORTIONAL_FIT',status:'PASS'});
   console.log('V20_LIVE_EDGE_MODULE='+c.id+':PASS');
  }catch(e){problems.push({id:c.id,message:String(e).slice(0,350)});}
 }
}));
const page=await open(origin+'/play/intro-module/','document');
assert.match(page.html,/intro-module-root/);
const css=await fetch(origin+'/play/intro-module/intro-module.css',{signal:AbortSignal.timeout(15000)});
assert.equal(css.status,200,'INTRO_CSS_UNAVAILABLE');
const cssText=await css.text();
assert.match(cssText,/#intro-module-root\s*\{\s*position:\s*fixed;\s*inset:\s*0;/);
if(problems.length||rows.length!==30)throw Error('V20_LIVE_EDGE_ROUTES_NOT_APPROVED:'+JSON.stringify(problems.slice(0,8)));
await mkdir('dist-pages',{recursive:true});
const report={source:origin,verifiedModules:rows.length,direct:30,embed:30,checks:60,fullBleedIntro:true,rows};
await writeFile('dist-pages/index.html','<!doctype html><html><head><title>QA V20 PASS</title></head><body>V20 live edge routes PASS 30/30</body></html>');
await writeFile('dist-pages/qa-v20-live-edge-report.json',JSON.stringify(report,null,2));
console.log('V20_LIVE_EDGE_DIRECT_AND_EMBED=PASS:30/30:60');
