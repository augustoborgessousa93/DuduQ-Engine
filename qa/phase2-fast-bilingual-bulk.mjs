#!/usr/bin/env node
/**
 * DUDUQ FAST BULK: 417 original bilingual PNGs -> real 600-question graph.
 * Source: GitHub Assets-DuduQ immutable Git tree SHA, never AI-generated.
 *
 * PLAN (read-only): DUDUQ_QA_ONLY=1 node qa/phase2-fast-bilingual-bulk.mjs
 * APPLY (disposable QA only): DUDUQ_QA_ONLY=1 node ... --apply
 *
 * Zero per-file prompts; confidence tiers are based on exact aliases and
 * ALL occurrences of each shared media ID. Ambiguity fails CLOSED.
 * No question JSON, Gold Masters, audio, JS runtime or production writes.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {aliases,extraAliases} from './phase2-fast-bilingual-aliases.mjs';

assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
const apply=process.argv.includes('--apply');
const root=path.resolve(process.env.DUDUQ_QA_DIST||'qa/fast-bilingual-immutable-candidate');
assert(root.startsWith(path.resolve('qa')+path.sep),'DISPOSABLE_QA_ROOT_ONLY');
assert(root.endsWith('qa/fast-bilingual-immutable-candidate'),'CANDIDATE_ROOT_NOT_APPROVED');
const tree=JSON.parse(await readFile('qa/results/assets-duduq-current-head-tree.json','utf8'));
const sourceSHA='a62c07c075a4a744f81dee2eea3a6b93108f9d08';
assert.equal(tree.sha,sourceSHA,'SOURCE_COMMIT_HEAD_CHANGED');
assert.equal(tree.truncated,false,'INCOMPLETE_GITHUB_TREE');
const inventory=tree.tree.filter(x=>x.type==='blob'&&
 x.path.startsWith('Imagens Ilustrativa/')&&/\.png$/i.test(x.path));
assert(inventory.length>=400&&inventory.length<550,'UNEXPECTED_SOURCE_IMAGE_COUNT');
const fileByPath=new Map(inventory.map(x=>[x.path,x]));
assert.equal(fileByPath.size,inventory.length,'SOURCE_DUPLICATE_PATH');

/* For lessons with full sentence/scenario concepts, the source filename can
 * itself be the exact semantic answer. E.g. 'I like apples.png', 'Two schools
 * — Duas escolas.png', or 'Red boat - barco vermelho.png'. Compare complete
 * bilingual caption segments only, NEVER substrings like 'park' in 'drawing
 * in the park'. Verify unique Git blob to disallow arbitrary file selection.
 */
const literalByName=new Map();
function literalIndex(key,asset){
 if(!key)return;
 if(!literalByName.has(key))literalByName.set(key,new Map());
 literalByName.get(key).set(asset.sha,asset);
}
for(const asset of inventory){
 const stem=asset.path.split('/').at(-1).replace(/\.png$/i,'');
 const parts=[stem,...stem.split(/\s+[—–-]\s+/g)];
 for(const part of parts){
  const key=String(part).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  literalIndex(key,asset);
 }
}


