/* DUDUQ English Y3 — Track B placeholder bridge.
   Minimal browser-contract fix for M03–M06: Smart Sentence 4.0.20 renders
   complete-sentence templates only when the blank uses four underscores.
   Preserve placeholder metadata and source content; normalize only the runtime
   template for semantic temporary placeholders.
*/
(function(root){
  "use strict";
  const base=root?.DuduQYear3Factory;
  if(!base||typeof base.publish!=="function")throw new Error("[DuduQ Y3 Track B] factory ausente para placeholder bridge.");
  const originalPublish=base.publish.bind(base);
  root.DuduQYear3Factory=Object.freeze({...base,publish(spec){
    const built=originalPublish(spec);
    if(Number(built?.module)>=3){
      for(const activity of built.activities||[]){
        const smart=activity?.questions?.[0]?.metadata?.smartSentence;
        const placeholder=smart?.placeholderVisual;
        if(!smart||placeholder?.visualStatus!=="TEMP_VISUAL_PLACEHOLDER")continue;
        const sentence=String(smart.sentence||"___");
        smart.sentence=sentence.replace(/_{2,}/g,"____");
      }
    }
    return built;
  }});
})(typeof globalThis!=="undefined"?globalThis:this);
