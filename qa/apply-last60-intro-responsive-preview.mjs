#!/usr/bin/env node
/** QA-only scoped responsive adapter for the *compiled* DUDUQ module intro. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_REQUIRED');
assert(process.argv.includes('--preview')&&!process.argv.includes('--release'),'QA_PREVIEW_ONLY');

const root='dist-pages/';
const introRel='play/intro-module/index.html';
const cssRel='core/adapters/v29/intro-portrait-qa.css';
const manifestRel='.duduq-pages-manifest';
const introFile=path.join(root,introRel),cssFile=path.join(root,cssRel),manifestFile=path.join(root,manifestRel);
const bytes=readFileSync('core/adapters/v29/intro-portrait-qa.css');
const text=bytes.toString('utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
const required=[
 '@media (orientation: portrait) and (max-width: 600px)',
 '.duduq-module-intro',
 '.intro-info',
 '.intro-start',
 'touch-action: manipulation',
 '--intro-mobile-control-top',
 'background-size: 100% auto'
];
for(const s of required)assert(text.includes(s),'INCOMPLETE_RESPONSIVE_SCOPE:'+s);
const previous=readFileSync(introFile);
const html=previous.toString('utf8');
const lines=readFileSync(manifestFile,'utf8').trimEnd().split(/\r?\n/);
const entries=new Map();
for(let i=0;i<lines.length;i++){
 const cut=lines[i].lastIndexOf(' '),p=lines[i].slice(0,cut),h=lines[i].slice(cut+1);
 assert(cut>0&&/^[a-f0-9]{64}$/.test(h)&&!entries.has(p),'BAD_MANIFEST:'+p);
 entries.set(p,{hash:h,index:i});
}
assert.equal(entries.get(introRel)?.hash,sha(previous),'INTRO_BYTES_NOT_MANIFESTED');
assert(!entries.has(cssRel),'MOBILE_QA_ADAPTER_ALREADY_PRESENT');
assert(!existsSync(cssFile),'MOBILE_QA_ADAPTER_PATH_ALREADY_EXISTS');
const marker='data-duduq-intro-mobile-review="v29"';
assert(!html.includes(marker),'MOBILE_QA_ADAPTER_ALREADY_LINKED');
assert(/<\/head>/i.test(html));
const tag='<link rel="stylesheet" href="/'+cssRel+'" '+marker+'>\n';
const next=Buffer.from(html.replace(/<\/head>/i,tag+'</head>'));
assert(next.includes(Buffer.from(tag)));
lines[entries.get(introRel).index]=introRel+' '+sha(next);
lines.push(cssRel+' '+sha(bytes));
mkdirSync(path.dirname(cssFile),{recursive:true});
writeFileSync(cssFile,bytes,{flag:'wx'});
writeFileSync(introFile,next);
writeFileSync(manifestFile,lines.join('\n')+'\n');
assert.equal(sha(readFileSync(introFile)),sha(next));
assert.equal(sha(readFileSync(cssFile)),sha(bytes));
const report={schema:'DUDUQ_V29_INTRO_RESPONSIVE_QA_V1',entry:introRel,adapter:cssRel,oldIntroSha256:sha(previous),
 newIntroSha256:sha(next),adapterSha256:sha(bytes),sourceLayoutTouched:false,changedAuthoredQuestions:0,
 changedGoldMasters:0,changedAudio:0,changedRuntimeModules:0,qaOnly:true,visualApproved:false,
 productionDeployed:false,viewportsToVerify:['390x844','844x390','1280x800']};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/intro-mobile-responsive-v29.json',JSON.stringify(report,null,2)+'\n');
console.log('V29_SCOPED_INTRO_QA_ADAPTER_APPLIED='+JSON.stringify(report));
