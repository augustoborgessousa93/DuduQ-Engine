#!/usr/bin/env node
/**
 * Windows Task Scheduler evidence for the DUDUQ Codex local agent.
 * READ ONLY. Does not change task, Windows policy, registry, worktrees or lock.
 * Usage: node qa/duduq-windows-scheduler-diagnostics.mjs --doctor
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const task='DUDUQ-Codex-Image-Closure';
const home=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'DUDUQ-Codex-Watchdog');
const resultFile=path.join(home,'scheduler-diagnostics.json');
const bin=(cmd,args)=>{
 const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,timeout:25000,maxBuffer:2*1024*1024});
 return {ok:r.status===0&&!r.error,status:r.status,stdout:r.stdout||'',stderr:(r.stderr||r.error?.message||'').slice(0,500)};
};
const tag=(xml,name)=>xml.match(new RegExp('<(?:[A-Za-z_]+:)?'+name+'(?:\\s[^>]*)?>([^<]*)</(?:[A-Za-z_]+:)?'+name+'>','i'))?.[1]||null;
async function readJson(file){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){return {unreadable:e.code||'INVALID_JSON'}}}
async function doctor(){
 if(process.platform!=='win32')throw Error('WINDOWS_HOST_REQUIRED');
 const query=bin('schtasks.exe',['/Query','/TN',task,'/V','/FO','LIST']);
 const xml=bin('schtasks.exe',['/Query','/TN',task,'/XML']);
 const state=await readJson(path.join(home,'state.json'));
 const lock=await readJson(path.join(home,'lock.json'));
 let logs=[];
 try{logs=(await Promise.all((await fs.readdir(path.join(home,'logs'))).filter(x=>/\.jsonl$|\.stderr\.log$/.test(x)).map(async name=>{
  const st=await fs.stat(path.join(home,'logs',name));return {name,modifiedAt:st.mtime.toISOString(),size:st.size};
 }))).sort((a,b)=>b.modifiedAt.localeCompare(a.modifiedAt)).slice(0,6)}catch(e){logs=[{unavailable:e.code||String(e)}]}
 // Read-only CIM is needed to disambiguate PID reuse, a real active Codex
 // process, and a queued Task Scheduler slot. No PowerShell policy change.
 const script=[
  "$ErrorActionPreference='Stop'",
  "@(Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(node|codex|cmd|powershell|pwsh)\\.exe$' -and $_.CommandLine -match '(duduq-codex-unattended|DUDUQ-Codex)' } | Select-Object Name,ProcessId,CreationDate,CommandLine) | ConvertTo-Json -Compress -Depth 3"
 ].join('; ');
 const ps=bin('powershell.exe',['-NoProfile','-NonInteractive','-Command',script]);
 let processes=null;
 if(ps.ok)try{const x=JSON.parse(ps.stdout||'[]');processes=Array.isArray(x)?x:x?[x]:[]}catch{}
 const policy=xml.ok?tag(xml.stdout,'MultipleInstancesPolicy'):null;
 const originalState=String(query.stdout||'');
 const report={
  schemaVersion:'DUDUQ_WINDOWS_SCHEDULER_DIAGNOSTICS_V1',
  generatedAt:new Date().toISOString(),
  taskName:task,taskFound:query.ok&&xml.ok,
  taskSchedulerQueryStatus:query.status,
  taskSchedulerQueryOutput:originalState.slice(0,7500),
  taskPolicy:{multipleInstancesPolicy:policy,
    enabled:xml.ok?tag(xml.stdout,'Enabled'):null,
    startWhenAvailable:xml.ok?tag(xml.stdout,'StartWhenAvailable'):null,
    executionTimeLimit:xml.ok?tag(xml.stdout,'ExecutionTimeLimit'):null,
    disallowStartIfOnBatteries:xml.ok?tag(xml.stdout,'DisallowStartIfOnBatteries'):null,
    logonType:xml.ok?tag(xml.stdout,'LogonType'):null},
  worktree:{cwd:process.cwd()},
  state:{status:state.status,activeLane:state.activeLane,lastLane:state.lastLane,
    runs:state.runs,updatedAt:state.updatedAt,notBefore:state.notBefore,
    lastError:state.lastError,lastFinishedAt:state.lastFinishedAt},
  lock:{pid:lock.pid,childPid:lock.childPid,startedAt:lock.startedAt,exists:!lock.unreadable},
  processInspectionSucceeded:ps.ok&&processes!==null,
  matchingProcesses:processes,
  latestLogs:logs,
  diagnosis:[],
  disclaimer:'Read-only evidence; task running/queued does not prove productive Codex execution'
 };
 if(!report.taskFound)report.diagnosis.push('TASK_NOT_FOUND_OR_ACCESS_DENIED');
 if(/Queue/i.test(policy||''))report.diagnosis.push('MULTIPLE_INSTANCES_POLICY_QUEUE');
 if(!ps.ok||processes===null)report.diagnosis.push('CANNOT_VERIFY_WINDOWS_PROCESS_IDENTITY');
 if((policy||'')==='Queue'&&!(processes||[]).length)report.diagnosis.push('QUEUED_POLICY_WITH_NO_MATCHING_EXECUTOR_PROCESS');
 if((processes||[]).length)report.diagnosis.push('MATCHING_EXECUTOR_PROCESS_PRESENT_INSPECT_BEFORE_RESTART');
 if((state.notBefore||'')&&Date.parse(state.notBefore)>Date.now())report.diagnosis.push('RUNNER_BACKOFF_ACTIVE');
 if(!logs.some(x=>x.modifiedAt))report.diagnosis.push('NO_LOCAL_CODEX_SESSION_LOGS_FOUND');
 if((state.lastLane||'')!=='generation'&&(state.lastLane||'')!=='integration')
  report.diagnosis.push('NO_EVIDENCE_OF_TWO_LANE_EXECUTION_YET');
 await fs.mkdir(home,{recursive:true});
 await fs.writeFile(resultFile,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({taskFound:report.taskFound,policy:report.taskPolicy,
  matchingProcesses:processes?.length??null,lastLane:state.lastLane||null,
  lastLogs:logs.slice(0,2),diagnosis:report.diagnosis,report:resultFile}));
 if(!report.taskFound||!report.processInspectionSucceeded)process.exitCode=2;
}
if(process.argv[2]==='--doctor')await doctor();
else throw Error('Usage: node qa/duduq-windows-scheduler-diagnostics.mjs --doctor');
