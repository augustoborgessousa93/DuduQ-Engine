import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const O=require("../../content/english/shared/pedagogical-orchestrator-v1.js");

assert.equal(O.version,"1.1.0-y1-y2-recovery");
assert.equal(O.YEAR_PROFILES.Y1_EARLY_LITERACY.maxReading,"R0");
assert.equal(O.YEAR_PROFILES.Y2_FOUNDATIONAL_LITERACY.maxReading,"R1");
assert.equal(O.YEAR_PROFILES.Y1_EARLY_LITERACY.smartSentenceScored,false);
assert.equal(O.YEAR_PROFILES.Y2_FOUNDATIONAL_LITERACY.smartSentenceScored,false);

const y1Visual={yearProfile:"Y1_EARLY_LITERACY",readingDemand:"R0",interactionIntent:"visual_recognition",requiredModalities:["image","audio"],motorDemand:"LOW",recommendedMechanic:"target-shooter"};
const y2Assoc={yearProfile:"Y2_FOUNDATIONAL_LITERACY",readingDemand:"R1",interactionIntent:"one_to_one_association",requiredModalities:["audio","image"],nonReaderEvidence:["audio"],motorDemand:"LOW",recommendedMechanic:"matching"};
assert.equal(O.readingDemandGate(y1Visual,"Y1_EARLY_LITERACY").status,"PASS");
assert.equal(O.readingDemandGate({...y1Visual,readingDemand:"R1"},"Y1_EARLY_LITERACY").status,"FAIL");
assert.equal(O.nonReaderGate(y2Assoc,"Y2_FOUNDATIONAL_LITERACY").status,"PASS");
assert.equal(O.nonReaderGate({...y2Assoc,autonomousEnglishReadingRequired:true},"Y2_FOUNDATIONAL_LITERACY").status,"FAIL");
assert.equal(O.motorDemandGate({...y1Visual,motorDemand:"TIMED_PRECISION"},"Y1_EARLY_LITERACY").status,"FAIL");
assert.equal(O.operationalAvailabilityGate("matching",{availableMechanics:["target-shooter"]}).status,"FAIL");

const smart=O.mechanicEligibilityAudit({...y2Assoc,interactionIntent:"complete_sentence",recommendedMechanic:"smart-sentence"},"smart-sentence","Y2_FOUNDATIONAL_LITERACY");
assert.equal(smart.status,"FAIL");
assert.ok(smart.reasons.includes("SMART_SENTENCE_BLOCKED_EARLY_LITERACY"));
const decorative=O.mechanicEligibilityAudit({...y1Visual,interactionIntent:"single_choice",dragSemanticRole:"single-choice",dragValueJustification:"just a choice"},"drag-drop","Y1_EARLY_LITERACY");
assert.equal(decorative.status,"FAIL");
assert.ok(decorative.reasons.includes("DECORATIVE_DRAG_DETECTED"));
const semanticDrag={...y2Assoc,interactionIntent:"classification",recommendedMechanic:"drag-drop",requiredModalities:["image","manipulation"],dragSemanticRole:"classification",dragSemanticReason:"sorting animals is the assessed action"};
assert.equal(O.mechanicEligibilityAudit(semanticDrag,"drag-drop","Y2_FOUNDATIONAL_LITERACY").status,"PASS");
assert.equal(O.decorativeDragDetector([{id:"ok",mechanic:"drag-drop",analysis:semanticDrag}]).status,"PASS");
assert.equal(O.decorativeDragDetector([{id:"bad",mechanic:"drag-drop",analysis:{dragSemanticRole:"single-choice"}}]).status,"FAIL");