const norm=x=>String(x??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const canonFix={
 'school bag':'backpack','sleeping':'sleep','feet':'feet',
 'silence please':'quiet','thank you':'thank you','school object':'school object',
 'eat':'eating','grapes':'grape'
};
const canon=x=>canonFix[norm(x)]||norm(x);
const byAlias=new Map();
function addAlias(alias,concept){
 const key=norm(alias),c=canon(concept);
 if(!key)return;
 if(!byAlias.has(key))byAlias.set(key,new Set());
 byAlias.get(key).add(c);
}
for(const obj of [aliases,extraAliases])
 for(const [concept,values] of Object.entries(obj)){
  addAlias(concept.replaceAll('_',' '),concept);
  for(const a of values)addAlias(a,concept);
 }
const aliasEntries=[...byAlias.entries()]
 .filter(([,set])=>set.size===1)
 .map(([phrase,set])=>({words:phrase.split(' '),concept:[...set][0],phrase}))
 .sort((a,b)=>b.words.length-a.words.length||a.phrase.localeCompare(b.phrase));
const canonicalExact=s=>{
 const k=norm(s);if(!k)return null;
 const concepts=byAlias.get(k);
 return concepts?.size===1?[...concepts][0]:null;
};
const resolveExactLabel=input=>{
 const concept=canonicalExact(input);
 if(concept)return {concept,source:null,confidence:'BILINGUAL_ALIAS'};
 const exact=literalByName.get(norm(input));
 if(exact?.size===1)return {concept:norm(input),source:exact.values().next().value,confidence:'EXACT_FULL_CAPTION'};
 return null;
};
const resolveLabelConsensus=labels=>{
 const values=[...new Set((Array.isArray(labels)?labels:[])
  .map(value=>String(value??'').trim()).filter(Boolean))];
 if(!values.length)return null;
 const resolved=values.map(resolveExactLabel);
 if(resolved.some(value=>!value))return null;
 const concepts=new Set(resolved.map(value=>value.concept));
 if(concepts.size!==1)return null;
 const sources=new Map(resolved.filter(value=>value.source)
  .map(value=>[value.source.sha,value.source]));
 return {concept:[...concepts][0],source:sources.size===1?[...sources.values()][0]:null};
};
// Keep multilingual exactness and reject ambiguous names such as "orange".
assert.equal(resolveExactLabel('cachorro')?.concept,'dog');
assert.equal(resolveExactLabel('school bag')?.concept,'backpack');
assert.equal(resolveExactLabel('orange')?.concept,'orange');
assert.notEqual(canonicalExact('orange fruit'),canonicalExact('orange'),
 'FRUIT_CONTEXT_MUST_NOT_COLLAPSE_TO_COLOR');
assert.equal(resolveExactLabel('farewell')?.concept,'goodbye');
assert.equal(resolveExactLabel('Saying goodbye')?.concept,'goodbye');
assert.equal(resolveLabelConsensus([
 'Cena de despedida','Saying goodbye','Reconhecer Goodbye','Goodbye!',
 'Duas pessoas se despedindo'
])?.concept,'goodbye','UNANIMOUS_QUEUE_LABELS_SHOULD_RESOLVE_FAREWELL');
assert.equal(resolveLabelConsensus(['Goodbye!','Good morning']),null,
 'CONFLICTING_QUEUE_LABELS_MUST_REMAIN_UNRESOLVED');
assert.equal(resolveLabelConsensus(['Good morning, my name is Leo']),null,
 'FULL_DIALOGUE_MUST_NOT_COLLAPSE_TO_GREETING');

const noisePhrases=['school object','body part','classroom command','daily routine','person',
 'pet','animal','color','colour','cor','fruta','fruit','greeting','routine',
 'number','numeral','month','weather','illustration','imagem','icon','3d'];
const noise=new Set(noisePhrases.flatMap(x=>x.split(' ')));
const numeric=new Map([['1','one'],['2','two'],['3','three'],['4','four'],
 ['5','five'],['6','six'],['7','seven'],['8','eight'],['9','nine'],['10','ten']]);
function parseFilename(p){
 const filename=p.split('/').at(-1).replace(/\.png$/i,'');
 const tokens=norm(filename).split(' ').filter(Boolean);
 const detected=[],unknown=[];
 for(let i=0;i<tokens.length;){
  // Interpret folder-like bilingual filename prefixes as metadata rather
  // than as the answer "school"/"body"/"color" itself.
  if(i===0){
   const prefixes=[
    ['school','object'],['body','part','touch'],['body','part'],
    ['classroom','command'],['daily','routine'],['person'],
    ['pet'],['animal'],['greeting'],['routine'],['number'],
    ['numeral'],['color'],['colour'],['cor'],['weather'],['fruit']
   ];
   const metadata=prefixes.find(p=>p.every((word,j)=>tokens[j]===word));
   if(metadata){i+=metadata.length;continue;}
  }
  const word=tokens[i];let matched=null;
  for(const a of aliasEntries){
   if(a.words.length<=tokens.length-i&&a.words.every((w,j)=>tokens[i+j]===w)){
    matched=a;break;
   }
  }
  if(matched){detected.push(matched.concept);i+=matched.words.length;continue;}
  // 01–10 is neutral only if corresponding English number is also present.
  if(/^0[1-9]$/.test(word)){detected.push(numeric[String(Number(word))]);i++;continue;}
  if(noise.has(word)){i++;continue;}
  unknown.push(word);i++;
 }
 const concepts=[...new Set(detected)];
 return {filename,path:p,concepts,unknown,
  isPlain:unknown.length===0&&concepts.length===1};
}
const sourceCandidates=new Map();
for(const asset of inventory){
 const parsed=parseFilename(asset.path);
 if(!parsed.isPlain)continue;
 const concept=parsed.concepts[0];
 if(!sourceCandidates.has(concept))sourceCandidates.set(concept,[]);
 sourceCandidates.get(concept).push({...asset,parsed});
}
const pinned=JSON.parse(await readFile('docs/qa/media-audit-20261029/phase2-canonical-semantic-map-20261103.json','utf8')).pins;
const pinByConcept=new Map(Object.entries(pinned).map(([c,p])=>[canon(c),p]));
const sourceSelection=new Map(),ambiguousSources=[];
const allConcepts=new Set([...sourceCandidates.keys(),...pinByConcept.keys()]);
for(const c of allConcepts){
 const pin=pinByConcept.get(c),option=pin&&fileByPath.get(pin);
 // A preexisting human-curated concept->file pin beats filename ambiguity,
 // but only if the asset still exists at the immutable source HEAD.
 if(option){sourceSelection.set(c,{...option,priority:'PINNED_CURATED'});continue;}
 const candidates=sourceCandidates.get(c)||[];
 const unique=new Map(candidates.map(x=>[x.sha,x]));
 if(unique.size===1){
  sourceSelection.set(c,{...unique.values().next().value,priority:'UNIQUE_PLAIN_BILINGUAL'});
 }else if(unique.size>1){
  ambiguousSources.push({concept:c,paths:candidates.map(x=>x.path)});
 }
}

const regRel='content/english/media/media-registry.json',regFile=path.join(root,regRel);
const manFile=path.join(root,'.duduq-pages-manifest');
const regBytes=await readFile(regFile),manBytes=await readFile(manFile);
const registry=JSON.parse(regBytes),q=JSON.parse(await readFile('docs/qa/media-audit-20261029/replacement-queue.json','utf8'));
assert(registry.entries.length>=1100,'REGISTRY_INCOMPLETE');
const queue=new Map(q.queue.map(x=>[x.mediaId,x]));
const entryIndex=new Map(registry.entries.map((x,i)=>[x.mediaId,i]));
assert.equal(entryIndex.size,registry.entries.length);
const manifestLines=manBytes.toString().trimEnd().split(/\r?\n/);
const manifest=new Map();
for(let i=0;i<manifestLines.length;i++){
 const l=manifestLines[i],at=l.lastIndexOf(' ');assert(at>0,'BAD_MANIFEST_LINE');
 const p=l.slice(0,at),h=l.slice(at+1);
 assert(/^[0-9a-f]{64}$/.test(h)&&!manifest.has(p),'BAD_MANIFEST_HASH_OR_DUPLICATE');
 manifest.set(p,{sha:h,index:i});
}
assert.equal(manifestLines.length,2891,'NOT_CURRENT_ORANGE_PRODUCTION');
assert.equal(manifest.get(regRel)?.sha,hash(regBytes),'REGISTRY_BASE_SHA_MISMATCH');

const usages=new Map(),questionHashes=new Map(),allQ=new Set();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(root,rel)),doc=JSON.parse(bytes);
 assert.equal(manifest.get(rel)?.sha,hash(bytes),'QUESTION_BASE_HASH_MISMATCH:'+rel);
 assert.equal(doc.items?.length,20,'EXPECTED_20_PER_MODULE:'+rel);
 questionHashes.set(rel,hash(bytes));
 for(const question of doc.items){
  const id=question.item_id;assert(!allQ.has(id));allQ.add(id);
  const choiceKey=/(?:option|opcao|choice|answer|resposta|alternative|distractor|target|bubble|card|pair|match)/i;
  const labelKey=/^(?:semanticTarget|semantic|concept|targetConcept|answerConcept|optionSemantic|label|text|value|alt|caption|title|word|name)$/i;
  function directLabels(node,inChoice){
   return Object.entries(node).filter(([k,v])=>typeof v==='string'&&labelKey.test(k)&&
    (inChoice||/^(?:semanticTarget|semantic|concept|targetConcept|answerConcept|optionSemantic)$/i.test(k)))
    .map(([,v])=>v.trim()).filter(Boolean);
  }
  function traverse(node,inChoice=false,inheritedLabels=[]){
   if(!node||typeof node!=='object')return;
   if(!Array.isArray(node)){
    const ids=[...new Set(['assetId','mediaId','image_ref','imageRef'].map(k=>node[k])
     .filter(v=>typeof v==='string'&&entryIndex.has(v)))];
    // Media-bearing options can carry their label locally even when a legacy
    // runtime uses a nonstandard ancestor key instead of "options"/"choices".
    const labels=directLabels(node,inChoice||ids.length>0);
    const scopedLabels=inChoice?[...new Set([...inheritedLabels,...labels])]:labels;
    for(const mediaId of ids){
     if(!usages.has(mediaId))usages.set(mediaId,[]);
     usages.get(mediaId).push({questionId:id,semanticTarget:norm(node.semanticTarget),contextLabels:scopedLabels});
    }
    for(const [key,child] of Object.entries(node))if(child&&typeof child==='object'){
     const childChoice=inChoice||choiceKey.test(key);
     traverse(child,childChoice,childChoice?[...new Set([...inheritedLabels,...labels])]:inheritedLabels);
    }
    return;
   }
   for(const child of node)if(child&&typeof child==='object')traverse(child,inChoice,inheritedLabels);
  }
  traverse(question);
 }
}
assert.equal(allQ.size,600,'CONTRACTS_NOT_600');

