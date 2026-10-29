import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist-pages');
const bundle=process.env.DUDUQ_CHATGPT_IMAGE_BUNDLE||'qa/media-inbox/cloudflare-eraser-20261029';
const h=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(path.join(bundle,'batch-manifest.json'),'utf8'));
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||manifest.assets?.length!==1)throw Error('CANARY_MANIFEST_EXPECTS_ONE_ASSET');
const lines=readFileSync(path.join(root,'.duduq-pages-manifest'),'utf8').trimEnd().split(/\r?\n/),map=new Map();
for(const line of lines){const x=line.lastIndexOf(' '),n=line.slice(0,x),s=line.slice(x+1);if(x<1||map.has(n)||!/^[a-f0-9]{64}$/.test(s))throw Error('CORRUPT_RELEASE_MANIFEST:'+n);map.set(n,s);}
for(const [file,expected] of map){const buffer=readFileSync(path.join(root,file));if(h(buffer)!==expected)throw Error('RELEASE_HASH_MISMATCH:'+file);}
const reg=JSON.parse(readFileSync(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const index=new Map((reg.entries||[]).map(e=>[e.mediaId,e]));let count=0;
for(const asset of manifest.assets){
 const raw=readFileSync(path.join(bundle,asset.file));
 if(h(raw)!==asset.sha256)throw Error('SOURCE_SHA_MISMATCH:'+asset.assetKey);
 for(const binding of asset.bindings){
 const id=binding.mediaId;
 const m=binding.questionId.match(/^Y([1-5])M(0[1-6])-Q\d{3}$/);
 if(!m)throw Error('INVALID_QUESTION_ID:'+binding.questionId);
 const q=JSON.parse(readFileSync(path.join(root,`content/english/year-${m[1]}/module-${m[2]}/questions.json`,'utf8')).items.find(x=>x.item_id===binding.questionId);
 const opt=q?.options?.find(x=>x.media?.assetId===id);
 if(!opt||opt.media?.semanticTarget!==asset.semanticTarget)throw Error('SEMANTIC_OPTION_MISMATCH:'+id);
 const entry=index.get(id),p=entry?.assets?.[0]?.path;
 if(!p?.startsWith('content/english/assets/images/chatgpt/')||entry?.temporary!==true||entry?.humanResolutionStatus!=='PEDAGOGICAL_QA_PENDING'||entry?.sha256!==asset.sha256||map.get(p)!==asset.sha256)throw Error('CANDIDATE_NOT_RESOLVED:'+id);
 count++;
 }
}
let modules=0,activities=0;
for(let year=1;year<=5;year++)for(let n=1;n<=6;n++){
 const mm=String(n).padStart(2,'0');
 const route=`play/english/year-${year}/module-${mm}/index.html`;
 if(!map.has(route))throw Error('MODULE_ROUTE_MISSING:'+route);
 const data=JSON.parse(readFileSync(path.join(root,`content/english/year-${year}/module-${mm}/questions.json`,'utf8'));
 if(data.items?.length!==20)throw Error('QUESTION_COUNT_INVALID:'+route);
 modules++;activities+=data.items.length;
}
if(modules!==30||activities!==600||count!==2)throw Error('CANARY_SCOPE_INVALID');
console.log(JSON.stringify({status:'CANDIDATE_INTEGRITY_PASS',modules,activities,bindings:count,manifestEntries:lines.length,
humanPedagogicalReview:'NOT_HOMOLOGATED',deploy:'NOT_APPROVED'}));
