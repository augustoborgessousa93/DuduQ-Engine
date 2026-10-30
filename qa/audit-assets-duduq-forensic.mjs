#!/usr/bin/env node
/* Read-only forensic audit: exactly what question references, expected prompts,
 * and runtime registry provide in the compiled Pages preview.
 * Does not alter game, Gold Masters, questions, or media registry.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const root='dist-pages',out='qa/results/assets-duduq-forensic.json';
const registry=JSON.parse(await fs.readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const ri=new Map(registry.entries.map(x=>[x.mediaId,x]));
const mods=['Y1M02','Y1M03','Y1M04','Y1M05','Y1M06'],rows={},unknownKeys=new Set();
for(const mod of mods){
 const [,y,mm]=/^Y([1-5])M(0[1-6])$/.exec(mod);
 const doc=JSON.parse(await fs.readFile(path.join(root,'content/english/year-'+y+'/module-'+mm+'/questions.json'),'utf8'));
 rows[mod]=[];
 for(const q of doc.items){
   const refs=[];
   function walk(node,parent){
     if(!node||typeof node!=='object')return;
     if(!Array.isArray(node)){
       const ids=[...new Set(['assetId','mediaId','image_ref','imageRef'].map(k=>node[k]).filter(v=>typeof v==='string'&&(v.startsWith('IMG-')||ri.has(v))))];
       for(const id of ids){
         const e=ri.get(id);
         refs.push({id,concept:node.semanticTarget||null,nodeKeys:Object.keys(node),nodeContext:JSON.stringify(node).slice(0,500),
           parentKeys:parent?Object.keys(parent).slice(0,14):[],temporary:e?.temporary??null,
           state:e?.integrationStatus||null,registrySemantic:e?.semantic||null,
           output:e?.urlOrPath||null,source:e?.provenance?.sourcePath||null});
       }
     }
     for(const v of Object.values(node))if(v&&typeof v==='object')walk(v,node);
   }
   walk(q,null);
   rows[mod].push({question:q.item_id,topic:q.topic||q.topicTitle||q.title||q.metadata?.topic||null,
     instruction:q.instruction||q.prompt||q.statement||null,
     promptExcerpt:JSON.stringify(q).slice(0,1100),mechanic:q.mechanic||q.delivery?.mechanic||null,refs});
 }
}
const samples={};
for(const m of mods)samples[m]={questions:rows[m].length,images:rows[m].reduce((s,q)=>s+q.refs.length,0),
  replacedRefs:rows[m].flatMap(q=>q.refs).filter(x=>x.source).length,
  notReplaced:rows[m].flatMap(q=>q.refs).filter(x=>!x.source).reduce((o,x)=>{const k=x.concept||'[MISSING]';o[k]=(o[k]||0)+1;return o},{}),
  firstQuestions:rows[m].slice(0,4),unresolved:rows[m].filter(q=>q.refs.some(r=>!r.source)).slice(0,12).map(q=>({question:q.question,prompt:q.promptExcerpt.slice(0,420),refs:q.refs.filter(r=>!r.source).map(r=>({id:r.id,concept:r.concept,context:r.nodeContext.slice(0,200)}))}))};
const outJson={schemaVersion:'DUDUQ_FORENSIC_MEDIA_RESOLUTION_V1',source:'compiled-QA-artifact',moduleSummary:samples};
await fs.mkdir('qa/results',{recursive:true});await fs.writeFile(out,JSON.stringify(outJson,null,2)+'\n');
for(const [mod,z] of Object.entries(samples))console.log('FORENSIC_MODULE='+mod+' '+JSON.stringify({questions:z.questions,images:z.images,replacedRefs:z.replacedRefs,notReplaced:z.notReplaced,firstQuestion:z.firstQuestions[0]}).slice(0,6200));
console.log('FORENSIC_AUDIT_WRITTEN='+out);
