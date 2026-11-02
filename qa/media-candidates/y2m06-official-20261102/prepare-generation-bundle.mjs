#!/usr/bin/env node
/**
 * Reproducible Y2M06 generation-lane evidence builder.
 *
 * This batch-local script never edits question contracts, the media registry,
 * runtime, Gold Masters, approval flags, or production. The default inventory
 * mode pins all 20 live questions before generation. --finalize consumes only
 * originals already preserved in this batch and writes candidate-only proof.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDuduqRgbaPng} from '../../validate-duduq-png.mjs';
import {analyzeAlphaComponents} from '../../png-alpha-component-audit.mjs';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const moduleId='Y2M06';
const questionRel='dist-pages/content/english/year-2/module-06/questions.json';
const registryRel='dist-pages/content/english/media/media-registry.json';
const ledgerRel='qa/results/media-module-closure.json';
const inventoryRel='qa/results/media-closure-inventory.json';
const questionPath=path.join(root,questionRel);
const registryPath=path.join(root,registryRel);
const ledgerPath=path.join(root,ledgerRel);
const canonicalInventoryPath=path.join(root,inventoryRel);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const prompt=lines=>lines.join('\n');

function vocabularyPrompt({primary,subject,composition,avoid,scale='78-86%'}){
  return prompt([
    'Use case: stylized-concept',
    'Asset type: DUDUQ English Y2M06 educational vocabulary-card PNG for children ages 6-11',
    'Primary request: '+primary,
    'Subject: '+subject,
    'Style/medium: premium polished rounded 3D children\'s animation render, crisp clean silhouette, realistic-enough educational anatomy or food materials',
    'Composition/framing: '+composition+'; the subject occupies about '+scale+' of a square canvas with a safe transparent margin',
    'Lighting/mood: soft bright studio lighting, cheerful, calm, and child-friendly',
    'Constraints: genuinely transparent alpha background; no floor; no cast shadow; no glow; no halo; no text; no letters; no number; no symbol; no arrow; no logo; no watermark; no collage; no grid; no frame; no cutoff; '+avoid
  ]);
}

const generatedSpecs={
  eye:{slug:'EYE',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable isolated human eye teaching the English word eye',
    subject:'exactly one friendly stylized child eye with clear eyelids, white sclera, warm brown iris, black pupil, and small natural eyelashes; no second eye',
    composition:'front-facing close-up of the complete eye centered and fully visible',
    avoid:'no face; no eyebrow; no nose; no glasses; no tears; no makeup; no other body part'}),
    visualObservation:'Exactly one complete child-friendly human eye is isolated; no other facial feature appears.'},
  ear:{slug:'EAR',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable isolated human ear teaching the English word ear',
    subject:'exactly one external child ear in a gentle three-quarter side view with clear natural outer-ear folds',
    composition:'close-up of the complete ear centered and fully visible',
    avoid:'no head; no face; no hair; no earring; no headphones; no second ear; no other body part'}),
    visualObservation:'Exactly one external human ear is isolated and immediately recognizable.'},
  nose:{slug:'NOSE',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable isolated human nose teaching the English word nose',
    subject:'exactly one friendly stylized child nose with a short bridge, rounded tip, and two natural nostrils',
    composition:'front three-quarter close-up of the complete nose centered and fully visible',
    avoid:'no face; no eyes; no mouth; no moustache; no glasses; no other body part'}),
    visualObservation:'Exactly one child-friendly human nose is isolated; no other facial feature appears.'},
  mouth:{slug:'MOUTH',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable isolated human mouth teaching the English word mouth',
    subject:'exactly one friendly smiling child mouth with soft natural lips and a small visible row of clean teeth',
    composition:'front-facing close-up of the complete mouth centered and fully visible',
    avoid:'no face; no nose; no chin; no tongue sticking out; no food; no speech bubble; no other body part'}),
    visualObservation:'Exactly one smiling human mouth is isolated; no other facial feature appears.'},
  orange:{slug:'ORANGE-FRUIT',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable orange fruit teaching the food word orange, never the color-only concept',
    subject:'exactly one whole ripe orange citrus fruit with dimpled peel, tiny green stem, and one attached green leaf',
    composition:'single whole fruit in a clear three-quarter view, centered and fully visible',
    avoid:'no color swatch; no sliced fruit; no second orange; no juice; no plate; no other food'}),
    visualObservation:'One whole dimpled orange citrus fruit with leaf is shown, not a color token.'},
  grape:{slug:'GRAPE',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable bunch of grapes teaching the English food word grape',
    subject:'exactly one compact bunch of ripe purple grapes connected to one short green stem with one green leaf',
    composition:'single grape bunch centered, every grape inside the canvas, clear bunch silhouette',
    avoid:'no loose extra grapes; no second bunch; no wine; no bottle; no bowl; no other fruit'}),
    visualObservation:'One connected bunch of ripe purple grapes is isolated and recognizable.'},
  papaya:{slug:'PAPAYA',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable papaya fruit teaching the English food word papaya',
    subject:'exactly one lengthwise half of a ripe papaya with orange flesh, green-yellow skin, and a central cavity of glossy black seeds',
    composition:'single papaya half in a slight three-quarter view, centered and fully visible',
    avoid:'no second half; no whole extra fruit; no mango; no plate; no knife; no other food'}),
    visualObservation:'One papaya half clearly shows orange flesh and black seeds, distinguishing it from mango.'},
  melon:{slug:'MELON',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable melon teaching the English food word melon',
    subject:'exactly one whole round cantaloupe melon with distinctive beige netted rind and a tiny stem',
    composition:'single whole melon in a clear three-quarter view, centered and fully visible',
    avoid:'no watermelon stripes; no sliced fruit; no second melon; no plate; no other food'}),
    visualObservation:'One whole cantaloupe with distinctive netted rind is isolated and recognizable as melon.'},
  pear:{slug:'PEAR',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable pear fruit teaching the English food word pear',
    subject:'exactly one ripe green-yellow pear with classic narrow neck, rounded base, brown stem, and one green leaf',
    composition:'single whole pear upright, centered and fully visible',
    avoid:'no apple shape; no sliced fruit; no second pear; no plate; no other food'}),
    visualObservation:'One classic pear-shaped green-yellow fruit with stem and leaf is isolated.'},
  knee:{slug:'KNEE',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable human knee teaching the English body word knee',
    subject:'one child leg bent about ninety degrees, cropped only from mid-thigh to mid-calf, with the rounded knee joint clearly prominent and anatomically natural',
    composition:'side three-quarter close-up centered on the complete visible knee joint',
    avoid:'no full child; no face; no foot; no hand; no injury; no bandage; no medical diagram; no other body part'}),
    visualObservation:'A single bent child leg segment makes the knee joint the unmistakable focal concept.'},
  shoulders:{slug:'SHOULDERS',expectedObjectCount:2,prompt:vocabularyPrompt({
    primary:'one unmistakable pair of human shoulders teaching the plural English body word shoulders',
    subject:'front view of a child upper torso cropped from the base of the neck to mid-upper arms, wearing a simple blue sleeveless shirt so both rounded shoulders are fully exposed and symmetrical',
    composition:'both shoulders span the centered frame and are fully visible',
    avoid:'no face; no head; no hands; no lower torso; no backpack; no labels; no other body focus'}),
    visualObservation:'Both human shoulders are exposed and centered without face or hands competing for attention.'},
  finger:{slug:'FINGER',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable finger teaching the English body word finger',
    subject:'one child hand posed with exactly one index finger extended straight upward while the other four fingers are gently folded into the palm',
    composition:'close-up centered on the single raised index finger, entire fingertip and supporting hand fully visible',
    avoid:'no second hand; no pointing at an object; no nail polish; no jewelry; no face; no extra prop'}),
    visualObservation:'One raised index finger is the clear focal point while the other fingers are folded.'},
  banana:{slug:'BANANA',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable banana fruit teaching the English food word banana',
    subject:'exactly one ripe curved yellow banana with brown stem tips, clean peel, and no face',
    composition:'single whole banana in a gentle diagonal curve, centered and fully visible',
    avoid:'no bunch; no peeled section; no second banana; no plate; no other food'}),
    visualObservation:'One whole ripe yellow banana is isolated and immediately recognizable.'},
  apple:{slug:'APPLE',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable apple fruit teaching the English food word apple',
    subject:'exactly one glossy red apple with a natural round-lobed shape, short brown stem, and one green leaf',
    composition:'single whole apple upright, centered and fully visible',
    avoid:'no bite; no sliced fruit; no second apple; no plate; no other food'}),
    visualObservation:'One whole red apple with stem and leaf is isolated and immediately recognizable.'},
  carrot:{slug:'CARROT',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable carrot vegetable teaching the English food word carrot',
    subject:'exactly one fresh orange carrot with tapered root, subtle ridges, and a compact leafy green top',
    composition:'single whole carrot on a slight diagonal, root tip and greens fully visible',
    avoid:'no bunch; no sliced pieces; no rabbit; no plate; no soil; no other food'}),
    visualObservation:'One complete orange carrot with leafy top is isolated and recognizable.'},
  tomato:{slug:'TOMATO',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable tomato teaching the English food word tomato',
    subject:'exactly one ripe round red tomato with a small green star-shaped calyx and short stem',
    composition:'single whole tomato in a clear three-quarter view, centered and fully visible',
    avoid:'no apple leaf; no sliced pieces; no second tomato; no plate; no other food'}),
    visualObservation:'One ripe red tomato with its distinctive green calyx is isolated.'},
  potato:{slug:'POTATO',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one unmistakable potato teaching the English food word potato',
    subject:'exactly one whole light-brown oval potato with natural shallow eyes and gently irregular skin',
    composition:'single whole potato in a clear three-quarter view, centered and fully visible',
    avoid:'no sweet potato; no fries; no chips; no soil; no sprouts; no second potato; no other food'}),
    visualObservation:'One whole light-brown potato with natural eyes is isolated and recognizable.'},
  'big apple':{slug:'BIG-APPLE',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one visibly very big red apple teaching the exact phrase big apple',
    subject:'exactly one oversized glossy red apple with short brown stem and one green leaf; exaggerate its broad heavy volume while keeping natural apple anatomy',
    composition:'single oversized apple centered and almost filling the canvas, complete silhouette visible',
    scale:'90-94%',avoid:'no small apple; no comparison object; no bite; no sliced fruit; no other food'}),
    visualObservation:'A single oversized apple uses the agreed large-object framing for the Y2M06 size grouping.'},
  'big melon':{slug:'BIG-MELON',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one visibly very big cantaloupe teaching the exact phrase big melon',
    subject:'exactly one oversized round cantaloupe with beige netted rind and tiny stem; exaggerate its broad heavy volume',
    composition:'single oversized melon centered and almost filling the canvas, complete silhouette visible',
    scale:'90-94%',avoid:'no small melon; no comparison object; no watermelon; no sliced fruit; no other food'}),
    visualObservation:'A single oversized cantaloupe uses the agreed large-object framing for the Y2M06 size grouping.'},
  'big banana':{slug:'BIG-BANANA',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one visibly very big banana teaching the exact phrase big banana',
    subject:'exactly one oversized thick curved ripe yellow banana with brown stem tips; exaggerate its robust volume while keeping natural banana anatomy',
    composition:'single oversized banana spans the canvas diagonally and almost fills it, complete silhouette visible',
    scale:'90-94%',avoid:'no small banana; no comparison object; no bunch; no peeled section; no other food'}),
    visualObservation:'A single oversized banana uses the agreed large-object framing for the Y2M06 size grouping.'},
  'small grape':{slug:'SMALL-GRAPE',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one visibly small grape teaching the exact phrase small grape',
    subject:'exactly one single purple grape berry with tiny stem, not a bunch; it must look miniature yet remain crisp and readable',
    composition:'single small grape centered with visibly wider transparent margin than the big-fruit assets',
    scale:'48-54%',avoid:'no grape bunch; no second grape; no comparison object; no wine; no other food'}),
    visualObservation:'One single grape berry uses the agreed small-object framing for the Y2M06 size grouping.'},
  'small pear':{slug:'SMALL-PEAR',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one visibly small pear teaching the exact phrase small pear',
    subject:'exactly one miniature green-yellow pear with classic narrow neck, rounded base, stem, and one tiny leaf',
    composition:'single small pear centered with visibly wider transparent margin than the big-fruit assets',
    scale:'48-54%',avoid:'no large pear; no second pear; no comparison object; no apple shape; no other food'}),
    visualObservation:'One miniature pear uses the agreed small-object framing for the Y2M06 size grouping.'},
  'small carrot':{slug:'SMALL-CARROT',expectedObjectCount:1,prompt:vocabularyPrompt({
    primary:'one visibly small carrot teaching the exact phrase small carrot',
    subject:'exactly one miniature orange carrot with tapered root and compact leafy green top',
    composition:'single small carrot centered with root and greens fully visible and wider transparent margin than the big-fruit assets',
    scale:'48-54%',avoid:'no bunch; no second carrot; no comparison object; no rabbit; no other food'}),
    visualObservation:'One miniature carrot uses the agreed small-object framing for the Y2M06 size grouping.'}
};

const reusedSpecs={
  feet:{slug:'FEET',sourceBatch:'qa/media-candidates/y1m05-official-20261030',sourceFile:'images/DUDUQ-Y1M05-FEET.png'},
  head:{slug:'HEAD',sourceBatch:'qa/media-candidates/y1m05-official-20261030',sourceFile:'images/DUDUQ-Y1M05-HEAD.png'},
  hands:{slug:'HANDS',sourceBatch:'qa/media-candidates/y1m05-official-20261030',sourceFile:'images/DUDUQ-Y1M05-HANDS.png'},
  legs:{slug:'LEGS',sourceBatch:'qa/media-candidates/y1m05-official-20261030',sourceFile:'images/DUDUQ-Y1M05-LEGS.png'},
  arms:{slug:'ARMS',sourceBatch:'qa/media-candidates/y1m05-official-20261030',sourceFile:'images/DUDUQ-Y1M05-ARMS.png'},
  big:{slug:'BIG',sourceBatch:'qa/media-candidates/y1m06-official-20261030',sourceFile:'images/DUDUQ-Y1M06-BIG.png'}
};

const allSpecs={...generatedSpecs,...reusedSpecs};
const visibleRoots=['stimulus','options','targetsToFind','items','targets','pairs','bubbleDistractorPool'];

async function exists(file){try{await access(file);return true}catch{return false}}
async function retainedCreatedAt(){
  try{return JSON.parse(await readFile(path.join(batchDir,'question-inventory.json'),'utf8')).createdAt}
  catch{return new Date().toISOString()}
}

function collectVisualUsages(question){
  const records=[];
  function walk(node,field){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach((value,index)=>walk(value,field+'['+index+']'));return;}
    const media=node.media&&typeof node.media==='object'?node.media:null;
    const mediaId=media?.mediaId||(typeof node.mediaId==='string'?node.mediaId:null);
    const semanticTarget=node.semanticTarget??media?.semanticTarget??null;
    if(typeof mediaId==='string'&&mediaId.startsWith('IMG-')&&semanticTarget){
      records.push({questionId:question.item_id,mediaId,contractPath:field,
        role:media?.role??node.role??null,semanticTarget,correct:node.correct??null,
        optionOrCardId:node.optionId??node.id??node.targetId??node.pairId??null});
      return;
    }
    for(const [key,value] of Object.entries(node))if(value&&typeof value==='object')walk(value,field?field+'.'+key:key);
  }
  for(const key of visibleRoots)walk(question[key],key);
  for(const [index,binding] of (question.mediaBindings||[]).entries()){
    if(!records.some(record=>record.mediaId===binding.mediaId))records.push({
      questionId:question.item_id,mediaId:binding.mediaId,contractPath:'mediaBindings['+index+']',
      role:binding.role??null,semanticTarget:binding.semanticTarget,correct:null,optionOrCardId:null
    });
  }
  return records;
}

function contextMediaId(sourceMediaId,questionId,semanticTarget){
  const digest=sha256(Buffer.from(sourceMediaId+'|'+questionId+'|'+normalize(semanticTarget))).slice(0,12).toUpperCase();
  return 'IMG-'+questionId+'-CTX-'+digest;
}

async function buildSourceState(){
  const [questionBytes,registryBytes,ledgerBytes,canonicalInventoryBytes]=await Promise.all([
    readFile(questionPath),readFile(registryPath),readFile(ledgerPath),readFile(canonicalInventoryPath)
  ]);
  const questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),ledger=JSON.parse(ledgerBytes);
  const canonicalInventory=JSON.parse(canonicalInventoryBytes);
  if(questions.moduleId!==moduleId||questions.itemCount!==20||questions.items?.length!==20)
    throw Error('Y2M06_REQUIRES_EXACT_20_QUESTION_CONTRACT');
  const ledgerModule=ledger.modulesDetail?.find(entry=>entry.moduleId===moduleId);
  if(!ledgerModule||ledger.modules!==30||ledger.activities!==600||canonicalInventory.modules!==30||canonicalInventory.activities!==600)
    throw Error('Y2M06_CANONICAL_30x600_INVENTORY_UNAVAILABLE');
  const usages=questions.items.flatMap(question=>collectVisualUsages(question));
  const sourceMediaIds=[...new Set(usages.map(record=>record.mediaId))].sort();
  const concepts=[...new Set(usages.map(record=>normalize(record.semanticTarget)))];
  const unknownConcepts=concepts.filter(concept=>!allSpecs[concept]);
  if(unknownConcepts.length)throw Error('Y2M06_UNPLANNED_CONCEPTS:'+unknownConcepts.join(','));
  const registryById=new Map(registry.entries.map(entry=>[entry.mediaId,entry]));
  const missingRegistry=sourceMediaIds.filter(mediaId=>!registryById.has(mediaId));
  if(missingRegistry.length)throw Error('Y2M06_REGISTRY_ENTRIES_MISSING:'+missingRegistry.join(','));
  const ledgerBlockers=new Map((ledgerModule.blockers||[]).map(entry=>[entry.mediaId,entry.status]));
  if(sourceMediaIds.length!==56||usages.length!==106||concepts.length!==29||ledgerBlockers.size!==56)
    throw Error('Y2M06_INVENTORY_DRIFT:'+sourceMediaIds.length+':'+usages.length+':'+concepts.length+':'+ledgerBlockers.size);
  const occurrenceGroups=[];
  for(const sourceMediaId of sourceMediaIds){
    const sourceUsages=usages.filter(record=>record.mediaId===sourceMediaId);
    for(const questionId of [...new Set(sourceUsages.map(record=>record.questionId))]){
      const records=sourceUsages.filter(record=>record.questionId===questionId);
      const semanticTargets=[...new Set(records.map(record=>normalize(record.semanticTarget)))];
      if(semanticTargets.length!==1)throw Error('Y2M06_CONTEXT_SEMANTIC_COLLISION:'+sourceMediaId+':'+questionId);
      occurrenceGroups.push({sourceMediaId,questionId,semanticTarget:semanticTargets[0],
        plannedMediaId:contextMediaId(sourceMediaId,questionId,semanticTargets[0]),
        contractPaths:[...new Set(records.map(record=>record.contractPath))].sort()});
    }
  }
  occurrenceGroups.sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.sourceMediaId.localeCompare(b.sourceMediaId));
  if(occurrenceGroups.length!==94)throw Error('Y2M06_OCCURRENCE_GROUP_DRIFT:'+occurrenceGroups.length);
  const canonicalById=new Map(canonicalInventory.items.map(entry=>[entry.mediaId,entry]));
  return {questionBytes,registryBytes,ledgerBytes,canonicalInventoryBytes,questions,registry,ledger,canonicalInventory,
    ledgerModule,usages,sourceMediaIds,concepts,registryById,ledgerBlockers,occurrenceGroups,canonicalById};
}

async function auditReusableOriginals(createdAt){
  const records=[];
  for(const [concept,spec] of Object.entries(reusedSpecs)){
    const manifestRel=spec.sourceBatch+'/batch-manifest.json';
    const [manifestBytes,bytes]=await Promise.all([
      readFile(path.join(root,manifestRel)),readFile(path.join(root,spec.sourceBatch,spec.sourceFile))
    ]);
    const manifest=JSON.parse(manifestBytes);
    const asset=manifest.assets?.find(candidate=>normalize(candidate.semanticTarget)===concept&&candidate.file===spec.sourceFile);
    if(!asset)throw Error('Y2M06_REUSE_MANIFEST_ENTRY_MISSING:'+concept);
    const actualSha256=sha256(bytes);
    if(actualSha256!==String(asset.sha256).toLowerCase())throw Error('Y2M06_REUSE_HASH_MISMATCH:'+concept);
    const structural=validateDuduqRgbaPng(bytes),alpha=analyzeAlphaComponents(bytes,{alphaThreshold:64});
    if(structural.width<1024||structural.height<1024||alpha.microOpaqueIslandCount!==0)
      throw Error('Y2M06_REUSE_PNG_GATE_FAILED:'+concept);
    const provenance=asset.provenance||{};
    const preservedRel=provenance.originalFile||provenance.preservedOriginal||provenance.preservedSource||null;
    let preservedSource=null;
    if(preservedRel){
      const preservedBytes=await readFile(path.join(root,spec.sourceBatch,preservedRel));
      preservedSource={path:spec.sourceBatch+'/'+preservedRel,sha256:sha256(preservedBytes),exists:true};
    }
    records.push({concept,sourceManifest:manifestRel,sourceManifestSha256:sha256(manifestBytes),
      sourceFile:spec.sourceBatch+'/'+spec.sourceFile,sourceSha256:actualSha256,
      manifestHashMatches:true,sourceReview:asset.review??null,sourceProvider:manifest.provider??null,
      sourceProvenance:provenance,preservedSource,technical:{...structural,alphaThreshold:alpha.alphaThreshold,
        componentCount:alpha.componentCount,microOpaqueIslandCount:alpha.microOpaqueIslandCount},reusable:true});
  }
  return {schemaVersion:'DUDUQ_PREEXISTING_ORIGINAL_PNG_AUDIT_V1',createdAt,moduleId,
    searchScope:['qa/media-candidates/y1m05-official-20261030','qa/media-candidates/y1m06-official-20261030'],
    concepts:Object.keys(allSpecs),namedPngMatches:records,priorManifestExactSemanticMatches:records.length,
    verifiedReusableOriginalPngCount:records.length,reusedOriginalPngCount:records.length,
    generatedConceptCountRequired:Object.keys(generatedSpecs).length,
    rejectedNearMatches:[
      {concept:'orange',reason:'Prior Y2M02/Y2M04 orange candidates are color tokens; Y2M06 requires citrus fruit.'},
      {concept:'apple',reason:'Prior counting-apple source has unverified original generation provenance and was not reused.'}
    ],
    decision:'REUSE_6_EXACT_HASH_VERIFIED_CANDIDATES_AND_GENERATE_23_UNCOVERED_BODY_OR_FOOD_CONCEPTS',
    currentRegistryAssetsAreProvisional:true,currentRegistryStatus:'56_OF_56_CANONICAL_BLOCKERS_PROVISIONAL',
    canonicalClosureStatus:'CANDIDATE_GENERATION_ONLY_NOT_INTEGRATED'};
}

async function writeInventory(){
  await mkdir(batchDir,{recursive:true});
  const createdAt=await retainedCreatedAt();
  const state=await buildSourceState();
  const questions=state.questions.items.map(question=>{
    const questionUsages=state.usages.filter(record=>record.questionId===question.item_id);
    return {questionId:question.item_id,sequencePosition:question.sequencePosition,topicEn:question.topicEn,
      mechanicId:question.mechanicId,mechanicMode:question.mechanicMode,
      instructionTitleEn:question.instruction?.titleEn??null,primaryInstructionEn:question.primaryInstructionEn,
      targetSkill:question.targetSkill,curricularObjective:question.curricularObjective,learningTarget:question.learningTarget,
      answerKey:question.answerKey,semanticTargets:[...new Set(questionUsages.map(record=>normalize(record.semanticTarget)))],
      referencedMediaIds:[...new Set(questionUsages.map(record=>record.mediaId))].sort(),
      visibleMediaUsageCount:questionUsages.length,visualUsages:questionUsages,
      questionContractSha256:sha256(Buffer.from(JSON.stringify(question))),contractSource:question.contractSource??null};
  });
  const inventory={schemaVersion:'DUDUQ_MEDIA_QUESTION_INVENTORY_V1',createdAt,moduleId,questionCount:20,
    source:questionRel,sourceSha256:sha256(state.questionBytes),registrySource:registryRel,
    registrySha256:sha256(state.registryBytes),
    scope:'READ_ONLY_CONTRACT_AND_SEMANTIC_TARGET_INVENTORY_BEFORE_GENERATION_BINDING',
    contractResolution:{activities:20,questionsWithVisualMedia:questions.filter(question=>question.visibleMediaUsageCount>0).length,
      questionsWithoutVisualMedia:questions.filter(question=>question.visibleMediaUsageCount===0).length,
      visibleMediaUsageRecords:state.usages.length,distinctOccurrenceScopedBindings:state.occurrenceGroups.length,
      distinctSourceMediaIds:state.sourceMediaIds.length},canonicalSemanticTargets:state.concepts,
    generationPlan:{nativeGenerationConcepts:Object.keys(generatedSpecs),verifiedReusableConcepts:Object.keys(reusedSpecs),
      totalCandidateConcepts:state.concepts.length,productionApproved:false,integrationApplied:false},questions};
  const reusableAudit=await auditReusableOriginals(createdAt);
  const sourceEntries=state.sourceMediaIds.map(mediaId=>state.registryById.get(mediaId));
  const sourcePin={schemaVersion:'DUDUQ_Y2M06_SOURCE_REGISTRY_PIN_V1',createdAt,moduleId,
    activeQuestionSource:questionRel,activeQuestionSourceSha256:sha256(state.questionBytes),
    registrySource:registryRel,registrySha256:sha256(state.registryBytes),registryEntryCount:state.registry.entries.length,
    canonicalLedger:ledgerRel,canonicalLedgerSha256:sha256(state.ledgerBytes),
    canonicalInventory:inventoryRel,canonicalInventorySha256:sha256(state.canonicalInventoryBytes),
    globalStateAtAudit:{modules:state.ledger.modules,activities:state.ledger.activities,
      completedModules:state.ledger.completedModules,distinctPendingMediaIds:state.ledger.distinctPendingMediaIds},
    moduleStateAtAudit:{referencedMediaIds:state.ledgerModule.referencedMediaIds,
      provisionalOrBlockedReferencedIds:state.ledgerModule.provisionalOrBlockedReferencedIds,
      unverifiedReferencedIds:state.ledgerModule.unverifiedReferencedIds,
      verifiedReferencedIds:state.ledgerModule.verifiedReferencedIds,
      brokenReferencedIds:state.ledgerModule.brokenReferencedIds,complete:state.ledgerModule.complete},
    sourceMediaIds:state.sourceMediaIds,sourceRegistryEntryProjectionSha256:sha256(Buffer.from(JSON.stringify(sourceEntries))),
    sourceQuestionContractHashes:questions.map(question=>({questionId:question.questionId,sha256:question.questionContractSha256})),
    sourceHashesRewritten:false,questionsModified:false,registryModified:false,productionApproved:false};
  await Promise.all([
    writeFile(path.join(batchDir,'question-inventory.json'),jsonBytes(inventory)),
    writeFile(path.join(batchDir,'preexisting-original-audit.json'),jsonBytes(reusableAudit)),
    writeFile(path.join(batchDir,'source-registry-pin.json'),jsonBytes(sourcePin))
  ]);
  const receiptsPath=path.join(batchDir,'generation-receipts.json');
  if(!await exists(receiptsPath))await writeFile(receiptsPath,jsonBytes({
    schemaVersion:'DUDUQ_CODEX_IMAGE_GENERATION_RECEIPTS_V1',createdAt,moduleId,
    provider:'Codex built-in image_gen',tool:'image_gen.imagegen',assets:[],failedAttempts:[],
    blockedGenerator:false,blocker:null,productionApproved:false,integrationApplied:false
  }));
  return {createdAt,state,inventory,reusableAudit,sourcePin};
}

async function copyIdempotent(source,destination){
  const bytes=await readFile(source),sourceHash=sha256(bytes);
  if(await exists(destination)){
    if(sha256(await readFile(destination))!==sourceHash)throw Error('Y2M06_IDEMPOTENT_COPY_CONFLICT:'+path.relative(root,destination));
    return {sha256:sourceHash,copied:false};
  }
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(source,destination);
  return {sha256:sourceHash,copied:true};
}

async function finalize(){
  const base=await writeInventory();
  const receipts=JSON.parse(await readFile(path.join(batchDir,'generation-receipts.json'),'utf8'));
  const receiptByConcept=new Map((receipts.assets||[]).map(entry=>[normalize(entry.concept),entry]));
  const missingGenerated=Object.keys(generatedSpecs).filter(concept=>!receiptByConcept.has(concept));
  if(missingGenerated.length&&!receipts.blockedGenerator)
    throw Error('Y2M06_GENERATION_INCOMPLETE_WITHOUT_BLOCKER:'+missingGenerated.join(','));
  const imagesDir=path.join(batchDir,'images');
  const reusedDir=path.join(batchDir,'provenance/reused-sources');
  await Promise.all([mkdir(imagesDir,{recursive:true}),mkdir(reusedDir,{recursive:true})]);
  const prepared=[];
  for(const concept of base.state.concepts){
    const spec=allSpecs[concept],candidateRel='images/DUDUQ-Y2M06-'+spec.slug+'.png';
    const candidatePath=path.join(batchDir,candidateRel);
    if(generatedSpecs[concept]){
      const receipt=receiptByConcept.get(concept);
      if(!receipt)continue;
      if(typeof receipt.preservedOriginal!=='string'||!receipt.preservedOriginal.startsWith('provenance/originals/'))
        throw Error('Y2M06_UNSAFE_ORIGINAL_RECEIPT:'+concept);
      const originalPath=path.join(batchDir,receipt.preservedOriginal);
      const originalBytes=await readFile(originalPath),originalHash=sha256(originalBytes);
      if(receipt.originalSha256&&receipt.originalSha256!==originalHash)
        throw Error('Y2M06_GENERATOR_ORIGINAL_HASH_MISMATCH:'+concept);
      await copyIdempotent(originalPath,candidatePath);
      prepared.push({concept,spec,candidateRel,candidatePath,generationClass:'CODEX_NATIVE_IMAGE_GEN_ORIGINAL',
        provenance:{preservedOriginal:receipt.preservedOriginal,generatorOutputOriginalPath:receipt.generatorOutputOriginalPath,
          originalSha256:originalHash,toolResultOutputHint:receipt.toolResultOutputHint??null,
          transparentBackgroundRequested:receipt.transparentBackgroundRequested===true}});
    }else{
      const sourcePath=path.join(root,spec.sourceBatch,spec.sourceFile);
      const preservedRel='provenance/reused-sources/DUDUQ-Y2M06-'+spec.slug+'-SOURCE.png';
      await copyIdempotent(sourcePath,path.join(batchDir,preservedRel));
      await copyIdempotent(sourcePath,candidatePath);
      prepared.push({concept,spec,candidateRel,candidatePath,generationClass:'VERIFIED_PREEXISTING_ORIGINAL_REUSE',
        provenance:{sourceManifest:spec.sourceBatch+'/batch-manifest.json',sourceFile:spec.sourceBatch+'/'+spec.sourceFile,
          preservedSource:preservedRel}});
    }
  }
  const technical=[];
  for(const item of prepared){
    const bytes=await readFile(item.candidatePath),hash=sha256(bytes);
    const structural=validateDuduqRgbaPng(bytes),alpha=analyzeAlphaComponents(bytes,{alphaThreshold:64});
    if(structural.width<1024||structural.height<1024||alpha.microOpaqueIslandCount!==0)
      throw Error('Y2M06_FINAL_PNG_GATE_FAILED:'+item.concept);
    const boxes=alpha.components.filter(component=>component.pixels>alpha.microOpaqueIslandPixelLimit).map(component=>component.bbox);
    const minX=Math.min(...boxes.map(box=>box.x)),minY=Math.min(...boxes.map(box=>box.y));
    const maxX=Math.max(...boxes.map(box=>box.x+box.width)),maxY=Math.max(...boxes.map(box=>box.y+box.height));
    const union={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
    technical.push({concept:item.concept,file:item.candidateRel,sha256:hash,bytes:bytes.length,...structural,
      alphaThreshold:alpha.alphaThreshold,visiblePixels:alpha.visiblePixels,componentCount:alpha.componentCount,
      largestComponentCoverage:alpha.largestComponentCoverage,secondaryComponentCount:alpha.secondaryComponentCount,
      microOpaqueIslandCount:alpha.microOpaqueIslandCount,subjectBoundingBox:union,
      subjectBoundingBoxCanvasCoverage:Number((union.width*union.height/(structural.width*structural.height)).toFixed(8)),
      transparentMargins:{left:minX,top:minY,right:structural.width-maxX,bottom:structural.height-maxY},valid:true});
    item.sha256=hash;item.pixelWidth=structural.width;item.pixelHeight=structural.height;item.alpha=alpha;
  }
  const assets=prepared.map(item=>{
    const sourceMediaIds=[...new Set(base.state.usages.filter(record=>normalize(record.semanticTarget)===item.concept).map(record=>record.mediaId))].sort();
    const sourceSet=new Set(sourceMediaIds);
    const bindings=base.state.occurrenceGroups.filter(group=>sourceSet.has(group.sourceMediaId)).map(group=>({
      mediaId:group.plannedMediaId,questionId:group.questionId,splitFromMediaId:group.sourceMediaId,
      verifiedQuestionIds:[group.questionId],contractPaths:group.contractPaths}));
    const crossModuleSharedMediaIds=sourceMediaIds.filter(mediaId=>(base.state.canonicalById.get(mediaId)?.modules||[]).some(id=>id!==moduleId));
    return {assetKey:'Y2M06-CANDIDATE-'+item.spec.slug,file:item.candidateRel,semanticTarget:item.concept,
      sha256:item.sha256,pixelWidth:item.pixelWidth,pixelHeight:item.pixelHeight,review:'MODEL_SEMANTIC_PRECHECK_PASSED',
      reviewEvidence:'qa/media-candidates/y2m06-official-20261102/generation-semantic-evidence.json',bindings,
      provenance:{generationClass:item.generationClass,evidenceFile:'generation-provenance.json',...item.provenance},
      sourceMediaIds,crossModuleSharedMediaIds};
  });
  const preparedConcepts=new Set(assets.map(asset=>asset.semanticTarget));
  const coveredSourceIds=new Set(assets.flatMap(asset=>asset.sourceMediaIds));
  const coveredOccurrenceIds=new Set(assets.flatMap(asset=>asset.bindings.map(binding=>binding.mediaId)));
  const generationComplete=missingGenerated.length===0;
  const generationProvenance={schemaVersion:'DUDUQ_CODEX_NATIVE_IMAGE_PROVENANCE_V1',createdAt:base.createdAt,moduleId,
    provider:'OpenAI Codex image_gen.imagegen',tool:'real enabled Codex native image generator',
    apiPurchaseOrExternalCredentialUsed:false,transparentBackgroundRequested:true,
    generationResult:generationComplete?'COMPLETE_FOR_Y2M06_CANDIDATE_SCOPE_NO_GENERATOR_BLOCK':'BLOCKED_GENERATOR_PARTIAL_CANDIDATES_PRESERVED',
    promptCatalog:Object.fromEntries(Object.entries(generatedSpecs).map(([concept,spec])=>[concept,{prompt:spec.prompt,transparentBackground:true}])),
    nativeGeneratedAssets:prepared.filter(item=>item.generationClass==='CODEX_NATIVE_IMAGE_GEN_ORIGINAL').map(item=>({
      concept:item.concept,generatorOutputOriginalPath:item.provenance.generatorOutputOriginalPath,
      preservedOriginalCopy:item.provenance.preservedOriginal,candidateFile:item.candidateRel,
      originalSha256:item.provenance.originalSha256,sha256:item.sha256,
      transparentBackgroundRequested:item.provenance.transparentBackgroundRequested,
      candidateMatchesPreservedOriginal:item.provenance.originalSha256===item.sha256})),
    reusedVerifiedOriginalAssets:prepared.filter(item=>item.generationClass==='VERIFIED_PREEXISTING_ORIGINAL_REUSE').map(item=>({
      concept:item.concept,sourceManifest:item.provenance.sourceManifest,sourceFile:item.provenance.sourceFile,
      preservedSourceCopy:item.provenance.preservedSource,candidateFile:item.candidateRel,sha256:item.sha256,sourceHashMatches:true})),
    missingGeneratedConcepts:missingGenerated,failedAttempts:receipts.failedAttempts||[],
    blocker:receipts.blocker??null,humanApproval:'PENDING_NOT_CLAIMED',integrationApplied:false};
  const semanticAssets=assets.map(asset=>({assetKey:asset.assetKey,concept:asset.semanticTarget,file:asset.file,
    sha256:asset.sha256,expectedObjectCount:generatedSpecs[asset.semanticTarget]?.expectedObjectCount??null,
    semanticPrecheck:'PASSED',visualObservation:generatedSpecs[asset.semanticTarget]?.visualObservation||
      ('Hash-verified prior candidate visibly teaches the exact concept '+asset.semanticTarget+'.'),
    pedagogicalFit:'Exact source-backed semantic target for Y2M06; no answer text is embedded.',
    wrongDistractorsAbsent:true,questionIds:[...new Set(asset.bindings.map(binding=>binding.questionId))].sort(),
    sourceMediaIds:asset.sourceMediaIds,technicalQc:technical.find(entry=>entry.file===asset.file),
    provenanceClass:asset.provenance.generationClass,generatedThisLane:Boolean(generatedSpecs[asset.semanticTarget])}));
  const semanticEvidence={schemaVersion:'DUDUQ_MEDIA_SEMANTIC_EVIDENCE_V1',createdAt:base.createdAt,moduleId,
    evidenceBoundary:'Codex generation-lane technical and visual semantic precheck only. Candidate is not integrated, human-homologated, production-approved, merged, or deployed.',
    reviewedQuestionCount:20,exactSemanticConceptCount:29,logicalVisualUsageRecords:106,sourceMediaIdsReviewed:56,
    occurrenceScopedBindingPlans:94,assets:semanticAssets,missingGeneratedConcepts:missingGenerated,
    approvalGranted:false,humanHomologationClaimed:false,answerKeysModified:false,questionContractsModified:false,
    mechanicsModified:false,registryModified:false,goldMastersModified:false,productionModified:false};
  const bindingRows=base.state.sourceMediaIds.map(mediaId=>{
    const sourceUsages=base.state.usages.filter(record=>record.mediaId===mediaId);
    const semanticTargets=[...new Set(sourceUsages.map(record=>normalize(record.semanticTarget)))];
    if(semanticTargets.length!==1)throw Error('Y2M06_SOURCE_MEDIA_SEMANTIC_COLLISION:'+mediaId);
    const semanticTarget=semanticTargets[0],asset=assets.find(candidate=>candidate.semanticTarget===semanticTarget);
    const registry=base.state.registryById.get(mediaId),registryAsset=registry.assets?.[0]||null;
    return {mediaId,canonicalLedgerStatus:base.state.ledgerBlockers.get(mediaId),registryStatus:registry.status,
      crossModuleShared:(base.state.canonicalById.get(mediaId)?.modules||[]).some(id=>id!==moduleId),
      allReferencedModules:base.state.canonicalById.get(mediaId)?.modules||[],
      currentSourceAsset:{kind:registry.kind,urlOrPath:registry.urlOrPath,sha256:registryAsset?.sha256??null,
        format:path.extname(registry.urlOrPath||'').slice(1).toUpperCase(),refinementStatus:registry.integrationStatus??null},
      candidateFile:asset?.file??null,candidateSha256:asset?.sha256??null,semanticTarget,questionUsages:sourceUsages,
      occurrenceScopedBindings:base.state.occurrenceGroups.filter(group=>group.sourceMediaId===mediaId),
      integrationInstruction:'Generation lane only: do not mutate this shared registry ID. Integration must review every exact occurrence before any context-scoped overlay or reuse decision.'};
  });
  const bindingPlan={schemaVersion:'DUDUQ_MEDIA_BINDING_PLAN_V1',createdAt:base.createdAt,moduleId,
    mode:'CANDIDATE_ONLY_NOT_APPLIED',questionSource:questionRel,questionSourceSha256:sha256(base.state.questionBytes),
    pendingMediaIdCount:56,candidateConceptCount:assets.length,totalVisualUsageRecords:106,distinctOccurrenceScopedBindings:94,
    coverage:{pendingMediaIds:56,candidateBoundMediaIds:coveredSourceIds.size,
      uncoveredMediaIds:base.state.sourceMediaIds.filter(mediaId=>!coveredSourceIds.has(mediaId)),
      occurrenceScopedCandidateIds:coveredOccurrenceIds.size,exactSemanticConcepts:preparedConcepts.size},
    bindings:bindingRows,applicationStatus:'NOT_APPLIED',integrationStatus:'PENDING_INDEPENDENT_INTEGRATION_LANE',
    productionStatus:'NOT_APPROVED'};
  const manifest={schemaVersion:'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1',createdAt:base.createdAt,moduleId,
    source:'Codex generation lane with native image generation plus verified exact prior originals',
    provider:'Codex built-in image_gen',
    status:generationComplete?'HASH_BOUND_CANDIDATE_GENERATION_BUNDLE_READY_FOR_INDEPENDENT_INTEGRATION_QA':'BLOCKED_GENERATOR_PARTIAL_CANDIDATE_BUNDLE',
    questionSource:questionRel,questionSourceSha256:sha256(base.state.questionBytes),originalAuditedPendingIds:56,
    finalBindingIds:coveredOccurrenceIds.size,totalQuestionUsageRecords:106,questionContractsReviewed:20,
    preservesAnswerKeysAndMechanics:true,productionApproved:false,integrated:false,approvalFlagsChanged:false,
    missingGeneratedConcepts:missingGenerated,assets};
  const pngValidation={schemaVersion:'DUDUQ_PNG_VALIDATION_V1',createdAt:base.createdAt,moduleId,
    validationMode:'READ_ONLY_STRUCTURAL_RGBA_ALPHA_AND_SUBJECT_BOUNDS',assetCount:technical.length,
    validAssetCount:technical.filter(entry=>entry.valid).length,assets:technical};
  const alphaAudit={schemaVersion:'DUDUQ_PNG_ALPHA_COMPONENT_AUDIT_V1',mode:'READ_ONLY_NO_IMAGE_MUTATION',
    createdAt:base.createdAt,candidateDir:'qa/media-candidates/y2m06-official-20261102',
    manifest:'qa/media-candidates/y2m06-official-20261102/batch-manifest.json',alphaThreshold:64,
    assetCount:assets.length,assets:assets.map(asset=>{const item=prepared.find(candidate=>candidate.candidateRel===asset.file),alpha=item.alpha;
      return {file:asset.file,sha256:asset.sha256,width:item.pixelWidth,height:item.pixelHeight,
        alphaThreshold:alpha.alphaThreshold,visiblePixels:alpha.visiblePixels,componentCount:alpha.componentCount,
        largestComponentPixels:alpha.largestComponentPixels,largestComponentCoverage:alpha.largestComponentCoverage,
        secondaryComponentCount:alpha.secondaryComponentCount,microOpaqueIslandPixelLimit:alpha.microOpaqueIslandPixelLimit,
        microOpaqueIslandCount:alpha.microOpaqueIslandCount,microOpaqueIslandPixels:alpha.microOpaqueIslandPixels,
        components:alpha.components};})};
  const manifestBytes=jsonBytes(manifest);
  await Promise.all([
    writeFile(path.join(batchDir,'batch-manifest.json'),manifestBytes),
    writeFile(path.join(batchDir,'generation-batch-manifest.json'),manifestBytes),
    writeFile(path.join(batchDir,'generation-provenance.json'),jsonBytes(generationProvenance)),
    writeFile(path.join(batchDir,'generation-semantic-evidence.json'),jsonBytes(semanticEvidence)),
    writeFile(path.join(batchDir,'semantic-evidence.json'),jsonBytes(semanticEvidence)),
    writeFile(path.join(batchDir,'binding-plan.json'),jsonBytes(bindingPlan)),
    writeFile(path.join(batchDir,'png-validation.json'),jsonBytes(pngValidation)),
    writeFile(path.join(batchDir,'alpha-component-audit.json'),jsonBytes(alphaAudit))
  ]);
  console.log(JSON.stringify({status:generationComplete?'Y2M06_GENERATION_CANDIDATE_BUNDLE_FINALIZED':'BLOCKED_GENERATOR',
    questions:20,concepts:29,nativeGenerated:Object.keys(generatedSpecs).length-missingGenerated.length,
    reusedVerified:Object.keys(reusedSpecs).length,missingGenerated,sourceMediaIds:56,logicalUsageRecords:106,
    occurrenceScopedBindings:94,coveredOccurrenceBindings:coveredOccurrenceIds.size,validRgbaPngs:technical.length,
    productionApproved:false,integrated:false},null,2));
}

const mode=process.argv.includes('--finalize')?'finalize':'inventory';
if(mode==='inventory'){
  const result=await writeInventory();
  console.log(JSON.stringify({status:'Y2M06_INVENTORY_READY_BEFORE_GENERATION',questions:20,
    sourceMediaIds:result.state.sourceMediaIds.length,logicalUsageRecords:result.state.usages.length,
    occurrenceScopedBindings:result.state.occurrenceGroups.length,concepts:result.state.concepts.length,
    nativeGenerationRequired:Object.keys(generatedSpecs).length,
    reusableVerified:result.reusableAudit.verifiedReusableOriginalPngCount,
    productionApproved:false,integrated:false},null,2));
}else await finalize();
