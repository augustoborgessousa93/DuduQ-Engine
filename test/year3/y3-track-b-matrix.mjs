import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Matrix=require('../../content/english/year-3/y3-orchestration-matrix-v1.js');
const Profile=require('../../content/english/year-3/y3-guided-reading-profile-v1.js');
const Orchestrator=require('../../content/english/shared/pedagogical-orchestrator-v1.js');

function gitBlobSha(content){const b=Buffer.from(content);return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex')}
function readModule(moduleNumber){
  const meta=Matrix.sourceModules[moduleNumber];
  const source=fs.readFileSync(meta.file,'utf8');
  assert.equal(gitBlobSha(source),meta.blob,`M${moduleNumber}: source blob changed`);
  let published=null;
  const context={window:{DuduQYear3Factory:{publish(spec){published=spec;return spec}}},console};
  vm.createContext(context);vm.runInContext(source,context,{filename:meta.file});
  assert.ok(published,`M${moduleNumber}: module did not publish`);
  assert.equal(published.items.length,15,`M${moduleNumber}: expected 15 items`);
  return published.items;
}

const sourceItems=[];
for(let m=1;m<=6;m++)sourceItems.push(...readModule(m));
assert.equal(sourceItems.length,90);
const matrix=Matrix.materialize(sourceItems);
assert.equal(matrix.length,90);
assert.equal(new Set(matrix.map(r=>r.ID)).size,90);

for(const row of matrix){
  assert.ok(row.sourceInvariant.id);
  assert.ok(row.sourceInvariant.answer?.id);
  assert.ok(row.sourceInvariant.answer?.text);
  assert.ok(row.sourceInvariant.skill);
  assert.ok(row.sourceInvariant.ability);
  assert.ok(row.sourceInvariant.difficulty);
  assert.ok(row.sourceInvariant.linguisticTarget);
  assert.ok(['R0','R1','R2'].includes(row.readingDemand),`${row.ID}: Y3 reading gate`);
  assert.equal(row.status.orchestration,'READY');
  const a={interactionIntent:row.interactionIntent,readingDemand:row.readingDemand,requiredModalities:row.requiredModalities,recommendedMechanic:row.primaryMechanic,secondChoice:row.secondaryMechanic,dragSemanticRole:row.dragSemanticRole};
  if(row.primaryMechanic==='drag-drop')a.dragValueJustification='Sequenciar cartões reproduz diretamente a ordem auditiva-alvo.';
  const eligibility=Orchestrator.mechanicEligibilityAudit(a,row.primaryMechanic,Profile.yearProfile,Profile.mechanicProfiles);
  assert.equal(eligibility.status,'PASS',`${row.ID}: ${row.primaryMechanic} ${JSON.stringify(eligibility)}`);
}

const distribution=Matrix.distribution();
assert.deepEqual(distribution,{'smart-sentence':43,'word-slash':1,'bubble-pop':3,'target-shooter':42,'drag-drop':1});
assert.equal(distribution.matching||0,0);

const m01=matrix.filter(r=>r.module===1);
assert.equal(m01.length,15);
assert.equal(m01.filter(r=>r.currentRuntimeMechanic==='drag-drop').length,13);
assert.equal(m01.filter(r=>r.currentRuntimeMechanic==='target-shooter').length,2);
assert.equal(m01.filter(r=>r.status.execution==='READY').length,15,'M01 sentinel planning must be execution-eligible before wiring');

console.log('Y3_SOURCE_BASELINE = PASS — 90/90 IDs, answers, skills, abilities, difficulties and linguistic targets frozen');
console.log('Y3_MATRIX = PASS — 90/90 orchestration decisions materialized');
console.log('DISTRIBUTION',JSON.stringify(distribution));
console.log('M01_SENTINEL_PLANNING = PASS — 15/15 execution-eligible');
