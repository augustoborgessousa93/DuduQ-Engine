import test from 'node:test';
import assert from 'node:assert/strict';
import {collectQuestionMediaUsages,assertBindingSafeAcrossQuestions} from '../media-binding-usage-guard.mjs';
const q=(id,mid,semantic)=>({item_id:id,options:[{media:{assetId:mid,mediaId:mid,semanticTarget:semantic}}]});
const guard=(usage,mid,qid,sem)=>assertBindingSafeAcrossQuestions({usages:usage,mediaId:mid,questionId:qid,semanticTarget:sem});
test('accept exact scoped reuse within one module, including multiple questions',()=>{
 const id='IMG-Y1M04-Q005-PEN',u=new Map();
 collectQuestionMediaUsages(q('Y1M04-Q005',id,'pen'),u);
 collectQuestionMediaUsages(q('Y1M04-Q018',id,'pen'),u);
 assert.equal(guard(u,id,'Y1M04-Q005','pen').distinctQuestions,2);
});
test('reject cross-module same media ID even with identical semantic text',()=>{
 const id='IMG-Y1M03-Q001-ORANGE',u=new Map();
 collectQuestionMediaUsages(q('Y1M03-Q001',id,'orange'),u);
 collectQuestionMediaUsages(q('Y2M06-Q002',id,'orange'),u);
 assert.throws(()=>guard(u,id,'Y1M03-Q001','orange'),/CROSS_MODULE_MEDIA_ID/);
});
test('reject ambiguous and missing semanticTarget across uses',()=>{
 for(const other of ['pencil',null]){
  const id='IMG-Y1M04-Q010-PEN',u=new Map();
  collectQuestionMediaUsages(q('Y1M04-Q010',id,'pen'),u);
  collectQuestionMediaUsages(q('Y1M04-Q015',id,other),u);
  assert.throws(()=>guard(u,id,'Y1M04-Q010','pen'),/AMBIGUOUS_OR_MISSING_SEMANTIC/);
 }
});
test('reject binding not actually referenced in the claimed question',()=>{
 const id='IMG-Y1M04-Q010-PEN',u=new Map();
 collectQuestionMediaUsages(q('Y1M04-Q010',id,'pen'),u);
 assert.throws(()=>guard(u,id,'Y1M04-Q015','pen'),/MEDIA_NOT_REFERENCED/);
});
test('deduplicate assetId and mediaId on same media object',()=>{
 const id='IMG-Y1M04-Q010-PEN',u=new Map();
 collectQuestionMediaUsages(q('Y1M04-Q010',id,'pen'),u);
 assert.equal(guard(u,id,'Y1M04-Q010','pen').usages,1);
});
