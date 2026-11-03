#!/usr/bin/env node
/**
 * Fast, read-only Assets-DuduQ metadata inventory at a PINNED Git commit.
 * Uses the GitHub tree index without downloading ~500MB of imagery.
 * It does NOT verify PNG bytes, pixel content, alpha, image SHA-256, or pedagogy.
 * Those validations are mandatory later for the small selected media batch.
 */
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const sha=process.argv.find(x=>x.startsWith('--source-commit='))?.slice(16)
  ||process.env.ASSETS_DUDUQ_SOURCE_COMMIT;
const outArg=process.argv.find(x=>x.startsWith('--out='))?.slice(6)
  ||'qa/results/assets-duduq-source-inventory.json';
if(!/^[a-f0-9]{40}$/.test(sha||''))throw Error('REQUIRE_PINNED_40_HEX_COMMIT');
const output=path.resolve(outArg);
if(!output.startsWith(root+path.sep))throw Error('OUTPUT_OUTSIDE_REPOSITORY');
const repo='augustoborgessousa93/Assets-DuduQ';
const url='https://api.github.com/repos/'+repo+'/git/trees/'+sha+'?recursive=1';
const headers={Accept:'application/vnd.github+json','User-Agent':'duduq-qa-readonly-crosswalk'};
if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
const response=await fetch(url,{headers,signal:AbortSignal.timeout(60000)});
if(!response.ok)throw Error('GITHUB_TREE_FETCH_FAILED:'+response.status);
const tree=await response.json();
if(tree.truncated===true||tree.sha!==sha||!Array.isArray(tree.tree))
  throw Error('INCOMPLETE_OR_WRONG_SOURCE_TREE');
const entries=tree.tree.filter(f=>f.type==='blob'&&f.path.startsWith('Imagens Ilustrativa/'));
entries.sort((a,b)=>a.path.localeCompare(b.path,'en'));
if(!entries.length)throw Error('NO_SOURCE_ASSETS');
const files=entries.map(e=>({
  path:e.path,bytes:e.size??null,gitBlobSha:e.sha,sha256:null,dimensions:null,
  detectedType:/\.png$/i.test(e.path)?'PNG':'OTHER_UNVERIFIED',
  technicalStatus:'METADATA_ONLY',
  visualReview:{status:'NOT_VISUALLY_REVIEWED',humanPedagogicalApproval:'PENDING'}
}));
const pngCount=files.filter(f=>f.detectedType==='PNG').length;
const result={
  schemaVersion:'ASSETS_DUDUQ_GIT_TREE_DISCOVERY_V1',sourceRepository:repo,sourceCommit:sha,
  sourceDirectory:'Imagens Ilustrativa/',status:'SOURCE_GIT_TREE_METADATA_ONLY',
  fileCount:files.length,byDetectedType:{PNG_FILENAME_ONLY:pngCount,OTHER:files.length-pngCount},
  uniqueGitBlobShas:new Set(files.map(f=>f.gitBlobSha)).size,
  uniqueSha256:null,sha256NotYetCalculated:true,pngBytesNotYetInspected:true,
  humanPedagogicalApproval:'PENDING',files
};
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,sourceCommit:sha,files:result.fileCount,
  pngFilenameCandidates:pngCount,uniqueGitBlobShas:result.uniqueGitBlobShas,
  imageBytesDownloaded:0,output:path.relative(root,output)}));
