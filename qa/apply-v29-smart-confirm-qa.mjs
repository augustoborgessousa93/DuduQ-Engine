#!/usr/bin/env node
/**
 * V29 isolated Smart Sentence Confirm state QA adapter injection.
 * Fail closed against compiled manifest drift, hashes both HTML and adapter.
 * Mutates ONLY dist-pages in the isolated GitHub Actions runner, never
 * authored source, Gold Masters, answer keys, production, or audio.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_REQUIRED');
assert(process.argv.includes('--preview')&&!process.argv.includes('--release'),'QA_PREVIEW_ONLY');

const root=path.resolve('dist-pages');
const htmlRel='play/smart-sentence/index.html';
const scriptRel='core/adapters/v29/smart-sentence-confirm-qa.js';
const manifestRel='.duduq-pages-manifest';
const srcFile=scriptRel;
const htmlFile=path.join(root,htmlRel),outFile=path.join(root,scriptRel),manifestFile=path.join(root,manifestRel);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const script=readFileSync(srcFile);
const scriptText=script.toString('utf8');
const required=[
 "snap.canConfirm", 'snap.status==="playing"',
 'root?.dataset.duduqInteractionState==="READY"',
 'btn.disabled=false',
 'onStateChange',
 'MutationObserver',
 "V29_QA_ONLY"
];
for(const part of required)assert(scriptText.includes(part),'QA_ADAPTER_INCOMPLETE:'+part);
assert(!/\.click\s*\(|\.dispatchEvent\s*\(|engine\.select\s*\(|engine\.confirm\s*\(/.test(scriptText),'QA_ADAPTER_MUST_NEVER_TRIGGER_ANSWER');
const original=readFileSync(htmlFile);
const html=original.toString('utf8');
assert(html.includes('smart-sentence')&&html.includes('</body>'),'UNEXPECTED_SMART_PAGE');
const rows=readFileSync(manifestFile,'utf8').trimEnd().split(/\r?\n/);
const entries=new Map();
rows.forEach((l,i)=>{
 const split=l.lastIndexOf(' '),p=l.slice(0,split),h=l.slice(split+1);
 assert(split>0&&/^[a-f0-9]{64}$/.test(h)&&!entries.has(p),'BAD_MANIFEST_ROW:'+p);
 entries.set(p,{hash:h,index:i});
});
assert.equal(entries.get(htmlRel)?.hash,sha(original),'SMART_HTML_BASE_SHA_DRIFT');
assert(!entries.has(scriptRel)&&!existsSync(outFile),'SMART_COMPAT_ALREADY_INCLUDED');
const marker='data-duduq-smart-confirm-qa="v29"';
assert(!html.includes(marker));
const scriptTag='<script src="/'+scriptRel+'" defer '+marker+'></script>\n';
const next=Buffer.from(html.replace(/<\/body>/i,scriptTag+'</body>'));
assert(next.includes(Buffer.from(scriptTag)));
rows[entries.get(htmlRel).index]=htmlRel+' '+sha(next);
rows.push(scriptRel+' '+sha(script));
mkdirSync(path.dirname(outFile),{recursive:true});
writeFileSync(outFile,script,{flag:'wx'});
writeFileSync(htmlFile,next);
writeFileSync(manifestFile,rows.join('\n')+'\n');
assert.equal(sha(readFileSync(htmlFile)),sha(next));
assert.equal(sha(readFileSync(outFile)),sha(script));
const report={schema:'DUDUQ_V29_SMART_CONFIRM_QA_ADAPTER_V1',mode:'QA_ONLY',html:htmlRel,script:scriptRel,
 htmlOriginalSha256:sha(original),htmlUpdatedSha256:sha(next),scriptSha256:sha(script),changedQuestionContracts:0,
 changedGoldMasters:0,changedAudio:0,changedScoring:0,changedEngine:0,changedRuntimeModules:0,
 answerSelectionNotModified:true,releaseApproved:false,productionDeployed:false};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/v29-smart-confirm-qa-adapter.json',JSON.stringify(report,null,2)+'\n');
console.log('V29_SMART_CONFIRM_ADAPTER_PREVIEW_ONLY='+JSON.stringify(report));
