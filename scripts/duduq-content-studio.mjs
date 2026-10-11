import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat, rename } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { contentHash, threeWayMerge } from './lib/content-studio-sync.mjs';
import { validateMatchingDraft, toMatchingRuntimePayload } from './lib/matching-authoring-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'artifacts', 'content-studio');
const DRAFTS = path.join(DATA, 'drafts');
const MEDIA_DIR = path.join(DATA, 'media');
const MEDIA_LIBRARY = path.join(DATA, 'media-library.json');
const PROJECTS_DIR = path.join(DATA, 'projects');
const PROJECT_REGISTRY = path.join(PROJECTS_DIR, 'registry.json');
const UI = path.join(ROOT, 'tools', 'content-studio');
const PORT = Number(process.env.DUDUQ_CONTENT_STUDIO_PORT || 4180);
const HOST = '127.0.0.1';
const TOKEN = crypto.randomBytes(24).toString('hex');
const MODULE_INDEX = path.join(ROOT, 'content/english/master/modules-index.json');
const QUESTION_SOURCE = path.join(ROOT, 'content/english/year-1/module-01/questions.json');
const MEDIA_SOURCE = path.join(ROOT, 'content/english/media/media-registry.json');
const AUDIO_SOURCE = path.join(ROOT, 'content/english/audio/audio-registry.json');
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2' };
const editableModules = new Set(['Y1M01']);
const MECHANIC_REGISTRY = path.join(ROOT, 'content/mechanics/canonical-mechanics-registry.json');
const MATCHING_PREVIEW_TICKETS = new Map();

