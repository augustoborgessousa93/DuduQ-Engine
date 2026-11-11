#!/usr/bin/env node
/** Read-only diagnosis of Y1M01-Q011/Q015 routing against immutable production. */
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const base='https://c84a66a2.duduq-engine-13a.pages.dev';
const paths=[
 '/core/duduq-y1m01-module-runtime.js',
 '/core/duduq-shared-module-route-runtime.js',
 '/core/duduq-production-question-bootstrap.js',
 '/core/duduq-target-shooter-content.js',
 '/content/english/year-1/module-01/questions.json',
 '/play/target-shooter/index.html'
];
const files={};
for(const filePath of paths){
 const response=await fetch(base+filePath,{signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,200,'OFFICIAL_BASE_UNAVAILABLE:'+filePath+':'+response.status);
 files[filePath]=await response.text();
 console.log('READ_ONLY_BASE_FILE='+filePath+':'+files[filePath].length);
}
const terms=['Y1M01_SESSION_ITEM_MISMATCH','SESSION_ITEM_MISMATCH','sessionStorage','session','duduqItem','duduqModule','qaSeed','ITEM_MISMATCH','activityId','currentItem','questionId','window.location','searchParams'];
const matches={};
for(const [p,src] of Object.entries(files)){
 const l=src.split(/\r?\n/);
 matches[p]=l.flatMap((line,i)=>terms.some(t=>line.includes(t))?[{line:i+1,source:line.slice(0,500),context:l.slice(Math.max(0,i-3),Math.min(l.length,i+4)).map((row,j)=>(Math.max(0,i-3)+j+1)+': '+row).join('\n').slice(0,2500)}]:[]);
}
let questions=JSON.parse(files['/content/english/year-1/module-01/questions.json']);
let requested=['Y1M01-Q011','Y1M01-Q015'];
let inspect=requested.map(id=>{
 const item=questions.items.find(x=>x.item_id===id);
 assert(item,'OFFICIAL_QUESTION_MISSING:'+id);
 return {id,mechanicId:item.mechanicId,mechanicMode:item.mechanicMode,canonicalAnswer:item.answerKey||item.resposta||null,
 studentInstruction:item.primaryInstructionEn||item.instrucao_pt||null,
 referencedMedia:(JSON.stringify(item).match(/Y1M01-EMOJI-[A-Z]+-001/g)||[])};
});
const report={schema:'DUDUQ_Y1M01_SESSION_GATE_DIAGNOSTIC_V1',source:base,qaOnly:true,
 questions:inspect,matches,scriptSources:[...files['/play/target-shooter/index.html'].matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(x=>x[1])};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/y1m01-session-gate-diagnosis.json',JSON.stringify(report,null,2)+'\n');
console.log('Y1M01_COMPILED_QUESTION_MECHANICS='+JSON.stringify(inspect));
for(const [p,rows] of Object.entries(matches)){
 const focus=rows.filter(x=>/MISMATCH|sessionStorage|duduqItem|searchParams|session|currentItem/.test(x.source)).slice(0,23);
 console.log('SOURCE_GATE_CONTEXT '+p+'\n'+focus.map(x=>x.context).join('\n----\n').slice(0,13000));
}
console.log('DIAG_READY=READ_ONLY_NOT_FIXED');
