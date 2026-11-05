#!/usr/bin/env node
/**
 * Expand seven existing original ChatGPT PNGs to safe Y1M04 references.
 * Does not generate pictures, call APIs, change a question, or deploy.
 * Run only after building V26 and regenerating the exact-usage reuse plan.
 */
import {readFile,writeFile,access} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {collectQuestionMediaUsages,assertBindingSafeAcrossQuestions} from "./media-binding-usage-guard.mjs";
import {isExactPedagogicalConcept} from "../scripts/duduq-exact-semantic-match.mjs";

const dir=path.resolve(process.argv[2]||"");
if(!process.argv[2])throw Error("USAGE: node qa/expand-native-chatgpt-schoolbag.mjs <unpacked-bundle>");
const root=process.cwd();
const planPath=path.join(root,"qa/results/duduq-school-bag-reuse-plan.json");
const manifestPath=path.join(dir,"batch-manifest.json");
const hash=b=>createHash("sha256").update(b).digest("hex");
const originalBytes=await readFile(manifestPath),manifest=JSON.parse(originalBytes);
const plan=JSON.parse(await readFile(planPath,"utf8"));
if(manifest.schemaVersion!=="DUDUQ_CHATGPT_MEDIA_BINDINGS_V1"||
   manifest.source!=="Native ChatGPT image generation (not Cloudflare)"||
   manifest.assets?.length!==10)throw Error("WRONG_ORIGINAL_NATIVE_BATCH");
if(plan.schemaVersion!=="DUDUQ_SAFE_SCHOOL_BAG_REUSE_V1"||
   plan.scope!=="Y1M04"||plan.applied!==false||
   plan.productionApproved!==false||plan.pedagogicalQaApproved!==false||
   plan.assets?.length!==7||plan.totalEligibleIds!==62||plan.totalQuestionUsages!==63)
   throw Error("UNTRUSTED_OR_STALE_REUSE_PLAN");

const allUsages=new Map();let items=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const moduleId="Y"+y+"M"+String(m).padStart(2,"0");
 const file=path.join(root,"dist-pages/content/english/year-"+y+"/module-"+String(m).padStart(2,"0")+"/questions.json");
 const q=JSON.parse(await readFile(file,"utf8"));
 if(q.items?.length!==20)throw Error("INVALID_COMPILED_MODULE:"+moduleId);
 for(const item of q.items){collectQuestionMediaUsages(item,allUsages);items++;}
}
if(items!==600)throw Error("ALL_600_CONTRACTS_REQUIRED");
const planByKey=new Map(plan.assets.map(a=>[a.assetKey,a]));
let expanded=0,originalBindings=0,shared=0,unique=new Set();
for(const asset of manifest.assets){
 originalBindings+=asset.bindings?.length||0;
 const candidate=planByKey.get(asset.assetKey);
 if(!candidate){
  // Unmapped image candidates must stay unmapped.
  if(asset.bindings?.length)throw Error("ORIGINAL_BOUND_ASSET_NOT_IN_REUSE_PLAN:"+asset.assetKey);
  continue;
 }
 if(!isExactPedagogicalConcept(asset.semanticTarget,candidate.semanticTarget) ||
    asset.sha256!==candidate.sha256 ||
    candidate.candidateStatus!=="MODEL_SEMANTIC_PRECHECK_ONLY" ||
    asset.review!=="MODEL_SEMANTIC_PRECHECK_PASSED"||
    !asset.reviewEvidence)throw Error("SOURCE_AND_VISUAL_EVIDENCE_MISMATCH:"+asset.assetKey);
 if(!/^images\/[A-Za-z0-9-]+\.png$/.test(asset.file))throw Error("UNSAFE_NATIVE_IMAGE_NAME");
 const bytes=await readFile(path.join(dir,asset.file));
 if(hash(bytes)!==asset.sha256)throw Error("SOURCE_IMAGE_HASH_CHANGED:"+asset.assetKey);
 const bindings=[];
 for(const ref of candidate.references||[]){
  if(ref.semanticTarget!==asset.semanticTarget||ref.questionIds?.length<1||
     ref.questionIds.some(q=>!/^Y1M04-Q\d{3}$/.test(q)))throw Error("REUSE_SCOPE_OR_TARGET_MISMATCH");
  if(unique.has(ref.mediaId))throw Error("DUPLICATE_REUSED_MEDIA_ID:"+ref.mediaId);
  const isScoped=/^IMG-Y1M04-Q\d{3}-[A-Z0-9-]+$/.test(ref.mediaId);
  const isGeneric=/^IMG-Q\d{3}-[A-Z0-9-]+$/.test(ref.mediaId);
  if(!isScoped&&!isGeneric)throw Error("UNSAFE_REUSED_MEDIA_ID:"+ref.mediaId);
  if(ref.scopedId!==isScoped)throw Error("REUSE_PLAN_ID_SCOPE_MISMATCH");
  for(const qid of ref.questionIds){
    assertBindingSafeAcrossQuestions({usages:allUsages,mediaId:ref.mediaId,questionId:qid,semanticTarget:asset.semanticTarget});
  }
  const actualQuestions=[...new Set((allUsages.get(ref.mediaId)||[]).map(u=>u.questionId))].sort();
  if(actualQuestions.join("|")!==[...ref.questionIds].sort().join("|"))
    throw Error("REUSE_PLAN_DOES_NOT_COVER_ALL_ID_REFERENCES:"+ref.mediaId);
  unique.add(ref.mediaId);
  if(ref.questionIds.length>1)shared++;
  bindings.push({questionId:ref.questionIds[0],mediaId:ref.mediaId,verifiedQuestionIds:ref.questionIds});
 }
 asset.bindings=bindings;
 expanded+=bindings.length;
}
if(unique.size!==62||expanded!==62||originalBindings!==12||
   manifest.assets.filter(a=>a.bindings.length).length!==7 ||
   shared!==1)throw Error("BATCH_EXPANSION_COUNT_MISMATCH");
const archivePath=path.join(dir,"original-12-bindings-manifest.json");
await access(archivePath).then(()=>{throw Error("ORIGINAL_MANIFEST_ALREADY_ARCHIVED")},e=>{
 if(e.code!=="ENOENT")throw e;
});
await writeFile(archivePath,originalBytes);
manifest.reusePlan="qa/results/duduq-school-bag-reuse-plan.json";
manifest.reuseCheckedAgainstAll600=true;
manifest.integratedCandidateCount=62;
manifest.pedagogicalQaApproved=false;
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({status:"REUSE_BATCH_EXPANDED_FOR_QA_ONLY",sourceAssets:7,
 originalMappings:12,candidateMappings:expanded,mediaIds:unique.size,
 questionsVerified:items,sharedIdCount:shared,productionApproved:false}));
