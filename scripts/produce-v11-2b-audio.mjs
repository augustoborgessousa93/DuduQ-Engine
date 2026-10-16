import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { ChatterboxEngine } from '../duduq-audio/engine/chatterbox-engine.mjs';
import { AudioPipeline } from '../duduq-audio/pipeline/audio-pipeline.mjs';

const execFile=promisify(execFileCallback), root=process.cwd(), base='duduq-audio';
const voice='DUDUQ_GOLD_VOICE_v1', engineId='chatterbox-multilingual-v3', model='Chatterbox Multilingual V3';
const settingsDoc=JSON.parse(await readFile(path.join(root,`${base}/config/gold-voice-worker.json`),'utf8'));
const runtimeConfig=path.join(root,`${base}/config/chatterbox-runtime.json`);
const runtime=path.join(root,`${base}/.runtime`);
const refAudio=JSON.parse(await readFile(runtimeConfig,'utf8')).referenceAudio;
const read=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const save=async(p,x)=>{const f=path.join(root,p);await mkdir(path.dirname(f),{recursive:true});await writeFile(f,`${JSON.stringify(x,null,2)}\n`)};
const exists=p=>access(p).then(()=>true,()=>false);
const sha=s=>createHash('sha256').update(s).digest('hex');
const short=s=>sha(s).slice(0,16).toUpperCase();
const norm=s=>String(s??'').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
const langName=locale=>locale==='pt-BR'?'Portuguese':'English';
const roleOf=r=>r.semanticKey[2];
const semanticTypeOf=r=>r.semanticKey[3];
const contextFor=(role,type,locale)=>{
  const profiles=settingsDoc.approvedDeliveryProfiles?.NATURAL_CLEAR_V2??{};
  if(locale==='pt-BR') return profiles.PT_BR_INSTRUCTION??settingsDoc.generation;
  if(/INSTRUCTION/i.test(role)) return /SENTENCE|PHRASE/i.test(type)?(profiles.EN_CONTEXT_SENTENCE??settingsDoc.generation):(profiles.EN_FUNCTIONAL_CHUNK??settingsDoc.generation);
  return /SENTENCE|PHRASE|DIALOGUE/i.test(type)?(profiles.EN_CONTEXT_SENTENCE??settingsDoc.generation):(profiles.EN_LEXICAL??settingsDoc.generation);
};
const contracts=JSON.parse(await readFile(path.join(root,'content/english/production/v11-1b/deterministic-activity-contracts.json'),'utf8')).contracts;
const audit=await read('content/english/production/v11-2/audio-dedup-and-reuse-audit.json');
const registryPath='content/english/audio/audio-registry.json';
const registry=await read(registryPath); const byId=new Map(registry.entries.map(x=>[x.audioId,x]));
const itemByConcept=new Map();
for(const c of contracts)for(const a of [...(c.requiredAudio?.instruction??[]),...(c.requiredAudio?.learnerTargets??[]),...(c.requiredAudio?.feedback??[]),...(c.requiredAudio?.completedSentence??[]),...(c.requiredAudio?.optionTargets??[])]){
  const set=itemByConcept.get(a.audioConceptId)??new Set();set.add(c.itemId);itemByConcept.set(a.audioConceptId,set);
}
const priorPath='content/english/production/v11-2b/audio-production-manifest.json';
const prior=await read(priorPath).catch(()=>null);
const jobs=[], bindings={}, reused=[];
for(const group of audit.groups){
  const [localeKey,spokenTarget,role,semanticType]=group.semanticKey;
  const locale=localeKey==='pt-br'?'pt-BR':'en-US';
  const targetId=`AUD-V11-2B-${short(group.canonicalKey)}`;
  const users=[...new Set(group.requirementIds.flatMap(id=>[...(itemByConcept.get(id)??[])]))].sort();
  const exact=group.candidates.find(c=>c.decision==='REUSE_EXACT_QC_PASS');
  if(exact){
    const e=byId.get(exact.audioId), p=e?.urlOrPath??e?.audioPath;
    if(e&&p&&await exists(path.join(root,p))){
      for(const id of group.requirementIds)bindings[id]={audioId:e.audioId,path:p,disposition:'REUSE_EXACT_QC_PASS',canonicalKey:group.canonicalKey};
      reused.push({canonicalKey:group.canonicalKey,audioId:e.audioId,path:p,spokenTarget,locale,role,users});
      continue;
    }
  }
  const previous=prior?.jobs?.find(x=>x.canonicalKey===group.canonicalKey);
  const audioId=previous?.audioId??targetId;
  const dir=`content/english/assets/audio/versions/V11_2B/${voice}`;
  const rel=`${dir}/${audioId.toLowerCase()}.mp3`, master=`content/english/assets/audio/master/versions/V11_2B/${voice}/${audioId.toLowerCase()}.wav`;
  const previousQcPass = previous?.status === 'GENERATED_QC_PASS' && previous.qc?.pass === true &&
    typeof previous.contentHash === 'string' && previous.contentHash.length === 64 &&
    previous.path === rel && await exists(path.join(root, rel));
  jobs.push({canonicalKey:group.canonicalKey,audioId,requirementIds:group.requirementIds,spokenTarget,locale,role,semanticType,users,
    outputWav:`${base}/.runtime/production-work/V11_2B/${audioId}.wav`,audioPath:rel,masterAudioPath:master,
    status:previousQcPass?'GENERATED_QC_PASS':'PENDING', ...(previousQcPass ? { contentHash: previous.contentHash, qc: previous.qc, path: previous.path } : {})});
  for(const id of group.requirementIds)bindings[id]={audioId,path:rel,disposition:'GENERATION_PENDING',canonicalKey:group.canonicalKey};
}
const checkpoint={schemaVersion:'duduq-v11-2b-audio-production-v1',goldVoice:voice,engine:engineId,model,
  createdAt:prior?.createdAt??new Date().toISOString(),updatedAt:new Date().toISOString(),totalCanonicalGroups:audit.canonicalConceptCount,
  reused, jobs, bindings, generated:jobs.filter(x=>x.status==='GENERATED_QC_PASS').length, pending:jobs.filter(x=>x.status==='PENDING').length};
