import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
const origin='https://e95963a0.duduq-v19-pinned-release-source.pages.dev';
const expected='CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E';
const maxAttempts=3;
const SHA=b=>createHash('sha256').update(b).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function download(relative){
 const url=origin+'/'+relative.split('/').map(encodeURIComponent).join('/');
 let last=null;
 for(let i=0;i<maxAttempts;i++){
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'follow',headers:{'Accept-Encoding':'identity'}});
   if(!res.ok)throw Error('HTTP_'+res.status+' for '+relative+' -> '+res.url);
   return Buffer.from(await res.arrayBuffer());
  }catch(e){last=e;if(i<maxAttempts-1)await sleep(350*(i+1));}
 }
 throw Error('DOWNLOAD_FAILED:'+relative+':'+String(last?.message||last));
}
const manifest=await download('__release/v19-file-sha256-manifest.txt');
if(SHA(manifest).toUpperCase()!==expected)throw Error('REMOTE_MANIFEST_INVALID:'+SHA(manifest));
const text=manifest.toString('utf8');
const lines=text.trimEnd().split(/\r?\n/),entries=[];
if(lines.length!==2670)throw Error('EXPECTED_2670_ENTRIES:'+lines.length);
const paths=new Set();
for(const line of lines){
 const i=line.lastIndexOf(' '),path=line.slice(0,i),sha=line.slice(i+1);
 if(i<1||!(/^[a-f0-9]{64}$/.test(sha))||path.startsWith('/')||path.includes('\\')||path.split('/').some(x=>x===''||x==='.'||x==='..')||paths.has(path))throw Error('INVALID_MANIFEST_ENTRY:'+line.slice(0,200));
 paths.add(path);entries.push({path,sha});
}
console.log('V19_REMOTE_MANIFEST=PASS:'+expected+':'+entries.length);
const smoke=process.env.DUDUQ_IMPORT_SMOKE_ONLY==='1';
const samples=[
 'play/english/year-1/module-03/index.html',
 'content/english/year-1/module-03/questions.json',
 'play/drag-drop/drag-drop.js',
 'core/ui/duduq-canonical-question-hud.js',
 'content/english/assets/images/year-2/module-01/q018-name-question-scene-v1.png',
 'content/english/assets/audio/qa/memory-quest/instructions/aud-mq-qa-audio-image-en.mp3'
];
const selected=smoke?entries.filter(x=>samples.includes(x.path)):entries;
if(smoke&&selected.length!==samples.length)throw Error('SMOKE_SAMPLES_MISSING');
let next=0,total=0,errors=[];
const pool=Array.from({length:smoke?3:14},async()=>{
 while(next<selected.length){
  const item=selected[next++];
  try{
   const b=await download(item.path);
   const sha=SHA(b);
   if(sha!==item.sha)throw Error('SHA256_MISMATCH:'+item.path+':'+sha+':expected:'+item.sha);
   const path=join('dist-pages',item.path);
   await mkdir(dirname(path),{recursive:true});
   await writeFile(path,b);
   total+=b.byteLength;
  }catch(e){errors.push(String(e));if(errors.length>=15)return}
 }
});
await Promise.all(pool);
if(errors.length)throw Error('V19_CDN_IMPORT_FAILED:'+JSON.stringify(errors.slice(0,15)));
if(!smoke){await mkdir('dist-pages',{recursive:true});await writeFile('dist-pages/.duduq-pages-manifest',manifest);}
console.log((smoke?'V19_IMMUTABLE_CDN_SMOKE':'V19_IMMUTABLE_CDN_IMPORT')+'=PASS:'+selected.length+':'+total+':'+expected);
