/* DUDUQ English Y3 — guided reading profile for shared pedagogical orchestrator.
   Track B only. Extends intent eligibility through profile overrides; no forked router.
*/
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQY3GuidedReadingProfile=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const YEAR_PROFILE="Y3_GUIDED_READING";
  const profiles=Object.freeze({
    "smart-sentence":Object.freeze({
      maxReading:"R2",
      intents:[
        "complete_sentence","build_sentence","guided_sentence","dialogue_completion",
        "profile_comprehension","visual_description","question_answer_pairing"
      ],
      modalities:["text","image","audio"],supportsRetry:true
    }),
    "target-shooter":Object.freeze({
      maxReading:"R2",
      intents:["recognize_audio_number","recognize_audio_image","recognize_audio_word","recognize_visual_word","listen_discriminate"],
      modalities:["text","image","audio"],supportsRetry:true
    }),
    "bubble-pop":Object.freeze({
      maxReading:"R2",
      intents:["recognize_audio_number","recognize_audio_word","recognize_audio_image","listen_discriminate","profile_comprehension"],
      modalities:["text","image","audio"],supportsRetry:true
    }),
    "matching":Object.freeze({
      maxReading:"R2",
      intents:["semantic_pairing","question_answer_pairing","quantity_match"],
      modalities:["text","image","audio"],supportsRetry:true
    }),
    "word-slash":Object.freeze({
      maxReading:"R1",
      intents:["lexical_discrimination","listen_discriminate"],
      modalities:["text","image","audio","manipulation"],supportsRetry:true
    }),
    "drag-drop":Object.freeze({
      maxReading:"R2",
      intents:["classify","sequence","spatial_place","quantity_match","construction"],
      modalities:["text","image","audio","manipulation"],supportsRetry:true
    })
  });
  return Object.freeze({version:"1.0.0-track-b",yearProfile:YEAR_PROFILE,mechanicProfiles:profiles});
});