await save(priorPath,checkpoint);
await save('content/english/production/v11-2b/audio-concept-binding-map.json',{schemaVersion:'duduq-v11-2b-audio-binding-map-v1',bindings,reused,updatedAt:new Date().toISOString()});

if(!jobs.some(j=>j.status==='PENDING')){console.log(JSON.stringify({status:'NO_PENDING_AUDIO',reused:reused.length,generated:jobs.length}));process.exit(0)}
if(!refAudio||!(await exists(refAudio)))throw new Error('GOLD_VOICE_REFERENCE_AUDIO_MISSING');
const pythonPath=path.join(root,`${base}/.runtime/chatterbox-venv/Scripts/python.exe`);
const hfHome=path.join(root,`${base}/.runtime/chatterbox-hf`);
const workerPath=path.join(root,`${base}/engine/chatterbox_worker.py`);
if(!(await exists(pythonPath))||!(await exists(workerPath)))throw new Error('CHATTERBOX_WORKER_COMPONENT_MISSING');
const engine=new ChatterboxEngine({root,pythonPath,workerPath,workerConfigPath:runtimeConfig,hfHome,loadTimeoutMs:300000,generationTimeoutMs:240000});
const pipe=new AudioPipeline({root,engine,paths:{cache:path.join(runtime,'cache/chatterbox-gold-v1'),jobs:path.join(runtime,'v11-2b-chatterbox-job-state.json'),manifest:path.join(runtime,'v11-2b-audio-run-manifest.json')},maxRetries:2});
const requestedLimit=Number(process.argv.find(x=>x.startsWith('--limit='))?.split('=')[1]);
const unresolved=jobs.filter(j=>j.status==='PENDING').slice(0,Number.isFinite(requestedLimit)&&requestedLimit>0?requestedLimit:undefined);
const inputs=unresolved.map(j=>({id:j.audioId,module:j.users[0]?.slice(0,5)??'SHARED',activity:j.users,type:j.role,
  displayText:j.spokenTarget,speechText:j.spokenTarget,locale:j.locale,language:langName(j.locale),voiceProfile:voice,voiceVersion:voice,
  engine:engineId,model,settings:contextFor(j.role,j.semanticType,j.locale),referenceAudio:refAudio,outputPath:j.outputWav}));
let generated=[];let failure=null;
try{
  generated=await pipe.runBatch(inputs,{closeEngine:false,preferResume:true,onJob:async result=>{
    const record=jobs.find(j=>j.audioId===result.id); if(record&&result.status==='DONE')record.rawStatus='RAW_QC_PASS';
    checkpoint.updatedAt=new Date().toISOString();checkpoint.jobs=jobs;checkpoint.generated=jobs.filter(x=>x.status==='GENERATED_QC_PASS').length;
    checkpoint.pending=jobs.filter(x=>x.status!=='GENERATED_QC_PASS').length;await save(priorPath,checkpoint);
    process.stdout.write(`${result.status}${result.cache?' CACHE_HIT':''} ${result.id}\n`);
  }});
}catch(error){failure=error.message;}finally{await engine.close();}

