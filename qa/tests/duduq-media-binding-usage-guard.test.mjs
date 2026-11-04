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

test('accept real Y1M04 drag-drop mediaBindings without option list',()=>{
 const id='IMG-Q001-ERASER',u=new Map();
 collectQuestionMediaUsages({item_id:'Y1M04-Q001',mechanicId:'drag-drop',
   mediaBindings:[{assetId:id,mediaId:id,semanticTarget:'eraser'}]},u);
 assert.equal(guard(u,id,'Y1M04-Q001','eraser').distinctQuestions,1);
});
test('accept exact meaning in nested targets and bubble distractor pools',()=>{
 const u=new Map();
 const pencil='IMG-Y1M04-Q003-PENCIL',pen='IMG-Y1M04-Q005-PEN';
 collectQuestionMediaUsages({item_id:'Y1M04-Q003',targets:[{media:{assetId:pencil,semanticTarget:'pencil'}}]},u);
 collectQuestionMediaUsages({item_id:'Y1M04-Q005',bubbleDistractorPool:[{media:{assetId:pen,semanticTarget:'pen'}}]},u);
 assert.equal(guard(u,pencil,'Y1M04-Q003','pencil').usages,1);
 assert.equal(guard(u,pen,'Y1M04-Q005','pen').usages,1);
});
test('infer an outer alias semantic only from its exact nested media object',()=>{
 const id='IMG-Y2M03-Q005-CTX-FAMILY',u=new Map();
 collectQuestionMediaUsages({item_id:'Y2M03-Q005',pairs:[{b:{assetId:id,
   media:{assetId:id,mediaId:id,semanticTarget:'grandmother'}}}]},u);
 const result=guard(u,id,'Y2M03-Q005','grandmother');
 assert.equal(result.usages,2);
 assert.equal(result.distinctQuestions,1);
});
test('reject conflicting direct and nested alias semantics',()=>{
 const id='IMG-Y2M03-Q005-CTX-FAMILY',u=new Map();
 assert.throws(()=>collectQuestionMediaUsages({item_id:'Y2M03-Q005',pairs:[{b:{assetId:id,
   semanticTarget:'father',media:{mediaId:id,semanticTarget:'mother'}}}]},u),/MEDIA_ALIAS_SEMANTIC_CONFLICT/);
});
test('allow a semantic wrapper around a distinct nested media ID',()=>{
 const id='IMG-Y2M01-Q018-NAME-QUESTION-SCENE-V1',u=new Map();
 collectQuestionMediaUsages({item_id:'Y2M01-Q018',options:[{semanticTarget:'name-question scene',
   media:{assetId:id,semanticTarget:"one child asks another child's name"}}]},u);
 assert.equal(guard(u,id,'Y2M01-Q018',"one child asks another child's name").usages,1);
});
test('reject same generic media ID used outside Y1M04 even when words match',()=>{
 const id='IMG-Q001-ERASER',u=new Map();
 collectQuestionMediaUsages(q('Y1M04-Q001',id,'eraser'),u);
 collectQuestionMediaUsages(q('Y2M04-Q001',id,'eraser'),u);
 assert.throws(()=>guard(u,id,'Y1M04-Q001','eraser'),/CROSS_MODULE_MEDIA_ID/);
});