const source={id:"Q1",skill:{description:"Recognize blue pencil"},difficulty:"BASIC",prompt:"Listen and choose.",alternatives:[{id:"A",text:"blue pencil",imageAsset:"school-pencil-blue"},{id:"B",text:"red pencil",imageAsset:"school-pencil-red"},{id:"C",text:"blue ruler",imageAsset:"school-ruler-blue"}],answer:{value:"A"},metadata:{audioText:"blue pencil",literacyDemand:"R0"}};
for(const [mechanic,builder] of [["target-shooter",O.buildTargetShooterPayload],["matching",O.buildMatchingPayload],["bubble-pop",O.buildBubblePopPayload]]){
  const built=builder(source,y1Visual,{yearProfile:"Y1_EARLY_LITERACY"});
  assert.equal(built.id,source.id,`${mechanic}: id changed`);
  assert.deepEqual(built.skill,source.skill,`${mechanic}: skill changed`);
  assert.deepEqual(built.answer,source.answer,`${mechanic}: answer changed`);
  assert.deepEqual(built.alternatives,source.alternatives,`${mechanic}: alternatives changed`);
  assert.equal(built.delivery.mechanic,mechanic);
  assert.equal(built.metadata.pedagogicalRecovery.nonReaderSupported,true);
  assert.equal(O.sourceInvariantAudit([source],[built]).status,"PASS");
}
const target=O.buildTargetShooterPayload(source,y1Visual,{yearProfile:"Y1_EARLY_LITERACY"});
assert.equal(target.metadata.targetShooter.items.length,3);
assert.deepEqual(target.metadata.targetShooter.correctIds,["A"]);
assert.equal(target.metadata.targetShooter.difficulty.timerMode,"none");
assert.equal(target.metadata.targetShooter.difficulty.timeLimitMs,0);
const matching=O.buildMatchingPayload(source,y2Assoc,{yearProfile:"Y2_FOUNDATIONAL_LITERACY"});
assert.equal(matching.metadata.matching.leftItems.length,1);
assert.equal(matching.metadata.matching.rightItems.length,3);
assert.deepEqual(matching.metadata.matching.pairs,[{leftId:"stimulus",rightId:"answer-A"}]);
const bubble=O.buildBubblePopPayload(source,y1Visual,{yearProfile:"Y1_EARLY_LITERACY"});
assert.deepEqual(bubble.payload.targetIds,["A"]);
assert.throws(()=>O.buildDragDropPayload(source,{...y1Visual,dragSemanticRole:"single-choice"},{yearProfile:"Y1_EARLY_LITERACY"}),/DRAG_SEMANTIC_REASON_REQUIRED/);
const semanticDragSource={...source,payload:{mode:"classification",items:[{id:"A",label:"cat",targetId:"wild"}],targets:[{id:"wild",label:"Wild",capacity:3}]}};
const drag=O.buildDragDropPayload(semanticDragSource,semanticDrag,{yearProfile:"Y2_FOUNDATIONAL_LITERACY"});
assert.equal(drag.delivery.mechanic,"drag-drop");
assert.equal(drag.metadata.dragSemanticRole,"classification");
assert.equal(drag.payload.mode,"classification");
assert.throws(()=>O.buildDragDropPayload(source,semanticDrag,{yearProfile:"Y2_FOUNDATIONAL_LITERACY"}),/DRAG_NATIVE_PAYLOAD_REQUIRED/);

const routed=O.orchestrate(source,y1Visual,{yearProfile:"Y1_EARLY_LITERACY",availableMechanics:["target-shooter","matching","bubble-pop"]});
assert.equal(routed.status,"BUILT");
assert.equal(routed.selection.mechanic,"target-shooter");
assert.equal(routed.gates.some(g=>g.status==="FAIL"),false);
const blocked=O.orchestrate(source,{...y1Visual,readingDemand:"R1"},{yearProfile:"Y1_EARLY_LITERACY",availableMechanics:["target-shooter"]});
assert.equal(blocked.status,"BLOCKED");
const micro=O.microblockCoherenceGate({...y1Visual,pedagogicallyEquivalentMechanics:["target-shooter","matching"]},{candidateMechanic:"target-shooter",previousMechanics:["target-shooter","target-shooter","target-shooter","target-shooter"]});
assert.equal(micro.status,"WARNING");

console.log("Y1_Y2_EARLY_LITERACY_ROUTER = PASS");
console.log("SMART_SENTENCE_Y1_Y2 = BLOCKED");
console.log("DECORATIVE_DRAG = 0_BY_CONTRACT");
