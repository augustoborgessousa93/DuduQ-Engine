#!/usr/bin/env node
/**
 * DUDUQ English image reuse planner: compile candidate bindings from the real
 * 30x20 question contracts, never from names alone.
 * Reports candidates only; DOES NOT alter the media registry or deploy.
 * Use after qa/build-v26-topic-first-paint-qa.sh and qa/audit-media-completion.mjs.
 */
import fs from "node:fs";
import path from "node:path";
const root=path.resolve("dist-pages");
const inventoryPath="qa/results/media-closure-inventory.json";
const evidencePath="qa/semantic-evidence/DUDUQ_ChatGPT_Escolar10_20261029.json";
const output="qa/results/duduq-school-bag-reuse-plan.json";
const inventory=JSON.parse(fs.readFileSync(inventoryPath,"utf8"));
if(inventory.modules!==30 || inventory.activities!==600)throw Error("INCOMPLETE_QUESTION_AUDIT");
const evidence=JSON.parse(fs.readFileSync(evidencePath,"utf8"));
if(evidence.productionApproved!==false || evidence.reviewScope!=="MODEL_SEMANTIC_PRECHECK_ONLY")
  throw Error("UNSAFE_EVIDENCE_STATUS");
const normalize=s=>String(s||"").trim().replace(/\s+/g," ").toLowerCase();
const assets=new Map(evidence.candidateAssets.map(a=>[normalize(a.concept),a]));
if(assets.size!==7)throw Error("EXPECTED_SEVEN_GROUNDED_ASSETS");
for(const a of assets.values())if(a.semanticPrecheck!=="PASSED" || !/^[a-f0-9]{64}$/.test(a.sha256))throw Error("BAD_ASSET_EVIDENCE:"+a.assetKey);
const usage=new Map();
function scan(v,qid,moduleId,loc="item"){
 if(!v||typeof v!=="object")return;
 if(!Array.isArray(v)){
  const ids=[...new Set([v.assetId,v.mediaId,v.image_ref].filter(x=>typeof x==="string" && x.startsWith("IMG-")))];
  for(const id of ids){
   let arr=usage.get(id);
   if(!arr){arr=[];usage.set(id,arr);}
   arr.push({questionId:qid,moduleId,semantic:normalize(v.semanticTarget),role:loc});
  }
 }
 for(const [k,x] of Object.entries(v))if(x&&typeof x==="object")scan(x,qid,moduleId,loc+"."+k);
}
let modules=0,activities=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const moduleId="Y"+y+"M"+String(m).padStart(2,"0");
 const qPath=path.join(root,"content/english/year-"+y+"/module-"+String(m).padStart(2,"0")+"/questions.json");
 const q=JSON.parse(fs.readFileSync(qPath,"utf8"));
 if(q.items?.length!==20)throw Error("INCOMPLETE_MODULE:"+moduleId);
 for(const item of q.items){if(!item.item_id?.startsWith(moduleId+"-"))throw Error("BAD_QUESTION_ID");
  scan(item,item.item_id,moduleId);activities++;}
 modules++;
}
if(modules!==30||activities!==600)throw Error("CONTRACT_COUNT_MISMATCH");
const byId=new Map(inventory.items.map(x=>[x.mediaId,x]));
const result={schemaVersion:"DUDUQ_SAFE_SCHOOL_BAG_REUSE_V1",scope:"Y1M04",generatedAt:new Date().toISOString(),
 source:"Actual V26 compiled question contracts, all 30 modules/600 questions",
 assetEvidence:evidencePath,productionApproved:false,applied:false,pedagogicalQaApproved:false,
 assets:[],totalEligibleIds:0,totalQuestionUsages:0,rejectedByReason:{}};
const rejected={};
const fail=r=>{rejected[r]=(rejected[r]||0)+1;};
for(const [concept,asset] of assets){
 const matches=[];
 for(const [id,refs] of usage){
  const inv=byId.get(id);
  if(!inv || inv.status!=="PROVISIONAL"){continue;}
  if(normalize(inv.semantic)!==concept)continue;
  // Very important: do not silently reuse generic IDs across modules.
  if(refs.some(r=>r.moduleId!=="Y1M04") || inv.modules.some(m=>m!=="Y1M04")){fail("CROSS_MODULE_ID");continue;}
  // Every semantic mention of this media ID must be explicit and match.
  if(refs.some(r=>r.semantic!==concept)){fail("MISSING_OR_MISMATCHED_SEMANTIC");continue;}
  const questions=[...new Set(refs.map(r=>r.questionId))].sort();
  if(questions.some(q=>!/^Y1M04-Q\d{3}$/.test(q))){fail("WRONG_QUESTION_SCOPE");continue;}
  const actualQuestions=[...inv.questions].sort();
  if(questions.join("|")!==actualQuestions.join("|")){fail("AUDIT_QUESTION_USAGE_MISMATCH");continue;}
  matches.push({mediaId:id,questionIds:questions,usages:questions.length,
    scopedId:/^IMG-Y1M04-Q\d{3}-/.test(id),semanticTarget:concept});
 }
 matches.sort((a,b)=>a.mediaId.localeCompare(b.mediaId));
 result.assets.push({assetKey:asset.assetKey,semanticTarget:concept,sha256:asset.sha256,
  candidateStatus:"MODEL_SEMANTIC_PRECHECK_ONLY",references:matches});
 result.totalEligibleIds+=matches.length;
 result.totalQuestionUsages+=matches.reduce((n,x)=>n+x.usages,0);
}
result.rejectedByReason=rejected;
if(result.totalEligibleIds<12)throw Error("SCHOOL_BAG_REUSE_MISSING_BASELINE: "+result.totalEligibleIds);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({status:"REUSE_PLAN_ONLY_NOT_INTEGRATED",assets:result.assets.length,
  eligibleMediaIds:result.totalEligibleIds,questionUsages:result.totalQuestionUsages,rejected,output}));
