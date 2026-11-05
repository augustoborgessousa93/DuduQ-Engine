import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const SHA=b=>createHash('sha256').update(b).digest('hex');
const manifestPath='dist-pages/.duduq-pages-manifest';
const before=readFileSync(manifestPath);
const approvedV21='B3A8BB79CD37507E329250A6B5E90A0C5365F1A1741038FA8776AEC579AC5AB1';
if(SHA(before).toUpperCase()!==approvedV21)throw Error('V22_INPUT_NOT_FROZEN_V21:'+SHA(before));
const lines=before.toString('utf8').trimEnd().split(/\r?\n/);
if(lines.length!==2670)throw Error('V22_EXPECTED_FROZEN_BASE_2670:'+lines.length);
const entries=new Map();
for(let i=0;i<lines.length;i++){
 const at=lines[i].lastIndexOf(' '),path=lines[i].slice(0,at),sha=lines[i].slice(at+1);
 if(at<1||entries.has(path)||!(/^[a-f0-9]{64}$/.test(sha)))throw Error('V22_INVALID_MANIFEST:'+path);
 entries.set(path,{sha,index:i});
}
const replaced=[
 'core/duduq-matching-production-bridge.js',
 'core/ui/duduq-canonical-question-hud.js'
];
for(const path of replaced){
 const entry=entries.get(path);
 if(!entry)throw Error('V22_EXPECTED_RUNTIME_FILE_MISSING:'+path);
 const current=readFileSync('dist-pages/'+path);
 if(SHA(current)!==entry.sha)throw Error('V22_APPROVED_FILE_SHA_MISMATCH:'+path);
 // Keep QA overlay bytes stable across Windows core.autocrlf and Linux CI.
 const update=Buffer.from(readFileSync('qa/overlays/v22/'+path,'utf8').replace(/\r\n/g,'\n'),'utf8');
 if(update.equals(current))throw Error('V22_NO_ACTUAL_CHANGE:'+path);
 mkdirSync(dirname('dist-pages/'+path),{recursive:true});
 writeFileSync('dist-pages/'+path,update);
 lines[entry.index]=path+' '+SHA(update);
 console.log('V22_RUNTIME_CHANGED='+path+':'+SHA(update));
}
const newPath='core/matching/duduq-matching-runtime-v22.js';
if(entries.has(newPath))throw Error('V22_NEW_RUNTIME_ALREADY_EXISTS');
const program=Buffer.from(readFileSync('qa/overlays/v22/'+newPath,'utf8').replace(/\r\n/g,'\n'),'utf8');
const goldPath='dist-pages/runtime/gold-masters/matching/src/app.js';
const gold=readFileSync(goldPath);
const approvedGold=entries.get('runtime/gold-masters/matching/src/app.js');
if(SHA(gold)!==approvedGold?.sha)throw Error('V22_GOLD_MASTER_CHANGED');
if(!program.toString().includes('from "/runtime/gold-masters/matching/src/matching-engine.js"'))throw Error('V22_RUNTIME_IMPORTS_BROKEN');
mkdirSync(dirname('dist-pages/'+newPath),{recursive:true});
writeFileSync('dist-pages/'+newPath,program);
lines.push(newPath+' '+SHA(program));
const output=Buffer.from(lines.join('\n')+'\n');
writeFileSync(manifestPath,output);
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/v22-matching-feedback-manifest.txt',output);
console.log('V22_GOLD_MASTER_IMMUTABLE=PASS:'+approvedGold.sha);
console.log('V22_MANIFEST=PASS:'+SHA(output).toUpperCase()+':2671:CHANGED=2:ADDED=1');
