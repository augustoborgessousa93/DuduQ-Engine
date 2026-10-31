#!/usr/bin/env node
// Independent QA of the non-temporary media still lacking official pedagogical
// evidence. NEVER writes registry status, source media or production releases.
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('dist-pages');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const out=path.resolve('qa/results/non-temporary-media-review');
await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const safe=rel=>typeof rel==='string'&&rel.length>0&&!rel.startsWith('/')&&!rel.includes('\\')&&
 rel.split('/').every(x=>x&&x!=='.'&&x!=='..');
const inventory=JSON.parse(await readFile('qa/results/media-closure-inventory.json','utf8'));
const registry=JSON.parse(await readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
if(inventory.modules!==30||inventory.activities!==600||!Array.isArray(registry.entries))
 throw Error('INVALID_CANONICAL_INPUT');
const index=new Map(registry.entries.map(x=>[x.mediaId,x]));
const pending=inventory.items.filter(i=>i.status==='NON_TEMPORARY_UNVERIFIED');
const report={schemaVersion:'DUDUQ_NON_TEMPORARY_INDEPENDENT_BROWSER_QA_V1',
 sourceInventorySha256:hash(await readFile('qa/results/media-closure-inventory.json')),
 modules:30,activities:600,identified:pending.length,records:[],
 reviewStatus:'HUMAN_PEDAGOGICAL_REVIEW_PENDING',productionDeployed:false,
 semanticApprovalGranted:false,status:'RUNNING'};
for(const item of pending){
 const entry=index.get(item.mediaId);
 const p=item.path;
 const record={mediaId:item.mediaId,modules:item.modules,semantic:item.semantic,path:p,
  expectedSha256:entry?.sha256||null,render:'NOT_TESTED',
  glyphReview:'HUMAN_REQUIRED',semanticReview:'HUMAN_REQUIRED'};
 try{
  if(!entry||!safe(p))throw Error('MISSING_REGISTRY_OR_UNSAFE_PATH');
  const bytes=await readFile(path.join(root,p));
  record.actualSha256=hash(bytes);record.bytes=bytes.length;
  if(!bytes.length)throw Error('ZERO_BYTE_ASSET');
  if(entry.sha256&&entry.sha256.toLowerCase()!==record.actualSha256)throw Error('SOURCE_ASSET_HASH_MISMATCH');
  if(/^MEDIA-LETTER-[A-Z]$/.test(item.mediaId)){
   record.letter=item.mediaId.slice(-1);
   if(!p.toLowerCase().endsWith('/'+record.letter.toLowerCase()+'.svg'))throw Error('LETTER_FILENAME_MISMATCH');
   const svg=bytes.toString('utf8');
   if(!/<svg(?:\s|>)/i.test(svg)||!/<\/svg>/i.test(svg))throw Error('INVALID_SVG_STRUCTURE');
   if(/<script(?:\s|>)/i.test(svg)||/<foreignObject(?:\s|>)/i.test(svg)||
    /(?:href|xlink:href)\s*=\s*['"](?:https?:|javascript:|data:)/i.test(svg))
    throw Error('SVG_UNSAFE_EMBED');
   record.mediaType='image/svg+xml';
  }else{
   record.mediaType=p.toLowerCase().endsWith('.png')?'image/png':'UNEXPECTED_TYPE';
   if(record.mediaType!=='image/png'||!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))
    throw Error('UNEXPECTED_NON_LETTER_IMAGE_FORMAT');
   record.dimensions={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
   if(record.dimensions.width<64||record.dimensions.height<64)throw Error('IMAGE_TOO_SMALL_FOR_REVIEW');
  }
  record.integrity='PASS';
 }catch(e){record.integrity='FAIL';record.error=String(e.message||e)}
 report.records.push(record);
}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1350,height:1050},deviceScaleFactor:1});
 const escaped=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const cards=report.records.filter(x=>x.integrity==='PASS').map((x,i)=>`<div class="asset">
 <div class="name">${escaped(x.mediaId)}</div>
 <img id="asset-${i}" alt="${escaped(x.mediaId)}" src="${base}/${x.path.split('/').map(encodeURIComponent).join('/')}">
 <div class="semantic">${escaped(x.semantic||'')}</div></div>`).join('');
 await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
 body{font-family:Arial,sans-serif;margin:12px;background:#f3f3f3}
 .grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}
 .asset{background:white;border:1px solid #ddd;display:grid;gap:6px;padding:10px;min-width:0}
 .name{font-size:11px;overflow-wrap:anywhere}.asset img{display:block;width:100%;height:130px;object-fit:contain}
 .semantic{font-size:11px;color:#555;overflow-wrap:anywhere}
 </style></head><body><h1>QA only — pedagogical approval PENDING</h1><div class="grid">${cards}</div></body></html>`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>[...document.querySelectorAll('.asset img')].every(i=>i.complete),null,{timeout:20000});
 const images=await page.locator('.asset img').evaluateAll(nodes=>nodes.map(i=>({id:i.alt,
  width:i.naturalWidth,height:i.naturalHeight,complete:i.complete})));
 for(const r of report.records){
  if(r.integrity!=='PASS')continue;
  const image=images.find(i=>i.id===r.mediaId);
  r.render=image&&image.complete&&image.width>0&&image.height>0?'PASS':'FAIL';
  r.browserIntrinsicSize=image?{width:image.width,height:image.height}:null;
 }
 await page.screenshot({path:path.join(out,'review-gallery.png'),fullPage:true});
 report.reviewGallery='qa/results/non-temporary-media-review/review-gallery.png';
}finally{await browser.close()}
const faults=report.records.filter(x=>x.integrity!=='PASS'||x.render!=='PASS');
report.status=faults.length?'FAIL_TECHNICAL_NO_APPROVAL':'PASS_TECHNICAL_ONLY_PEDAGOGICAL_PENDING';
report.faults=faults.map(x=>({mediaId:x.mediaId,error:x.error||'BROWSER_RENDER_FAILED'}));
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,identified:report.identified,
 technicalPass:report.records.length-faults.length,technicalFail:faults.length,
 humanPedagogicalReviewRequired:true,report:'qa/results/non-temporary-media-review/report.json'}));
if(faults.length)process.exitCode=1;
