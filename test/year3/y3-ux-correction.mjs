import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

const BaseMatrix=require('../../content/english/year-3/y3-orchestration-matrix-v1.js');
const Matrix=require('../../content/english/year-3/y3-ux-orchestration-v1.js');
const Profile=require('../../content/english/year-3/y3-guided-reading-profile-v1.js');
const Orchestrator=require('../../content/english/shared/pedagogical-orchestrator-v1.js');
const Ux=require('../../content/english/year-3/year3-ux-presentation-v1.js');

globalThis.DuduQPedagogicalOrchestrator=Orchestrator;
globalThis.DuduQY3GuidedReadingProfile=Profile;
globalThis.DuduQY3OrchestrationMatrix=Matrix;
let activeModule=0;
globalThis.DuduQAssets={resolveImageDetails(query){
  const raw=String(query||'').trim().toLowerCase();
  if(!raw)return null;
  if(activeModule>=3&&/[:\s]/.test(raw))return null;
  const key=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');
  return {key,url:`https://assets.invalid/${encodeURIComponent(key)}.png`};
}};

const Factory=require('../../content/english/year-3/year3-track-b-factory-v1.js');
Factory.clearPendingCanonicalAssets();

function readSource(moduleNumber){
  const tag=String(moduleNumber).padStart(2,'0');
  const sourcePath=`content/english/year-3/module-${tag}/module-${tag}-v1.js`;
  const source=fs.readFileSync(sourcePath,'utf8');
  let spec=null;
  const context={window:{DuduQYear3Factory:{publish(value){spec=value;return value}}},console};
  vm.createContext(context);vm.runInContext(source,context,{filename:sourcePath});
  assert.ok(spec,`M${tag}: source spec missing`);
  assert.equal(spec.items.length,15,`M${tag}: 15 source items`);
  return spec;
}

function distribution(questions){
  return questions.reduce((out,q)=>{const m=q.delivery.mechanic;out[m]=(out[m]||0)+1;return out},{});
}
function maxStreak(entries){
  let max=0,current=0,last='';
  const runs=[];
  let start=null;
  entries.forEach((entry,index)=>{
    if(entry.mechanic===last){current+=1;}else{
      if(current)runs.push({mechanic:last,count:current,start,end:index-1});
      last=entry.mechanic;current=1;start=index;
    }
    max=Math.max(max,current);
  });
  if(current)runs.push({mechanic:last,count:current,start,end:entries.length-1});
  return {max,runs};
}

const EXPECTED_BY_MODULE={
  1:{'smart-sentence':9,'word-slash':1,'bubble-pop':3,'target-shooter':1,'drag-drop':1},
  2:{'target-shooter':8,'smart-sentence':4,'bubble-pop':3},
  3:{'target-shooter':10,'smart-sentence':5},
  4:{'target-shooter':10,'smart-sentence':5},
  5:{'target-shooter':9,'smart-sentence':6},
  6:{'target-shooter':9,'smart-sentence':6}
};
const BEFORE_TOTAL={'target-shooter':42,'smart-sentence':43,'bubble-pop':3,'drag-drop':1,'word-slash':1,'matching':0};
const EXPECTED_AFTER={'target-shooter':47,'smart-sentence':35,'bubble-pop':6,'drag-drop':1,'word-slash':1,'matching':0};
const STREAK_EXCEPTIONS=[
  {module:2,ids:['EN3-M2-01','EN3-M2-02','EN3-M2-03','EN3-M2-04','EN3-M2-05','EN3-M2-06','EN3-M2-07'],mechanic:'target-shooter',reason:'Numeral→áudio exige áudio individual repetível nas opções; Smart converteria reconhecimento em construção, Matching artificializaria o item e Bubble Pop não oferece pré-escuta individual equivalente.'},
  {module:4,ids:['EN3-M4-01','EN3-M4-02','EN3-M4-03','EN3-M4-04','EN3-M4-05'],mechanic:'target-shooter',reason:'O símbolo/operação precisa permanecer visível enquanto as opções orais são repetíveis; não há alternativa atual igualmente fiel.'},
  {module:5,ids:['EN3-M5-01','EN3-M5-02','EN3-M5-03','EN3-M5-04','EN3-M5-05'],mechanic:'target-shooter',reason:'Bloco coerente de reconhecimento visual de formas. Bubble Pop não recebe o estímulo visual da pergunta e Matching exigiria ampliar a evidência para pares não solicitados.'},
  {module:6,ids:['EN3-M6-01','EN3-M6-02','EN3-M6-03','EN3-M6-04','EN3-M6-05'],mechanic:'target-shooter',reason:'Bloco coerente de reconhecimento visual de transportes. As demais mecânicas atuais distorcem o construto ou perdem o estímulo visual.'}
];

