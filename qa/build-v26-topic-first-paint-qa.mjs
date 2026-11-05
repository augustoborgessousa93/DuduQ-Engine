#!/usr/bin/env node
/** Cross-platform equivalent of qa/build-v26-topic-first-paint-qa.sh. */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const root=process.cwd();
const initialArtifact='CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E';
const env={...process.env,CI:'true',EXPECTED_ARTIFACT_SHA256:initialArtifact};
const steps=[];
function run(command,args){
  const started=Date.now();
  const child=spawnSync(command,args,{cwd:root,env,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});
  const step={command:[command,...args].join(' '),exitCode:child.status,durationMs:Date.now()-started};
  steps.push(step);
  if(child.stdout)process.stdout.write(child.stdout);
  if(child.stderr)process.stderr.write(child.stderr);
  if(child.status!==0)throw Error('BUILD_STEP_FAILED:'+step.command+':'+child.status+':'+(child.error?.code||child.error?.message||'NO_CHILD_ERROR'));
  return String(child.stdout||'').trim();
}
const node=(...args)=>run(process.execPath,args);

node('--check','qa/import-v19-immutable-cdn.mjs');
node('qa/import-v19-immutable-cdn.mjs');
node('qa/verify-artifact.mjs');
const middlewareBlob=run('git',['hash-object','functions/play/english/_middleware.js']);
if(middlewareBlob!=='a9b5ff00c2e09976c86e0adda7e6813c64815ef0')
  throw Error('V21_MIDDLEWARE_PINNED_GIT_BLOB_MISMATCH:'+middlewareBlob);
console.log('V21_MIDDLEWARE_PINNED_GIT_BLOB=PASS:'+middlewareBlob);

const chain=[
  ['qa/apply-v21-approved-content-overlay.mjs',[
    'functions/play/english/_middleware.js','dist-pages/play/drag-drop/drag-drop.js',
    'dist-pages/play/drag-drop-multimedia/drag-drop-multimedia-gameplay.js',
    'dist-pages/core/ui/duduq-canonical-question-hud.js','qa/tests/verify-v21-targeted.mjs']],
  ['qa/apply-v22-matching-feedback.mjs',[
    'dist-pages/core/matching/duduq-matching-runtime-v22.js','dist-pages/core/ui/duduq-canonical-question-hud.js',
    'dist-pages/core/duduq-matching-production-bridge.js','qa/tests/verify-v22-matching-feedback.mjs']],
  ['qa/apply-v23-ebc-watermark.mjs',['dist-pages/core/duduq-ebc-attribution-watermark.js','qa/tests/verify-v23-ebc-watermark.mjs']],
  ['qa/apply-v24-header-title.mjs',['dist-pages/core/duduq-header-title-fit-v24.js','qa/tests/verify-v24-header-title.mjs']],
  ['qa/apply-v25-early-header-title.mjs',['qa/tests/verify-v25-early-header-title.mjs']],
  ['qa/apply-v26-topic-first-paint.mjs',['qa/tests/verify-v26-topic-first-paint.mjs']]
];
for(const [apply,checks] of chain){
  node('--check',apply);
  node(apply);
  for(const file of checks)node('--check',file);
  node(checks.at(-1));
}

let modules=0,activities=0;
for(let year=1;year<=5;year++)for(let n=1;n<=6;n++){
  const mm=String(n).padStart(2,'0'),moduleId='Y'+year+'M'+mm;
  const page=await readFile(path.join(root,'dist-pages/play/english/year-'+year+'/module-'+mm+'/index.html'),'utf8');
  if(!page.includes('<html'))throw Error('MODULE_ROUTE_INVALID:'+moduleId);
  const questions=JSON.parse(await readFile(path.join(root,'dist-pages/content/english/year-'+year+'/module-'+mm+'/questions.json'),'utf8'));
  if(questions.moduleId!==moduleId||questions.items?.length!==20)throw Error('MODULE_CURRICULUM_INVALID:'+moduleId);
  for(const item of questions.items){if(!item.item_id?.startsWith(moduleId+'-'))throw Error('CURRICULUM_ID_INVALID:'+item.item_id);activities++;}
  modules++;
}
if(modules!==30||activities!==600)throw Error('MODULE_COUNT_MISMATCH');
const manifestBytes=await readFile(path.join(root,'dist-pages/.duduq-pages-manifest'));
const report={schemaVersion:'DUDUQ_V26_CROSS_PLATFORM_BUILD_V1',status:'PASS',platform:process.platform,
  source:'qa/build-v26-topic-first-paint-qa.sh command-equivalent',initialArtifactSha256:initialArtifact,
  modules,activities,steps,finalCompiledManifestSha256:createHash('sha256').update(manifestBytes).digest('hex'),
  productionDeployed:false};
await writeFile(path.join(root,'qa/results/y1m04-v26-build.json'),JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_V26_CRITICAL_HUD_TOPIC_RELEASE_GATE=PASS');
console.log(JSON.stringify({status:report.status,modules,activities,steps:steps.length,manifestSha256:report.finalCompiledManifestSha256}));
