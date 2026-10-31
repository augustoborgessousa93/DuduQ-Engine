/**
 * Pure media-binding guard for the compiled 600-question DUDUQ contracts.
 * Prevents replacing a shared media ID in one question when other questions
 * or modules expect a different visual meaning. No runtime/game mutations.
 */
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
const normalize=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
export function collectQuestionMediaUsages(question, usages=new Map()){
 const qid=question?.item_id;
 if(!/^Y[1-5]M0[1-6]-Q\d{3}$/.test(qid||''))throw Error('INVALID_QUESTION_ID:'+qid);
 const moduleId=qid.slice(0,5);
 function walk(node){
  if(!node||typeof node!=='object')return;
  if(!Array.isArray(node)){
   const ids=[...new Set(['assetId','mediaId','image_ref','imageRef'].map(k=>node[k]).filter(v=>typeof v==='string'&&v.startsWith('IMG-')))];
   for(const id of ids){
    if(!usages.has(id))usages.set(id,[]);
    usages.get(id).push({questionId:qid,moduleId,semanticTarget:normalize(node.semanticTarget)});
   }
  }
  for(const v of Object.values(node))if(v&&typeof v==='object')walk(v);
 }
 walk(question);
 return usages;
}
export function assertBindingSafeAcrossQuestions({usages,mediaId,questionId,semanticTarget}){
 if(!/^Y[1-5]M0[1-6]-Q\d{3}$/.test(questionId||''))throw Error('INVALID_BINDING_QUESTION');
 const records=usages.get(mediaId)||[];
 if(!records.length||!records.some(r=>r.questionId===questionId))
  throw Error('MEDIA_NOT_REFERENCED_IN_BOUND_QUESTION:'+mediaId);
 const moduleId=questionId.slice(0,5);
 if(records.some(r=>r.moduleId!==moduleId))
  throw Error('CROSS_MODULE_MEDIA_ID_REQUIRES_SEPARATE_ASSET:'+mediaId);
 if(records.some(r=>!isExactPedagogicalConcept(semanticTarget,r.semanticTarget)))
  throw Error('MEDIA_ID_HAS_AMBIGUOUS_OR_MISSING_SEMANTIC:'+mediaId);
 return {mediaId,questionId,usages:records.length,distinctQuestions:new Set(records.map(r=>r.questionId)).size};
}
