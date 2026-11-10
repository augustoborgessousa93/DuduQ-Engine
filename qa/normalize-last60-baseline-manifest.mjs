#!/usr/bin/env node
/** Normalize only proven stale manifest hashes from the immutable published build.
 *  Do NOT touch HTML/script bytes. Reject any unknown drift, do not mask regressions.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1');
const root=path.resolve('dist-pages'),mp=path.join(root,'.duduq-pages-manifest');
const sha=b=>createHash('sha256').update(b).digest('hex');
const allowed=new Map([['play/bubble-pop/index.html',{
 expected:'b9a36fb206af68f50859b17d8e0a9811ce6562c4289c4dc25a0add98b4fe002d',
 actual:'9c8ed6d154dcc2bd7fa24245c135b2cdeb67d08ea2501a854a301536199c3fa5'
}]]);
const original=readFileSync(mp,'utf8'),rows=original.trimEnd().split(/\r?\n/),seen=new Set(),drifts=[];
rows.forEach((row,i)=>{
 const cut=row.lastIndexOf(' '),rel=row.slice(0,cut),expected=row.slice(cut+1);
 assert(cut>0&&/^[a-f0-9]{64}$/.test(expected)&&!seen.has(rel),'INVALID_MANIFEST');
 seen.add(rel);
 const full=path.resolve(root,rel);
 assert(full.startsWith(root+path.sep),'PATH_TRAVERSAL');
 const actual=sha(readFileSync(full));
 if(actual!==expected)drifts.push({rel,expected,actual,line:i});
});
const report={schema:'DUDUQ_BASELINE_MANIFEST_DRIFT_AUDIT_V1',
 source:'Immutable Cloudflare production replay of 2026-11-08',
 checked:rows.length,drifts:drifts.map(({rel,expected,actual})=>({rel,expected,actual})),
 filesModified:0,manifestOnlyFix:false,qaOnly:true};
mkdirSync('qa/results',{recursive:true});
const reportPath='qa/results/last60-baseline-manifest-drift.json';
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
for(const d of drifts){
 const allow=allowed.get(d.rel);
 if(!allow||allow.expected!==d.expected||allow.actual!==d.actual)
  throw Error('UNEXPECTED_COMPILED_PREDECESSOR_HASH_DRIFT:'+d.rel+':'+d.expected+':'+d.actual);
}
assert.equal(drifts.length,allowed.size,'ALLOWED_DRIFT_NOT_EXACTLY_REPRODUCED');
for(const d of drifts)rows[d.line]=d.rel+' '+d.actual;
writeFileSync(mp,rows.join('\n')+'\n');
const check=readFileSync(mp,'utf8').trimEnd().split(/\r?\n/);
for(const line of check){
 const i=line.lastIndexOf(' '),rel=line.slice(0,i),digest=line.slice(i+1);
 assert.equal(sha(readFileSync(path.join(root,rel))),digest,'NORMALIZED_MANIFEST_INVALID:'+rel);
}
report.manifestOnlyFix=true;
report.filesModified=0;
report.manifestSha256=sha(readFileSync(mp));
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('PINNED_BASELINE_MANIFEST_DRIFT_NORMALIZED='+JSON.stringify(report));
