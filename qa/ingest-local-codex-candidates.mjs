#!/usr/bin/env node
/**
 * Read-only with respect to the game. Stages Codex-generated local PNGs into a
 * QA-only inbox; never edits the media registry, question contracts, Gold
 * Masters or live runtime. Handles dirty local branches via an isolated
 * worktree (created by Codex before invoking this script).
 *
 * Usage:
 *   node qa/ingest-local-codex-candidates.mjs --source="ABSOLUTE_PATH"
 * Optional:
 *   --dest=qa/media-inbox/codex-local-20261029
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';

function option(name, fallback) {
 const prefix='--'+name+'=';
 return process.argv.find(v=>v.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}
function blocked(reason){throw Error('DUDUQ_CODEX_LOCAL_INGEST_BLOCKED:'+reason);}
const root=await fs.realpath(process.cwd());
const targetBranch='automation/duduq-media-source-only-fix-20261029';
let currentBranch;
try {currentBranch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();}
catch {blocked('REQUIRES_GIT_WORKTREE');}
if(currentBranch!==targetBranch)blocked('WRONG_BRANCH:'+currentBranch+':NEEDS_ISOLATED_WORKTREE');
const srcArg=option('source');
if(!srcArg)blocked('SOURCE_REQUIRED');
const source=await fs.realpath(path.resolve(srcArg));
const stat=await fs.stat(source);
if(!stat.isDirectory())blocked('SOURCE_NOT_DIRECTORY');
const destRel=option('dest','qa/media-inbox/codex-local-20261029').replaceAll('\\','/');
if(!/^qa\/media-inbox\/[a-zA-Z0-9_-]+$/.test(destRel))blocked('DEST_OUTSIDE_QA_INBOX');
const dest=path.resolve(root,destRel);
if(source===dest||source.startsWith(dest+path.sep)||dest.startsWith(source+path.sep))blocked('SOURCE_DEST_OVERLAP');
const pngs=[], other=[];
async function walk(folder,depth=0){
 if(depth>4)blocked('SOURCE_TOO_DEEP');
 const files=await fs.readdir(folder,{withFileTypes:true});
 for(const entry of files){
  const fp=path.join(folder,entry.name);
  if(entry.isSymbolicLink())blocked('SYMLINK_SOURCE');
  if(entry.isDirectory())await walk(fp,depth+1);
  else if(entry.isFile()&&/\.png$/i.test(entry.name)){pngs.push(fp);if(pngs.length>64)blocked('TOO_MANY_IMAGES');}
  else if(entry.isFile())other.push(entry.name);
 }
}
await walk(source);
if(!pngs.length)blocked('NO_PNG_FILES');
pngs.sort((a,b)=>a.localeCompare(b));
const candidates=[];
for(let i=0;i<pngs.length;i++){
 const file=pngs[i], bytes=await fs.readFile(file);
 if(bytes.length<1024||bytes.length>16*1024*1024)blocked('IMAGE_SIZE_OUT_OF_RANGE:'+path.basename(file));
 const png=inspectPng(bytes);
 if(!png.valid||png.transparent!==true)blocked('NOT_VALID_TRANSPARENT_RGBA:'+path.basename(file)+':'+png.reason);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<512||height<512)blocked('RESOLUTION_TOO_LOW:'+path.basename(file));
 const base=path.basename(file);
 const safeName=base.replace(/[^a-zA-Z0-9_.-]/g,'_').replace(/^\.+/,'');
 if(!safeName||safeName.length>140)blocked('BAD_FILENAME');
 const fileName=String(i+1).padStart(3,'0')+'-'+safeName;
 candidates.push({
  fileName,originalName:base,
  bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),
  width,height,transparent:true,
  subjectBoundsCoverage:png.subjectBoundsCoverage,
  subjectScaleQc:png.subjectScaleQc,
  technicalQA:'PASS',semanticQA:'PENDING',browserQA:'PENDING',
  integrationStatus:'NOT_INTEGRATED',
  reviewHints:/fish|peixe|pencil.?case|estojo/i.test(base)?['REVIEW_FRAMING_OR_DECORATIVE_DETAILS']:[]
 });
}
await fs.mkdir(dest,{recursive:true});
const realDest=await fs.realpath(dest);
if(!realDest.startsWith(root+path.sep)||!realDest.includes(path.sep+'qa'+path.sep+'media-inbox'+path.sep))blocked('INVALID_DEST_REALPATH');
const previousManifest=path.join(dest,'codex-local-candidates.json');
let previous=null;
try{previous=JSON.parse(await fs.readFile(previousManifest,'utf8'));}
catch(e){if(e.code!=='ENOENT')blocked('INVALID_PREVIOUS_MANIFEST');}
if(previous){
 const prior=new Map((previous.candidates||[]).map(x=>[x.fileName,x.sha256]));
 if(prior.size!==candidates.length||candidates.some(x=>prior.get(x.fileName)!==x.sha256))
  blocked('NON_IDENTICAL_BATCH_ALREADY_PRESENT');
}
for(let i=0;i<candidates.length;i++){
 const x=candidates[i],target=path.join(dest,x.fileName);
 try{
  const existing=await fs.readFile(target);
  if(createHash('sha256').update(existing).digest('hex')!==x.sha256)blocked('DEST_HASH_COLLISION:'+x.fileName);
 }catch(e){
  if(e.code!=='ENOENT')throw e;
  await fs.copyFile(pngs[i],target,fs.constants.COPYFILE_EXCL);
  const copied=await fs.readFile(target);
  if(createHash('sha256').update(copied).digest('hex')!==x.sha256)blocked('COPY_HASH_MISMATCH:'+x.fileName);
 }
}
const manifest={
 schemaVersion:'DUDUQ_CODEX_LOCAL_CANDIDATES_QA_V1',
 provenance:'CODEX_LOCAL_ARTIFACTS',qaOnly:true,eligibleForProduction:false,originalImageGenerationProvenanceVerified:false,
 note:'Staged candidates only. No semantic certification, question bindings or deployment.',
 count:candidates.length,otherSourceFiles:other.filter(x=>/\.json$/i.test(x)).sort(),
 candidates
};
await fs.writeFile(previousManifest,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'CODEX_LOCAL_CANDIDATES_STAGED_QA_ONLY',
 candidates:candidates.length,technicalQA:'PASS',semanticQA:'PENDING',
 integrated:0,output:destRel,manifest:destRel+'/codex-local-candidates.json'}));