const allQuestions=[];
const sourceById=new Map();
const moduleReports=[];
let longBefore=0,longAfter=0;
for(let moduleNumber=1;moduleNumber<=6;moduleNumber++){
  activeModule=moduleNumber;
  const tag=String(moduleNumber).padStart(2,'0');
  const spec=readSource(moduleNumber);
  spec.items.forEach(item=>sourceById.set(item.id,item));
  const built=Ux.applyPresentation(spec,Factory.publish(spec));
  assert.equal(built.activities.length,15,`M${tag}: built 15`);
  assert.equal(built.implementationStatus,'PASS',`M${tag}: implementation`);
  assert.equal(built.technicalBlockers,0,`M${tag}: blockers`);
  const questions=built.activities.map(activity=>activity.questions[0]);
  assert.deepEqual(distribution(questions),EXPECTED_BY_MODULE[moduleNumber],`M${tag}: distribution`);
  const instructions=[];
  for(const q of questions){
    const source=sourceById.get(q.id);
    assert.ok(source,`${q.id}: source exists`);
    assert.equal(q.metadata.sourceInvariant.id,source.id);
    assert.equal(q.metadata.sourceInvariant.skill,source.skill);
    assert.equal(q.metadata.sourceInvariant.ability,source.ability);
    assert.deepEqual(q.metadata.sourceInvariant.answer,{id:source.answer.id,text:source.answer.text});
    assert.equal(q.metadata.sourceInvariant.difficulty,source.difficulty);
    assert.equal(q.metadata.sourceInvariant.linguisticTarget,source.answer.text);
    assert.equal(q.metadata.sourceStatement,source.prompt,`${q.id}: full source prompt preserved`);
    assert.equal(q.metadata.studentInstruction,q.instruction,`${q.id}: student instruction metadata`);
    assert.equal(q.statement,q.instruction,`${q.id}: visible statement/instruction parity`);
    assert.ok(q.instruction.length<=40,`${q.id}: concise instruction ${q.instruction.length}`);
    assert.ok(q.instruction.split(/\s+/).length<=5,`${q.id}: concise word count`);
    if(q.delivery.mechanic==='smart-sentence')assert.equal(q.metadata.smartSentence.instruction,q.instruction,`${q.id}: Smart visible instruction`);
    if(String(source.prompt).length>40)longBefore+=1;
    if(String(q.instruction).length>40)longAfter+=1;
    instructions.push({id:q.id,studentInstruction:q.instruction,mechanic:q.delivery.mechanic});
  }
  const moduleSequence=questions.map(q=>({id:q.id,mechanic:q.delivery.mechanic}));
  moduleReports.push({module:moduleNumber,distribution:distribution(questions),studentInstructions:instructions,maxStreak:maxStreak(moduleSequence).max});
  allQuestions.push(...questions);
  console.log(`M${tag}_CONTRACT = PASS — 15/15`);
  for(const item of instructions)console.log(`M${tag}_INSTRUCTION ${item.id} [${item.mechanic}] = ${item.studentInstruction}`);
}

assert.equal(allQuestions.length,90,'Year 3 activities');
assert.equal(new Set(allQuestions.map(q=>q.id)).size,90,'90 unique source IDs');
assert.equal(longAfter,0,'no long student instructions after correction');
const afterTotal={...distribution(allQuestions),matching:0};
assert.deepEqual(afterTotal,EXPECTED_AFTER,'Year 3 mechanic distribution after');
assert.equal(allQuestions.filter(q=>q.delivery.mechanic==='matching').length,0,'Matching must not be invented');
assert.deepEqual(allQuestions.filter(q=>q.delivery.mechanic==='drag-drop').map(q=>q.id),['EN3-M1-12'],'no decorative Drag & Drop');
assert.deepEqual(allQuestions.filter(q=>q.delivery.mechanic==='word-slash').map(q=>q.id),['EN3-M1-05'],'no artificial Word Slash');

const beforeSequence=BaseMatrix.expectedIds.map(id=>({id,mechanic:BaseMatrix.plan[id].primary,module:Number(id.match(/M(\d)-/)[1])}));
const afterSequence=BaseMatrix.expectedIds.map(id=>({id,mechanic:Matrix.plan[id].primary,module:Number(id.match(/M(\d)-/)[1])}));
const beforeStreak=maxStreak(beforeSequence);
const afterStreak=maxStreak(afterSequence);
assert.equal(beforeStreak.max,10,'baseline max streak');
assert.equal(afterStreak.max,7,'corrected max streak with documented exceptions');

