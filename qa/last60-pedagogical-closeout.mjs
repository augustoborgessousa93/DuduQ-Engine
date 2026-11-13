#!/usr/bin/env node
/** Read-only pedagogical/media closure audit. Does not approve content. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
const plan=JSON.parse(readFileSync('qa/plans/last60-official-assets-20261110.json','utf8'));
const candidate=JSON.parse(readFileSync('qa/results/last60-candidate-20261110.json','utf8'));
const qs=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0');
 const data=JSON.parse(readFileSync('dist-pages/content/english/year-'+y+'/module-'+mm+'/questions.json','utf8'));
 for(const q of data.items)qs.set(q.item_id,q);
}
assert.equal(qs.size,600);
assert.equal(candidate.mediaIdsUpdated,60);
assert.equal(candidate.affectedQuestions.length,65);
assert.equal(plan.assignments.length,60);
const source=new Map(plan.assignments.map(a=>[a.mediaId,a]));
const scopedPath='qa/results/last60-banana-context-correction.json';
const scoped=existsSync(scopedPath)?JSON.parse(readFileSync(scopedPath,'utf8')):null;
if(scoped){
 assert.equal(scoped.question,'Y2M06-Q018');
 const actual=qs.get('Y2M06-Q018');
 const txt=JSON.stringify(actual);
 assert(txt.includes(scoped.scopedMediaId)&&!txt.includes(scoped.originalMediaId),'CONTEXTUAL_BANANA_NOT_SELECTED');
 assert.equal(actual.answerKey,'big','CONTEXTUAL_Q_ANSWER_MUST_STAY_BIG');
 assert(scoped.answerKeyPreserved&&scoped.textPreserved&&scoped.audioPreserved&&scoped.goldMastersPreserved);
 const data=readFileSync('dist-pages/'+scoped.sourceUrl);
 assert.equal(createHash('sha256').update(data).digest('hex'),scoped.sha256,'BANANA_SOURCE_SHA_MISMATCH');
}
const rows=[],dimensions={};
for(const b of candidate.bindings){
 const a=source.get(b.mediaId);
 assert(a,'SOURCE_ASSIGNMENT_NOT_FOUND:'+b.mediaId);
 assert(typeof b.url==='string'&&!b.url.startsWith('http')&&!b.url.includes('..')&&b.url.length>2,'INVALID_URL:'+b.mediaId);
 const file=path.join('dist-pages',b.url.replace(/^\/+/,''));
 const png=readFileSync(file);
 assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'NON_PNG:'+file);
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20),colorType=png[25];
 const sha256=createHash('sha256').update(png).digest('hex');
 assert.equal(sha256,b.sha256,'SHA256_MISMATCH:'+file);
 assert(width>=512&&height>=512,'TOO_SMALL:'+file);
 assert(colorType===6||colorType===4||png.includes(Buffer.from('tRNS')),'NO_ALPHA_CHANNEL:'+file);
 dimensions[width+'x'+height]=(dimensions[width+'x'+height]||0)+1;
 const refs=b.referencedQuestions.filter(id=>!(scoped&&b.mediaId===scoped.originalMediaId&&id===scoped.question)).map(id=>{
  const q=qs.get(id);assert(q,'QUESTION_NOT_FOUND:'+id);
  return {id,mechanic:q.mechanicId,instructionEn:q.primaryInstructionEn||q.promptEn||null,
   instructionPt:q.primaryInstructionPt||q.instructionPt||null,answerKey:q.answerKey,
   options:(q.options||[]).map(o=>({label:o.label,answerKey:o.answerKey,mediaId:o.mediaId}))};
 });
 rows.push({mediaId:a.mediaId,concept:a.semantic,sourceFile:a.filename,
  reviewStatus:a.reviewStatus,pedagogicalRisk:a.pedagogicalRisk,
  url:b.url,width,height,alpha:true,sha256,refs});
}
assert.equal(rows.length,60);
const unique=new Set(rows.map(x=>x.sha256));
assert.equal(unique.size,59,'EXPECTED_59_DISTINCT_PNGS');
const pending=rows.filter(x=>x.reviewStatus!=='APPROVED');
const orphan=rows.filter(x=>x.refs.length===0);
const report={schema:'DUDUQ_LAST60_PEDAGOGICAL_CLOSEOUT_V1',qaOnly:true,productionPublished:false,
 verifiedPngBindings:60,uniquePngs:unique.size,questions:600,affectedQuestions:65,dimensions,
 approvedItems:60-pending.length,humanReviewPending:pending.length+(scoped?1:0),
 contextualRemediation:scoped?{question:scoped.question,source:scoped.sourceFile,mediaId:scoped.scopedMediaId,sha256:scoped.sha256,approval:'PENDING'}:null,
 orphanBindings:orphan.length,
 releaseGate:{passed:pending.length===0,reason:pending.length?'HUMAN_PEDAGOGICAL_REVIEW_PENDING':'ALL_SOURCE_REVIEWS_MARKED_APPROVED'},
 items:rows};
const dir='qa/results/last60-final-pedagogical-review';mkdirSync(dir,{recursive:true});
writeFileSync(dir+'/checklist.json',JSON.stringify(report,null,2)+'\n');
const md=['# DUDUQ English — última revisão pedagógica','',
 '- 60 associações PNG, 59 arquivos distintos; SHA-256 e alfa conferidos.',
 '- 600 questões preservadas, 65 questões diretamente afetadas.',
 '- Tamanhos encontrados: '+Object.entries(dimensions).map(([k,v])=>k+' ('+v+' vínculos)').join(', ')+'.',
 '- Registros pendentes de aprovação humana: '+pending.length+'/60.',
 '- Não declarar produção encerrada sem verificar significado visual, alternativas e as atividades.',
 '', '## Conferência visual por conceito e questão'];
for(const x of rows.sort((a,b)=>a.concept.localeCompare(b.concept)||a.mediaId.localeCompare(b.mediaId))) {
 const ids=x.refs.map(q=>q.id+' ['+q.mechanic+']').join(', ')||'(órfão)';
 md.push('- [ ] '+x.mediaId+' — '+x.concept+' | '+x.sourceFile+' | '+x.width+'x'+x.height+' | '+x.reviewStatus+' | '+ids);
}
md.push('','Os gabaritos e distratores da fonte constam no arquivo checklist.json. Este documento não constitui homologação humana.');
writeFileSync(dir+'/checklist.md',md.join('\n')+'\n');
console.log('LAST60_PEDAGOGICAL_REVIEW='+JSON.stringify({items:rows.length,unique:unique.size,dimensions,pending:pending.length,bananaContextPatched:Boolean(scoped),orphan:orphan.length,affected:65}));
