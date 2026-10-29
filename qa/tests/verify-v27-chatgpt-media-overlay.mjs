import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=process.cwd(), dist=path.resolve('dist-pages');
const hash=b=>createHash('sha256').update(b).digest('hex');
const entries=new Map();
for(const line of readFileSync(path.join(dist,'.duduq-pages-manifest'),'utf8').trimEnd().split(/\r?\n/)){
  const p=line.lastIndexOf(' '),name=line.slice(0,p),expected=line.slice(p+1);
  if(p<1||entries.has(name)||!/^[a-f0-9]{64}$/.test(expected))throw Error('BAD_MANIFEST_ENTRY:'+name);
  entries.set(name,expected);
}
if(entries.size<2672)throw Error('V27_RELEASE_MANIFEST_TOO_SMALL:'+entries.size);
for(const [name,sha] of entries){
  if(/(^|\/)\.\.|^\//.test(name))throw Error('ILLEGAL_ARTIFACT_PATH:'+name);
  const actual=hash(readFileSync(path.join(dist,name)));
  if(actual!==sha)throw Error('ARTIFACT_SHA256_MISMATCH:'+name);
}
const registry=JSON.parse(readFileSync(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const index=new Map((registry.entries||[]).map(x=>[x.mediaId,x]));
const checks=[
 ['Y1M05-Q001','IMG-Y1M05-Q001-HEAD','head'],
 ['Y1M04-Q010','IMG-Y1M04-Q010-BACKPACK','backpack'],
 ['Y1M04-Q015','IMG-Y1M04-Q015-BACKPACK','backpack'],
 ['Y1M04-Q020','IMG-Y1M04-Q020-BACKPACK','backpack']
];
for(const [qid,id,sem] of checks){
  const m=/^Y([1-5])M(0[1-6])-Q\d{3}$/.exec(qid);
  const qpath='content/english/year-'+m[1]+'/module-'+m[2]+'/questions.json';
  const questions=JSON.parse(readFileSync(path.join(dist,qpath),'utf8'));
  const question=questions.items.find(x=>x.item_id===qid);
  const option=question?.options?.find(x=>x.media?.assetId===id);
  if(option?.media?.semanticTarget!==sem)throw Error('V27_SEMANTIC_OPTION_MISMATCH:'+id);
  const media=index.get(id);
  if(media?.status!=='APPROVED'||media?.kind!=='image'||media?.temporary!==false)throw Error('V27_MEDIA_NOT_APPROVED:'+id);
  const file=media.assets?.[0]?.path;
  if(!file?.startsWith('content/english/assets/images/chatgpt/')||entries.get(file)!==media.sha256)throw Error('V27_MEDIA_NOT_IN_ARTIFACT:'+id);
}
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const p='play/english/year-'+year+'/module-'+String(module).padStart(2,'0')+'/index.html';
  if(!entries.has(p))throw Error('V27_MISSING_OFFICIAL_MODULE:'+p);
}
console.log('DUDUQ_V27_CHATGPT_MEDIA=PASS; options=4; manifestEntries='+entries.size+'; modules=30');
