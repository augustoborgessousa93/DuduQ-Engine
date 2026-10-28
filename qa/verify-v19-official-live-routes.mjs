import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const official='https://duduq-engine-13a.pages.dev';
const source='https://e95963a0.duduq-v19-pinned-release-source.pages.dev';
const manifestSha='CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E';
const SHA=b=>createHash('sha256').update(b).digest('hex');
async function get(url){
 let last;
 for(let i=0;i<3;i++)try{
  const r=await fetch(url,{signal:AbortSignal.timeout(30000),redirect:'follow',headers:{'Accept-Encoding':'identity'}});
  if(!r.ok)throw Error('HTTP_'+r.status+':'+url);
  const b=Buffer.from(await r.arrayBuffer());
  return {response:r,bytes:b};
 }catch(e){last=e;if(i<2)await new Promise(r=>setTimeout(r,500*(i+1)))}
 throw last;
}
const m=await get(source+'/__release/v19-file-sha256-manifest.txt');
if(SHA(m.bytes).toUpperCase()!==manifestSha)throw Error('UPSTREAM_MANIFEST_MISMATCH');
const hashes=new Map();
for(const row of m.bytes.toString('utf8').trimEnd().split(/\r?\n/)){
 const i=row.lastIndexOf(' ');hashes.set(row.slice(0,i),row.slice(i+1));
}
if(hashes.size!==2670)throw Error('SOURCE_INCOMPLETE');
const results=[];let requests=0;
async function verifyFile(path,contentCheck){
 const {bytes}=await get(official+'/'+path.split('/').map(encodeURIComponent).join('/'));
 requests++;
 const actual=SHA(bytes),expected=hashes.get(path);
 if(!expected||actual!==expected)throw Error('LIVE_HASH_MISMATCH:'+path+':'+actual+':'+expected);
 if(contentCheck)contentCheck(bytes);
 return {path,bytes:bytes.length};
}
for(let y=1;y<=5;y++)for(let mm=1;mm<=6;mm++){
 const m=String(mm).padStart(2,'0'),mid='Y'+y+'M'+m;
 const index='play/english/year-'+y+'/module-'+m+'/index.html';
 const json='content/english/year-'+y+'/module-'+m+'/questions.json';
 await verifyFile(index,bytes=>{if(!bytes.toString('utf8').includes('<html'))throw Error('HTML_INVALID:'+mid)});
 await verifyFile(json,bytes=>{const data=JSON.parse(bytes.toString('utf8'));if(data.moduleId!==mid||data.items?.length!==20)throw Error('QUESTIONS_INVALID:'+mid)});
 const live=await get(official+'/play/english/year-'+y+'/module-'+m+'/?duduqModule='+mid+'&__duduq_fit=1');
 requests++;
 const fit=live.response.headers.get('x-duduq-fit');
 if(fit!=='1')throw Error('FIT_MIDDLEWARE_MISSING:'+mid+':'+fit);
 if(!live.bytes.toString('utf8').includes('<html'))throw Error('LIVE_MODULE_HTML_INVALID:'+mid);
 results.push({module:mid,activities:20,fit,checks:'PASS'});
 console.log('OFFICIAL_V19_MODULE='+mid+':PASS');
}
for(const path of [
 'play/drag-drop/drag-drop.js',
 'core/ui/duduq-canonical-question-hud.js',
 'play/bubble-pop/bubble-pop.css',
 'content/english/assets/images/year-2/module-01/q018-name-question-scene-v1.png',
 'content/english/assets/audio/qa/memory-quest/instructions/aud-mq-qa-audio-image-en.mp3'
])await verifyFile(path);
if(results.length!==30||results.reduce((s,x)=>s+x.activities,0)!==600)throw Error('LIVE_MODULES_INCOMPLETE');
await mkdir('dist-pages',{recursive:true});
await writeFile('dist-pages/index.html','<!doctype html><meta charset="utf-8"><title>V19 QA route verification PASS</title><p>30/30 modules, 600/600 activities and official media checks.</p>');
const report={site:official,manifestSha256:manifestSha,modules:30,activities:600,httpRequests:requests,verifiedIndexFiles:30,verifiedContentFiles:30,verifiedFitRoutes:30,verifiedStaticAssets:5,results};
await writeFile('dist-pages/v19-live-route-report.json',JSON.stringify(report,null,2));
console.log('DUDUQ_V19_OFFICIAL_ROUTES=PASS:30/30:600/600:HTTP='+requests);
