import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const base=path.resolve('dist-pages');
const bundle=path.resolve(process.env.DUDUQ_CHATGPT_IMAGE_BUNDLE||'/tmp/duduq-native-chatgpt-10');
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>fs.readFileSync(path.join(base,p));
const manifest=JSON.parse(fs.readFileSync(path.join(bundle,'batch-manifest.json'),'utf8'));
const registry=JSON.parse(read('content/english/media/media-registry.json'));
const mediaById=new Map(registry.entries.map(x=>[x.mediaId,x]));
const fileManifest=read('.duduq-pages-manifest').toString('utf8').trimEnd().split(/\r?\n/);
const index=new Map();
for(const line of fileManifest){
 const k=line.lastIndexOf(' '),name=line.slice(0,k),hash=line.slice(k+1);
 if(k<=0||index.has(name)||!/^[a-f0-9]{64}$/.test(hash))throw Error('INVALID_ARTIFACT_MANIFEST:'+line);
 index.set(name,hash);
}
if(index.size<2670)throw Error('RELEASE_MANIFEST_INCOMPLETE');
for(const [name,hash] of index){
 const actual=sha(read(name));
 if(actual!==hash)throw Error('COMPILED_ARTIFACT_HASH_MISMATCH:'+name);
}
let checked=0;
for(const asset of manifest.assets){
 if(!asset.bindings.length)continue;
 for(const binding of asset.bindings){
  const qid=binding.questionId, match=/^Y([1-5])M(0[1-6])-Q\d{3}$/.exec(qid);
  if(!match)throw Error('BAD_QUESTION:'+qid);
  const rel=`content/english/year-${match[1]}/module-${match[2]}/questions.json`;
  const data=JSON.parse(read(rel));
  const question=data.items?.find(q=>q.item_id===qid);
  const opt=question?.options?.find(o=>o.media?.assetId===binding.mediaId);
  if(!opt||opt.media?.semanticTarget!==asset.semanticTarget)throw Error('WRONG_PEDAGOGICAL_TARGET:'+binding.mediaId);
  const entry=mediaById.get(binding.mediaId);
  if(!entry||entry.temporary!==true||entry.humanResolutionStatus!=='PEDAGOGICAL_QA_PENDING')
   throw Error('PENDING_SEMANTIC_QA_NOT_TRACKED:'+binding.mediaId);
  const p=entry.assets?.[0]?.path;
  if(!p?.startsWith('content/english/assets/images/chatgpt/')||entry.sha256!==asset.sha256||index.get(p)!==asset.sha256)
   throw Error('IMPORT_NOT_PRESENT_IN_COMPILED_GAME:'+binding.mediaId);
  checked++;
 }
}
if(checked!==12)throw Error('EXPECTED_12_GAME_OPTION_BINDINGS');
let modules=0,activities=0;
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const nn=String(module).padStart(2,'0'),p=`play/english/year-${year}/module-${nn}/index.html`;
 if(!index.has(p))throw Error('MODULE_ROUTE_MISSING:'+p);
 const q=JSON.parse(read(`content/english/year-${year}/module-${nn}/questions.json`));
 if(q.items?.length!==20)throw Error('EXPECTED_20_ACTIVITIES:'+p);
 modules++;activities+=20;
}
console.log(JSON.stringify({status:'CHATGPT_NATIVE_BATCH_QA_PASS',modules,activities,bindings:checked,
 assetIntegrityFiles:index.size,temporaryUntilHumanQa:true,productionDeployment:false}));