const rawById=new Map(generated.filter(x=>x.status==='DONE'||x.status==='SKIPPED/DONE').map(x=>[x.id,x]));
const ready=jobs.filter(j=>j.status!=='GENERATED_QC_PASS'&&rawById.has(j.audioId));
if(ready.length){
  const postInput=`${base}/.runtime/v11-2b-postprocess-input.json`;
  const postJobs=ready.map(j=>({id:j.audioId,voiceVersion:voice,engine:engineId,model,cacheKey:rawById.get(j.audioId).cacheKey,
    sourceWav:path.join(root,j.outputWav),masterPath:path.join(root,j.masterAudioPath),audioPath:path.join(root,j.audioPath),
    masterAudioPath:path.join(root,j.masterAudioPath),audioPathRelative:j.audioPath}));
  await save(postInput,{settings:settingsDoc.productionPostProcessing,items:postJobs});
  const {stdout}=await execFile(pythonPath,[path.join(root,`${base}/scripts/process-production-audio.py`),path.join(root,postInput)],{windowsHide:true,maxBuffer:8*1024*1024,encoding:'utf8'});
  const post=JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  const postById=new Map((post.results??[]).map(x=>[x.id,x]));
  const failures=new Map((post.failures??[]).map(x=>[x.id,x.error]));
  for(const j of ready){
    const x=postById.get(j.audioId); if(!x){j.status='FAILED_QC';j.error=failures.get(j.audioId)??'POSTPROCESS_RESULT_MISSING';continue;}
    const raw=rawById.get(j.audioId),entry={audioId:j.audioId,type:/INSTRUCTION/i.test(j.role)?`instruction-${j.locale==='pt-BR'?'pt':'en'}`:'learner-content',
      transcript:j.spokenTarget,speechText:j.spokenTarget,language:j.locale==='pt-BR'?'pt':'en',locale:j.locale,semanticRole:j.role,semanticType:j.semanticType,
      speakerRole:'single',voiceProfile:voice,voiceVersion:voice,engine:engineId,model,deliveryProfile:'NATURAL_CLEAR_V2',version:'1.0',
      status:'GENERATED',approvalStatus:'TECHNICAL_PASS_HUMAN_PENDING',humanPronunciationReview:'HUMAN_REVIEW_PENDING',
      urlOrPath:j.audioPath,masterAudioPath:j.masterAudioPath,contentHash:x.audioSha256,masterContentHash:x.masterSha256,
      cacheKey:raw.cacheKey,qcStatus:'PASS',qc:{pass:true,master:x.masterQc,optimized:x.mp3Qc},usedByItems:j.users,
      generatedAt:new Date().toISOString(),provenance:{feature:'DUDUQ_PHYSICAL_ASSET_FACTORY_EXECUTION_V11_2B',canonicalKey:j.canonicalKey}};
    const priorIndex=registry.entries.findIndex(e=>e.audioId===j.audioId);
    if(priorIndex>=0) registry.entries[priorIndex]=entry; else registry.entries.push(entry);
    j.status='GENERATED_QC_PASS';j.path=j.audioPath;j.contentHash=x.audioSha256;j.qc={pass:true,master:x.masterQc,optimized:x.mp3Qc};
    for(const id of j.requirementIds)bindings[id]={audioId:j.audioId,path:j.audioPath,disposition:'GENERATED_QC_PASS',canonicalKey:j.canonicalKey};
  }
  registry.updatedAt=new Date().toISOString(); await save(registryPath,registry);
}
checkpoint.updatedAt=new Date().toISOString();checkpoint.jobs=jobs;checkpoint.bindings=bindings;
checkpoint.generated=jobs.filter(x=>x.status==='GENERATED_QC_PASS').length;checkpoint.pending=jobs.filter(x=>x.status!=='GENERATED_QC_PASS').length;
checkpoint.failures=jobs.filter(x=>x.status==='FAILED_QC').map(x=>({audioId:x.audioId,error:x.error}));
await save(priorPath,checkpoint);await save('content/english/production/v11-2b/audio-concept-binding-map.json',{schemaVersion:'duduq-v11-2b-audio-binding-map-v1',bindings,reused,updatedAt:new Date().toISOString()});
console.log(JSON.stringify({status:failure||checkpoint.pending?'PARTIAL':'PASS',canonical:audit.canonicalConceptCount,reused:reused.length,new:jobs.length,generated:checkpoint.generated,pending:checkpoint.pending,failure},null,2));
