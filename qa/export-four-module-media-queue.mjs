#!/usr/bin/env node
/**
 * Read-only, context-aware reuse/gap queue for Y1M02/03/04/06.
 * Exact meanings ONLY: color/attribute composites are not generic animals,
 * pen is not pencil, book is not notebook. Never updates a question or key.
 * Candidate == technical reuse, NEVER pedagogical or production approval.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist-pages');
const output='qa/results/assets-duduq-mixed-mechanics/four-module-image-queue.json';
const modules=['Y1M02','Y1M03','Y1M04','Y1M06'];
const mediaFields=new Set(['assetId','mediaId','imageRef','image_ref']);
const exact=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const registry=JSON.parse(await readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
assert(Array.isArray(registry.entries));
const entries=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(entries.size,registry.entries.length);
const rows=[],counts={};
for(const moduleId of modules){
 const year=moduleId[1],number=moduleId.slice(3);
 const document=JSON.parse(await readFile(path.join(root,'content/english/year-'+year+'/module-'+number+'/questions.json'),'utf8'));
 assert.equal(document.moduleId,moduleId);
 assert.equal(document.items?.length,20);
 counts[moduleId]={questions:20,total:0,withPinnedSource:0,unresolved:0,composites:0,unverifiedCandidates:0,unknownIds:0,distinctUnresolvedConcepts:{}};
 for(const q of document.items){
  function scan(node,loc){
   if(!node||typeof node!=='object')return;
   if(Array.isArray(node)){node.forEach((n,i)=>scan(n,loc+'['+i+']'));return;}
   for(const [field,mediaId] of Object.entries(node)){
    if(!mediaFields.has(field)||typeof mediaId!=='string'||!mediaId.startsWith('IMG-'))continue;
    const entry=entries.get(mediaId);
    const concept=exact(node.semanticTarget||node.mustInclude||node.answerKey||entry?.semantic||'');
    const expected=exact(node.mustInclude||node.semanticTarget||'');
    const officialSource=entry?.provenance?.sourceRepository==='augustoborgessousa93/Assets-DuduQ' &&
      entry?.provenance?.sourceCommit==='658d94f08031820cfea5258a6f4e7c24f278df92';
    const hasPath=typeof entry?.urlOrPath==='string'&&entry.urlOrPath.startsWith('content/english/assets/images/assets-duduq-review/');
    const exactMatch=concept&&exact(entry?.semantic)===concept&&(!expected||expected===concept);
    const alias=(concept==='pencil-case'&&exact(entry?.semantic)==='pencil case') ||
                (concept==='pencil case'&&exact(entry?.semantic)==='pencil-case');
    // Aliases need a complete independent context audit; never self-approve.
    const pinned=officialSource&&hasPath&&exactMatch;
    const status=!entry?'UNKNOWN_MEDIA_ID':pinned?'PINNED_TECHNICAL_CANDIDATE_NOT_HOMOLOGATED':
      alias?'PENCIL_CASE_ALIAS_REQUIRES_CONTEXT_EVIDENCE':
      /\s/.test(concept)?'COMPOSITE_NEEDS_EXACT_VISUAL_MATCH':'NO_PROVEN_EXACT_SOURCE';
    const row={moduleId,questionId:q.item_id,mechanic:q.mechanicId||q.mechanic||q.delivery?.mechanic||'unknown',
      location:loc+'.'+field,mediaId,semanticTarget:concept,mustInclude:expected,
      status,sourcePath:entry?.urlOrPath||null,temporary:entry?.temporary??null,
      candidateSourceCommit:officialSource?entry.provenance.sourceCommit:null,
      pedagogicalQAApproved:false,productionApproved:false};
    rows.push(row);counts[moduleId].total++;
    if(pinned){counts[moduleId].withPinnedSource++;counts[moduleId].unverifiedCandidates++;}
    else {
     counts[moduleId].unresolved++;
     if(status==='COMPOSITE_NEEDS_EXACT_VISUAL_MATCH')counts[moduleId].composites++;
     if(status==='UNKNOWN_MEDIA_ID')counts[moduleId].unknownIds++;
     counts[moduleId].distinctUnresolvedConcepts[concept||'[SEMANTIC_UNKNOWN]']=
       (counts[moduleId].distinctUnresolvedConcepts[concept||'[SEMANTIC_UNKNOWN]']||0)+1;
    }
   }
   for(const [k,v] of Object.entries(node))if(v&&typeof v==='object')scan(v,loc+'.'+k);
  }
  scan(q,'question');
 }
 counts[moduleId].distinctUnresolvedConcepts=Object.fromEntries(
  Object.entries(counts[moduleId].distinctUnresolvedConcepts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));
}
const summary={modules:4,questions:80,imageReferences:rows.length,
 pinnedTechnicalCandidates:rows.filter(r=>r.status==='PINNED_TECHNICAL_CANDIDATE_NOT_HOMOLOGATED').length,
 unresolvedReferences:rows.filter(r=>r.status!=='PINNED_TECHNICAL_CANDIDATE_NOT_HOMOLOGATED').length,
 finalPedagogicalApproval:false,officialDeploymentAllowed:false};
const report={schemaVersion:'DUDUQ_FOUR_MODULE_EXACT_CONCEPT_QUEUE_V1',source:'compiled_candidate_only',
 policy:{allowGlobalAlias:false,preserveAnswerKey:true,preserveDistractors:true,preserveMechanic:true,
  allowCompositeToSimple:false,allowUnreviewedPublication:false},
 summary,byModule:counts,items:rows};
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_FOUR_MODULE_REUSE_QUEUE='+JSON.stringify({summary,byModule:counts,output}).slice(0,11000));
