#!/usr/bin/env node
/** Crosswalk all available source files against the audited 600 questions.
 * Filename/translation matches are leads only; only visually reviewed exact
 * concepts become preview candidates, and none receive human approval here.
 */
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const inventoryPath=path.resolve(process.argv[2]||'docs/qa/assets-duduq-source-inventory-20261030.json');
const output=path.resolve(process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'qa/results/assets-duduq-question-crosswalk.json');
const safe=(base,target)=>target===base||target.startsWith(base+path.sep);
if(!safe(root,output))throw Error('OUTPUT_MUST_REMAIN_IN_REPOSITORY');
const inventory=JSON.parse(await readFile(inventoryPath,'utf8'));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const aliases={
  dog:['dog','dogs','cachorro','cachorros','cao','caes'],cat:['cat','cats','gato','gata','gatos','gatas'],
  fish:['fish','peixe','peixes'],bird:['bird','birds','passaro','passaros','ave','aves'],turtle:['turtle','tortoise','tartaruga','tartarugas'],
  apple:['apple','apples','maca','macas'],banana:['banana','bananas'],pear:['pear','pears','pera','peras'],
  backpack:['backpack','backpacks','school bag','schoolbag','school bags','schoolbags','mochila','mochilas'],
  eraser:['eraser','erasers','rubber','borracha','borrachas'],pencil:['pencil','pencils','lapis'],
  pencil_case:['pencil case','pencilcase','estojo'],
  ruler:['ruler','rulers','regua','reguas'],pen:['pen','pens','caneta','canetas'],crayon:['crayon','crayons','giz de cera'],
  book:['book','books','livro','livros'],notebook:['notebook','notebooks','caderno','cadernos'],school:['school','escola'],
  red:['red','vermelho','vermelha','vermelhos','vermelhas'],blue:['blue','azul'],green:['green','verde'],yellow:['yellow','amarelo','amarela'],
  orange:['orange','laranja'],orange_fruit:['orange fruit','laranja fruta'],purple:['purple','roxo','roxa'],black:['black','preto','preta'],white:['white','branco','branca'],
  hello:['hello','oi','ola'],goodbye:['goodbye','bye','tchau','adeus'],
  boy:['boy','menino','garoto'],girl:['girl','menina','garota'],head:['head','cabeca'],hand:['hand','mao'],hands:['hands','maos'],
  leg:['leg','perna'],legs:['legs','pernas'],eye:['eye','olho'],eyes:['eyes','olhos'],ear:['ear','orelha'],ears:['ears','orelhas'],
  shirt:['shirt','camisa'],jacket:['jacket','jaqueta'],cap:['cap','bone'],hat:['hat','chapeu'],glasses:['glasses','oculos'],
  car:['car','carro'],ball:['ball','bola'],doll:['doll','boneca'],kite:['kite','pipa'],
  // Newly uploaded 31-Oct concepts are discovery leads only; visually unreviewed
  // images remain SEMANTIC_REVIEW_REQUIRED, especially contextual compositions.
  bathroom:['bathroom','banheiro'],bedroom:['bedroom','quarto'],kitchen:['kitchen','cozinha'],
  living_room:['living room','sala de estar'],dining_room:['dining room','sala de jantar'],
  dress:['dress','vestido'],sneakers:['sneakers','tenis','tenis esportivo'],
  blue_jacket:['blue jacket','jaqueta azul'],red_cap:['red cap','bone vermelho'],
  dining:['dining','jantar'],sleeping:['sleeping','sleep','dormindo','dormir'],
  eating:['eating','comendo','comer'],mouth:['mouth','boca'],nose:['nose','nariz'],arm:['arm','braco','braços','bracos'],
  bus:['bus','onibus'],train:['train','trem'],plane:['plane','airplane','aviao'],
  truck:['truck','caminhao'],carrot:['carrot','cenoura'],
  // Exact bilingual lead discovery; NO automatic pedagogical approval.
  one:['one','um','1'],two:['two','dois','2'],three:['three','tres','3'],
  four:['four','quatro','4'],five:['five','cinco','5'],six:['six','seis','6'],
  seven:['seven','sete','7'],eight:['eight','oito','8'],nine:['nine','nove','9'],
  ten:['ten','dez','10'],eleven:['eleven','onze','11'],twelve:['twelve','doze','12'],
  thirteen:['thirteen','treze','13'],fourteen:['fourteen','quatorze','14'],
  fifteen:['fifteen','quinze','15'],sixteen:['sixteen','dezesseis','16'],
  seventeen:['seventeen','dezessete','17'],eighteen:['eighteen','dezoito','18'],
  nineteen:['nineteen','dezenove','19'],twenty:['twenty','vinte','20'],
  thirty:['thirty','trinta','30'],forty:['forty','quarenta','40'],
  cow:['cow','vaca'],duck:['duck','pato'],horse:['horse','cavalo'],pig:['pig','porco'],
  sheep:['sheep','ovelha'],rabbit:['rabbit','coelho'],hamster:['hamster','hamister'],
  mother:['mother','mae'],father:['father','pai'],sister:['sister','irma'],
  brother:['brother','irmao'],
  // Remove Portuguese avó/avô from exact aliases: accent folding makes both
  // indistinguishable ('avo'). The English labels in the assets disambiguate.
  grandmother:['grandmother'],grandfather:['grandfather'],
  spring:['spring','primavera'],summer:['summer','verao'],autumn:['autumn','fall','outono'],
  winter:['winter','inverno'],pink:['pink','rosa'],brown:['brown','marrom'],gray:['gray','grey','cinza'],
  wake_up:['wake up','acordar','acordando'],go_to_school:['go to school','indo para a escola','ir para escola'],
  go_to_sleep:['go to sleep','go to bed','ir dormir','indo dormir'],have_lunch:['have lunch','almocar','almocando'],
  read:['read','reading','ler','lendo'],draw:['draw','drawing','desenhar','desenhando'],
  play:['play','playing','brincar','brincando'],rest:['rest','resting','descansar','descansando'],
  brush_teeth:['brush teeth','brushing teeth','escovar dentes','escovando os dentes'],
  stand_up:['stand up','em pe','levantar'],sit_down:['sit down','sentar','sentada'],
  quiet:['quiet','silence','silencio'],
 
};
// Phrase-level multilingual discovery for greetings, not automatic approval.
aliases.good_morning=['good morning','bom dia','morning greeting'];
aliases.good_afternoon=['good afternoon','boa tarde','afternoon greeting'];
aliases.good_night=['good night','boa noite','night farewell'];
aliases.good_evening=['good evening','boa noite ao chegar'];
const aliasToConcept=new Map();for(const [concept,terms] of Object.entries(aliases))for(const term of terms)aliasToConcept.set(norm(term),concept);
for(const [concept] of Object.entries(aliases))aliasToConcept.set(norm(concept),concept);
// Only validated PNGs are considered as candidate game images; all source files
// remain present in the original inventory and are never discarded.
const sourceRows=inventory.files.filter(f=>f.detectedType==='PNG' && ['PASS','METADATA_ONLY'].includes(f.technicalStatus))
  .map(f=>({...f,filenameNormalized:norm(path.basename(f.path,path.extname(f.path)))}));
