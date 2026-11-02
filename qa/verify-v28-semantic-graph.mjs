#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist-pages'),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=new Map((await readFile(root+'/.duduq-pages-manifest','utf8')).trim().split(/\r?\n/).map(x=>{const i=x.lastIndexOf(' ');return [x.slice(0,i),x.slice(i+1)];}));
async function checked(rel){const p=path.resolve(root,rel);assert(p.startsWith(root+path.sep)&&manifest.has(rel),'MISSING_HASH:'+rel);const b=await readFile(p);assert.equal(sha(b),manifest.get(rel),'HASH_MISMATCH:'+rel);return b;}
const reg=JSON.parse(await checked('content/english/media/media-registry.json'));
const assets=reg.entries.filter(x=>String(x.urlOrPath||'').startsWith('content/english/assets/images/assets-duduq/'));
assert.equal(assets.length,157);
const byId=new Map(assets.map(x=>[x.mediaId,x]));assert.equal(byId.size,157);
const pngs=new Set(assets.map(x=>x.urlOrPath));assert.equal(pngs.size,21);
for(const x of assets){
 assert(x.temporary===true&&x.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING'&&x.integrationStatus==='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING','FALSE_APPROVAL:'+x.mediaId);
 assert(x.provenance?.sourceRepository==='augustoborgessousa93/Assets-DuduQ'&&x.provenance?.sourceCommit==='50fb80a89a5779d73f81c96aab35f6e86193d769');
 assert(x.altText===x.semantic&&x.sha256===manifest.get(x.urlOrPath),'REGISTRY_SOURCE_MISMATCH:'+x.mediaId);
}
for(const rel of pngs){const b=await checked(rel);assert(b.readUInt32BE(16)>=1024&&b.readUInt32BE(20)>=1024&&b[24]===8&&b[25]===6,'NOT_RGBA:'+rel);}
const usages=new Map(assets.map(x=>[x.mediaId,new Set()])),nested=[];
let qcount=0;
for(let year=1;year<=5;year++)for(let mod=1;mod<=6;mod++){
 const mm=String(mod).padStart(2,'0'),moduleId='Y'+year+'M'+mm;
 const data=JSON.parse(await checked('content/english/year-'+year+'/module-'+mm+'/questions.json'));
 assert.equal(data.moduleId,moduleId);assert.equal(data.items.length,20);
 for(const q of data.items){qcount++;
  function walk(node,where){
   if(!node||typeof node!=='object')return;
   if(Array.isArray(node)){node.forEach((v,i)=>walk(v,where+'/'+i));return;}
   const ids=new Set(['assetId','mediaId','imageRef','image_ref'].map(k=>node[k]).filter(id=>byId.has(id)));
   for(const id of ids){const sem=byId.get(id).semantic;
    if(node.semanticTarget)assert.equal(node.semanticTarget,sem,'SEMANTIC_CONFLICT:'+q.item_id+':'+id);
    else{
     assert(node.media?.mediaId===id&&node.media?.assetId===id&&node.media?.semanticTarget===sem&&node.media?.alt===sem,'MISSING_NESTED_SEMANTIC:'+q.item_id+':'+id);
     nested.push({questionId:q.item_id,mediaId:id,concept:sem,path:where});
    }
    usages.get(id).add(q.item_id);
   }
   for(const [k,v]of Object.entries(node))walk(v,where+'/'+k);
  }
  walk(q,'');
 }
}
assert.equal(qcount,600);assert.equal(nested.length,13,'IMPLICIT_REFERENCE_COUNT_CHANGED');
for(const [id,x]of byId)assert.deepEqual([...usages.get(id)].sort(),[...new Set(x.replacementAudit?.verifiedQuestionIds||[])].sort(),'WRONG_QUESTION_BINDING:'+id);
const questions=new Set([...usages.values()].flatMap(x=>[...x]));
const report={status:'PASS_SOURCE_SEMANTIC_GRAPH_TECHNICAL_ONLY',compiledQuestions:qcount,distinctPngs:pngs.size,mediaIds:byId.size,uniqueAffectedQuestions:questions.size,nestedExactReferences:nested.length,nestedEvidence:nested,semanticConflicts:0,unresolvedReferences:0,sourceCommit:'50fb80a89a5779d73f81c96aab35f6e86193d769',note:'APPROVED is only a runtime registry status. temporary=true and PEDAGOGICAL_QA_PENDING remain unchanged.',pedagogicalQaApproved:false,releaseApproved:false,productionDeployed:false};
await mkdir('qa/results',{recursive:true});await writeFile('qa/results/v28-semantic-graph.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,pngs:report.distinctPngs,mediaIds:report.mediaIds,questions:questions.size,nestedResolved:nested.length}));
