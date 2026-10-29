#!/usr/bin/env node
/**
 * DUDUQ asset bundle importer.
 * Reads individual PNGs produced in ChatGPT. Updates only the central
 * media registry and approved asset directory after a full preflight.
 * No changes to mechanics, answers, HUD, Gold Masters, audio or deployments.
 *
 * Usage: node scripts/duduq-import-chatgpt-bundle.mjs /path/to/unzipped/bundle
 *        node scripts/duduq-import-chatgpt-bundle.mjs /path/to/unzipped/bundle --apply
 */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const bundle=path.resolve(process.argv[2]||'');
const apply=process.argv.includes('--apply');
const registryPath=path.join(root,'content/english/media/media-registry.json');
const exists=p=>fs.stat(p).then(s=>s.isFile(),()=>false);
const hash=b=>createHash('sha256').update(b).digest('hex');
const safe=(base,target)=>target===base||target.startsWith(base+path.sep);
if(!process.argv[2]||!safe(root,root))throw Error('Provide bundle folder');
const manifest=JSON.parse(await fs.readFile(path.join(bundle,'batch-manifest.json'),'utf8'));
if(manifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1')throw Error('Invalid bundle schema');
const registry=JSON.parse(await fs.readFile(registryPath,'utf8'));
if(!Array.isArray(registry.entries))throw Error('Invalid central registry');
const index=new Map(registry.entries.map((e,i)=>[e.mediaId,i]));
const moduleCache=new Map(), actions=[];
function imageIds(node, out=new Set()){
  if(!node||typeof node!=='object')return out;
  for(const [k,v] of Object.entries(node)){
    if(typeof v==='string'&&['assetId','mediaId','image_ref'].includes(k)&&v.startsWith('IMG-'))out.add(v);
    else if(v&&typeof v==='object')imageIds(v,out);
  }
  return out;
}
async function questionFor(qid){
  const m=/^Y([1-5])M(0[1-6])-Q\d{3}$/.exec(qid);
  if(!m)throw Error('Invalid question ID: '+qid);
  const relative='content/english/year-'+m[1]+'/module-'+m[2]+'/questions.json';
  if(!moduleCache.has(relative)){
    let p=path.join(root,relative);
    if(!await exists(p))p=path.join(root,'dist-pages',relative);
    if(!await exists(p))throw Error('Missing question contract: '+relative);
    const json=JSON.parse(await fs.readFile(p,'utf8'));
    moduleCache.set(relative,new Map((json.items||[]).map(i=>[i.item_id,i])));
  }
  const q=moduleCache.get(relative).get(qid);
  if(!q)throw Error('Missing question: '+qid);
  return q;
}
for(const asset of manifest.assets||[]){
  const png=path.resolve(bundle,asset.file||'');
  if(!safe(bundle,png))throw Error('Bundle path escape');
  const bytes=await fs.readFile(png);
  const actual=hash(bytes);
  if(actual!==asset.sha256)throw Error('Asset hash mismatch '+asset.assetKey);
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  if(!bytes.subarray(0,8).equals(signature))throw Error('Not PNG '+asset.assetKey);
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width<1024||height<1024||bytes[24]!==8||bytes[25]!==6)throw Error('Not native high-resolution RGBA '+asset.assetKey);
  if(!asset.bindings?.length)continue;
  const out='content/english/assets/images/chatgpt/'+asset.assetKey.toLowerCase()+'-'+actual.slice(0,12)+'.png';
  for(const binding of asset.bindings){
    if(!/^IMG-Y[1-5]M0[1-6]-Q\d{3}-/.test(binding.mediaId))throw Error('Unsafe non-scoped media ID: '+binding.mediaId);
    const q=await questionFor(binding.questionId);
    if(!imageIds(q).has(binding.mediaId))throw Error('Media not bound to question: '+binding.mediaId);
    const prior=index.has(binding.mediaId)?registry.entries[index.get(binding.mediaId)]:null;
    const entry={...(prior||{}),mediaId:binding.mediaId,status:'APPROVED',kind:'image',temporary:false,
      urlOrPath:out,sha256:actual,assets:[{path:out,sha256:actual}],
      altText:asset.semanticTarget,
      provenance:{provider:'ChatGPT image generation',sourceAsset:asset.assetKey,nativeWidth:width,nativeHeight:height,sha256:actual},
      replacementAudit:{questionId:binding.questionId,previousPath:prior?.urlOrPath||null}};
    actions.push({binding,entry,bytes,out});
  }
}
if(!actions.length)throw Error('No safe image bindings in bundle');
const result={mode:apply?'SOURCE_IMPORT':'DRY_RUN',assets:manifest.assets.length,bindings:actions.length,files:[...new Set(actions.map(a=>a.out))],changedIds:actions.map(a=>a.binding.mediaId)};
if(apply){
  const backup=path.join(root,'.duduq','media-backups','chatgpt-import-'+new Date().toISOString().replace(/[:.]/g,'-'));
  await fs.mkdir(backup,{recursive:true});
  await fs.copyFile(registryPath,path.join(backup,'media-registry.json'));
  for(const item of new Map(actions.map(a=>[a.out,a])).values()){
    const target=path.join(root,item.out);
    if(!safe(root,target))throw Error('Output escape');
    await fs.mkdir(path.dirname(target),{recursive:true});
    if(await exists(target)){
      if(hash(await fs.readFile(target))!==hash(item.bytes))throw Error('Conflicting asset: '+item.out);
    }else await fs.writeFile(target,item.bytes);
  }
  for(const action of actions){
    const i=index.get(action.binding.mediaId);
    if(i===undefined){index.set(action.binding.mediaId,registry.entries.length);registry.entries.push(action.entry)}
    else registry.entries[i]=action.entry;
  }
  const temp=registryPath+'.importing';
  await fs.writeFile(temp,JSON.stringify(registry,null,2)+'\n');
  await fs.rename(temp,registryPath);
  result.status='SOURCE_UPDATED_BUILD_AND_QA_REQUIRED';
}else result.status='PREFLIGHT_PASS';
console.log(JSON.stringify(result,null,2));