// Reuse PNGs that are ALREADY in the production registry when their original
// source blob is identical; avoid downloading or duplicating binaries.
const published=new Map();
for(const e of registry.entries){
 const b=e.provenance?.sourceGitBlob,rel=e.urlOrPath,h=e.sha256;
 if(b&&rel?.endsWith('.png')&&h&&manifest.get(rel)?.sha===h&&!published.has(b))
  published.set(b,{path:rel,sha256:h});
}
const historical=new Set(['white','black','orange','orange fruit','banana','brother']);
const held=[],selected=[],counts={};
function hold(id,reason,concept){
 counts[reason]=(counts[reason]||0)+1;
 held.push({mediaId:id,reason,concept});
}
for(const [id,links] of usages){
 const e=registry.entries[entryIndex.get(id)],old=queue.get(id);
 if(e.kind!=='image'||!e.urlOrPath?.endsWith('.svg'))continue;
 const rawConcept=old?.semantic||e.semantic;
 let concept=canonicalExact(rawConcept);
 let literalSource=null;
 if(!concept&&rawConcept){
  const literal=literalByName.get(norm(rawConcept));
  if(literal?.size===1){
   concept=norm(rawConcept);
   literalSource=literal.values().next().value;
  }
 }
 if(!concept){
  const opts=[...new Set((old?.optionSemanticTargets||[])
   .map(canonicalExact).filter(Boolean))];
  if(opts.length===1&&!old?.semantic)concept=opts[0];
 }
 let queueLabelSource=null;
 // Only use the audited label set as fallback when the semantic field itself
 // is absent. Every nonempty label must resolve exactly to the same concept;
 // mixed, descriptive or partially unknown sets remain held for review.
 if(!concept&&!rawConcept){
  const consensus=resolveLabelConsensus(old?.labels);
  if(consensus){concept=consensus.concept;queueLabelSource=consensus.source;}
 }

 // Resolve media from the exact option context in the real compiled graph.
 // Every actual occurrence of a shared mediaId must independently yield one
 // concept, and all occurrences must agree. This can supersede stale queue
 // conflict flags, but never an actual disagreement in the question graph.
 const perOccurrence=links.map(link=>{
  const found=[];
  const explicit=resolveExactLabel(link.semanticTarget);
  if(explicit)found.push(explicit);
  for(const label of link.contextLabels||[]){const resolved=resolveExactLabel(label);if(resolved)found.push(resolved);}
  const unique=new Map(found.map(x=>[x.concept+'::'+(x.source?.sha||''),x]));
  const concepts=new Set([...unique.values()].map(x=>x.concept));
  return concepts.size===1?{concept:[...concepts][0],sources:[...unique.values()].filter(x=>x.source)}:null;
 });
 const contextConcepts=new Set(perOccurrence.filter(Boolean).map(x=>x.concept));
 const graphConsensus=perOccurrence.length===links.length&&perOccurrence.every(Boolean)&&contextConcepts.size===1
  ?{concept:[...contextConcepts][0],source:(()=>{
    const sources=perOccurrence.flatMap(x=>x.sources||[]);
    const unique=new Map(sources.map(x=>[x.source?.sha,x.source]));
    return unique.size===1?[...unique.values()][0]:null;
   })()}:null;
 const contextDerived=!concept&&Boolean(graphConsensus);
 if(contextDerived)concept=graphConsensus.concept;

 // Fail closed when any independently resolved option context contradicts
 // the queue/registry concept. A missing graphConsensus is NOT evidence of
 // agreement: a shared ID may have conflicting real option labels.
 if(concept&&[...contextConcepts].some(c=>c!==concept)){
  hold(id,'REAL_OPTION_CONTEXT_DISAGREES_WITH_AUDITED_CONCEPT',concept);continue;
 }
 if(contextConcepts.size>1){
  hold(id,'SHARED_REAL_OPTION_CONTEXT_CONFLICT',concept);continue;
 }
 if(!old||old.classification!=='PROVISIONAL'){hold(id,'AUDITED_QUEUE_ENTRY_MISSING',concept);continue;}
 if(!concept){hold(id,'CONCEPT_UNMAPPED_BILINGUAL',rawConcept);continue;}
 if(historical.has(concept)||/(?:^|[-_])(WHITE|BLACK|BANANA|ORANGE)(?:$|[-_])/i.test(id)){
  hold(id,'HISTORICAL_VISUAL_OR_SEMANTIC_HOLD',concept);continue;
 }
 if(old.semanticConflict===true&&!graphConsensus){hold(id,'CONFLICTING_AUDITED_SEMANTICS',concept);continue;}
 if(old.temporary===false||e.temporary===false){
  hold(id,'NOT_PROVISIONAL',concept);continue;
 }
 if((old.mustInclude||[]).length||(old.mustNotInclude||[]).length){
  hold(id,'VISUAL_SCENE_CONSTRAINT_REQUIRES_REVIEW',concept);continue;
 }
 const asset=sourceSelection.get(concept)||
  (graphConsensus?.concept===concept&&graphConsensus.source?
   {...graphConsensus.source,priority:'QUESTION_GRAPH_CONTEXT'}:null)||
  (queueLabelSource?{...queueLabelSource,priority:'UNANIMOUS_AUDITED_LABELS'}:null)||
  (literalSource&&{...literalSource,priority:'UNIQUE_FULL_BILINGUAL_CAPTION'});
 if(!asset){hold(id,'NO_UNAMBIGUOUS_SOURCE_FOR_CONCEPT',concept);continue;}
 const realQuestionIds=[...new Set(links.map(x=>x.questionId))].sort();
 if(old.usage!==realQuestionIds.length){
  hold(id,'QUEUE_VS_REAL_QUESTION_COUNT_CONFLICT',concept);continue;
 }
 if((old.exampleQuestions||[]).some(q=>!realQuestionIds.includes(q))){
  hold(id,'QUEUED_QUESTION_OUTSIDE_REAL_GRAPH',concept);continue;
 }
 const registryConcept=canonicalExact(e.semantic)||(e.semantic?norm(e.semantic):null);
 if(e.semantic&&registryConcept&&registryConcept!==concept){
  hold(id,'REGISTRY_SEMANTIC_CONFLICT',concept);continue;
 }
 const explicit=[...links.map(x=>x.semanticTarget),...(old.optionSemanticTargets||[])].filter(Boolean);
 const explicitConcepts=explicit.map(resolveExactLabel).filter(Boolean).map(x=>x.concept);
 if(explicitConcepts.some(value=>value!==concept)){
  hold(id,'SHARED_EXPLICIT_ALTERNATIVE_SEMANTICS_CONFLICT',concept);continue;
 }
 if(old.semanticConflict===true&&graphConsensus?.concept!==concept){
  hold(id,'CONFLICTING_AUDITED_SEMANTICS',concept);continue;
 }
 // Strong inference for legacy missing semanticTarget: audited concept and
 // queue must agree across ALL referenced questions. This isn't a human signoff.
 selected.push({mediaId:id,concept,sourcePath:asset.path,sourceGitBlob:asset.sha,
  sourcePriority:asset.priority,sourceSize:asset.size,
  previousPath:e.urlOrPath,questionIds:realQuestionIds,occurrences:links.length,
  implicitUsages:links.filter(x=>!x.semanticTarget).length,
  sourceAlreadyPublished:published.has(asset.sha)});
}
selected.sort((a,b)=>a.mediaId.localeCompare(b.mediaId));

 // Impact-ranked concept clusters: one editorial decision can unblock
 // multiple identical semantic uses without per-question busywork.
