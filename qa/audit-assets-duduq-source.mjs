#!/usr/bin/env node
/** Read-only file/hash inventory for Assets-DuduQ/Imagens Ilustrativa. */
import {createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';

const sourceRoot=path.resolve(process.argv[2]||'');
const sourceDir=path.join(sourceRoot,'Imagens Ilustrativa');
const output=path.resolve(process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'docs/qa/assets-duduq-source-inventory-20261030.json');
const expectedCommit=process.env.ASSETS_DUDUQ_SOURCE_COMMIT||'ef9551b075cc60e42408e02eb3f52752dc179297';
const sha=b=>createHash('sha256').update(b).digest('hex');
const safe=(base,target)=>target===base||target.startsWith(base+path.sep);
if(!process.argv[2]||!safe(process.cwd(),output))throw Error('SOURCE_AND_IN_REPOSITORY_OUTPUT_REQUIRED');
if(!await fs.stat(sourceDir).then(s=>s.isDirectory(),()=>false))throw Error('ASSETS_SOURCE_FOLDER_MISSING');

const reviewed=new Map([
  ['school-object-backpack-mochila.png',{semantic:'backpack',visual:'Single school backpack with straps, top handle, zipper and front pocket.'}],
  ['school-object-eraser-borracha.png',{semantic:'eraser',visual:'One school eraser with blue cap.'}],
  ['school-object-pencil-lapis.png',{semantic:'pencil',visual:'One yellow school pencil.'}],
  ['school-object-ruler-regua.png',{semantic:'ruler',visual:'One ruler with measurement marks.'}],
  ['school-object-blue-pen-caneta-azul.png',{semantic:'pen',visual:'One blue pen.'}],
  ['school-object-orange-crayon-giz-laranja.png',{semantic:'crayon',visual:'One orange crayon.'}],
  ['Apple - maçã.png',{semantic:'apple',visual:'One red apple with an attached leaf.'}],
  ['Banana.png',{semantic:'banana',visual:'One yellow banana.'}],
  ['Pear - pera.png',{semantic:'pear',visual:'One green pear with an attached leaf.'}]
]);
const jpegSize=b=>{
  let i=2;
  while(i+9<b.length){
    if(b[i++]!==0xff)continue;
    let marker=b[i++];
    while(marker===0xff)marker=b[i++];
    if(marker===0xd8||marker===0xd9||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    if(i+2>b.length)break;
    const len=b.readUInt16BE(i);
    if(len<2||i+len>b.length)break;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&len>=7)
      return {width:b.readUInt16BE(i+5),height:b.readUInt16BE(i+3)};
    i+=len;
  }
  return null;
};
const files=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else if(entry.isFile())files.push(p);}}
await walk(sourceDir);
files.sort((a,b)=>a.localeCompare(b,'en'));
const hashGroups=new Map(),byType={};
let totalBytes=0;
const rows=[];
for(const full of files){
  const bytes=await fs.readFile(full);
  const rel=path.relative(sourceRoot,full).split(path.sep).join('/');
  const ext=path.extname(full).toLowerCase()||'(no extension)';
  let type='UNKNOWN',dimensions=null,technical=null;
  if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
    type='PNG';dimensions={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};technical=inspectPng(bytes);
  }else if(bytes.subarray(0,3).toString('hex')==='ffd8ff'){type='JPEG';dimensions=jpegSize(bytes);}
  else if(bytes.subarray(0,6).toString('ascii').match(/^GIF8[79]a$/)){type='GIF';dimensions={width:bytes.readUInt16LE(6),height:bytes.readUInt16LE(8)};}
  else if(bytes.subarray(0,256).toString('utf8').includes('<svg')){
    type='SVG';const s=bytes.toString('utf8',0,4096),vb=s.match(/viewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
    const w=s.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i),h=s.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i);
    dimensions=vb?{width:Number(vb[1]),height:Number(vb[2])}:w&&h?{width:Number(w[1]),height:Number(h[1])}:null;
  }
  const digest=sha(bytes),hint=path.basename(full).replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
  const review=reviewed.get(path.basename(full));
  const row={path:rel,extension:ext,detectedType:type,bytes:bytes.length,sha256:digest,dimensions,
    transparency:technical?{present:bytes[25]===4||bytes[25]===6,verified:technical.valid,hasClearPixels:technical.transparent,alphaVisiblePixels:technical.alphaVisiblePixels,alphaClearPixels:technical.alphaClearPixels}:null,
    technicalStatus:technical?(technical.valid?'PASS':'FAIL'):'NOT_APPLICABLE_OR_UNCHECKED',
    filenameHint:hint,filenameHintIsNotSemanticProof:true,
    visualReview:review?{status:'CODEX_VISUALLY_INSPECTED',semantic:review.semantic,observation:review.visual,humanPedagogicalApproval:'PENDING'}:{status:'NOT_VISUALLY_REVIEWED',humanPedagogicalApproval:'PENDING'}};
  rows.push(row);totalBytes+=bytes.length;byType[type]=(byType[type]||0)+1;
  const group=hashGroups.get(digest)||[];group.push(rel);hashGroups.set(digest,group);
}
const duplicates=[...hashGroups].filter(([,paths])=>paths.length>1).map(([digest,paths])=>({sha256:digest,paths}));
const report={schemaVersion:'ASSETS_DUDUQ_SOURCE_INVENTORY_V1',sourceRepository:'augustoborgessousa93/Assets-DuduQ',sourceCommit:expectedCommit,sourceDirectory:'Imagens Ilustrativa/',
  status:'FILE_INVENTORY_COMPLETE_VISUAL_REVIEW_PARTIAL',fileCount:rows.length,totalBytes,byDetectedType:byType,uniqueSha256:hashGroups.size,duplicateGroups:duplicates,visuallyReviewedCount:rows.filter(x=>x.visualReview.status==='CODEX_VISUALLY_INSPECTED').length,files:rows};
const data=Buffer.from(JSON.stringify(report,null,2)+'\n');
const previous=await fs.readFile(output).catch(()=>null);
if(previous&&!previous.equals(data))throw Error('INVENTORY_OUTPUT_EXISTS_WITH_DIFFERENT_CONTENT:'+output);
if(!previous)await fs.writeFile(output,data,{flag:'wx'});
console.log(JSON.stringify({status:report.status,fileCount:rows.length,totalBytes,byDetectedType:byType,uniqueSha256:hashGroups.size,duplicateGroups:duplicates.length,visuallyReviewedCount:report.visuallyReviewedCount,output:path.relative(process.cwd(),output)},null,2));
