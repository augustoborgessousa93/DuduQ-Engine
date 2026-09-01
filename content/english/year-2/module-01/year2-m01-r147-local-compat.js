/* Year 2 M01 — R147 local Loader/Router compatibility. Presentation only; fail-closed. */
(function(){
"use strict";
if(window.Year2M01R147LocalCompat)return;
const MODULE_PATH="english/year2/module01v23multimodal",EXPECTED=new Set(["EN2-M1-02","EN2-M1-04"]),state={patched:[],optionAudioRemoved:[],errors:[]};
function moduleOK(){return Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)&&window.DUDUQ_GAME_CONFIG.modulePath.join("/")===MODULE_PATH}
function suppressOptionAudio(q,id){
 const alts=Array.isArray(q?.alternatives)?q.alternatives:[];
 if(alts.length<2){state.errors.push(`${id}: alternativas ausentes`);return false}
 for(const alt of alts){
  if(!alt||typeof alt!=="object")continue;
  const previous=alt.audio&&typeof alt.audio==="object"?{...alt.audio}:null;
  alt.metadata={...(alt.metadata||{}),r147SuppressedOptionAudio:previous?.text||previous?.src||"",r147OptionAudioSuppressed:true};
  alt.audio={enabled:false,src:null,text:"",language:"en-US",role:"option"};
 }
 state.optionAudioRemoved.push(id);return true;
}
function patch(){
 if(!moduleOK())return false;
 const m=window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal;if(!m||!Array.isArray(m.activities))return false;
 for(const activity of m.activities){
  if(activity?.mechanic!=="matching")continue;
  const qs=Array.isArray(activity.questions)?activity.questions:[];
  if(qs.length!==1){state.errors.push(`${activity?.id||"activity"}: matching não unitário`);continue}
  const q=qs[0],id=String(q?.id||"");
  if(!EXPECTED.has(id)){state.errors.push(`${id||activity?.id}: matching inesperado`);continue}
  const ts=q?.metadata?.targetShooter;
  if(!ts||!Array.isArray(ts.items)||ts.items.length<2||!Array.isArray(ts.correctIds)||ts.correctIds.length!==1){state.errors.push(`${id}: payload target-shooter ausente/inválido`);continue}
  if(q?.answer?.type!=="single"){state.errors.push(`${id}: answer.type não single`);continue}
  if(!suppressOptionAudio(q,id))continue;
  q.delivery={...(q.delivery||{}),mechanic:"target-shooter",allowImage:true,allowAudio:true};
  activity.mechanic="target-shooter";
  activity.id=String(activity.id||id.toLowerCase()).replace(/-matching(?=-|$)/,"-target-shooter");
  q.metadata={...(q.metadata||{}),r147LocalCompatibility:{version:"1.0.1-year2-m01-local",from:"matching",to:"target-shooter",reason:"Target Shooter payload is correct; residual per-option audio is unsupported by TS 1.0.21 Router profile",optionAudioRemoved:true,stimulusAudioPreserved:true,imagesPreserved:true,contentChanged:false,sourceAnswerPreserved:true}};
  state.patched.push(id);
 }
 const missing=[...EXPECTED].filter(id=>!state.patched.includes(id));if(missing.length)state.errors.push(`expected not patched: ${missing.join(",")}`);
 if(state.errors.length)throw new Error(`[Year2 M01 local compat] ${state.errors.join(" | ")}`);
 return true;
}
window.addEventListener("duduq:engine-ready",patch);
window.Year2M01R147LocalCompat=Object.freeze({version:"1.0.1-year2-m01-local",patch,getState:()=>({patched:[...state.patched],optionAudioRemoved:[...state.optionAudioRemoved],errors:[...state.errors]})});
})();