/* Year 2 Gamification Diversity — Bubble Pop exact-alternative postprocessor
   Homologation-only consolidation patch.
   Uses Bubble Pop's supported legacy payload shape so a canonical four-option
   question renders exactly those four options, rather than the universal
   adapter's optional visual duplicate distractor.
*/
(function(){
  "use strict";
  const base=window.DuduQYear2GamificationDiversity;
  if(!base||typeof base.apply!=="function"){
    throw new Error("[Year2 Bubble Exact] Diversity adapter must load first.");
  }
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
  function patchBubble(question){
    const review=question.metadata?.gamificationReview;
    const source=review?.canonicalAlternatives;
    const answer=String(review?.canonicalAnswer||"");
    if(!Array.isArray(source)||!source.length||!answer) throw new Error(`[Year2 Bubble Exact] canonical source missing in ${question.id}`);
    const alternatives=Array.isArray(question.alternatives)?question.alternatives:[];
    if(alternatives.length!==source.length) throw new Error(`[Year2 Bubble Exact] alternative count drift in ${question.id}`);
    const answerIndex=source.findIndex((value)=>String(value)===answer);
    if(answerIndex<0) throw new Error(`[Year2 Bubble Exact] canonical answer missing from alternatives in ${question.id}`);
    const tones=["blue","pink","green","yellow","purple","orange","aqua"];
    question.bubbles=alternatives.map((alternative,index)=>({
      id:String(alternative.id||`opt-${index+1}`),
      label:String(alternative.text||"●"),
      alt:`Representação visual da alternativa ${index+1}`,
      tone:tones[index%tones.length],
      speechText:String(source[index]),
      speechLanguage:"en-US"
    }));
    question.targetIds=[String(alternatives[answerIndex].id||`opt-${answerIndex+1}`)];
    question.mode="single-target";
    question.behavior={...(question.behavior||{}),shuffleBubbles:true};
    question.metadata.bubbleAlternativeCountPreserved=true;
    question.metadata.bubbleCanonicalAlternativeCount=source.length;
  }
  function apply(sourceModule){
    const module=clone(base.apply(sourceModule));
    for(const activity of module.activities||[]){
      if(activity.mechanic!=="bubble-pop") continue;
      for(const question of activity.questions||[]) patchBubble(question);
    }
    module.gamificationAudit={...(module.gamificationAudit||{}),bubbleExactAlternativeCount:true};
    return Object.freeze(module);
  }
  window.DuduQYear2GamificationDiversityExact=Object.freeze({
    version:base.version+"+bubble-exact",
    plan:base.plan,
    visualLabel:base.visualLabel,
    apply
  });
})();