const json = async file => JSON.parse(await readFile(file, 'utf8'));
async function mechanicsForStudio(){
  const registry=await json(MECHANIC_REGISTRY);
  return {
    schemaVersion:registry.schemaVersion,
    catalogVersion:registry.registryId,
    sourceOfTruth:'content/mechanics/canonical-mechanics-registry.json',
    mechanics:Object.values(registry.mechanics||{}).filter(mechanic=>mechanic.status==='PRODUCTION_CANONICAL_LOCKED').map(mechanic=>({
      id:mechanic.mechanicId,
      name:mechanic.displayName,
      version:mechanic.currentVersion,
      homologationStatus:mechanic.status,
      route:mechanic.runtimeRoute,
      contract:mechanic.contentContract,
      schemaPath:mechanic.schemaPath,
      mediaCapabilities:mechanic.mediaCapabilities,
      answerTypes:mechanic.answerTypes,
      alternativeCount:mechanic.alternativeCount,
      source:mechanic.canonicalCandidateSource,
      goldMasterSource:mechanic.goldMasterSource,
      authoringLifecycle:{
        registration:'REGISTERED',
        adapter:mechanic.authoringAdapter?'AUTHORING_ADAPTER_PENDING_HUMAN_REVIEW':'NOT_AVAILABLE',
        preview:'PENDING_HUMAN_REVIEW',
        humanQa:'PENDING_HUMAN_REVIEW',
        approval:mechanic.secondHomologation==='APPROVED'?'APPROVED':'NOT_APPROVED'
      },
      authoringAvailable:false,
      authoringAvailableForQA:false,
      humanApprovalRequired:true,
      blockingReason:mechanic.status==='HUMAN_REVIEW_REQUIRED'?'Implementação ou variante exige revisão humana antes de autoria.':'Segunda homologação humana ainda não foi concedida.'
    }))
  };
}
const send = (res, status, value, headers={}) => { const body=typeof value==='string'?value:JSON.stringify(value); res.writeHead(status, {'content-type':typeof value==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8','cache-control':'no-store',...headers}); res.end(body); };
const cookieValue = (req, name) => String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1);
const safeId = value => /^[A-Za-z0-9_-]{1,80}$/.test(String(value||''));
const draftDir = id => { if(!safeId(id)) throw Error('ID de rascunho inválido.'); return path.join(DRAFTS,id); };
const readBody = req => new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>16_000_000){reject(Error('Corpo maior que o limite de 16 MB.'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'));}catch{reject(Error('JSON inválido.'));}});req.on('error',reject);});
const revisionId = () => `${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomBytes(4).toString('hex')}`;
async function writeAtomic(file, data){await mkdir(path.dirname(file),{recursive:true});const temp=`${file}.${crypto.randomBytes(6).toString('hex')}.tmp`;await writeFile(temp,data,{flag:'wx'});await rename(temp,file);}
async function loadDraft(id){return json(path.join(draftDir(id),'draft.json'));}
async function loadMediaLibrary(){try{return await json(MEDIA_LIBRARY);}catch{return{version:1,entries:[]};}}
const seedProjects=()=>({version:1,projects:[{projectId:'duduq-english-y1-y5',slug:'duduq-english-y1-y5',name:'DUDUQ Língua Inglesa',description:'Projeto existente de Inglês, 1º ao 5º ano.',subject:'Língua Inglesa',stage:'Ensino Fundamental I',years:[1,2,3,4,5],primaryLanguage:'en',additionalLanguages:['pt-BR'],curriculum:{authority:'DUDUQ English Curricular Master V3',path:'docs/master/DUDUQ_English_Master_Curricular_Pedagogico_V3.md',machinePath:'content/english/master/curricular-master-v3.json'},source:{mode:'LEGACY_REFERENCE',moduleCatalog:'content/english/master/modules-index.json',editableQuestionContracts:['content/english/year-1/module-01/questions.json']},mechanicPins:{},publication:{enabled:false,status:'DISABLED'},status:'ACTIVE',revision:1,createdAt:'2026-10-09T00:00:00.000Z'}]});
async function loadProjects(){await mkdir(PROJECTS_DIR,{recursive:true});try{return await json(PROJECT_REGISTRY);}catch{const seeded=seedProjects();await writeAtomic(PROJECT_REGISTRY,JSON.stringify(seeded,null,2));return seeded;}}
function isolatedProjectRoot(project){
  if(project?.source?.mode!=='ISOLATED_DRAFT'||!safeId(project.projectId))throw Error('Operação disponível apenas em projeto isolado ativo.');
  const expected=`artifacts/content-studio/projects/${project.projectId}`;
  if(project.source.workspacePath!==expected)throw Error('O caminho do projeto não corresponde ao registro isolado.');
  return path.join(DATA,'projects',project.projectId);
}
async function isolatedProject(projectId){const registry=await loadProjects();const project=registry.projects.find(p=>p.projectId===projectId);if(!project)throw Error('Projeto não encontrado.');isolatedProjectRoot(project);if(project.status==='ARCHIVED')throw Error('Projeto arquivado; restaure-o antes de editar.');return project;}
const projectModulesDir=project=>path.join(isolatedProjectRoot(project),'modules');
const validModuleId=value=>/^[A-Za-z0-9_-]{1,80}$/.test(String(value||''));
async function listProjectModules(project){const dir=projectModulesDir(project);await mkdir(dir,{recursive:true});const modules=[];for(const name of await readdir(dir)){if(!name.endsWith('.json')||name.endsWith('.revision.json'))continue;try{const data=await json(path.join(dir,name));modules.push({moduleId:data.moduleId,title:data.title,year:data.year,status:data.status,questionCount:data.questions?.length||0,revision:data.revision,updatedAt:data.updatedAt});}catch{}}
  return modules.sort((a,b)=>a.year-b.year||a.moduleId.localeCompare(b.moduleId));}
function moduleFilename(project,moduleId){if(!validModuleId(moduleId))throw Error('ID do módulo inválido.');return path.join(projectModulesDir(project),`${moduleId}.json`);}
async function persistIsolatedModule(project,module){const file=moduleFilename(project,module.moduleId);await writeAtomic(file,JSON.stringify(module,null,2));const revisionFile=path.join(projectModulesDir(project),'revisions',`${module.moduleId}.${module.revision}.json`);await writeAtomic(revisionFile,JSON.stringify(module,null,2));return module;}
async function allowedMatchingImageKeys(){const source=await readFile(path.join(ROOT,'core/duduq-assets.js'),'utf8');const catalog=source.match(/const INTELLIGENT_IMAGE_CATALOG\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);if(!catalog)throw Error('Catálogo seguro de imagens não pôde ser lido.');return new Set([...catalog[1].matchAll(/\bkey\s*:\s*"([a-z0-9-]+)"/g)].map(match=>match[1]));}
async function loadMatchingModule(projectId,moduleId){const project=await isolatedProject(projectId);const module=await json(moduleFilename(project,moduleId));if(module.projectId!==projectId||module.moduleId!==moduleId)throw Error('A identidade do módulo não confere com o projeto.');return{project,module};}
async function questionRevisionRecords(project,moduleId,questionId){const dir=path.join(projectModulesDir(project),'revisions');const names=(await readdir(dir)).filter(name=>name.startsWith(`${moduleId}.`)&&name.endsWith('.json'));const records=[];for(const name of names){try{const snapshot=await json(path.join(dir,name));const question=snapshot.questions?.find(item=>item.questionId===questionId);if(question)records.push({revision:snapshot.revision,updatedAt:snapshot.updatedAt,question});}catch{}}return records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
async function requireMatchingPreviewReady(){const registry=await json(MECHANIC_REGISTRY);const mechanic=registry.mechanics.find(item=>item.id==='matching');if(mechanic?.authoringLifecycle?.adapter!=='AUTHORING_ADAPTER_READY'||mechanic?.authoringLifecycle?.preview!=='PREVIEW_VALIDATED')throw Error('Matching permanece bloqueado até o adapter e o preview real passarem pela validação.');return mechanic;}
function validateProjectInput(body, existing=[]){const errors=[];const name=String(body.name||'').trim().slice(0,100);const subject=String(body.subject||'').trim().slice(0,80);const stage=String(body.stage||'').trim().slice(0,80);const primaryLanguage=String(body.primaryLanguage||'pt-BR').trim().slice(0,16);const years=Array.isArray(body.years)?[...new Set(body.years.map(Number))].filter(n=>Number.isInteger(n)&&n>=1&&n<=12).sort((a,b)=>a-b):[];const slug=String(body.slug||name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).toLowerCase();if(!name)errors.push('Informe o nome do projeto.');if(!subject)errors.push('Informe a disciplina ou área.');if(!stage)errors.push('Informe a etapa escolar.');if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>60)errors.push('Use um slug de até 60 caracteres, com letras minúsculas, números e hífens.');if(existing.some(p=>p.slug===slug))errors.push('Este slug já está em uso.');if(!/^[A-Za-z0-9-]{2,16}$/.test(primaryLanguage))errors.push('Código de idioma inválido.');if(years.length===0)errors.push('Informe ao menos uma série entre 1 e 12.');return{errors,project:{slug,name,description:String(body.description||'').trim().slice(0,500),subject,stage,years,primaryLanguage,additionalLanguages:Array.isArray(body.additionalLanguages)?body.additionalLanguages.map(x=>String(x).slice(0,16)).slice(0,8):[]}};}
function detectMedia(buffer,kind){
  if(kind==='image'){
    if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return{ext:'png',mime:'image/png'};
    if(buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)return{ext:'jpg',mime:'image/jpeg'};
    if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return{ext:'webp',mime:'image/webp'};
    if(buffer.toString('ascii',0,6)==='GIF87a'||buffer.toString('ascii',0,6)==='GIF89a')return{ext:'gif',mime:'image/gif'};
    return null;
  }
  if(kind==='audio'){
    if(buffer.toString('ascii',0,3)==='ID3'||(buffer[0]===0xff&&(buffer[1]&0xe0)===0xe0))return{ext:'mp3',mime:'audio/mpeg'};
    if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WAVE')return{ext:'wav',mime:'audio/wav'};
  }
  return null;
}
async function readLimited(response,limit){const reader=response.body?.getReader();if(!reader)throw Error('Resposta remota sem corpo de arquivo.');const chunks=[];let size=0;while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('O arquivo remoto excede 5 MB.');}chunks.push(Buffer.from(value));}return Buffer.concat(chunks,size);}
async function storeMedia(buffer,kind,source={}){
  if(!['image','audio'].includes(kind))throw Error('Selecione imagem ou áudio.');
  if(!buffer.length||buffer.length>5_000_000)throw Error('O arquivo deve ter até 5 MB.');
  const detected=detectMedia(buffer,kind);if(!detected)throw Error('Formato ou conteúdo do arquivo inválido.');
  const sha256=crypto.createHash('sha256').update(buffer).digest('hex');const library=await loadMediaLibrary();const existingIndex=library.entries.findIndex(x=>x.sha256===sha256&&x.kind===kind);if(existingIndex>=0){const existing=library.entries[existingIndex];const origin={sourceType:source.sourceType||'UNKNOWN',sourceUrl:source.sourceUrl||null,originalName:source.originalName||null,recordedAt:new Date().toISOString()};const origins=[...(existing.origins||[]),origin].filter((entry,index,all)=>all.findIndex(item=>item.sourceType===entry.sourceType&&item.sourceUrl===entry.sourceUrl&&item.originalName===entry.originalName)===index);library.entries[existingIndex]={...existing,origins};await writeAtomic(MEDIA_LIBRARY,JSON.stringify(library,null,2));return library.entries[existingIndex];}
  const id=`CS-${kind==='image'?'IMG':'AUD'}-${crypto.randomBytes(7).toString('hex').toUpperCase()}`;const filename=`${id}.${detected.ext}`;
  await mkdir(MEDIA_DIR,{recursive:true});await writeAtomic(path.join(MEDIA_DIR,filename),buffer);
  const entry={assetId:id,mediaId:kind==='image'?id:null,audioId:kind==='audio'?id:null,kind,filename,storedName:filename,mime:detected.mime,size:buffer.length,sha256,localPath:`/studio-media/${filename}`,createdAt:new Date().toISOString(),reviewStatus:'DRAFT_ONLY',origins:[{sourceType:source.sourceType||'UNKNOWN',sourceUrl:source.sourceUrl||null,originalName:source.originalName||null,recordedAt:new Date().toISOString()}],...source};
  library.entries.push(entry);await writeAtomic(MEDIA_LIBRARY,JSON.stringify(library,null,2));return entry;
}
function githubRawUrl(input){let url;try{url=new URL(input);}catch{throw Error('URL inválida.');}if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Use uma URL HTTPS pública sem credenciais ou porta personalizada.');
  if(url.hostname==='github.com'){
    const parts=url.pathname.split('/').filter(Boolean);const blobAt=parts.indexOf('blob');const rawAt=parts.indexOf('raw');const marker=blobAt>=0?blobAt:rawAt;
    if(parts.length<4||marker!==2)throw Error('Link GitHub não reconhecido. Use link /blob/branch/caminho ou Raw.');
    return new URL(`https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join('/')}${url.search}`);
  }
  if(url.hostname!=='raw.githubusercontent.com')throw Error('Por segurança, somente raw.githubusercontent.com e links GitHub de arquivo são aceitos.');return url;
}
function validateQuestions(data, baseline){
  const errors=[]; if(data?.moduleId!=='Y1M01')errors.push('O contrato deve permanecer em Y1M01.');
  if(!Array.isArray(data?.items)||data.items.length!==20)errors.push('Y1M01 exige exatamente 20 questões para o preview existente.');
  const ids=(data?.items||[]).map(q=>q.item_id); if(new Set(ids).size!==ids.length)errors.push('Há IDs de questão duplicados.');
  const baselineById=new Map((baseline?.items||[]).map(q=>[q.item_id,JSON.stringify(q)]));
  for(const q of data?.items||[]){
    if(baselineById.get(q.item_id)===JSON.stringify(q))continue;
    if(!q.item_id)errors.push('Questão sem item_id.');
    if(Array.isArray(q.options)){
      const optionIds=q.options.map(o=>o.optionId);
      if(new Set(optionIds).size!==optionIds.length)errors.push(`${q.item_id}: optionId duplicado.`);
      if(q.dragDropContract?.mode==='multi-match'){
        const mapping=q.dragDropContract.mapping||[], bindings=q.audioBindings||[];
        const tuple=b=>`${b.itemId}|${b.targetId}|${b.answerKey}`;
        const bindingTuples=new Set(bindings.map(tuple));
        const optionTuples=new Set(q.options.map(o=>`${o.itemId}|${o.targetId}|${o.answerKey}`));
        const mappingTuples=mapping.map(tuple);
        if(mapping.length!==q.dragDropContract.draggableCount||mapping.length!==q.dragDropContract.destinationCount||mapping.length!==4)errors.push(`${q.item_id}: estrutura multi-match exige quatro relações completas.`);
        if(new Set(mappingTuples).size!==mappingTuples.length||mappingTuples.some(x=>!bindingTuples.has(x)||!optionTuples.has(x)))errors.push(`${q.item_id}: mapping não resolve em audioBindings e options.`);
        const keyParts=String(q.answerKey||'').split('+').filter(Boolean).sort();
        const mappingKeys=mapping.map(x=>x.answerKey).sort();
        if(keyParts.length!==mappingKeys.length||keyParts.some((x,i)=>x!==mappingKeys[i]))errors.push(`${q.item_id}: answerKey agregado diverge do mapping multi-match.`);
      }else if(q.answerKey&&!q.options.some(o=>o.answerKey===q.answerKey||o.optionId===q.answerKey))errors.push(`${q.item_id}: answerKey não resolve em options.`);
    }
  }
  return errors;
}
async function createDraft(){const source=await json(QUESTION_SOURCE);const id=`y1m01-${crypto.randomBytes(8).toString('hex')}`;const revision=revisionId();const envelope={draftId:id,moduleId:'Y1M01',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),revision,baseSha256:contentHash(source),sourceBaseData:source,data:source,workflowStatus:'DRAFT'};const dir=draftDir(id);await mkdir(path.join(dir,'revisions'),{recursive:true});await writeAtomic(path.join(dir,'draft.json'),JSON.stringify(envelope,null,2));await writeAtomic(path.join(dir,'revisions',`${revision}.json`),JSON.stringify(envelope,null,2));return envelope;}
async function draftSourceBase(id,draft){if(draft.sourceBaseData)return draft.sourceBaseData;const dir=path.join(draftDir(id),'revisions');const names=(await readdir(dir)).filter(n=>n.endsWith('.json')).sort();for(const name of names){const rev=await json(path.join(dir,name));if(rev.baseSha256===draft.baseSha256)return rev.data;}return draft.data;}
async function sourceStatus(id,draft){const current=await json(QUESTION_SOURCE);const sha=contentHash(current);return{changed:sha!==draft.baseSha256,baseSha256:draft.baseSha256,currentSha256:sha,workflowStatus:draft.workflowStatus||'DRAFT'};}
const questionById=(draft,id)=>draft.data.items.find(q=>q.item_id===id);
async function validateQuestionDraft(draft,itemId){
  const q=questionById(draft,itemId);if(!q)return{ok:false,errors:['Questão não encontrada no rascunho.']};
  const errors=[];const mechanic=q.runtimeMechanic||q.mecanica_preferida||'';
  if(!q.instruction?.instructionEn?.trim()||!q.instruction?.instructionPt?.trim())errors.push('Instrução EN/PT incompleta.');
  const options=q.options||[];
  if(mechanic==='target-shooter'){
    if(options.length!==4)errors.push('Target Shooter exige quatro opções.');
    if(new Set(options.map(o=>o.optionId)).size!==options.length)errors.push('IDs de opção ausentes ou duplicados.');
    if(!options.some(o=>o.optionId===q.answerKey))errors.push('answerKey não resolve em optionId.');
  }
  if(mechanic==='bubble-pop'){
    if(!options.some(o=>o.correct&&o.optionId===q.answerKey))errors.push('A alternativa correta não coincide com answerKey.');
    if((q.bubbleDistractorPool||[]).length<6)errors.push('Bubble Pop requer pelo menos seis distratores registrados.');
  }
  if(mechanic==='drag-drop-multimedia'){
    const contract=q.dragDropContract,mapping=contract?.mapping||[],bindings=q.audioBindings||[],destinations=contract?.mode==='multi-match'?mapping:q.mediaBindings||[];
    if(destinations.length!==4)errors.push('Drag & Drop requer quatro destinos para esta questão.');
    if(contract?.mode==='multi-match'){
      const tuple=x=>`${x.itemId}|${x.targetId}|${x.answerKey}`;const optionTuples=new Set(options.map(tuple));const bindingTuples=new Set(bindings.map(tuple));
      if(mapping.length!==4||new Set(mapping.map(tuple)).size!==4||mapping.some(x=>!optionTuples.has(tuple(x))||!bindingTuples.has(tuple(x))))errors.push('Mapping multi-match não resolve em quatro relações distintas.');
      const aggregate=String(q.answerKey||'').split('+').filter(Boolean).sort();const mapped=mapping.map(x=>x.answerKey).sort();if(aggregate.length!==mapped.length||aggregate.some((x,i)=>x!==mapped[i]))errors.push('answerKey agregado diverge do mapping.');
    }else if(!['single-item-recognition',undefined].includes(contract?.mode)||!q.answerKey)errors.push('Contrato single-item sem modo ou gabarito válido.');
  }
  const [canonicalMedia,local,canonicalAudio,audioRegistry,canonical]=await Promise.all([json(MEDIA_SOURCE),loadMediaLibrary(),json(path.join(ROOT,'duduq-audio/manifests/AUDIO_MANIFEST.json')),json(AUDIO_SOURCE),json(QUESTION_SOURCE)]);
  const knownMedia=new Set([...(canonicalMedia.entries||[]).map(x=>x.mediaId),...local.entries.filter(x=>x.kind==='image').map(x=>x.mediaId)]);
  const mediaIds=[q.image_ref,...(q.mediaBindings||[]).map(x=>x.mediaId),...options.map(x=>x.mediaId),...(q.dragDropContract?.mapping||[]).map(x=>x.mediaId)].filter(Boolean);
  for(const id of new Set(mediaIds))if(!knownMedia.has(id))errors.push(`Imagem ${id} não está registrada na biblioteca do rascunho.`);
  const knownAudio=new Set([...(canonicalAudio.items||[]).flatMap(x=>[x.id,x.audioId]),...(audioRegistry.entries||[]).flatMap(x=>[x.audioId,x.id]),...local.entries.filter(x=>x.kind==='audio').flatMap(x=>[x.audioId,x.audioId])].filter(Boolean));
  const audioIds=[q.audio_ref,q.contentAudioId,...(q.audioBindings||[]).map(x=>x.audioId),q.instruction?.instructionAudioEnId,q.instruction?.instructionAudioPtId].filter(Boolean);
  for(const id of new Set(audioIds))if(!knownAudio.has(id))errors.push(`Áudio ${id} não está registrado.`);
  const sourceSha=contentHash(canonical);if(sourceSha!==draft.baseSha256)errors.push('Contrato canônico mudou; sincronize antes de validar.');
  return{ok:errors.length===0,errors,questionId:itemId,questionHash:contentHash(q),draftRevision:draft.revision,sourceSha256:sourceSha,mechanic};
}
function ensureWorkflow(draft){draft.questionWorkflow ||= {};return draft.questionWorkflow;}
function recordFor(draft,itemId){return ensureWorkflow(draft)[itemId]||null;}
function effectiveStatus(draft,itemId){const q=questionById(draft,itemId),record=recordFor(draft,itemId);if(!q)return'FAILED';if(!record)return'DRAFT';if(record.itemHash!==contentHash(q))return'DRAFT';return record.status||'DRAFT';}
async function persistDraft(draft){const revision=revisionId();const now=new Date().toISOString();const next={...draft,revision,updatedAt:now};const dir=draftDir(draft.draftId);await writeAtomic(path.join(dir,'draft.json'),JSON.stringify(next,null,2));await writeAtomic(path.join(dir,'revisions',`${revision}.json`),JSON.stringify(next,null,2));return next;}
async function listDrafts(){await mkdir(DRAFTS,{recursive:true});const out=[];for(const name of await readdir(DRAFTS)){try{const d=await loadDraft(name);out.push({draftId:d.draftId,moduleId:d.moduleId,updatedAt:d.updatedAt,revision:d.revision});}catch{}}return out.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
function referencedQuestionMedia(q){const ids=new Set();for(const id of [q.image_ref,q.audio_ref,q.contentAudioId,...(q.mediaBindings||[]).map(x=>x.mediaId),...(q.options||[]).map(x=>x.mediaId),...(q.audioBindings||[]).flatMap(x=>[x.mediaId,x.audioId]),q.instruction?.instructionAudioEnId,q.instruction?.instructionAudioPtId])if(id)ids.add(id);return ids;}
function referencedDraftMedia(draft){const ids=new Set();for(const q of draft.data.items||[])for(const id of referencedQuestionMedia(q))ids.add(id);return ids;}
function changedPaths(before,after,path=''){if(JSON.stringify(before)===JSON.stringify(after))return[];if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after))return[...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(k=>changedPaths(before[k],after[k],`${path}/${k}`));return[path||'/'];}
async function previewRegistry(req,kind){const draftId=cookieValue(req,'duduq-preview-draft');const source=kind==='image'?MEDIA_SOURCE:path.join(ROOT,'duduq-audio/manifests/AUDIO_MANIFEST.json');const registry=await json(source);if(!draftId)return registry;try{const draft=await loadDraft(decodeURIComponent(draftId));const ids=referencedDraftMedia(draft);const library=await loadMediaLibrary();const entries=library.entries.filter(e=>ids.has(e.mediaId||e.audioId));if(kind==='image')return{...registry,entries:[...(registry.entries||[]),...entries.filter(e=>e.kind==='image').map(e=>({mediaId:e.mediaId,status:'APPROVED',kind:'image',altText:e.filename,assets:[{path:`studio-media/${e.storedName}`,sha256:e.sha256}]}))]};return{...registry,items:[...(registry.items||[]),...entries.filter(e=>e.kind==='audio'&&e.filename.endsWith('.mp3')).map(e=>({id:e.audioId,audioId:e.audioId,status:'APPROVED',audioPath:`studio-media/${e.storedName}`,locale:'en',transcript:e.filename,voiceVersion:'DRAFT_PREVIEW'}))]};}catch{return registry;}}
async function serveStatic(req,res,url){
  let relative=decodeURIComponent(url.pathname).replace(/^\/+/, ''); if(!relative)relative='tools/content-studio/index.html';
  if(relative==='studio'||relative==='studio/')relative='tools/content-studio/index.html';
  const first=relative.split('/')[0];
  if(!['tools','content','core','play','engine','runtime','assets','styles','fonts','shared','components','test','studio-media','duduq-audio'].includes(first)){send(res,404,'Not found');return;}
  if(relative.split('/').some(s=>s==='..'||s.startsWith('.'))||relative.includes('\\')){send(res,400,'Invalid path');return;}
  if(relative.startsWith('studio-media/')){const name=relative.slice('studio-media/'.length);if(!/^[A-Za-z0-9_-]{1,80}\.(?:png|jpe?g|webp|gif|mp3|wav)$/i.test(name)){send(res,404,'Not found');return;}try{const library=await loadMediaLibrary();if(!library.entries.some(e=>e.storedName===name)){send(res,404,'Not found');return;}const file=path.join(MEDIA_DIR,name);await stat(file);res.writeHead(200,{'content-type':MIME[path.extname(name).toLowerCase()]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});createReadStream(file).pipe(res);}catch{send(res,404,'Not found');}return;}
  if(relative==='content/english/media/media-registry.json'){try{send(res,200,await previewRegistry(req,'image'));}catch{send(res,500,{error:'Registro de mídia indisponível.'});}return;}
  if(relative==='duduq-audio/manifests/AUDIO_MANIFEST.json'){try{send(res,200,await previewRegistry(req,'audio'));}catch{send(res,500,{error:'Manifesto de áudio indisponível.'});}return;}
  if(relative.startsWith('content/english/year-1/module-01/questions.json')){
    const id=cookieValue(req,'duduq-preview-draft');if(id){try{const draft=await loadDraft(decodeURIComponent(id));send(res,200,draft.data);return;}catch{}}
  }
  const runtimePrefix='runtime/gold-masters/target-shooter/';
  let file=relative.startsWith(runtimePrefix)
    ? path.resolve(ROOT,'test/target-shooter/gold-master-clean-v2',relative.slice(runtimePrefix.length))
    : path.resolve(ROOT,relative);
  if(!file.startsWith(ROOT+path.sep)){send(res,403,'Forbidden');return;}
  try{let s=await stat(file);if(s.isDirectory()){file=path.join(file,'index.html');s=await stat(file);}if(!s.isFile()){send(res,404,'Not found');return;}res.writeHead(200,{'content-type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});createReadStream(file).pipe(res);}catch{send(res,404,'Not found');}
}
const server=createServer(async(req,res)=>{
  const rawRequestPath=String(req.url||'').split('?',1)[0];
  let decodedRequestPath=rawRequestPath;
  try{decodedRequestPath=decodeURIComponent(rawRequestPath);}catch{send(res,400,{error:'Caminho de requisição inválido.'});return;}
  if(decodedRequestPath.split(/[\\/]/).some(segment=>segment==='.'||segment==='..')){send(res,400,{error:'Travessia de diretório não permitida.'});return;}
  const url=new URL(req.url,`http://${HOST}:${PORT}`);const origin=`http://${req.headers.host}`;
  if(!['127.0.0.1','localhost'].includes((req.headers.host||'').split(':')[0])){send(res,403,'Local access only');return;}
  if(req.method==='GET'&&url.pathname.startsWith('/api/')){
    if(url.pathname==='/api/session'){send(res,200,{token:TOKEN,host:HOST,port:PORT});return;}
    if(url.pathname==='/api/health'){send(res,200,{status:'LOCAL_ONLY',draftPersistence:'FILESYSTEM',productionWrites:false});return;}
    if(url.pathname==='/api/projects'){try{const registry=await loadProjects();const projects=await Promise.all(registry.projects.map(async p=>{const modules=p.source?.mode==='ISOLATED_DRAFT'?await listProjectModules(p):[];const metrics=p.source?.mode==='LEGACY_REFERENCE'?{modules:30,editableModules:1,questions:20}:p.source?.mode==='ISOLATED_DRAFT'?{modules:modules.length,editableModules:0,questions:modules.reduce((n,m)=>n+(m.questionCount||0),0)}:{modules:0,editableModules:0,questions:0};return{...p,metrics};}));send(res,200,{version:registry.version,projects});}catch(e){send(res,500,{error:e.message});}return;}
    if(url.pathname==='/api/mechanics'){try{send(res,200,await mechanicsForStudio());}catch(e){send(res,500,{error:e.message});}return;}
    if(url.pathname==='/api/matching/image-assets'){try{const keys=await allowedMatchingImageKeys();send(res,200,{assets:[...keys].map(key=>({imageAssetKey:key,label:key.replace(/-/g,' ')}))});}catch(e){send(res,500,{error:'Catálogo de imagens indisponível.'});}return;}
    if(url.pathname==='/api/matching-preview/original-regression'){
      try{const question=await json(path.join(ROOT,'test/matching/multiproject-candidate-v1/fixtures/original-regression.json'));const allowed=await allowedMatchingImageKeys();const check=validateMatchingDraft(question,allowed);if(!check.ok){send(res,422,{error:'Fixture de regressão Matching inválido.',errors:check.errors});return;}const module={moduleId:'original-gold-master-fixture',title:'Baseline DOG/CAT/RABBIT/FISH'};const project={projectId:'matching-baseline-qa',name:'Matching baseline QA',subject:'Matching regression'};send(res,200,{project,module,questionId:question.questionId,payload:toMatchingRuntimePayload(question,module,project)});}catch(e){send(res,500,{error:'Fixture de regressão indisponível.'});}return;
    }
    const matchingPreviewData=url.pathname.match(/^\/api\/matching-preview\/([a-f0-9]{48})$/);
    if(matchingPreviewData){try{const ticket=MATCHING_PREVIEW_TICKETS.get(matchingPreviewData[1]);if(!ticket||ticket.expiresAt<Date.now()){MATCHING_PREVIEW_TICKETS.delete(matchingPreviewData[1]);send(res,404,{error:'Este link de preview expirou. Gere outro pelo Studio.'});return;}const{project,module}=await loadMatchingModule(ticket.projectId,ticket.moduleId);const question=module.questions.find(item=>item.questionId===ticket.questionId);if(!question||question.mechanicId!=='matching'){send(res,404,{error:'Questão de preview não encontrada.'});return;}const check=validateMatchingDraft(question,new Set(ticket.allowedImageAssetKeys));if(!check.ok){send(res,422,{error:'O rascunho deixou de ser válido.',errors:check.errors});return;}send(res,200,{project:{projectId:project.projectId,name:project.name,subject:project.subject},module:{moduleId:module.moduleId,title:module.title},questionId:question.questionId,payload:toMatchingRuntimePayload(question,module,project)});}catch(e){send(res,404,{error:e.message});}return;}
    const projectModulesRoute=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]+)\/modules$/);
    if(projectModulesRoute){try{const project=await isolatedProject(projectModulesRoute[1]);send(res,200,{projectId:project.projectId,modules:await listProjectModules(project)});}catch(e){send(res,404,{error:e.message});}return;}
    const projectModuleRoute=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]+)\/modules\/([A-Za-z0-9_-]+)$/);
    if(projectModuleRoute){try{const project=await isolatedProject(projectModuleRoute[1]);const module=await json(moduleFilename(project,projectModuleRoute[2]));send(res,200,{module});}catch(e){send(res,404,{error:e.message});}return;}
    const questionRevisionRoute=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]+)\/modules\/([A-Za-z0-9_-]+)\/questions\/([A-Za-z0-9_-]+)\/revisions$/);
    if(questionRevisionRoute){try{const project=await isolatedProject(questionRevisionRoute[1]);const records=await questionRevisionRecords(project,questionRevisionRoute[2],questionRevisionRoute[3]);send(res,200,{revisions:records.map(({revision,updatedAt,question})=>({revision,updatedAt,questionRevision:question.revision}))});}catch(e){send(res,404,{error:e.message});}return;}
    if(url.pathname==='/api/catalog'){
      try{const [catalog,v3]=await Promise.all([json(MODULE_INDEX),json(path.join(ROOT,'content/english/master/curricular-master-v3.json'))]);const modules=catalog.modules.map(m=>({moduleId:m.module_id,year:m.ano,moduleNumber:m.modulo,title:m.titulo,goal:m.objetivo_funcional,editable:editableModules.has(m.module_id),status:editableModules.has(m.module_id)?'DRAFT_EDITING_SUPPORTED':'BROWSE_ONLY_CONTRACT_ADAPTER_REQUIRED',curriculum:v3.modules?.find(x=>x.moduleId===m.module_id)||null}));send(res,200,{modules,editableModules:[...editableModules]});}catch(e){send(res,500,{error:e.message});}return;
    }
    if(url.pathname==='/api/drafts'){send(res,200,await listDrafts());return;}
    if(url.pathname==='/api/media-library'){try{const [images,local]=await Promise.all([json(MEDIA_SOURCE),loadMediaLibrary()]);const imageEntries=(images.entries||[]).map(e=>({...e,kind:'image'}));const localEntries=local.entries.map(e=>e.kind==='image'?{...e,status:'APPROVED',assets:[{path:`studio-media/${e.storedName}`,sha256:e.sha256}]}:{...e,status:'APPROVED',assets:[{path:`studio-media/${e.storedName}`}],urlOrPath:`studio-media/${e.storedName}`});send(res,200,{entries:[...imageEntries,...localEntries]});}catch(e){send(res,500,{error:e.message});}return;}
    const match=url.pathname.match(/^\/api\/modules\/([A-Z0-9]+M[0-9]+)\/questions$/);if(match){if(!editableModules.has(match[1])){send(res,409,{error:'Este módulo está em modo de consulta. Seu contrato ainda não possui adaptador seguro de edição.'});return;}let draftId=url.searchParams.get('draftId');try{if(!draftId){const d=await createDraft();draftId=d.draftId;}let d=await loadDraft(draftId);const [registry,audioRegistry,library,source]=await Promise.all([json(MEDIA_SOURCE),json(AUDIO_SOURCE),loadMediaLibrary(),sourceStatus(draftId,d)]);const media=[...(registry.entries||[]),...library.entries.filter(x=>x.kind==='image').map(e=>({...e,status:'APPROVED',assets:[{path:`studio-media/${e.storedName}`,sha256:e.sha256}]}))];const audio=[...(audioRegistry.entries||[]),...library.entries.filter(x=>x.kind==='audio').map(e=>({...e,status:'APPROVED',assets:[{path:`studio-media/${e.storedName}`}]}))];const workflow=Object.fromEntries((d.data.items||[]).map(q=>[q.item_id,{status:effectiveStatus(d,q.item_id),record:recordFor(d,q.item_id)}]));send(res,200,{draft:d,media,audio,source,workflow});}catch(e){send(res,500,{error:e.message});}return;}
    const sourceMatch=url.pathname.match(/^\/api\/drafts\/([A-Za-z0-9_-]+)\/source-status$/);if(sourceMatch){try{const d=await loadDraft(sourceMatch[1]);send(res,200,await sourceStatus(sourceMatch[1],d));}catch(e){send(res,404,{error:e.message});}return;}
    const workflowGet=url.pathname.match(/^\/api\/drafts\/([A-Za-z0-9_-]+)\/workflow$/);if(workflowGet){try{const d=await loadDraft(workflowGet[1]);send(res,200,Object.fromEntries((d.data.items||[]).map(q=>[q.item_id,{status:effectiveStatus(d,q.item_id),record:recordFor(d,q.item_id)}])));}catch(e){send(res,404,{error:e.message});}return;}
    const hist=url.pathname.match(/^\/api\/drafts\/([A-Za-z0-9_-]+)\/revisions$/);if(hist){try{const names=await readdir(path.join(draftDir(hist[1]),'revisions'));const items=await Promise.all(names.filter(n=>n.endsWith('.json')).map(n=>json(path.join(draftDir(hist[1]),'revisions',n))));send(res,200,items.map(x=>({revision:x.revision,updatedAt:x.updatedAt})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));}catch(e){send(res,404,{error:e.message});}return;}
  }
  if(req.method==='POST'&&url.pathname==='/api/projects'){
    if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida. Recarregue o Content Studio.'});return;}
    try{const body=await readBody(req);const registry=await loadProjects();const {errors,project}=validateProjectInput(body,registry.projects);if(errors.length){send(res,422,{errors});return;}const projectId=`project-${project.slug}`;if(registry.projects.some(p=>p.projectId===projectId)){send(res,409,{error:'O identificador deste projeto já existe.'});return;}const now=new Date().toISOString();const record={projectId,...project,curriculum:null,source:{mode:'ISOLATED_DRAFT',workspacePath:`artifacts/content-studio/projects/${projectId}`,inheritsFrom:null},mechanicPins:{},publication:{enabled:false,status:'DISABLED',target:null},status:'DRAFT',revision:1,createdAt:now,updatedAt:now};const isolated=path.join(PROJECTS_DIR,projectId);for(const folder of ['curriculum','modules','questions','media','feedback','manifests'])await mkdir(path.join(isolated,folder),{recursive:true});registry.projects.push(record);await writeAtomic(PROJECT_REGISTRY,JSON.stringify(registry,null,2));send(res,201,{project:record});}catch(e){send(res,400,{error:e.message});}return;
  }
  const projectRoute=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]+)$/);
  if(req.method==='PATCH'&&projectRoute){
    if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida. Recarregue o Content Studio.'});return;}
    try{const body=await readBody(req);const registry=await loadProjects();const index=registry.projects.findIndex(p=>p.projectId===projectRoute[1]);if(index<0){send(res,404,{error:'Projeto não encontrado.'});return;}const current=registry.projects[index];if(body.baseRevision!==current.revision){send(res,409,{error:'Este projeto mudou em outra sessão. Recarregue antes de salvar.',currentRevision:current.revision});return;}const allowed=['name','description','subject','stage','years','primaryLanguage','additionalLanguages','status'];const input={...current,...Object.fromEntries(allowed.filter(k=>Object.hasOwn(body,k)).map(k=>[k,body[k]])),slug:current.slug};const {errors,project}=validateProjectInput(input,registry.projects.filter(p=>p.projectId!==current.projectId));if(errors.length){send(res,422,{errors});return;}const status=body.status===undefined?current.status:body.status;if(!['ACTIVE','DRAFT','ARCHIVED'].includes(status)){send(res,422,{error:'Estado do projeto inválido.'});return;}const updated={...current,...project,status,revision:current.revision+1,updatedAt:new Date().toISOString()};registry.projects[index]=updated;await writeAtomic(PROJECT_REGISTRY,JSON.stringify(registry,null,2));send(res,200,{project:updated});}catch(e){send(res,400,{error:e.message});}return;
  }
  if(req.method==='POST'&&url.pathname==='/api/drafts'){
    if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida. Recarregue o Content Studio.'});return;}
    try{const body=await readBody(req);if(body.action==='create'){const d=await createDraft();send(res,201,{draft:d});return;}send(res,400,{error:'Ação não suportada.'});}catch(e){send(res,400,{error:e.message});}return;
  }
  const workflowRoute=url.pathname.match(/^\/api\/drafts\/([A-Za-z0-9_-]+)\/(validate-question|test-evidence|approve-question|stage-promotion)$/);
  if(req.method==='POST'&&workflowRoute){if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida.'});return;}try{
    const id=workflowRoute[1],action=workflowRoute[2],draft=await loadDraft(id),body=await readBody(req),q=questionById(draft,body.itemId);if(!q){send(res,404,{error:'Questão não encontrada.'});return;}if(body.baseRevision!==draft.revision){send(res,409,{error:'O rascunho mudou. Recarregue antes de continuar.'});return;}
    const itemHash=contentHash(q);const workflow=ensureWorkflow(draft);let record=workflow[body.itemId]||{};
    if(action==='validate-question'){
      const validation=await validateQuestionDraft(draft,body.itemId);if(!validation.ok){send(res,422,{validation});return;}record={...record,itemHash,status:'READY_FOR_TEST',validation,testEvidence:null,approval:null,updatedAt:new Date().toISOString()};workflow[body.itemId]=record;const saved=await persistDraft(draft);send(res,200,{draft:saved,workflowStatus:'READY_FOR_TEST',validation});return;
    }
    if(record.itemHash!==itemHash){send(res,409,{error:'O conteúdo mudou desde a última validação; valide novamente.'});return;}
    if(action==='test-evidence'){
      const required=['previewOpened','contentLoaded','correctResponse','incorrectResponse','feedback','continue','cleanup'];const missing=required.filter(k=>body.evidence?.[k]!==true);if(record.status!=='READY_FOR_TEST'||!record.validation?.ok||missing.length){send(res,422,{error:'Evidência incompleta ou validação ausente.',missing});return;}const evidence={...body.evidence,tester:String(body.tester||'Administrador local').slice(0,80),recordedAt:new Date().toISOString(),questionId:body.itemId,itemHash,draftRevision:draft.revision,mode:'HUMAN_ATTESTATION'};record={...record,status:'TESTED',itemHash,testEvidence:evidence,approval:null,updatedAt:new Date().toISOString()};workflow[body.itemId]=record;const saved=await persistDraft(draft);send(res,200,{draft:saved,workflowStatus:'TESTED',testEvidence:evidence});return;
    }
    if(action==='approve-question'){
      if(body.confirmed!==true||record.status!=='TESTED'||record.testEvidence?.itemHash!==itemHash){send(res,422,{error:'A aprovação exige confirmação explícita e testes vinculados à revisão atual.'});return;}const source=await sourceStatus(id,draft);if(source.changed){send(res,409,{error:'O contrato canônico mudou. Sincronize antes de aprovar.'});return;}const approval={questionId:body.itemId,itemHash,draftRevision:draft.revision,approvedAt:new Date().toISOString(),approvedBy:String(body.approvedBy||'Administrador local').slice(0,80),status:'APPROVED'};record={...record,status:'APPROVED',itemHash,approval,updatedAt:new Date().toISOString()};workflow[body.itemId]=record;const saved=await persistDraft(draft);send(res,200,{draft:saved,workflowStatus:'APPROVED',approval});return;
    }
    if(action==='stage-promotion'){
      if(record.status!=='APPROVED'||record.approval?.itemHash!==itemHash) {send(res,422,{error:'A revisão precisa estar aprovada explicitamente.'});return;}const source=await sourceStatus(id,draft);if(source.changed){send(res,409,{error:'O contrato canônico mudou; sincronize e revalide.'});return;}const canonical=await json(QUESTION_SOURCE);const currentQuestion=questionById({data:canonical},body.itemId);if(!currentQuestion){send(res,409,{error:'Questão canônica ausente.'});return;}
      const localLibrary=await loadMediaLibrary();const referenced=referencedQuestionMedia(q);const imported=localLibrary.entries.filter(x=>referenced.has(x.mediaId||x.audioId));if(imported.some(x=>x.kind==='audio'&&x.filename.endsWith('.wav')))throw Error(`Áudio WAV não pode ser promovido: runtime atual aceita somente MP3.`);
      const releaseId=`review-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomBytes(4).toString('hex')}`;const releaseDir=path.join(DATA,'staging',releaseId);const before=path.join(releaseDir,'before');const candidate=path.join(releaseDir,'candidate');const qPath='content/english/year-1/module-01/questions.json';const mediaPath='content/english/media/media-registry.json';const audioPath='duduq-audio/manifests/AUDIO_MANIFEST.json';await mkdir(before,{recursive:true});await mkdir(candidate,{recursive:true});
      const files={questions:await json(QUESTION_SOURCE),media:await json(MEDIA_SOURCE),audio:await json(path.join(ROOT,audioPath))};
      await writeAtomic(path.join(before,qPath),JSON.stringify(files.questions,null,2));await writeAtomic(path.join(before,mediaPath),JSON.stringify(files.media,null,2));await writeAtomic(path.join(before,audioPath),JSON.stringify(files.audio,null,2));
      const candidateQuestions=structuredClone(files.questions);candidateQuestions.items=candidateQuestions.items.map(x=>x.item_id===body.itemId?structuredClone(q):x);
      const candidateMedia=structuredClone(files.media),candidateAudio=structuredClone(files.audio);const changedFiles=[qPath];
      for(const asset of imported){if(asset.kind==='audio'&&!asset.filename.endsWith('.mp3'))continue;const folder=asset.kind==='image'?'content/english/assets/content-studio':'duduq-audio/assets/content-studio';const promotedPath=`${folder}/${asset.storedName}`;await writeAtomic(path.join(candidate,promotedPath),await readFile(path.join(MEDIA_DIR,asset.storedName)));if(asset.kind==='image'){candidateMedia.entries.push({mediaId:asset.mediaId,status:'APPROVED',kind:'image',urlOrPath:promotedPath,assets:[{path:promotedPath,sha256:asset.sha256,sourcePath:asset.sourceUrl||asset.originalName||'Content Studio draft'}],altText:asset.originalName||asset.filename});}else{candidateAudio.items.push({id:asset.audioId,audioId:asset.audioId,status:'APPROVED',audioPath:promotedPath,locale:'en',transcript:asset.originalName||asset.filename,voiceVersion:'HUMAN_REVIEW_REQUIRED',source:'Content Studio import'});}}
      if(imported.some(x=>x.kind==='image'))changedFiles.push(mediaPath);if(imported.some(x=>x.kind==='audio'&&x.filename.endsWith('.mp3')))changedFiles.push(audioPath);
      await writeAtomic(path.join(candidate,qPath),JSON.stringify(candidateQuestions,null,2));if(changedFiles.includes(mediaPath))await writeAtomic(path.join(candidate,mediaPath),JSON.stringify(candidateMedia,null,2));if(changedFiles.includes(audioPath))await writeAtomic(path.join(candidate,audioPath),JSON.stringify(candidateAudio,null,2));
      const manifest={releaseId,moduleId:draft.moduleId,questionId:body.itemId,status:'STAGED_FOR_HUMAN_REVIEW',createdAt:new Date().toISOString(),draftId:id,draftRevision:draft.revision,itemHash,approval:record.approval,sourceSha256:source.currentSha256,files:changedFiles,diff:{changedFields:changedPaths(currentQuestion,q),questionBeforeSha256:contentHash(currentQuestion),questionAfterSha256:itemHash},mediaAssets:imported.map(x=>({assetId:x.assetId,kind:x.kind,sha256:x.sha256})),github:{selectiveFiles:changedFiles,commitCreated:false,pushPerformed:false},cloudflare:{deploymentStarted:false,deploymentVerified:false},productionWrite:false};await writeAtomic(path.join(releaseDir,'release.json'),JSON.stringify(manifest,null,2));send(res,201,{release:manifest,candidatePath:`artifacts/content-studio/staging/${releaseId}/candidate`,manifestPath:`artifacts/content-studio/staging/${releaseId}/release.json`});return;
    }
  }catch(e){send(res,400,{error:e.message});}return;}
  if(req.method==='POST'&&['/api/media/import','/api/media/fetch-url'].includes(url.pathname)){
    if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida.'});return;}
    try{const body=await readBody(req);let buffer,source={};if(url.pathname==='/api/media/import'){if(typeof body.base64!=='string'||body.base64.length>7_000_000)throw Error('Arquivo ausente ou maior que 5 MB.');buffer=Buffer.from(body.base64,'base64');source.sourceType='LOCAL_IMPORT';source.originalName=String(body.filename||'arquivo').replace(/[\\/\0-\x1f]/g,'_').slice(0,120);}else{let target=githubRawUrl(String(body.url||''));for(let hop=0;hop<4;hop++){const response=await fetch(target,{redirect:'manual',headers:{'user-agent':'DUDUQ-Content-Studio/1.0','accept':'image/*,audio/mpeg,audio/wav,application/octet-stream'}});if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw Error('Redirecionamento remoto inválido.');target=githubRawUrl(new URL(location,target).href);continue;}if(!response.ok)throw Error(`O arquivo remoto respondeu HTTP ${response.status}.`);const length=Number(response.headers.get('content-length')||0);if(length>5_000_000)throw Error('O arquivo remoto excede 5 MB.');buffer=await readLimited(response,5_000_000);source.sourceType='GITHUB_IMPORT';source.sourceUrl=target.href;break;}if(!buffer)throw Error('Muitos redirecionamentos.');}const entry=await storeMedia(buffer,String(body.kind||''),source);send(res,201,{entry});}catch(e){send(res,422,{error:e.message});}return;
  }
  const projectQuestionsRoute=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]+)\/modules\/([A-Za-z0-9_-]+)\/questions$/);
  const projectQuestionAction=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]+)\/modules\/([A-Za-z0-9_-]+)\/questions\/([A-Za-z0-9_-]+)\/(preview|restore)$/);
  const projectQuestionUpdate=url.pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]+)\/modules\/([A-Za-z0-9_-]+)\/questions\/([A-Za-z0-9_-]+)$/);
  if((req.method==='POST'&&projectQuestionsRoute)||(req.method==='PUT'&&projectQuestionUpdate)||(req.method==='POST'&&projectQuestionAction)){
    if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida. Recarregue o Content Studio.'});return;}
    try{
      await requireMatchingPreviewReady();
      const match=projectQuestionsRoute||projectQuestionUpdate||projectQuestionAction;const[,_projectId,_moduleId,actionId,action]=match||[];const{project,module}=await loadMatchingModule(_projectId,_moduleId);
      if(req.method==='POST'&&projectQuestionAction&&action==='preview'){
        const question=module.questions.find(item=>item.questionId===actionId);if(!question)throw Error('Questão não encontrada neste módulo.');if(question.mechanicId!=='matching')throw Error('Esta rota só executa questões Matching.');const allowed=await allowedMatchingImageKeys(),check=validateMatchingDraft(question,allowed);if(!check.ok){send(res,422,{error:'A questão precisa passar a validação antes do preview.',errors:check.errors});return;}const token=crypto.randomBytes(24).toString('hex');for(const[key,value]of MATCHING_PREVIEW_TICKETS)if(value.expiresAt<Date.now())MATCHING_PREVIEW_TICKETS.delete(key);MATCHING_PREVIEW_TICKETS.set(token,{projectId:project.projectId,moduleId:module.moduleId,questionId:question.questionId,allowedImageAssetKeys:[...allowed],expiresAt:Date.now()+10*60*1000});send(res,201,{url:`/test/matching/multiproject-candidate-v1/?ticket=${token}`,expiresInSeconds:600});return;
      }
      const body=await readBody(req);if(body.baseRevision!==module.revision){send(res,409,{error:'O módulo mudou desde sua edição. Recarregue para evitar sobrescrever alterações.' ,currentRevision:module.revision});return;}
      const allowed=await allowedMatchingImageKeys();
      if(req.method==='POST'&&projectQuestionsRoute){
        const input=body.question||{};const questionId=`MCH-${crypto.randomBytes(9).toString('hex').toUpperCase()}`;const question={questionId,mechanicId:'matching',editorialStatus:'DRAFT_QA_ONLY',statement:String(input.statement||''),instruction:String(input.instruction||''),metadata:{matching:{leftTitle:String(input.metadata?.matching?.leftTitle||'Itens'),rightTitle:String(input.metadata?.matching?.rightTitle||'Correspondências'),leftItems:input.metadata?.matching?.leftItems,rightItems:input.metadata?.matching?.rightItems,pairs:input.metadata?.matching?.pairs,behavior:{connectionMode:'1x1',interactionMode:'smart'}}},revision:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const check=validateMatchingDraft(question,allowed);if(!check.ok){send(res,422,{error:'A questão Matching não atende ao contrato.',errors:check.errors});return;}const next={...module,questions:[...module.questions,question],revision:revisionId(),updatedAt:new Date().toISOString(),history:[...(module.history||[]),{type:'QUESTION_CREATED',questionId,at:new Date().toISOString()}]};await persistIsolatedModule(project,next);send(res,201,{module:next,question,validation:{ok:true,errors:[]}});return;
      }
      if(req.method==='POST'&&projectQuestionAction&&action==='restore'){
        const question=module.questions.find(item=>item.questionId===actionId);if(!question)throw Error('Questão não encontrada.');const snapshot=await json(path.join(projectModulesDir(project),'revisions',`${module.moduleId}.${String(body.revision||'')}.json`));const previous=snapshot.questions?.find(item=>item.questionId===actionId);if(!previous)throw Error('A revisão selecionada não contém esta questão.');const restored={...previous,revision:(question.revision||1)+1,updatedAt:new Date().toISOString(),restoredFrom:body.revision};const next={...module,questions:module.questions.map(item=>item.questionId===actionId?restored:item),revision:revisionId(),updatedAt:new Date().toISOString(),history:[...(module.history||[]),{type:'QUESTION_RESTORED',questionId:actionId,fromRevision:body.revision,at:new Date().toISOString()}]};await persistIsolatedModule(project,next);send(res,200,{module:next,question:restored});return;
      }
      if(req.method==='PUT'&&projectQuestionUpdate){const index=module.questions.findIndex(item=>item.questionId===actionId);if(index<0)throw Error('Questão não encontrada neste módulo.');const current=module.questions[index],input=body.question||{};const question={...current,statement:String(input.statement||''),instruction:String(input.instruction||''),metadata:{matching:{leftTitle:String(input.metadata?.matching?.leftTitle||'Itens'),rightTitle:String(input.metadata?.matching?.rightTitle||'Correspondências'),leftItems:input.metadata?.matching?.leftItems,rightItems:input.metadata?.matching?.rightItems,pairs:input.metadata?.matching?.pairs,behavior:{connectionMode:'1x1',interactionMode:'smart'}}},revision:(current.revision||1)+1,updatedAt:new Date().toISOString()};const check=validateMatchingDraft(question,allowed);if(!check.ok){send(res,422,{error:'A questão Matching não atende ao contrato.',errors:check.errors});return;}const next={...module,questions:module.questions.map((item,i)=>i===index?question:item),revision:revisionId(),updatedAt:new Date().toISOString(),history:[...(module.history||[]),{type:'QUESTION_UPDATED',questionId:actionId,at:new Date().toISOString()}]};await persistIsolatedModule(project,next);send(res,200,{module:next,question,validation:{ok:true,errors:[]}});return;}
    }catch(e){send(res,422,{error:e.message});}return;
  }
  if(req.method==='POST'&&/^\/api\/projects\/[A-Za-z0-9_-]+\/modules$/.test(url.pathname)){
    if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida. Recarregue o Content Studio.'});return;}
    try{
      const projectId=url.pathname.split('/')[3],project=await isolatedProject(projectId),body=await readBody(req);
      const title=String(body.title||'').trim().slice(0,120),year=Number(body.year);
      if(!title)throw Error('Informe o título do módulo.');
      if(!project.years?.includes(year))throw Error('Selecione um ano/série pertencente ao projeto.');
      const existing=await listProjectModules(project),taken=new Set(existing.map(x=>x.moduleId));let sequence=1,moduleId;
      do{moduleId=`${project.projectId}-Y${year}-M${String(sequence).padStart(2,'0')}`;sequence++;}while(taken.has(moduleId));
      const now=new Date().toISOString(),module={schemaVersion:1,projectId:project.projectId,moduleId,year,title,description:String(body.description||'').trim().slice(0,500),curriculumObjective:'',prerequisites:[],status:'DRAFT',questions:[],revision:revisionId(),createdAt:now,updatedAt:now,history:[]};
      await persistIsolatedModule(project,module);send(res,201,{module,projectId:project.projectId,questionCount:0});
    }catch(e){send(res,422,{error:e.message});}return;
  }
  const draftRoute=url.pathname.match(/^\/api\/drafts\/([A-Za-z0-9_-]+)$/);
  if(req.method==='PUT'&&draftRoute){
    if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida. Recarregue o Content Studio.'});return;}
    try{const id=draftRoute[1],current=await loadDraft(id),body=await readBody(req);if(body.baseRevision!==current.revision){send(res,409,{error:'Este rascunho mudou em outra sessão. Recarregue antes de salvar.',currentRevision:current.revision});return;}const source=await sourceStatus(id,current);if(source.changed){send(res,409,{error:'O contrato canônico foi alterado desde a criação deste rascunho. Verifique e sincronize as mudanças antes de salvar.',sourceChanged:true,currentSourceSha256:source.currentSha256});return;}const errors=validateQuestions(body.data,current.data);if(errors.length){send(res,422,{errors});return;}const revision=revisionId();const next={...current,updatedAt:new Date().toISOString(),revision,data:body.data,workflowStatus:'DRAFT'};const dir=draftDir(id);await writeAtomic(path.join(dir,'draft.json'),JSON.stringify(next,null,2));await writeAtomic(path.join(dir,'revisions',`${revision}.json`),JSON.stringify(next,null,2));send(res,200,{draft:next,errors:[]});}catch(e){send(res,400,{error:e.message});}return;
  }
  const syncRoute=url.pathname.match(/^\/api\/drafts\/([A-Za-z0-9_-]+)\/sync-source$/);
  if(req.method==='POST'&&syncRoute){if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida.'});return;}try{const id=syncRoute[1],current=await loadDraft(id),body=await readBody(req);if(body.baseRevision!==current.revision){send(res,409,{error:'O rascunho mudou em outra sessão. Recarregue antes de sincronizar.'});return;}const latest=await json(QUESTION_SOURCE);const latestSha=contentHash(latest);const base=await draftSourceBase(id,current);const result=threeWayMerge(base,current.data,latest);if(result.conflicts.length){send(res,409,{error:'Há alterações concorrentes nos mesmos campos. Nenhuma versão foi sobrescrita.',conflicts:result.conflicts,currentSourceSha256:latestSha});return;}const errors=validateQuestions(result.merged,latest);if(errors.length){send(res,422,{error:'A reconciliação encontrou dados incompatíveis com o contrato atual.',errors});return;}const revision=revisionId();const now=new Date().toISOString();const next={...current,updatedAt:now,revision,baseSha256:latestSha,sourceBaseData:latest,data:result.merged,workflowStatus:'DRAFT',lastSourceSyncAt:now};const dir=draftDir(id);await writeAtomic(path.join(dir,'draft.json'),JSON.stringify(next,null,2));await writeAtomic(path.join(dir,'revisions',`${revision}.json`),JSON.stringify(next,null,2));send(res,200,{draft:next,merged:true,sourceSha256:latestSha});}catch(e){send(res,400,{error:e.message});}return;}
  const rollback=url.pathname.match(/^\/api\/drafts\/([A-Za-z0-9_-]+)\/restore$/);
  if(req.method==='POST'&&rollback){if(req.headers.origin!==origin||req.headers['x-duduq-admin-token']!==TOKEN){send(res,403,{error:'Sessão administrativa inválida.'});return;}try{const id=rollback[1],current=await loadDraft(id),body=await readBody(req);if(body.baseRevision!==current.revision){send(res,409,{error:'Rascunho mudou; recarregue antes de restaurar.'});return;}const target=await json(path.join(draftDir(id),'revisions',`${body.revision}.json`));const revision=revisionId();const next={...current,revision,updatedAt:new Date().toISOString(),data:target.data,restoredFrom:body.revision};await writeAtomic(path.join(draftDir(id),'draft.json'),JSON.stringify(next,null,2));await writeAtomic(path.join(draftDir(id),'revisions',`${revision}.json`),JSON.stringify(next,null,2));send(res,200,{draft:next});}catch(e){send(res,400,{error:e.message});}return;}
  if(req.method==='GET'&&url.pathname.startsWith('/play/')&&url.searchParams.has('duduqDraftId')){const id=url.searchParams.get('duduqDraftId');try{await loadDraft(id);res.setHeader('Set-Cookie',`duduq-preview-draft=${encodeURIComponent(id)}; Path=/; SameSite=Strict; HttpOnly`);}catch{send(res,404,'Draft not found');return;}}
  await serveStatic(req,res,url);
});
server.listen(PORT,HOST,async()=>{await mkdir(DRAFTS,{recursive:true});console.log(`DUDUQ Content Studio local: http://${HOST}:${PORT}/studio/`);console.log(`Draft preview origin: http://${HOST}:${PORT}; production writes disabled.`);});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
