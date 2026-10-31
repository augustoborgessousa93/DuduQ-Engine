import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {collectQuestionMediaUsages,assertBindingSafeAcrossQuestions} from "../media-binding-usage-guard.mjs";
const root=path.resolve("dist-pages");
const bundle=path.resolve(process.env.DUDUQ_CHATGPT_IMAGE_BUNDLE||"/tmp/duduq-native-head");
const manifest=JSON.parse(fs.readFileSync(path.join(bundle,"batch-manifest.json"),"utf8"));
const sha=b=>createHash("sha256").update(b).digest("hex");
const read=p=>fs.readFileSync(path.join(root,p));
const rows=read(".duduq-pages-manifest").toString("utf8").trimEnd().split(/\r?\n/);
const hashes=new Map();
for(const row of rows){const k=row.lastIndexOf(" "),p=row.slice(0,k),v=row.slice(k+1);
 if(k<1||hashes.has(p)||!/^[a-f0-9]{64}$/.test(v))throw Error("MANIFEST_CORRUPT:"+p);hashes.set(p,v);}
if(hashes.size<2670)throw Error("INCOMPLETE_V26_ARTIFACT");
for(const [p,v] of hashes)if(sha(read(p))!==v)throw Error("BAD_RELEASE_FILE_SHA:"+p);
const usages=new Map();let count=0,modules=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const id=String(m).padStart(2,"0");
 if(!hashes.has("play/english/year-"+y+"/module-"+id+"/index.html"))throw Error("MODULE_ROUTE_MISSING");
 const json=JSON.parse(read("content/english/year-"+y+"/module-"+id+"/questions.json"));
 if(json.items?.length!==20)throw Error("MISSING_MODULE_QUESTIONS");
 for(const q of json.items){collectQuestionMediaUsages(q,usages);count++;}
 modules++;
}
if(count!==600||modules!==30)throw Error("INCOMPLETE_30_MODULE_GAME");
const registry=JSON.parse(read("content/english/media/media-registry.json"));
const byId=new Map(registry.entries.map(x=>[x.mediaId,x]));
let refs=0;
for(const asset of manifest.assets){
 if(asset.semanticTarget!=="head")throw Error("EXPECTED_HEAD");
 for(const binding of asset.bindings){
  assertBindingSafeAcrossQuestions({usages,mediaId:binding.mediaId,
   questionId:binding.questionId,semanticTarget:"head"});
  const e=byId.get(binding.mediaId),p=e?.assets?.[0]?.path;
  if(!e||e.temporary!==true||e.humanResolutionStatus!=="PEDAGOGICAL_QA_PENDING"||
     !p?.startsWith("content/english/assets/images/chatgpt/")||
     e.sha256!==asset.sha256||hashes.get(p)!==asset.sha256)
    throw Error("HEAD_CANDIDATE_NOT_IN_GAME:"+binding.mediaId);
  refs++;
 }
}
if(refs!==7)throw Error("EXPECTED_SEVEN_SAFE_HEAD_IDS");
const excluded=byId.get("IMG-Y1M05-Q001-HEAD");
if(!excluded?.urlOrPath?.includes("provisional-semantic-v1"))
 throw Error("CROSS_MODULE_HEAD_SHOULD_STAY_UNCHANGED");
console.log(JSON.stringify({status:"NATIVE_HEAD_7_IDS_QA_PASS",modules,activities:count,
 importedCandidates:refs,crossModuleUntouched:true,allHashesValid:true,
 humanPedagogicalQA:"PENDING",productionRelease:false}));
