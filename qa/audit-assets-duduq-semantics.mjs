#!/usr/bin/env node
/** Read-only audit of the 600 immutable compiled game contracts.
 * Produces exact semantic candidate counts; NEVER mutates registry or art.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
// All registry media IDs, including Y2–Y5 IDs without IMG- prefix, are audited.
const root=process.cwd(),dist=path.join(root,'dist-pages');
const usage=new Map(),registry=JSON.parse(await readFile(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const idx=new Map(registry.entries.map(e=>[e.mediaId,e]));
function collectAll(q){
  const moduleId=q.item_id.slice(0,5);
  function walk(node){
    if(!node||typeof node!=='object')return;
    if(!Array.isArray(node)){
      const ids=[...new Set(['assetId','mediaId','image_ref','imageRef'].map(k=>node[k]).filter(v=>typeof v==='string'&&idx.has(v)))];
      for(const id of ids){
        if(!usage.has(id))usage.set(id,[]);
        usage.get(id).push({questionId:q.item_id,moduleId,semanticTarget:String(node.semanticTarget||'').trim().toLowerCase()});
      }
    }
    for(const v of Object.values(node))if(v&&typeof v==='object')walk(v);
  }
  walk(q);
}
let questions=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),file=path.join(dist,'content/english/year-'+y+'/module-'+mm+'/questions.json');
 const doc=JSON.parse(await readFile(file,'utf8'));
 if(doc.moduleId!=='Y'+y+'M'+mm||doc.items?.length!==20)throw Error('NOT_CANONICAL_30x600');
 for(const item of doc.items){questions++;collectAll(item);}
}
if(questions!==600)throw Error('EXPECTED_600_QUESTIONS');
const m=new Map(),missing=[];
for(const [id,records] of usage){
 const modules=[...new Set(records.map(r=>r.moduleId))];
 const semantics=[...new Set(records.map(r=>r.semanticTarget))];
 const entry=idx.get(id);
 if(!entry){missing.push(id);continue;}
 const first=modules[0],concept=semantics.length===1?semantics[0]:'[AMBIGUOUS]';
 const key=first+'|'+concept;
 if(!m.has(key))m.set(key,{module:first,concept,ids:[],questions:0,provisional:0,approved:0});
 const g=m.get(key);g.ids.push(id);g.questions+=new Set(records.map(x=>x.questionId)).size;
 if(entry.temporary===true)g.provisional++;else g.approved++;
}
const groups=[...m.values()].map(x=>({...x,ids:x.ids.slice(0,4)})).sort((a,b)=>a.module.localeCompare(b.module)||b.provisional-a.provisional);
const summary={schemaVersion:'DUDUQ_EXACT_SEMANTIC_OPPORTUNITIES_V1',questions,distinctReferencedIds:usage.size,groups:groups.length,missing:missing.slice(0,20),byModule:Object.fromEntries(Array.from({length:5},(_,y)=>Array.from({length:6},(_,m)=>'Y'+(y+1)+'M'+String(m+1).padStart(2,'0'))).flat().map(module=>[module,groups.filter(x=>x.module===module)]))};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/assets-duduq-semantics-inventory.json',JSON.stringify(summary,null,2)+'\n');
for(const [module,entries] of Object.entries(summary.byModule)){
 console.log('ASSETS_SEMANTICS_MODULE='+module+' '+JSON.stringify(entries.map(e=>({concept:e.concept,n:e.provisional}))));
}
console.log('ASSETS_SEMANTICS_COMPLETE='+JSON.stringify({questions,distinctReferencedIds:usage.size,groups:groups.length,output:'qa/results/assets-duduq-semantics-inventory.json'}));
