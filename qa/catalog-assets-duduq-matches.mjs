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
const aliasToConcept=new Map();for(const [concept,terms] of Object.entries(aliases))for(const term of terms)aliasToConcept.set(norm(term),concept);
for(const [concept] of Object.entries(aliases))aliasToConcept.set(norm(concept),concept);
const sourceRows=inventory.files.map(f=>({...f,filenameNormalized:norm(path.basename(f.path,path.extname(f.path)))}));
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
      (/^\\d+$/.test(t)&&terms.has(String(Number(t)))));
  }
  if(pureColorConcepts.has(concept))
    return tokens[0]==='cor'||tokens[0]==='color';
  if(isolatedBodyParts.has(concept)){
    const terms=new Set(aliases[concept].flatMap(v=>norm(v).split(' ')));
    return tokens.every(t=>terms.has(t));
  }
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
const allOptions=questions.flatMap(q=>q.options),candidateOptions=allOptions.filter(o=>o.candidateCount>0);
const reviewedOptions=candidateOptions.filter(o=>o.candidates.some(c=>c.associationStatus==='VISUAL_EXACT_PRECHECK_HUMAN_QA_PENDING'));
const report={schemaVersion:'ASSETS_DUDUQ_BILINGUAL_600_QUESTION_CROSSWALK_V1',sourceRepository:inventory.sourceRepository,sourceCommit:inventory.sourceCommit,
  inventoryPath:path.relative(root,inventoryPath).replaceAll('\\','/'),inventoryFiles:inventory.fileCount,uniqueSourceHashes:inventory.uniqueSha256,
  inventoryStatus:inventory.status,questionCount:questions.length,optionCount:allOptions.length,
  candidateOptions:candidateOptions.length,optionsWithVisuallyReviewedExactConcept:reviewedOptions.length,
  humanPedagogicalApproval:'PENDING',matchingRule:'Bilingual exact normalized aliases are discovery hints only. No filename-only match is approved.',questions};
const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');await writeFile(output,bytes);
console.log(JSON.stringify({status:'CROSSWALK_COMPLETE_REVIEW_REQUIRED',inventoryFiles:inventory.fileCount,questions:questions.length,options:allOptions.length,
  optionsWithCandidates:candidateOptions.length,visuallyReviewedExactCandidateOptions:reviewedOptions.length,output:path.relative(root,output).replaceAll('\\','/')},null,2));