// Numeric alternatives require numeral-only assets. A scene named
// "y3-two-brown-rabbits" is NOT an illustration of the numeral two.
const numeralConcepts=new Set([
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen',
  'seventeen','eighteen','nineteen','twenty','thirty','forty'
]);
const pureColorConcepts=new Set(['red','blue','green','yellow','orange','purple','black','white','pink','brown','gray']);
const isolatedBodyParts=new Set(['head','hand','hands','leg','legs','eye','eyes','ear','ears','mouth','nose','arm']);
// Reject false-positive lexical leads before pedagogical review. This does
// not infer what an image depicts: the manual/visual review gate still applies.
function eligibleFilenameForConcept(file,concept){
  const tokens=file.filenameNormalized.split(' ');
  if(numeralConcepts.has(concept)){
    const terms=new Set(aliases[concept].flatMap(v=>norm(v).split(' ')));
    return tokens.every(t=>t==='number'||terms.has(t)||
      (/^\d+$/.test(t)&&terms.has(String(Number(t)))));
  }
  if(pureColorConcepts.has(concept))
    return tokens[0]==='cor'||tokens[0]==='color';
  if(isolatedBodyParts.has(concept)){
    const terms=new Set(aliases[concept].flatMap(v=>norm(v).split(' ')));
    return tokens.every(t=>terms.has(t));
  }
  // A pencil case is NOT a pencil. This collision had hidden the fourth
  // Y1M04-Q020 option despite a case image already existing in Assets-DuduQ.
  if(concept==='pencil'&&tokens.some(t=>['case','pencilcase','estojo'].includes(t)))
    return false;
  if(concept==='play'&&tokens.some(t=>['logo','eduq','duduq'].includes(t)))
    return false;
  if(['apple','banana','pear','carrot'].includes(concept))
    return !/(?:^| )(?:like|prefer|gosta|rejeitando|eating|comendo)(?: |$)/.test(file.filenameNormalized);
  return true;
}
const mediaByConcept=new Map();
for(const f of sourceRows){
  const concepts=new Set();
  // Match only complete normalized alias phrases, never substrings (e.g. dog != doghouse).
  for(const [alias,concept] of aliasToConcept){
    const tokens=f.filenameNormalized.split(' '),a=alias.split(' ');
    if(a.length&&a.length<=tokens.length&&tokens.some((_,i)=>tokens.slice(i,i+a.length).join(' ')===alias))concepts.add(concept);
  }
  f.filenameConceptHints=[...concepts].sort();
  for(const concept of concepts){if(!eligibleFilenameForConcept(f,concept))continue;const list=mediaByConcept.get(concept)||[];list.push(f);mediaByConcept.set(concept,list);}
}
const visuallyReviewed=new Map(sourceRows.filter(f=>f.visualReview?.status==='CODEX_VISUALLY_INSPECTED').map(f=>[f.path,f.visualReview.semantic]));
const questions=[];
for(let year=1;year<=5;year++){
  const data=JSON.parse(await readFile(path.join(root,`docs/qa/media-audit-20261029/year-${year}.json`),'utf8'));
  for(const mod of data.modules)for(const q of mod.questions){
    const options=[];
    for(const option of q.options||[]){
      const semantic=norm(option.semanticTarget);
      let concept=aliasToConcept.get(semantic)||null;
      // Orange is both a fruit and a color. Select a candidate domain ONLY
      // when the actual question provides unambiguous contextual evidence.
      // Conflicting or absent domain evidence stays unassigned.
      if(semantic==='orange'||semantic==='laranja'){
        const context=norm([q.learningTarget,q.instructionPt,q.visualRequirement]
          .filter(x=>typeof x==='string').join(' '));
        const colorDomain=/(?:^| )(?:color|colors|cor|cores)(?: |$)/.test(context);
        const fruitDomain=/(?:^| )(?:fruit|fruits|fruta|frutas|food|foods|alimento|alimentos|comida|comidas)(?: |$)/.test(context);
        concept=colorDomain!==fruitDomain?(colorDomain?'orange':'orange_fruit'):null;
      }
      const candidates=concept?(mediaByConcept.get(concept)||[]).map(file=>({sourcePath:file.path,sha256:file.sha256,dimensions:file.dimensions,
        format:file.detectedType,technicalStatus:file.technicalStatus,visualReview:file.visualReview.status,
        associationStatus:visuallyReviewed.get(file.path)===concept?'VISUAL_EXACT_PRECHECK_HUMAN_QA_PENDING':'SEMANTIC_REVIEW_REQUIRED'})):[];
      options.push({optionId:option.optionId,label:option.label,answerKey:option.answerKey,correct:option.correct===true,
        semanticTarget:option.semanticTarget,mediaId:option.mediaId,candidateCount:candidates.length,candidates});
    }
    questions.push({year,moduleId:mod.moduleId,questionId:q.questionId,mechanic:q.mechanic,learningTarget:q.learningTarget,
      instructionPt:q.instructionPt,audioTranscript:q.audioTranscript||null,visualRequirement:q.visualRequirement||null,
      correctAnswer:q.correctAnswer,semanticReview:q.semanticReview,mediaIds:q.mediaIds||[],primaryMediaId:q.imageRef||null,options});
  }
}
if(questions.length!==600)throw Error('EXPECTED_600_QUESTIONS:'+questions.length);
// Full reverse binding graph, including shared media IDs and question-level media.
// This is an audit index: candidate paths are lexical leads, never image approval.
const mediaById=new Map();
function addBinding(rawMediaId,q,slot,option){
  const mediaId=typeof rawMediaId==='string'?rawMediaId.trim():'';
  if(!mediaId)return;
  let row=mediaById.get(mediaId);
  if(!row){row={mediaId,uses:[],candidatePaths:new Set(),semantics:new Set()};mediaById.set(mediaId,row);}
  const semantic=typeof option?.semanticTarget==='string'?norm(option.semanticTarget):null;
  if(semantic)row.semantics.add(semantic);
  for(const candidate of option?.candidates||[])row.candidatePaths.add(candidate.sourcePath);
  row.uses.push({questionId:q.questionId,moduleId:q.moduleId,slot,
    optionId:option?.optionId||null,semanticTarget:option?.semanticTarget||null,
    correct:option?.correct===true,answerKey:option?.answerKey??null});
}
for(const q of questions){
  const coveredByOptions=new Set();
  for(const o of q.options){
    if(typeof o.mediaId==='string'&&o.mediaId.trim()){
      addBinding(o.mediaId,q,'OPTION',o);coveredByOptions.add(o.mediaId.trim());
    }
  }
  const otherIds=[...(Array.isArray(q.mediaIds)?q.mediaIds:[]),q.primaryMediaId];
  for(const id of new Set(otherIds)){
    if(typeof id==='string'&&id.trim()&&!coveredByOptions.has(id.trim()))
      addBinding(id,q,'QUESTION_LEVEL',null);
  }
}
const bindingIndex=[...mediaById.values()].map(entry=>{
  const questions=[...new Set(entry.uses.map(x=>x.questionId))].sort();
  const semantics=[...entry.semantics].sort();
  const candidatePaths=[...entry.candidatePaths].sort();
  const flags=[];
  if(semantics.length>1)flags.push('MULTIPLE_OPTION_SEMANTICS_REVIEW');
  if(semantics.includes('orange')||/ORANGE/i.test(entry.mediaId))flags.push('ORANGE_COLOR_VS_FRUIT_REVIEW');
  if(semantics.includes('white')||/WHITE/i.test(entry.mediaId))flags.push('WHITE_CONTRAST_BLOCK');
  if(semantics.includes('banana')||/BANANA/i.test(entry.mediaId))flags.push('BANANA_TEMPORARY_FIELD_AUDIT');
  if(questions.length>1)flags.push('SHARED_MEDIA_ID_ALL_USES_REQUIRED');
  const classification=flags.some(x=>x==='WHITE_CONTRAST_BLOCK'||x==='BANANA_TEMPORARY_FIELD_AUDIT')
    ?'QUARANTINED_FOR_TARGETED_QA'
    :candidatePaths.length?'SOURCE_HINT_REVIEW_REQUIRED':'NO_SOURCE_HINT';
  return {mediaId:entry.mediaId,questionCount:questions.length,occurrenceCount:entry.uses.length,
    questions,semantics,candidatePaths,flags,classification,uses:entry.uses};
}).sort((a,b)=>b.questionCount-a.questionCount||a.mediaId.localeCompare(b.mediaId));
const candidateSources=new Map();
for(const item of bindingIndex)for(const sourcePath of item.candidatePaths){
  let row=candidateSources.get(sourcePath);
  if(!row){row={path:sourcePath,mediaIds:new Set(),questions:new Set(),flags:new Set()};candidateSources.set(sourcePath,row);}
  row.mediaIds.add(item.mediaId);
  for(const q of item.questions)row.questions.add(q);
  for(const flag of item.flags)row.flags.add(flag);
}
const sourceIndex=[...candidateSources.values()].map(row=>({
  sourcePath:row.path,mediaIds:[...row.mediaIds].sort(),
  possibleQuestionCount:row.questions.size,questionIds:[...row.questions].sort(),
  riskFlags:[...row.flags].sort(),status:'DISCOVERY_ONLY_PEDAGOGICAL_QA_REQUIRED'
})).sort((a,b)=>b.possibleQuestionCount-a.possibleQuestionCount||a.sourcePath.localeCompare(b.sourcePath));
const bindingsSummary={
  uniqueMediaIds:bindingIndex.length,
  totalOccurrences:bindingIndex.reduce((n,x)=>n+x.occurrenceCount,0),
  sharedMediaIds:bindingIndex.filter(x=>x.questionCount>1).length,
  conflictedMediaIds:bindingIndex.filter(x=>x.flags.includes('MULTIPLE_OPTION_SEMANTICS_REVIEW')).length,
  quarantinedMediaIds:bindingIndex.filter(x=>x.classification==='QUARANTINED_FOR_TARGETED_QA').length,
  mediaIdsWithCandidateHints:bindingIndex.filter(x=>x.candidatePaths.length).length
};
const allOptions=questions.flatMap(q=>q.options),candidateOptions=allOptions.filter(o=>o.candidateCount>0);
const reviewedOptions=candidateOptions.filter(o=>o.candidates.some(c=>c.associationStatus==='VISUAL_EXACT_PRECHECK_HUMAN_QA_PENDING'));
const report={schemaVersion:'ASSETS_DUDUQ_BILINGUAL_600_QUESTION_CROSSWALK_V1',sourceRepository:inventory.sourceRepository,sourceCommit:inventory.sourceCommit,
  inventoryPath:path.relative(root,inventoryPath).replaceAll('\\','/'),inventoryFiles:inventory.fileCount,uniqueSourceHashes:inventory.uniqueSha256,
  inventoryStatus:inventory.status,questionCount:questions.length,optionCount:allOptions.length,
  candidateOptions:candidateOptions.length,optionsWithVisuallyReviewedExactConcept:reviewedOptions.length,
  humanPedagogicalApproval:'PENDING',matchingRule:'Bilingual exact normalized aliases are discovery hints only. No filename-only match is approved.',
  sourceImageFiles:sourceRows.length,sourceCandidateCount:sourceIndex.length,
  sourceProvenanceLevel:inventory.status==='SOURCE_GIT_TREE_METADATA_ONLY'?'GIT_TREE_METADATA_ONLY':'FILE_BYTES_INSPECTED',
  uniqueGitBlobShas:inventory.uniqueGitBlobShas??null,bindingsSummary,mediaBindingIndex:bindingIndex,sourceCandidateIndex:sourceIndex,
  provenanceWarning:'20261029 questions are historical QA snapshots. Confirm against current compiled 600 contracts and registry before any change.',questions};
const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');await writeFile(output,bytes);
console.log(JSON.stringify({status:'CROSSWALK_COMPLETE_REVIEW_REQUIRED',inventoryFiles:inventory.fileCount,questions:questions.length,options:allOptions.length,
  optionsWithCandidates:candidateOptions.length,visuallyReviewedExactCandidateOptions:reviewedOptions.length,sourceImageFiles:sourceRows.length,
  sourceCandidateCount:sourceIndex.length,bindingsSummary,output:path.relative(root,output).replaceAll('\\','/')},null,2));
