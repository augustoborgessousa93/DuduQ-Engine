#!/usr/bin/env node
/**
 * DUDUQ English — module-by-module closeout, Y1M01 only.
 * Run after the approved Q001 and scoped Q003/Q004 source patches.
 * Inventory all 20 compiled questions and every image actually referenced.
 * Distinguish mechanical/byte QA from HUMAN visual/pedagogical approval.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const load=(p)=>readFileSync(path.resolve(root,p));
const json=(p)=>JSON.parse(load(p).toString('utf8'));
const sha=(b)=>createHash('sha256').update(b).digest('hex');
const moduleId='Y1M01', qpath='content/english/year-1/module-01/questions.json';
const content=json(qpath),registry=json('content/english/media/media-registry.json');
assert.equal(content.moduleId,moduleId,'MODULE_ID_MISMATCH');
assert.equal(content.items?.length,20,'MODULE_MUST_HAVE_20_CONTRACTS');
const manifest=new Map(load('.duduq-pages-manifest').toString('utf8')
 .trimEnd().split(/\r?\n/).map(s=>{
  const cut=s.lastIndexOf(' ');
  assert(cut>0,'MANIFEST_FORMAT_INVALID');
  return [s.slice(0,cut),s.slice(cut+1)];
 }));
const byMedia=new Map(registry.entries.map(x=>[x.mediaId,x]));
assert.equal(byMedia.size,registry.entries.length,'MEDIA_ID_COLLISION');
assert.equal(sha(load(qpath)),manifest.get(qpath),'QUESTIONS_HASH_NOT_IN_MANIFEST');
const questionRows=[],imageRows=[],missing=[],missingFiles=[],hashFailures=[];
const approvedQ001='Y1M01-Q001';
const auditedDayparts=new Set(['Y1M01-Q003','Y1M01-Q004']);
const classified=new Map();
const referenceKeys=new Set(['mediaId','assetId','image_ref','imageRef']);
function refsFrom(node,found,where='question'){
 if(!node||typeof node!=='object')return;
 if(Array.isArray(node)){for(let i=0;i<node.length;i++)refsFrom(node[i],found,where+'['+i+']');return;}
 for(const [k,v] of Object.entries(node)){
  if(referenceKeys.has(k)&&typeof v==='string'&&v.trim()){
   if(!found.has(v))found.set(v,[]);
   found.get(v).push(where+'.'+k);
  }
  if(v&&typeof v==='object')refsFrom(v,found,where+'.'+k);
 }
}
const seenId=new Set();
for(const q of content.items){
 assert(/^Y1M01-Q\d{3}$/.test(q.item_id),'INVALID_QUESTION_ID');
 assert(!seenId.has(q.item_id),'DUPLICATE_QUESTION');
 seenId.add(q.item_id);
 const refs=new Map();refsFrom(q,refs);
 let provisional=0,official=0,missingForQuestion=0,legacy=0;
 const problemIds=[];
 for(const [mediaId,placements] of refs){
  const e=byMedia.get(mediaId);
  // Audio IDs can be handled outside the image registry; audit only image-like
  // bindings and mediaIDs known to be images.
  if(!e){
   if(/^(?:IMG-|Y\dM\d\d-EMOJI-|IMAGE-)/.test(mediaId)){
    missing.push({questionId:q.item_id,mediaId,placements});
    missingForQuestion++;problemIds.push(mediaId);
   }
   continue;
  }
  const isImage=e.kind==='image'||/\.(png|webp|svg|jpe?g)(?:$|\?)/i.test(e.urlOrPath||'');
  if(!isImage)continue;
  const rel=String(e.urlOrPath||'').replace(/^\/+/,'');
  const source=String(e.provenance?.sourcePath||'');
  let fileOk=false,checksumOk=false;
  if(rel&&manifest.has(rel)&&existsSync(path.resolve(root,rel))){
   fileOk=true;
   const bytes=load(rel);
   checksumOk=sha(bytes)===manifest.get(rel)&&(!e.sha256||sha(bytes)===e.sha256);
  }
  if(!fileOk)missingFiles.push({questionId:q.item_id,mediaId,path:rel});
  else if(!checksumOk)hashFailures.push({questionId:q.item_id,mediaId,path:rel});
  const old=rel.endsWith('.svg')||e.temporary===true||e.humanResolutionStatus==='PROVISIONAL';
  const sourceOfficial=source.startsWith('Imagens Ilustrativa/')&&rel.endsWith('.png');
  let classification=old?'PROVISIONAL':sourceOfficial?'OFFICIAL_PNG':'LEGACY_OR_NOT_PROVEN_OFFICIAL';
  if(!fileOk||!checksumOk)classification='BROKEN';
  if(old)provisional++;
  else if(sourceOfficial)official++;
  else legacy++;
  if(classification!=='OFFICIAL_PNG')problemIds.push(mediaId);
  imageRows.push({questionId:q.item_id,mediaId,classification,path:rel,
   semantic:e.semantic??null,temporary:e.temporary===true,
   humanResolutionStatus:e.humanResolutionStatus??null,
   source:source||null,sourceGitBlob:e.provenance?.sourceGitBlob??null,
   manifestVerified:fileOk&&checksumOk,placements:placements.slice(0,5)});
  classified.set(mediaId,classification);
 }
 const status=q.item_id===approvedQ001?'OWNER_APPROVED_VISUAL':
  auditedDayparts.has(q.item_id)?'QA_PREVIEW_HUMAN_REVIEW_PENDING':
  (provisional||missingForQuestion)?'NEEDS_IMAGE_REMEDIATION':
  'VISUAL_QA_NOT_YET_SIGNED_OFF';
 questionRows.push({questionId:q.item_id,mechanic:q.mechanicId??q.mechanic??null,
  answerKey:q.answerKey??null,answerLetter:q.resposta??null,
  mediaIds:[...refs.keys()].filter(x=>byMedia.get(x)?.kind==='image'||/^(IMG-|Y\dM\d\d-EMOJI-)/.test(x)),
  references:refs.size,officialPngs:official,provisional,
  legacyOrUnverified:legacy,missing:missingForQuestion,status,problemIds});
}
assert.equal(questionRows.length,20);
assert.equal(questionRows.filter(q=>q.status==='OWNER_APPROVED_VISUAL').length,1);
const q1=content.items.find(x=>x.item_id===approvedQ001);
assert(q1?.answerKey==='hello'&&q1?.resposta==='C','USER_APPROVED_Q001_DRIFT');
assert.deepEqual(q1.options?.map(x=>x.optionId),['reading','sleep','hello','snack']);
const unique=[...classified.entries()].reduce((acc,[id,type])=>(acc[type]=(acc[type]||0)+1,acc),{});
const counts={
 questions:questionRows.length,imageReferences:imageRows.length,
 uniqueMediaIds:classified.size,
 officialPngReferences:imageRows.filter(x=>x.classification==='OFFICIAL_PNG').length,
 provisionalReferences:imageRows.filter(x=>x.classification==='PROVISIONAL').length,
 legacyOrUnknownReferences:imageRows.filter(x=>x.classification==='LEGACY_OR_NOT_PROVEN_OFFICIAL').length,
 brokenReferences:imageRows.filter(x=>x.classification==='BROKEN').length,
 ownerApprovedQuestions:1,remainingVisualReviewQuestions:19,
 missingMediaIds:missing.length,missingFiles:missingFiles.length,hashFailures:hashFailures.length,
 classificationsUnique:unique
};
const report={
 schemaVersion:'DUDUQ_YEAR_1_MODULE_01_REAL_MEDIA_CLOSURE_V1',
 year:1,module:1,moduleId,ownerApprovedQ001Protected:true,
 questionsWithScopedDaypartSources:['Y1M01-Q003','Y1M01-Q004'],
 currentPhase:'MODULE_01_VISUAL_PEDAGOGICAL_REVIEW_REQUIRED',
 productionDeployed:false,completionCertified:false,contractsAllYears:600,
 counts,questions:questionRows,imageOccurrences:imageRows,
 problems:{missing,missingFiles,hashFailures},
 nextRequiredHumanChecks:[
  'Y1M01 Q003/Q004: verify real in-module session, not only direct links',
  'Verify visual recognition of Morning/Afternoon/Night by first graders',
  'Review all nonofficial or provisional concepts in remaining questions',
  'Verify interaction and audio where module uses Bubble Pop/Target Shooter'
 ]
};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/y1m01-real-module-audit.json',JSON.stringify(report,null,2)+'\n');
const md=[
 '# DUDUQ English — 1º ano / Módulo 01 — Auditoria real de imagens',
 '',
 '**Estado:** revisão visual e pedagógica pendente. **Não equivale a 100% homologado.**',
 '',
 '| Indicador | Resultado |','|---|---:|',
 ...Object.entries(counts).filter(([k])=>k!=='classificationsUnique')
  .map(([k,v])=>'| '+k+' | '+v+' |'),
 '',
 '| Questão | Mecânica | PNGs oficiais | Provisórias | Outras | Status |',
 '|---|---|---:|---:|---:|---|',
 ...questionRows.map(x=>'| '+x.questionId+' | '+(x.mechanic||'n/d')+' | '+x.officialPngs+
  ' | '+x.provisional+' | '+x.legacyOrUnverified+' | '+x.status+' |'),
 '',
 '## Mídias provisórias / pendentes por questão',
 ...questionRows.filter(x=>x.problemIds.length).map(x=>
  '- **'+x.questionId+':** '+x.problemIds.join(', ')),
 '',
 '## Portões de qualidade',
 '- Q001 Hello: decisão do usuário protegida por teste automático',
 '- Q003/Q004: referências oficiais aplicadas em candidata isolada',
 '- 600 contratos: preservados pelo QA geral',
 '- Imagens renderizadas numa sessão real e adequação pedagógica: revisão necessária',
 '- Produção oficial: não alterada',
 ''
].join('\n');
writeFileSync('qa/results/y1m01-real-module-audit.md',md);
console.log('DUDUQ_Y1M01_REAL_AUDIT='+JSON.stringify({moduleId,phase:report.currentPhase,counts,
 topPending:questionRows.filter(x=>x.problemIds.length)
 .slice(0,10).map(x=>({id:x.questionId,provisional:x.provisional,legacy:x.legacyOrUnverified}))}));
assert.equal(hashFailures.length,0,'MODULE_01_MEDIA_CHECKSUM_FAILURE');
assert.equal(missingFiles.length,0,'MODULE_01_ASSET_PATH_MISSING');
