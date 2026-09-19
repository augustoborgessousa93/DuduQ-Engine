/* Y4 M05 Phase 2 — approved pedagogical plan.
   Content metadata only: no runtime wiring and no mechanic quota logic.
*/
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQY4M05Phase2Plan=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const rows=[
    ["EN4-M5-01","visual_lexical_identification","R1","target-shooter","bubble-pop","hat"],
    ["EN4-M5-02","visual_lexical_identification","R1","target-shooter","bubble-pop","jacket"],
    ["EN4-M5-03","visual_lexical_identification","R1","target-shooter","bubble-pop","glasses"],
    ["EN4-M5-04","visual_lexical_identification","R1","target-shooter","bubble-pop","dress"],
    ["EN4-M5-05","visual_lexical_identification","R1","target-shooter","bubble-pop","sneakers"],
    ["EN4-M5-06","complete_sentence","R2","smart-sentence","drag-drop","blue"],
    ["EN4-M5-07","functional_label_completion","R3","smart-sentence","drag-drop","medium"],
    ["EN4-M5-08","visual_lexical_identification","R1","target-shooter","bubble-pop","kitchen"],
    ["EN4-M5-09","visual_lexical_identification","R1","target-shooter","bubble-pop","bathroom"],
    ["EN4-M5-10","visual_lexical_identification","R1","target-shooter","bubble-pop","living room"],
    ["EN4-M5-11","visual_lexical_identification","R1","target-shooter","bubble-pop","bedroom"],
    ["EN4-M5-12","image_sentence_location_interpretation","R3","smart-sentence",null,"She’s in the kitchen."],
    ["EN4-M5-13","image_sentence_location_interpretation","R3","smart-sentence",null,"He’s in the living room."],
    ["EN4-M5-14","scene_sentence_location_interpretation","R3","smart-sentence",null,"They’re in the dining room."],
    ["EN4-M5-15","visual_attribute_chunk_identification","R2","target-shooter","bubble-pop","red cap"]
  ];
  const plan=Object.freeze(Object.fromEntries(rows.map(([sourceId,interactionIntent,readingDemand,recommendedMechanic,secondChoice,linguisticTarget])=>[
    sourceId,Object.freeze({
      sourceId,yearProfile:"Y4_FUNCTIONAL_READING",interactionIntent,readingDemand,
      requiredModalities:["image","text"],recommendedMechanic,secondChoice,
      linguisticTarget,
      assetRequirement:{required:true,canonicalOnly:true},
      preserve:Object.freeze(["id","skill","answer","difficulty","linguisticTarget"])
    })
  ])));
  const distribution=Object.freeze(Object.values(plan).reduce((out,row)=>{
    out[row.recommendedMechanic]=(out[row.recommendedMechanic]||0)+1;return out;
  },{}));
  return Object.freeze({version:"1.0.0-phase2",profile:"Y4_FUNCTIONAL_READING",plan,ids:Object.freeze(Object.keys(plan)),distribution});
});
