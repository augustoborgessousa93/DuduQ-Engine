#!/usr/bin/env node
/**
 * DUDUQ Windows host for authenticated Codex CLI.
 * --doctor: preflight; --install: create 15min Task Scheduler job;
 * --once: single bounded agent attempt; --status: report checkpoint.
 * No PowerShell policy changes, yolo mode, production deploy or auto merge.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const task='DUDUQ-Codex-Image-Closure';
const branch='automation/duduq-media-source-only-fix-20261029';
const home=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'DUDUQ-Codex-Watchdog');
const lockPath=path.join(home,'lock.json'),statePath=path.join(home,'state.json');
const logs=path.join(home,'logs');
const now=()=>new Date().toISOString();
const q=s=>'"'+String(s).replaceAll('"','')+'"';
const modules=Array.from({length:5},(_,i)=>i+1).flatMap(y=>Array.from({length:6},(_,j)=>'Y'+y+'M'+String(j+1).padStart(2,'0')));
const order=['Y1M04','Y1M05',...modules.filter(x=>!['Y1M04','Y1M05'].includes(x))];
function run(cmd,args){
 const p=spawnSync(cmd,args,{cwd:root,encoding:'utf8',windowsHide:true});
 if(p.status!==0||p.error)throw Error(cmd+' '+String(p.stderr||p.error?.message||p.status).slice(0,450));
 return (p.stdout||'').trim();
}
function requireWindows(){if(process.platform!=='win32')throw Error('REQUIRES_WINDOWS_HOST')}
function preflight(){
 requireWindows();
 const actual=run('git',['branch','--show-current']);
 if(actual!==branch)throw Error('REQUIRES_ISOLATED_REVIEW_WORKTREE:'+actual);
 const origin=run('git',['remote','get-url','origin']);
 if(!/augustoborgessousa93\/DuduQ-Engine(?:\.git)?$/i.test(origin))throw Error('REQUIRES_CORRECT_REPOSITORY_ORIGIN');
 const bins=run('where.exe',['codex']).split(/\r?\n/).filter(Boolean);
 const binary=bins.find(x=>/codex\.exe$/i.test(x))||bins.find(x=>/codex\.cmd$/i.test(x));
 if(!binary)throw Error('CODEX_CLI_NOT_FOUND');
 const isCmd=/\.cmd$/i.test(binary);
 const auth=isCmd?
  spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c','""'+binary+'" login status"'],{encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true}):
  spawnSync(binary,['login','status'],{encoding:'utf8',windowsHide:true});
 if(auth.status!==0||auth.error)throw Error('CODEX_CLI_LOGIN_REQUIRED: authenticated Codex CLI must be available to Scheduled Task ('+
  JSON.stringify({binary,status:auth.status,error:auth.error?.code||null,loggedIn:/Logged in using ChatGPT/i.test(auth.stdout||'')})+')');
 return binary;
}
async function ensure(){await fs.mkdir(logs,{recursive:true})}
async function load(){
 try{return JSON.parse(await fs.readFile(statePath,'utf8'))}
 catch(e){if(e.code==='ENOENT')return {schema:1,runs:0,stalled:{},status:'NOT_STARTED'};throw e}
}
async function save(v){
 await ensure();const temp=statePath+'.tmp-'+process.pid;
 await fs.writeFile(temp,JSON.stringify({...v,updatedAt:now()},null,2)+'\n');
 await fs.rename(temp,statePath);
}
function alive(pid){if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true}catch{return false}}
async function lock(){
 await ensure();
 for(let attempt=0;attempt<2;attempt++){
  try{
   const handle=await fs.open(lockPath,'wx');
   await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:now()}));await handle.close();return true;
  }catch(e){
   if(e.code!=='EEXIST')throw e;
   let existing={};try{existing=JSON.parse(await fs.readFile(lockPath,'utf8'))}catch{}
   if(alive(existing.pid)||alive(existing.childPid)){console.log('ACTIVE_PROCESS_PRESENT');return false}
   await fs.unlink(lockPath).catch(()=>{});
  }
 }
 throw Error('UNABLE_TO_ACQUIRE_LOCK');
}
async function closure(){
 try{
  const v=JSON.parse(await fs.readFile(path.join(root,'qa/results/media-module-closure.json'),'utf8'));
  return v.modules===30&&v.activities===600&&v.modulesDetail?.length===30?v:null;
 }catch{return null}
}
function complete(v){return v?.status==='PROJECT_COMPLETE'&&v.completedModules===30&&v.pendingModules===0&&
 v.distinctPendingMediaIds===0&&v.finalPedagogicalQaApproved===true&&v.finalCompletionPassed===true}
function choose(c,s){
 const map=new Map((c?.modulesDetail||[]).map(x=>[x.moduleId,x]));
 const pending=order.filter(x=>map.get(x)?.complete!==true);
 // Finish one module before moving on; skip only after three consecutive
 // rounds with no measurable global pending reduction.
 if(s.lastModule&&pending.includes(s.lastModule)&&(s.stalled?.[s.lastModule]||0)<3)return s.lastModule;
 return (pending.length?pending:order).sort((a,b)=>
  (s.stalled?.[a]||0)-(s.stalled?.[b]||0)||order.indexOf(a)-order.indexOf(b))[0];
}
function queuePlan(){
 // Recalculate available candidates and independent module queues on every
 // attempt; if a queue cannot be verified, fail closed rather than guess.
 const report=run(process.execPath,['qa/duduq-two-lane-plan.mjs']);
 const parsed=JSON.parse(report);
 if(parsed.status!=='TWO_LANES_READY_FOR_ORCHESTRATION')throw Error('INVALID_TWO_LANE_PLANNER_STATUS');
 return JSON.parse(fsSync.readFileSync(path.join(root,'qa/results/media-two-lane-plan.json'),'utf8'));
}
function pickFromLane(plan,lane,state){
 const work=plan.modules.filter(x=>lane==='generation'?x.needsGeneration:x.needsIntegrationOrQA);
 if(!work.length)return null;
 const remembered=lane==='generation'?state.lastGeneratedModule:state.lastIntegratedModule;
 const stalled=state.stalled||{};
 if(remembered&&work.some(x=>x.moduleId===remembered)&&(stalled[remembered]||0)<3)return remembered;
 const priority=lane==='generation'?
  ['Y1M06',...order.filter(x=>x!=='Y1M06')]:['Y1M04','Y1M05',...order.filter(x=>!['Y1M04','Y1M05'].includes(x))];
 return work.sort((a,b)=>(stalled[a.moduleId]||0)-(stalled[b.moduleId]||0)||
  priority.indexOf(a.moduleId)-priority.indexOf(b.moduleId))[0].moduleId;
}
function instruction(mod,c,lane){
 const header=[
  'DUDUQ ENGLISH: UNATTENDED TWO-LANE EXECUTION. ACTIVE LANE: '+lane+'. Current module: '+mod+'.',
  'Last audited global pending media IDs: '+(c?.distinctPendingMediaIds??'UNKNOWN')+'.',
  'Read AGENTS.md, docs/qa/DUDUQ_CODEX_IMAGE_AUTOMATION.md and latest local checkpoint.',
  'Protect Gold Masters, source question contracts, production and the original dirty workspace.',
  'No manual CONTINUE, no subscription/API purchases, no false approval, no production merge/deploy.',
  'Do not run a second Codex process: the Windows scheduler serializes both independent lanes in this safe rollout.'
 ];
 const producer=[
  'PRODUCTION LANE ONLY: generate EVERY remaining needed pedagogical PNG for '+mod+' using the real enabled Codex image generator.',
  'Inventory the actual 20 questions and all semantic targets first. Reuse pre-existing original PNGs when verified. Never create ungrounded or duplicate concepts.',
  'Generate 3D premium child-friendly concept assets with real alpha and subject filling the canvas; one file per concept, no wrong distractors.',
  'Write candidate PNGs, original generation provenance, SHA-256, semantic evidence and per-question binding plans ONLY under qa/media-candidates/ in a module-specific batch.',
  'Do NOT apply or finalize media overlays, modify runtime/registry/question JSON, set approval flags, run deployment, or remove existing referenced assets.',
  'A candidate is not an integrated official image. Save an idempotent checkpoint, record generated assets, commit/push safe candidate files to the isolated review branch.',
  'On image generation limits, record BLOCKED_GENERATOR, proceed with unblocked concepts and exit normally for future resumption.'
 ];
 const integrator=[
  'INTEGRATION/QA LANE ONLY: take already-generated, hash-verified PNG candidates for '+mod+'. Do not spend time creating next-module PNGs in this lane.',
  'Fix semantic per-occurrence shared media IDs, keep all answer keys and mechanics, integrate QA overlay and registry/manifest in the isolated compiled game.',
  'Run semantic validators and real browser gameplay with mouse/touch at desktop/tablet/mobile; verify both correct and incorrect feedback and transport hashes.',
  'Investigate the known Y1M04 Target Shooter Q002 CONFIRMAR/CONTINUAR race and Y1M05 source registry hash pin WITHOUT weakening gates or forging source hashes.',
  'Use Linux GitHub Actions independent replay after committing QA changes. A green baseline V26 is NOT proof of integrated PNGs.',
  'Commit/push safe QA corrections to review only; save precise checkpoint of module, verified PNG hashes, tests, CI URL, blockers and next integration target.',
  'If the QA lane is blocked, record the exact failure and EXIT this invocation without stopping the independent generation queue.'
 ];
 return [...header,...(lane==='generation'?producer:integrator),
 'After the invocation, the scheduler will plan the OTHER lane. Do not report PROJECT_COMPLETE unless 30/30 modules, 600 activities, zero provisional/unverified media and release gates are independently proven.'
 ].join('\n');
}
async function codex(binary,taskPrompt,stdoutPath,stderrPath){
 const args=['exec','--json','--approve-for-me',
  '-C',root,'-c','sandbox_workspace_write.network_access=true','-'];
 let exe=binary,params=args;
 if(/\.cmd$/i.test(binary)){
  exe=process.env.ComSpec||'cmd.exe';
  params=['/d','/s','/c','""'+binary+'" '+args.map(q).join(' ')+'"'];
 }
 const out=fsSync.createWriteStream(stdoutPath,{flags:'wx'});
 const err=fsSync.createWriteStream(stderrPath,{flags:'wx'});
 const p=spawn(exe,params,{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe'],windowsVerbatimArguments:/\.cmd$/i.test(binary)});
 p.stdout.pipe(out);p.stderr.pipe(err);p.stdin.end(taskPrompt);
 await fs.writeFile(lockPath,JSON.stringify({pid:process.pid,childPid:p.pid,startedAt:now()}));
 const exit=await new Promise((resolve,reject)=>{p.once('error',reject);p.once('close',(code,signal)=>resolve({code:code??1,signal}))});
 await Promise.all([new Promise(r=>out.end(r)),new Promise(r=>err.end(r))]);
 return exit;
}
async function once(){
 const binary=preflight();
 if(!(await lock()))return;
 try{
  const state=await load(),before=await closure();
  if(complete(before)){await save({...state,status:'PROJECT_COMPLETE_VERIFIED'});return}
  if(state.notBefore&&Date.now()<Date.parse(state.notBefore)){
   console.log('BACKOFF_UNTIL:'+state.notBefore);return;
  }
  const beforePlan=queuePlan();
  const hasGeneration=beforePlan.producer.queuedModules>0;
  const hasIntegration=beforePlan.integrator.queuedModules>0;
  if(!hasGeneration&&!hasIntegration){
   await save({...state,status:'NO_QUEUED_WORK_NEEDS_INDEPENDENT_RELEASE_QA',notBefore:
    new Date(Date.now()+60*60*1000).toISOString()});
   console.log('NO_TWO_LANE_WORK: independent QA and release completion require separate proof');return;
  }
  const lane=hasGeneration&&hasIntegration?
   (state.lastLane==='generation'?'integration':'generation'):
   (hasGeneration?'generation':'integration');
  const moduleId=pickFromLane(beforePlan,lane,state);
  if(!moduleId)throw Error('TWO_LANE_QUEUE_EMPTY_INCONSISTENT');
  const id=now().replace(/[^0-9]/g,'').slice(0,14)+'-'+String(state.runs+1);
  const outFile=path.join(logs,id+'.jsonl'),errFile=path.join(logs,id+'.stderr.log');
  await save({...state,status:'IN_PROGRESS',runs:state.runs+1,activeModule:moduleId,activeLane:lane,
   startedAt:now(),beforePending:before?.distinctPendingMediaIds??null});
  const result=await codex(binary,instruction(moduleId,before,lane),outFile,errFile);
  const after=await closure(),oldPending=before?.distinctPendingMediaIds??null,newPending=after?.distinctPendingMediaIds??null;
  const afterPlan=queuePlan();
  const beforeMod=before?.modulesDetail?.find(m=>m.moduleId===moduleId);
  const afterMod=after?.modulesDetail?.find(m=>m.moduleId===moduleId);
  const beforeCandidate=beforePlan.modules.find(m=>m.moduleId===moduleId)?.candidate;
  const afterCandidate=afterPlan.modules.find(m=>m.moduleId===moduleId)?.candidate;
  const newImageEvidence=lane==='generation'&&
   ((afterCandidate?.validAssetCount||0)>(beforeCandidate?.validAssetCount||0)||
    ((afterCandidate?.validAssetCount||0)>0 && afterCandidate?.manifestSha256!==beforeCandidate?.manifestSha256));
  const improved=newImageEvidence||
   (oldPending!==null&&newPending!==null&&newPending<oldPending)||
   (after?.completedModules??0)>(before?.completedModules??0)||
   (Number(afterMod?.verifiedReferencedIds)||0)>(Number(beforeMod?.verifiedReferencedIds)||0);
  const updated=await load(),stalled={...(updated.stalled||{})};
  stalled[moduleId]=improved?0:(stalled[moduleId]||0)+1;
  const noProgress=improved?0:(Number(updated.consecutiveNoProgress)||0)+1;
  // Try another module if one is blocked. If a complete pass over 30
  // modules makes no measurable progress, slow down rather than burn quota.
  const retry=result.code!==0;
  const backoff=retry?Math.min(360,30*stalled[moduleId]):
   noProgress>=30?Math.min(240,30*Math.ceil((noProgress-29)/10)):0;
  await save({...updated,status:complete(after)?'PROJECT_COMPLETE_VERIFIED':retry?'BLOCKED_RETRY':'IN_PROGRESS',
   activeModule:null,activeLane:null,lastLane:lane,
   lastGeneratedModule:lane==='generation'?moduleId:updated.lastGeneratedModule,
   lastIntegratedModule:lane==='integration'?moduleId:updated.lastIntegratedModule,
   lastModule:moduleId,lastExitCode:result.code,
   pendingBefore:oldPending,pendingAfter:newPending,reduced:improved,
   stalled,consecutiveNoProgress:noProgress,lastFinishedAt:now(),
   notBefore:backoff?new Date(Date.now()+backoff*60000).toISOString():null,
   logs:{outFile,errFile},moduleClosure:after?.completedModules??null});
  console.log(JSON.stringify({lane,moduleId,exitCode:result.code,oldPending,newPending,
   candidateAssetsBefore:beforePlan.candidateAssetCount,
   candidateAssetsAfter:afterPlan.candidateAssetCount,newImageEvidence,improved,logs:[outFile,errFile]}));
 }catch(e){
  const prev=await load();
  const prior=Number(prev.failedAttempts||0)+1;
  await save({...prev,status:'BLOCKED_RETRY',lastError:String(e.message||e).slice(0,600),
   failedAttempts:prior,notBefore:new Date(Date.now()+Math.min(360,30*prior)*60000).toISOString()});
  console.error('CODEX_UNATTENDED_FAILED:'+String(e.message||e).slice(0,600));
  process.exitCode=2;
 }finally{await fs.unlink(lockPath).catch(()=>{})}
}
async function install(){
 const binary=preflight();
 const command=q(process.execPath)+' '+q(fileURLToPath(import.meta.url))+' --once';
 const result=run('schtasks.exe',['/Create','/F','/SC','MINUTE','/MO','15','/TN',task,'/TR',command]);
 const verified=run('schtasks.exe',['/Query','/TN',task,'/FO','LIST']);
 if(!verified.includes(task))throw Error('SCHEDULED_TASK_NOT_VERIFIED');
 await save({...await load(),status:'TASK_INSTALLED_NOT_YET_PROVEN_RUNNING',installedAt:now(),binary});
 console.log(JSON.stringify({task,installed:true,command,result,
  warning:'Requires Windows signed-in session, valid Codex auth, official image generation capability and successful first real run'}));
}
async function clearBackoff(){
 let existing={};
 try{existing=JSON.parse(await fs.readFile(lockPath,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 if(alive(existing.pid)||alive(existing.childPid))throw Error('CANNOT_CLEAR_BACKOFF_WHILE_RUNNER_ACTIVE');
 const state=await load();
 await save({...state,notBefore:null,backoffResetAt:now(),backoffResetReason:'retry after CLI compatibility fix'});
 console.log(JSON.stringify({status:'RETRY_READY',task,previousNotBefore:state.notBefore||null}));
}
const cmd=process.argv[2];
if(cmd==='--doctor'){
 try{const x=preflight();console.log(JSON.stringify({status:'READY_FOR_INSTALL',root,binary:x,task}))}
 catch(e){console.error('PREFLIGHT_BLOCKED:'+e.message);process.exitCode=2}
}else if(cmd==='--install')await install();
else if(cmd==='--once')await once();
else if(cmd==='--clear-backoff')await clearBackoff();
else if(cmd==='--status'){console.log(JSON.stringify({state:await load(),closure:await closure()},null,2))}
else throw Error('Usage: node qa/duduq-codex-unattended.mjs --doctor|--install|--once|--status');
