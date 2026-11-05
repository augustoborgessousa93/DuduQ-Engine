#!/usr/bin/env node
/**
 * Read-only DUDUQ media-ID context audit.
 * Identifies cross-module reuse and homonyms that must not be auto-replaced
 * merely because semanticTarget strings are equal (e.g. orange color/fruit).
 * Requires the compiled V26 30x20 contracts and media inventory.
 */
import fs from "node:fs";
import path from "node:path";
const root=path.resolve("dist-pages");
const reportPath="qa/results/duduq-cross-context-media-audit.json";
const inventory=JSON.parse(fs.readFileSync("qa/results/media-closure-inventory.json","utf8"));
if(inventory.modules!==30||inventory.activities!==600||!Array.isArray(inventory.items))
 throw Error("INCOMPLETE_V26_MEDIA_INVENTORY");
const questionById=new Map();
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const mm=String(module).padStart(2,"0"),mod="Y"+year+"M"+mm;
 const data=JSON.parse(fs.readFileSync(path.join(root,"content/english/year-"+year+"/module-"+mm+"/questions.json"),"utf8"));
 if(data.moduleId!==mod||data.items?.length!==20)throw Error("INVALID_MODULE:"+mod);
 for(const q of data.items){
  if(!q.item_id?.startsWith(mod+"-")||questionById.has(q.item_id))throw Error("BAD_QUESTION:"+q.item_id);
  questionById.set(q.item_id,q);
 }
}
if(questionById.size!==600)throw Error("EXPECTED_600_QUESTIONS");
const clean=x=>String(x||"").trim().toLowerCase().replace(/\s+/g," ");
function classify(q,semantic){
 const topic=clean(q.topicEn),learning=clean(q.learningTarget);
 // Only a known lexical homonym receives a semantic ambiguity flag.
 // Other cross-module reuse is review-required, not automatically wrong.
 if(semantic==="orange"){
  if(/\bcolors?\b/.test(topic)&&!/\bfoods?\b/.test(topic))return "COLOR";
  if(/\bfoods?\b/.test(topic)&&!/\bcolors?\b/.test(topic)){
   // A food-focused activity may also contain an orange color distractor.
   // Preserve uncertainty; never silently assert that every occurrence is fruit.
   return "FOOD_CONTEXT_AMBIGUOUS";
  }
  if(/\bcolor\b/.test(learning)&&!/\bfood\b/.test(learning))return "COLOR_CONTEXT";
 }
 return "UNCLASSIFIED";
}
const reused=[],homonyms=[],missing=[];
for(const item of inventory.items){
 const ids=[...new Set(item.questions||[])].sort();
 const contexts=[];
 for(const qid of ids){
  const q=questionById.get(qid);
  if(!q){missing.push({mediaId:item.mediaId,questionId:qid});continue;}
  contexts.push({questionId:qid,moduleId:q.moduleId,topicEn:q.topicEn||null,
    context:classify(q,clean(item.semantic)),learningTarget:q.learningTarget||null});
 }
 const modules=[...new Set(contexts.map(c=>c.moduleId))].sort();
 if(modules.length<=1)continue;
 const record={mediaId:item.mediaId,semanticTarget:item.semantic,mediaStatus:item.status,
   modules,questionCount:contexts.length,contexts};
 reused.push(record);
 const tags=new Set(contexts.map(x=>x.context));
 if(clean(item.semantic)==="orange"&&tags.has("COLOR")&&tags.has("FOOD_CONTEXT_AMBIGUOUS")){
  homonyms.push({...record,classification:"COLOR_VS_FOOD_CONTEXT_POSSIBLE_HOMONYM",
    decision:"BLOCK_AUTOMATIC_REUSE_UNTIL_QUESTION_LEVEL_VISUAL_REVIEW"});
 }
}
if(missing.length)throw Error("MISSING_QUESTION_REFERENCES:"+missing.length);
reused.sort((a,b)=>b.questionCount-a.questionCount||a.mediaId.localeCompare(b.mediaId));
homonyms.sort((a,b)=>b.questionCount-a.questionCount||a.mediaId.localeCompare(b.mediaId));
const report={schemaVersion:"DUDUQ_CROSS_CONTEXT_MEDIA_QA_V1",modules:30,activities:600,
 referencedMediaIds:inventory.referencedMediaIds,source:"Compiled V26 question contracts and media closure inventory",
 autoReplacementAllowed:false,pedagogicalQaApproved:false,productionApproved:false,
 crossModuleMediaIds:reused.length,possibleHomonymIds:homonyms.length,
 homonymQuarantine:homonyms,topCrossModuleReuse:reused.slice(0,40)};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:"READ_ONLY_CONTEXT_AUDIT_PASS",modules:30,activities:600,
 crossModuleMediaIds:reused.length,possibleHomonymIds:homonyms.length,
 quarantinedMediaIds:homonyms.map(x=>x.mediaId),report:reportPath}));
