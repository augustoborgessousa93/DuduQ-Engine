#!/usr/bin/env node
// Audit actual built question graph, not stale queue counts or filenames.
import {readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const audit=[
 'IMG-Y1M01-GREETING-MORNING-001',
 'IMG-Y1M01-GREETING-AFTERNOON-001',
 'Y1M01-EMOJI-NIGHT-001',
 'IMG-Y1M03-Q001-WHITE'
];
const registry=JSON.parse(readFileSync(root+'/content/english/media/media-registry.json'));
const byId=new Map(registry.entries.map(x=>[x.mediaId,x]));
const rows=new Map(audit.map(x=>[x,[]]));
const matchKeys=new Set(['mediaId','assetId','image_ref','imageRef']);
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0');
 const file=root+'/content/english/year-'+y+'/module-'+mm+'/questions.json';
 const d=JSON.parse(readFileSync(file));
 for(const q of d.items){
  const walk=(x,location,ancestor={})=>{
   if(!x||typeof x!=='object')return;
   if(Array.isArray(x)){x.forEach((v,i)=>walk(v,location+'['+i+']',ancestor));return}
   const current={...ancestor};
   for(const k of ['optionId','semanticTarget','label','text','alt','caption','value','concept','targetConcept','word']){
    if(typeof x[k]==='string')current[k]=x[k];
   }
   for(const [k,v] of Object.entries(x)){
    if(matchKeys.has(k)&&typeof v==='string'&&rows.has(v))
     rows.get(v).push({questionId:q.item_id,where:location+'.'+k,
      optionId:current.optionId||null,semanticTarget:current.semanticTarget||null,
      label:current.label||null,alt:current.alt||null,concept:current.concept||null});
    if(v&&typeof v==='object')walk(v,location+'.'+k,current);
   }
  };
  walk(q,'question');
 }
}
for(const mediaId of audit){
 const r=rows.get(mediaId)||[],entry=byId.get(mediaId);
 const questions=[...new Set(r.map(x=>x.questionId))];
 const optionLabels=[...new Set(r.map(x=>x.label).filter(Boolean))];
 const semantics=[...new Set(r.map(x=>x.semanticTarget).filter(Boolean))];
 console.log('DUDUQ_DAYPART_GRAPH_AUDIT='+JSON.stringify({
  mediaId,registry:{urlOrPath:entry?.urlOrPath,semantic:entry?.semantic,
   temporary:entry?.temporary,status:entry?.status},
  questionCount:questions.length,questions,occurrences:r.length,
  optionLabels,semantics,examples:r.slice(0,30)}));
}
const important=['Y1M01-Q002','Y1M01-Q003','Y1M01-Q004','Y1M01-Q005',
 'Y2M01-Q001','Y2M01-Q003'];
for(const qid of important){
 const p=root+'/content/english/year-'+qid[1]+'/module-'+qid.slice(3,5)+'/questions.json';
 const q=JSON.parse(readFileSync(p)).items.find(x=>x.item_id===qid);
 console.log('DUDUQ_DAYPART_FULL_QUESTION='+JSON.stringify({
  questionId:qid,item:q}));
}