for(const run of afterStreak.runs.filter(run=>run.count>4)){
  const ids=afterSequence.slice(run.start,run.end+1).map(item=>item.id);
  const exception=STREAK_EXCEPTIONS.find(entry=>entry.mechanic===run.mechanic&&JSON.stringify(entry.ids)===JSON.stringify(ids));
  assert.ok(exception,`undocumented mechanic streak ${run.mechanic} ${ids.join(',')}`);
}

const baseStreakPosition=new Map();
let previous='';let position=0;
for(const entry of beforeSequence){
  position=entry.mechanic===previous?position+1:1;
  previous=entry.mechanic;
  baseStreakPosition.set(entry.id,position);
}
const audit=BaseMatrix.expectedIds.map(id=>{
  const base=BaseMatrix.plan[id],next=Matrix.plan[id],source=sourceById.get(id),change=Matrix.uxChanges[id]||null;
  return {
    ID:id,
    module:Number(id.match(/M(\d)-/)[1]),
    interactionIntent:next.intent,
    currentMechanic:base.primary,
    eligibleAlternative1:base.secondary||next.secondary||null,
    eligibleAlternative2:null,
    streakPosition:baseStreakPosition.get(id),
    changeRecommended:base.primary!==next.primary,
    finalMechanic:next.primary,
    reason:change?.changeReason||`KEEP — ${next.reason}`,
    sourceInvariant:{answer:source.answer,skill:source.skill,ability:source.ability,difficulty:source.difficulty,linguisticTarget:source.answer.text}
  };
});

// Matching visual source audit: values are taken from the current real Matching 1.0.23 component.
const matchingHtml=fs.readFileSync('engine/releases/mechanics/matching/1.0.23/DUDUQ_MATCHING.html','utf8');
const requiredMatchingTokens=['width: min(220px,100%)','min-height: 56px','padding: 0 28px','border-radius: 18px','font: 900 19px/1 Fredoka,Nunito,sans-serif','--dq-primary: #0056B3','--dq-primary-depth: #003A7A','--dq-disabled: #E2E8F0','--dq-focus: #111827'];
for(const token of requiredMatchingTokens)assert.ok(matchingHtml.includes(token),`Matching visual reference missing: ${token}`);
const uxSource=fs.readFileSync('content/english/year-3/year3-ux-presentation-v1.js','utf8');
for(const token of ['min-height:56px','padding:0 28px','border-radius:18px','font:900 19px/1 Fredoka,Nunito,sans-serif','outline:4px solid #111827'])assert.ok(uxSource.includes(token),`Smart parity token missing: ${token}`);

fs.mkdirSync('test-results/year3',{recursive:true});
const report={
  schemaVersion:1,
  status:'YEAR3_UX_CORRECTION = PASS',
  source:'90/90 PASS',
  conciseInstructions:'PASS',
  longInstructionBefore:longBefore,
  longInstructionAfter:longAfter,
  primaryButtonParity:'CONTRACT_PASS',
  mechanicDistributionBefore:BEFORE_TOTAL,
  mechanicDistributionAfter:afterTotal,
  maxStreakBefore:beforeStreak.max,
  maxStreakAfter:afterStreak.max,
  diversityExceptions:STREAK_EXCEPTIONS,
  modules:moduleReports,
  itemAudit:audit
};
fs.writeFileSync('test-results/year3/year3-ux-correction.json',JSON.stringify(report,null,2)+'\n');

console.log(`LONG_INSTRUCTION_BEFORE = ${longBefore}`);
console.log(`LONG_INSTRUCTION_AFTER = ${longAfter}`);
console.log('YEAR3_CONCISE_INSTRUCTION_GATE = PASS');
console.log('PRIMARY_BUTTON_MATCHING_SOURCE_AUDIT = PASS');
console.log('MECHANIC_DISTRIBUTION_BEFORE',JSON.stringify(BEFORE_TOTAL));
console.log('MECHANIC_DISTRIBUTION_AFTER',JSON.stringify(afterTotal));
console.log(`MAX_SAME_MECHANIC_STREAK_BEFORE = ${beforeStreak.max}`);
console.log(`MAX_SAME_MECHANIC_STREAK_AFTER = ${afterStreak.max}`);
for(const exception of STREAK_EXCEPTIONS)console.log(`MECHANIC_STREAK_EXCEPTION M${String(exception.module).padStart(2,'0')} ${exception.mechanic} ${exception.ids.join(',')} — ${exception.reason}`);
console.log('YEAR3_UX_CORRECTION = PASS');