const heldClusterMap=new Map();
for(const item of held){
 const conceptKey=norm(item.concept)||'(no audited concept)';
 const key=item.reason+'::'+conceptKey;
 if(!heldClusterMap.has(key))heldClusterMap.set(key,{
  reason:item.reason,concept:conceptKey,mediaIds:[],questionIds:new Set(),
  modules:new Set(),explicitOccurrences:0});
 const g=heldClusterMap.get(key);g.mediaIds.push(item.mediaId);
 for(const u of usages.get(item.mediaId)||[]){
  g.questionIds.add(u.questionId);g.modules.add(u.questionId.slice(0,5));
  if(u.semanticTarget)g.explicitOccurrences++;
 }
}
const heldConceptClusters=[...heldClusterMap.values()].map(g=>({
 reason:g.reason,concept:g.concept,mediaIdCount:g.mediaIds.length,
 questionCount:g.questionIds.size,moduleCount:g.modules.size,
 explicitOccurrenceCount:g.explicitOccurrences,mediaIds:g.mediaIds.sort(),
 questionIds:[...g.questionIds].sort(),modules:[...g.modules].sort()
})).sort((a,b)=>b.questionCount-a.questionCount||
 b.mediaIdCount-a.mediaIdCount||a.reason.localeCompare(b.reason)||
 a.concept.localeCompare(b.concept));

