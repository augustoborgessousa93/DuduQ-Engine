import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {collectQuestionMediaUsages,assertBindingSafeAcrossQuestions} from "../media-binding-usage-guard.mjs";
const base=path.resolve("dist-pages");
const bundle=path.resolve(process.env.DUDUQ_CHATGPT_IMAGE_BUNDLE||"/tmp/duduq-native-chatgpt-10");
const sha=x=>createHash("sha256").update(x).digest("hex");
const read=p=>fs.readFileSync(path.join(base,p));
const manifest=JSON.parse(fs.readFileSync(path.join(bundle,"batch-manifest.json"),"utf8"));
const registry=JSON.parse(read("content/english/media/media-registry.json"));
const byId=new Map(registry.entries.map(x=>[x.mediaId,x]));
const fileManifest=read(".duduq-pages-manifest").toString("utf8").trimEnd().split(/\r?\n/);
const integrity=new Map();
for(const line of fileManifest){
 const k=line.lastIndexOf(" "),name=line.slice(0,k),hash=line.slice(k+1);
 if(k<1||integrity.has(name)||!/^[a-f0-9]{64}$/.test(hash))throw Error("INVALID_ARTIFACT_MANIFEST:"+line);
 integrity.set(name,hash);
}
if(integrity.size<2670)throw Error("RELEASE_MANIFEST_INCOMPLETE");
for(const [name,hash] of integrity){
 const actual=sha(read(name));
 if(actual!==hash)throw Error("COMPILED_ARTIFACT_HASH_MISMATCH:"+name);
}
const usages=new Map();let modules=0,activities=0;
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const nn=String(module).padStart(2,"0");
 const route="play/english/year-"+year+"/module-"+nn+"/index.html";
 if(!integrity.has(route))throw Error("MODULE_ROUTE_MISSING:"+route);
 const questions=JSON.parse(read("content/english/year-"+year+"/module-"+nn+"/questions.json"));
 if(questions.items?.length!==20)throw Error("EXPECTED_20_ACTIVITIES:"+route);
 for(const q of questions.items){collectQuestionMediaUsages(q,usages);activities++;}
 modules++;
}
if(modules!==30||activities!==600)throw Error("BROKEN_30_MODULES_600_ACTIVITIES");
const plan=JSON.parse(fs.readFileSync("qa/results/duduq-school-bag-reuse-plan.json","utf8"));
if(plan.totalEligibleIds!==62||plan.totalQuestionUsages!==63||
   manifest.reusePlan!=="qa/results/duduq-school-bag-reuse-plan.json"||
   manifest.integratedCandidateCount!==62||manifest.reuseCheckedAgainstAll600!==true)
 throw Error("UNVERIFIED_SOURCE_BINDING_EXPANSION");
let checked=0,references=0;const seen=new Set();
for(const asset of manifest.assets){
 if(!asset.bindings?.length)continue;
 const planned=plan.assets.find(x=>x.assetKey===asset.assetKey);
 if(!planned||planned.sha256!==asset.sha256||planned.semanticTarget!==asset.semanticTarget)
  throw Error("ASSET_HAS_NO_SHA_PINNED_PLAN:"+asset.assetKey);
 for(const binding of asset.bindings){
  if(seen.has(binding.mediaId))throw Error("DUPLICATE_BINDING:"+binding.mediaId);
  seen.add(binding.mediaId);
  const proof=planned.references.find(x=>x.mediaId===binding.mediaId);
  if(!proof||!proof.questionIds.includes(binding.questionId))throw Error("NOT_IN_CHECKED_PLAN:"+binding.mediaId);
  for(const q of proof.questionIds){
   assertBindingSafeAcrossQuestions({usages,mediaId:binding.mediaId,questionId:q,semanticTarget:asset.semanticTarget});
  }
  const e=byId.get(binding.mediaId);
  if(e?.temporary!==true||e?.status!=="APPROVED"||
     e?.humanResolutionStatus!=="PEDAGOGICAL_QA_PENDING")
    throw Error("PENDING_PEDAGOGICAL_QA_NOT_TRACKED:"+binding.mediaId);
  const p=e.assets?.[0]?.path;
  if(!p?.startsWith("content/english/assets/images/chatgpt/")||
     e.sha256!==asset.sha256||integrity.get(p)!==asset.sha256)
    throw Error("CANDIDATE_NOT_IN_COMPILED_GAME:"+binding.mediaId);
  checked++;references+=proof.questionIds.length;
 }
}
if(checked!==62||references!==63)throw Error("EXPECTED_62_MEDIA_IDS_AND_63_QUESTION_REFERENCES");
console.log(JSON.stringify({status:"CHATGPT_7_IMAGES_62_MEDIA_IDS_CANDIDATE_QA_PASS",
 originalAssets:7,mediaIds:checked,questionUsages:references,modules,activities,
 integrityEntries:integrity.size,provisionalUntilPedagogicalReview:true,productionDeployment:false}));
