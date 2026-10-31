#!/usr/bin/env node
/**
 * Read-only alpha-component audit for transparent PNG candidates.
 *
 * Structural PNG validity is enforced by validate-duduq-png.mjs first. This
 * audit then reports disconnected visible pixel islands so integration QA can
 * distinguish a clean cutout from loose generator/matting pixels. It does not
 * rewrite, clean, approve, or import any image.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDuduqRgbaPng} from './validate-duduq-png.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

function decodeAlpha(bytes){
  const structural=validateDuduqRgbaPng(bytes);
  let offset=8;
  const idat=[];
  while(offset<bytes.length){
    const length=bytes.readUInt32BE(offset);
    const type=bytes.toString('ascii',offset+4,offset+8);
    const start=offset+8,end=start+length;
    if(type==='IDAT')idat.push(bytes.subarray(start,end));
    offset=end+4;
    if(type==='IEND')break;
  }
  const {width,height}=structural,rowBytes=width*4;
  const decoded=inflateSync(Buffer.concat(idat),{maxOutputLength:height*(rowBytes+1)+1});
  const alpha=new Uint8Array(width*height);
  let pos=0;
  let previous=Buffer.alloc(rowBytes);
  for(let y=0;y<height;y++){
    const filter=decoded[pos++];
    const row=Buffer.allocUnsafe(rowBytes);
    for(let x=0;x<rowBytes;x++){
      const left=x>=4?row[x-4]:0,up=previous[x],upperLeft=x>=4?previous[x-4]:0;
      let predictor=0;
      if(filter===1)predictor=left;
      else if(filter===2)predictor=up;
      else if(filter===3)predictor=(left+up)>>1;
      else if(filter===4){
        const p=left+up-upperLeft,pa=Math.abs(p-left),pb=Math.abs(p-up),pc=Math.abs(p-upperLeft);
        predictor=pa<=pb&&pa<=pc?left:pb<=pc?up:upperLeft;
      }
      row[x]=(decoded[pos++]+predictor)&255;
    }
    for(let x=0;x<width;x++)alpha[y*width+x]=row[x*4+3];
    previous=row;
  }
  return {...structural,alpha};
}

export function analyzeAlphaComponents(bytes,{alphaThreshold=64}={}){
  if(!Number.isInteger(alphaThreshold)||alphaThreshold<1||alphaThreshold>255)
    throw Error('INVALID_ALPHA_THRESHOLD');
  const decoded=decodeAlpha(bytes),{width,height,alpha}=decoded,total=width*height;
  const visited=new Uint8Array(total),queue=new Int32Array(total),components=[];
  let visiblePixels=0;
  for(let i=0;i<total;i++)if(alpha[i]>=alphaThreshold)visiblePixels++;
  for(let start=0;start<total;start++){
    if(visited[start]||alpha[start]<alphaThreshold)continue;
    let head=0,tail=0,pixels=0,maxAlpha=0,alphaSum=0;
    let minX=width,minY=height,maxX=-1,maxY=-1;
    visited[start]=1;queue[tail++]=start;
    while(head<tail){
      const index=queue[head++],y=Math.floor(index/width),x=index-y*width,a=alpha[index];
      pixels++;alphaSum+=a;if(a>maxAlpha)maxAlpha=a;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(dx===0&&dy===0)continue;
        const nx=x+dx,ny=y+dy;
        if(nx<0||nx>=width||ny<0||ny>=height)continue;
        const next=ny*width+nx;
        if(!visited[next]&&alpha[next]>=alphaThreshold){visited[next]=1;queue[tail++]=next;}
      }
    }
    components.push({pixels,maxAlpha,meanAlpha:Number((alphaSum/pixels).toFixed(2)),
      bbox:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}});
  }
  components.sort((a,b)=>b.pixels-a.pixels);
  const largest=components[0]?.pixels||0;
  // Multiple large components are expected for valid concepts such as two
  // children, a child plus a moon, or a school gate. Only tiny, meaningfully
  // opaque islands are artifact candidates; the raw component list remains in
  // the report so a reviewer can inspect every secondary subject.
  const microLimit=Math.max(32,Math.floor(visiblePixels*0.0001));
  const micro=components.slice(1).filter(component=>component.maxAlpha>=128&&component.pixels<=microLimit);
  return {
    width,height,alphaThreshold,visiblePixels,componentCount:components.length,
    largestComponentPixels:largest,
    largestComponentCoverage:visiblePixels?Number((largest/visiblePixels).toFixed(8)):0,
    secondaryComponentCount:Math.max(0,components.length-1),microOpaqueIslandPixelLimit:microLimit,
    microOpaqueIslandCount:micro.length,
    microOpaqueIslandPixels:micro.reduce((sum,component)=>sum+component.pixels,0),
    components:components.slice(0,64)
  };
}

async function runCli(){
  const candidateDir=path.resolve(process.argv.find(value=>value.startsWith('--candidate-dir='))?.slice(16)||'');
  const manifestPath=path.resolve(process.argv.find(value=>value.startsWith('--manifest='))?.slice(11)||path.join(candidateDir,'batch-manifest.json'));
  const output=path.resolve(process.argv.find(value=>value.startsWith('--output='))?.slice(9)||'qa/results/png-alpha-component-audit.json');
  const threshold=Number(process.argv.find(value=>value.startsWith('--alpha-threshold='))?.slice(18)||64);
  if(!candidateDir)throw Error('CANDIDATE_DIR_REQUIRED');
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const seen=new Set(),assets=[];
  for(const asset of manifest.assets||[]){
    if(!asset.file||seen.has(asset.file))continue;
    seen.add(asset.file);
    const file=path.resolve(candidateDir,asset.file);
    if(file!==candidateDir&&!file.startsWith(candidateDir+path.sep))throw Error('CANDIDATE_PATH_ESCAPE:'+asset.file);
    const bytes=await readFile(file),actual=sha256(bytes);
    if(actual!==asset.sha256)throw Error('CANDIDATE_HASH_MISMATCH:'+asset.file);
    assets.push({file:asset.file,sha256:actual,...analyzeAlphaComponents(bytes,{alphaThreshold:threshold})});
  }
  const report={
    schemaVersion:'DUDUQ_PNG_ALPHA_COMPONENT_AUDIT_V1',mode:'READ_ONLY_NO_IMAGE_MUTATION',
    createdAt:new Date().toISOString(),candidateDir:path.relative(process.cwd(),candidateDir).replaceAll('\\','/'),
    manifest:path.relative(process.cwd(),manifestPath).replaceAll('\\','/'),alphaThreshold:threshold,
    assetCount:assets.length,assets
  };
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'READ_ONLY_ALPHA_COMPONENT_AUDIT',assets:assets.length,
    assetsWithMicroOpaqueIslands:assets.filter(asset=>asset.microOpaqueIslandCount>0).length,output}));
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))await runCli();