const proposedPngs=new Map(selected.map(x=>[x.sourceGitBlob,
 {sourcePath:x.sourcePath,sourceGitBlob:x.sourceGitBlob,alreadyPublished:x.sourceAlreadyPublished}]));
const affected=[...new Set(selected.flatMap(x=>x.questionIds))].sort();
const report={schemaVersion:'DUDUQ_PHASE2_3DAY_BILINGUAL_BULK_V1',
 status:'SOURCE_MATCH_PLAN_REQUIRES_QA_AND_PEDAGOGICAL_REVIEW',
 sourceRepository:'augustoborgessousa93/Assets-DuduQ',sourceCommit:sourceSHA,
 imagesInSource:inventory.length,distinctSourceBlobs:new Set(inventory.map(x=>x.sha)).size,
 sourceExactPlainConcepts:sourceCandidates.size,
 curatedConcepts:pinByConcept.size,sourceResolvedConcepts:sourceSelection.size,
 sourceAmbiguity:ambiguousSources.slice(0,65),realContracts:600,baseManifestFiles:2891,
 registrySHA256Before:hash(regBytes),manifestSHA256Before:hash(manBytes),
 provisionalSvgCandidates:held.length+selected.length,
 matchedMediaIds:selected.length,matchedQuestionCount:affected.length,
 matchedModules:[...new Set(affected.map(id=>id.slice(0,5)))].sort(),
 matchedDistinctPngBlobs:proposedPngs.size,
 distinctPngAlreadyInProduction:[...proposedPngs.values()].filter(x=>x.alreadyPublished).length,
 matchedFromCuratedPin:selected.filter(x=>x.sourcePriority==='PINNED_CURATED').length,
 matchedFromBilingualFilename:selected.filter(x=>x.sourcePriority==='UNIQUE_PLAIN_BILINGUAL').length,
 matchedFromFullSceneCaption:selected.filter(x=>x.sourcePriority==='UNIQUE_FULL_BILINGUAL_CAPTION').length,
 matchedFromQuestionGraphContext:selected.filter(x=>x.sourcePriority==='QUESTION_GRAPH_CONTEXT').length,
 heldCount:held.length,heldReasons:counts,
  heldConceptClusters,heldDistinctConceptClusters:heldConceptClusters.length,
  nextReviewPriority:heldConceptClusters.slice(0,35),
 humanReviewStillRequired:true,productionDeployed:false,releaseApproved:false,
 affectedQuestionIds:affected,proposed:selected,exceptions:held};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-fast-bilingual-bulk-plan.json',JSON.stringify(report,null,2)+'\n');
