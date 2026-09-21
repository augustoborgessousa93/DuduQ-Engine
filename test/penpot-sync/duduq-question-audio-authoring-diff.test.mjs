import assert from "node:assert/strict";
import { semanticDiff } from "../../scripts/duduq-question-audio-live-snapshot.mjs";
const source={resolution:"AUTHORIZED_AUTHORING_SOURCE",authorizedControlPanel:true};
const snap=(fill)=>({componentId:"QUESTION_AUDIO",semanticId:"question-audio",source,surface:{fills:[{color:fill}]},dimensions:{width:56,height:56},icon:{}});
assert.equal(semanticDiff(snap("#349FDF"),snap("#8B5CF6")).state,"CHANGE_DETECTED");
assert.equal(semanticDiff(snap("#349FDF"),snap("#349FDF")).state,"NO_CHANGES");
assert.equal(semanticDiff(snap("#349FDF"),snap("#8B5CF6")).changed.includes("surface"),true);
console.log("QuestionAudio authoring diff regression: PASS");
