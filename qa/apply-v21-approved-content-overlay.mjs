import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifestPath='dist-pages/.duduq-pages-manifest';
const manifestBytes=readFileSync(manifestPath);
const baseSha=hash(manifestBytes).toUpperCase();
const approved='CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E';
if(baseSha!==approved)throw Error('V21_BASE_V19_MANIFEST_WRONG:'+baseSha);
const lines=manifestBytes.toString('utf8').trimEnd().split(/\r?\n/);
if(lines.length!==2670)throw Error('V21_BASE_COUNT_WRONG:'+lines.length);
const files=new Map();
for(let i=0;i<lines.length;i++){
 const line=lines[i],split=line.lastIndexOf(' ');
 const path=line.slice(0,split),sha=line.slice(split+1);
 if(!/^[a-f0-9]{64}$/.test(sha)||files.has(path))throw Error('BASE_MANIFEST_FORMAT_INVALID:'+path);
 files.set(path,{sha,index:i});
}
const changed=[
 'play/drag-drop/drag-drop.js',
 'play/drag-drop-multimedia/drag-drop-multimedia-gameplay.js',
 'core/ui/duduq-canonical-question-hud.js',
 'play/matching/index.html'
];
for(const name of changed){
 const old=files.get(name);
 if(!old)throw Error('BASE_ASSET_NOT_FOUND:'+name);
 const previous=readFileSync('dist-pages/'+name);
 if(hash(previous)!==old.sha)throw Error('BASE_ASSET_SHA_MISMATCH:'+name);
  // Git checks out text overlays with CRLF on Windows when core.autocrlf is
  // enabled. Normalize only line endings so the frozen V21 artifact manifest
  // is byte-identical across Windows and Linux runners.
  const update=Buffer.from(readFileSync('qa/overlays/v21/'+name,'utf8').replace(/\r\n/g,'\n'),'utf8');
 if(update.equals(previous))throw Error('OVERLAY_HAS_NO_DIFF:'+name);
 writeFileSync('dist-pages/'+name,update);
 old.sha=hash(update);
 lines[old.index]=name+' '+old.sha;
 console.log('V21_ASSET_PATCHED='+name+':'+old.sha);
}
const output=Buffer.from(lines.join('\n')+'\n');
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/v21-embed-feedback-matching-manifest.txt',output);
writeFileSync(manifestPath,output);
console.log('DUDUQ_V21_OVERLAY_MANIFEST=PASS:'+hash(output).toUpperCase()+':2670:CHANGED='+changed.length);