console.log('FAST_BILINGUAL_PLAN='+JSON.stringify({
 imagesInSource:report.imagesInSource,resolvedConcepts:report.sourceResolvedConcepts,
 matchedMediaIds:report.matchedMediaIds,affectedQuestions:report.matchedQuestionCount,
 modules:report.matchedModules.length,sourceBlobs:report.matchedDistinctPngBlobs,
 prepublishedBlobs:report.distinctPngAlreadyInProduction,
 pinned:report.matchedFromCuratedPin,autoBilingual:report.matchedFromBilingualFilename,
 fullSceneCaption:report.matchedFromFullSceneCaption,
 questionContext:report.matchedFromQuestionGraphContext,
 held:report.heldCount,topHeld:Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8),
 topUnmappedClusters:heldConceptClusters.filter(x=>x.reason==='CONCEPT_UNMAPPED_BILINGUAL')
  .slice(0,8).map(({concept,mediaIdCount,questionCount,modules})=>({concept,mediaIdCount,questionCount,modules}))}));
if(!apply)process.exit(0);
assert(selected.length>0,'ZERO_SELECTED_NO_BULK_CANDIDATE');
const unrecognized=[...new Set(selected.filter(x=>!published.has(x.sourceGitBlob))
 .map(x=>x.sourceGitBlob))];
const newData=new Map(),failed=[];
let nextIndex=0;
async function downloadWorker(){
 while(nextIndex<unrecognized.length){
  const blob=unrecognized[nextIndex++];
  const asset=selected.find(x=>x.sourceGitBlob===blob);
  const url='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+
   sourceSHA+'/'+asset.sourcePath.split('/').map(encodeURIComponent).join('/');
  try{
   const resp=await fetch(url,{signal:AbortSignal.timeout(120000)});
   assert(resp.ok,'SOURCE_HTTP_'+resp.status);
   const b=Buffer.from(await resp.arrayBuffer());
   assert.equal(gitBlob(b),blob,'GIT_BLOB_MISMATCH');
   assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG');
   const width=b.readUInt32BE(16),height=b.readUInt32BE(20),colorType=b[25];
   assert(width>=512&&height>=512&&[2,6].includes(colorType),
    'IMAGE_TOO_SMALL_OR_UNSUPPORTED_COLOR_FORMAT');
   const digest=hash(b);
   const dest='content/english/assets/images/assets-duduq/fast-'+blob.slice(0,12)+'-'+digest.slice(0,12)+'.png';
   newData.set(blob,{bytes:b,sha256:digest,path:dest,width,height,colorType});
  }catch(e){failed.push({sourcePath:asset.sourcePath,reason:String(e.message||e).slice(0,200)});}
 }
}
await Promise.all(Array.from({length:Math.min(8,unrecognized.length)},()=>downloadWorker()));
const accepted=selected.filter(x=>published.has(x.sourceGitBlob)||newData.has(x.sourceGitBlob));
const rejected=selected.filter(x=>!published.has(x.sourceGitBlob)&&!newData.has(x.sourceGitBlob));
assert(accepted.length>0,'ALL_ASSETS_FAILED_BYTE_VERIFICATION');
const next=structuredClone(registry);
for(const x of accepted){
 const blob=published.get(x.sourceGitBlob)||newData.get(x.sourceGitBlob);
 const idx=entryIndex.get(x.mediaId),e=next.entries[idx];
 assert.equal(e.urlOrPath,x.previousPath,'CANDIDATE_REGISTRY_MUTATED_WHILE_PLANNING');
 next.entries[idx]={...e,urlOrPath:blob.path,sha256:blob.sha256,
  assets:[{path:blob.path,sha256:blob.sha256}],temporary:true,
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  integrationStatus:'FAST_BILINGUAL_BULK_QA_NOT_PRODUCTION',
  provenance:{provider:'Assets-DuduQ',sourcePath:x.sourcePath,
   sourceCommit:sourceSHA,sourceGitBlob:x.sourceGitBlob,sha256:blob.sha256},
  replacementAudit:{qaOnly:true,previousPath:x.previousPath,
   verifiedQuestionIds:x.questionIds,realOccurrences:x.occurrences,
   implicitUsages:x.implicitUsages,rule:x.sourcePriority}};
}
const nextBytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
const lines=[...manifestLines];
lines[manifest.get(regRel).index]=regRel+' '+hash(nextBytes);
for(const x of newData.values()){
 assert(!manifest.has(x.path),'DUPLICATED_MANIFEST_IMAGE_PATH');
 lines.push(x.path+' '+x.sha256);
}
const nextManifest=Buffer.from(lines.join('\n')+'\n');
const created=[];
try{
 for(const x of newData.values()){
  const p=path.resolve(root,x.path);assert(p.startsWith(root+path.sep));
  await mkdir(path.dirname(p),{recursive:true});
  await writeFile(p,x.bytes,{flag:'wx'});created.push(p);
 }
 await writeFile(regFile,nextBytes);await writeFile(manFile,nextManifest);
 for(const [p,h] of questionHashes)assert.equal(hash(await readFile(path.join(root,p))),h,'CONTRACT_CHANGED:'+p);
 for(const x of newData.values())assert.equal(hash(await readFile(path.join(root,x.path))),x.sha256);
 const post={...report,
  status:'QA_CANDIDATE_MEDIA_INTEGRATED_VISUAL_AND_PEDAGOGICAL_REVIEW_PENDING',
  appliedMediaIds:accepted.length,appliedQuestionIds:[...new Set(accepted.flatMap(x=>x.questionIds))].sort(),
  actuallyAddedPngs:newData.size,
  reusedAlreadyPublishedPngs:[...new Set(accepted.filter(x=>published.has(x.sourceGitBlob)).map(x=>x.sourceGitBlob))].length,
  downloadFailures:failed,skippedForByteIssues:rejected.length,applied:accepted,
  registrySHA256After:hash(nextBytes),manifestSHA256After:hash(nextManifest),
  changedQuestionJsonFiles:0,changedGoldMasters:0,changedAudioFiles:0,
  changedRuntimeFiles:0,productionDeployed:false,releaseApproved:false};
 await writeFile('qa/results/phase2-fast-bilingual-bulk-applied.json',JSON.stringify(post,null,2)+'\n');
 console.log('FAST_BILINGUAL_APPLIED='+JSON.stringify({
  appliedMediaIds:post.appliedMediaIds,questions:post.appliedQuestionIds.length,
  newPNGs:post.actuallyAddedPngs,preexistingPNGs:post.reusedAlreadyPublishedPngs,
  held:post.heldCount,downloadFailures:failed.length,sourceSHA,productionDeployed:false}));
}catch(e){
 await writeFile(regFile,regBytes);await writeFile(manFile,manBytes);
 for(const x of created)await import('node:fs/promises').then(fs=>fs.rm(x,{force:true}));
 throw e;
}
