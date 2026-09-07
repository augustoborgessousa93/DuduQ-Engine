/* DUDUQ English Year 3 — UX presentation correction.
   - keeps the complete editorial source prompt in metadata.sourceStatement;
   - exposes only a concise studentInstruction;
   - aligns Smart Sentence CONFIRMAR with the real Matching primary action.
   No answer, validation, retry, feedback or completion logic is changed.
*/
(function(root,factory){
  "use strict";
  const api=factory(root);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQY3UxPresentation=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
  "use strict";

  const BUTTON_REFERENCE=Object.freeze({
    source:"matching@1.0.23 / .duduq-matching-primary",
    width:"min(220px, 100%)",
    minHeight:"56px",
    padding:"0 28px",
    border:"2px solid #003A7A",
    borderRadius:"18px",
    background:"linear-gradient(180deg,#1471CF 0%,#0056B3 72%,#004892 100%)",
    color:"#fff",
    boxShadow:"0 6px 0 #003A7A, 0 12px 22px rgba(0,86,179,.16), inset 0 2px 0 rgba(255,255,255,.28)",
    font:"900 19px/1 Fredoka,Nunito,sans-serif",
    focus:"4px solid #111827",
    mobileMinWidth:"190px",
    mobileMinHeight:"50px",
    mobileFontSize:"18px"
  });

  function words(text){
    return String(text||"").trim().split(/\s+/).filter(Boolean).length;
  }

  function studentInstruction(source,analysis,mechanic){
    const intent=String(analysis?.interactionIntent||"");
    const modalities=new Set(Array.isArray(analysis?.requiredModalities)?analysis.requiredModalities:[]);
    const hasVisual=modalities.has("image")||Boolean(String(source?.visualQuery||"").trim());
    const hasAudio=modalities.has("audio")||Boolean(String(source?.listenText||"").trim());

    if(mechanic==="smart-sentence"){
      if(intent==="dialogue_completion")return "Complete o diálogo.";
      if(intent==="sequence")return "Ouça e monte.";
      if(hasVisual)return "Observe e complete.";
      return "Complete a frase.";
    }
    if(mechanic==="drag-drop")return "Ouça e monte.";
    if(mechanic==="word-slash")return "Ouça e encontre.";
    if(mechanic==="matching")return hasVisual&&hasAudio?"Observe, ouça e relacione.":"Relacione os itens.";
    if(intent==="profile_comprehension")return "Ouça e escolha.";
    if(hasVisual&&hasAudio)return "Observe, ouça e escolha.";
    if(hasVisual)return "Observe e escolha.";
    if(hasAudio)return "Ouça e escolha.";
    return "Escolha a resposta.";
  }

  function assertInstruction(value,id){
    const text=String(value||"").trim();
    if(!text)throw new Error(`[DuduQ Y3 UX] ${id}: studentInstruction vazia.`);
    if(text.includes("\n"))throw new Error(`[DuduQ Y3 UX] ${id}: studentInstruction não pode ter parágrafo.`);
    if(text.length>55)throw new Error(`[DuduQ Y3 UX] ${id}: studentInstruction > 55 caracteres.`);
    if(words(text)>7)throw new Error(`[DuduQ Y3 UX] ${id}: studentInstruction excessivamente longa.`);
    return text;
  }

  function applyPresentation(sourceSpec,built){
    const sourceById=new Map((sourceSpec?.items||[]).map(item=>[item.id,item]));
    let before=0,after=0;
    const instructions=[];
    for(const activity of built?.activities||[]){
      const q=activity?.questions?.[0];
      if(!q)continue;
      const source=sourceById.get(q.id);
      if(!source)throw new Error(`[DuduQ Y3 UX] fonte não encontrada: ${q.id}`);
      const original=String(source.prompt||"").trim();
      if(original.length>55||words(original)>7)before+=1;
      const instruction=assertInstruction(studentInstruction(source,q.metadata,q.delivery?.mechanic),q.id);
      if(instruction.length>55||words(instruction)>7)after+=1;

      // SOURCE invariant: preserve the complete editorial prompt untouched.
      q.metadata.sourceStatement=original;
      q.metadata.studentInstruction=instruction;
      q.metadata.uxCorrection=Object.freeze({
        conciseInstruction:true,
        sourcePreserved:true,
        mechanic:q.delivery?.mechanic,
        orchestrationVersion:root?.DuduQY3OrchestrationMatrix?.version||"unknown"
      });
      q.statement=instruction;
      q.instruction=instruction;
      if(q.metadata.smartSentence){
        q.metadata.smartSentence.instruction=instruction;
      }
      instructions.push(Object.freeze({id:q.id,instruction,mechanic:q.delivery?.mechanic}));
    }
    const audit=Object.freeze({module:built?.module,before,after,instructions:Object.freeze(instructions)});
    root.DUDUQ_Y3_UX_AUDIT=root.DUDUQ_Y3_UX_AUDIT||{};
    root.DUDUQ_Y3_UX_AUDIT[`module${String(built?.module||0).padStart(2,"0")}`]=audit;
    return built;
  }

  function installFactoryWrapper(){
    const original=root?.DuduQYear3Factory;
    if(!original||original.__uxPresentationWrapped)return false;
    const wrapper=Object.freeze({
      ...original,
      version:`${original.version}+ux1`,
      __uxPresentationWrapped:true,
      studentInstruction,
      publish(spec){return applyPresentation(spec,original.publish(spec));}
    });
    root.DuduQYear3Factory=wrapper;
    return true;
  }

  const SMART_BUTTON_CSS=`
/* Matching 1.0.23 primary action parity — visual only. */
.duduq-smart-ts-confirm{
  position:relative!important;
  isolation:isolate!important;
  overflow:hidden!important;
  width:min(220px,100%)!important;
  min-width:0!important;
  min-height:56px!important;
  padding:0 28px!important;
  border:2px solid #003A7A!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#1471CF 0%,#0056B3 72%,#004892 100%)!important;
  color:#fff!important;
  box-shadow:0 6px 0 #003A7A,0 12px 22px rgba(0,86,179,.16),inset 0 2px 0 rgba(255,255,255,.28)!important;
  font:900 19px/1 Fredoka,Nunito,sans-serif!important;
  letter-spacing:0!important;
  text-transform:uppercase!important;
  text-shadow:0 1px 0 rgba(0,0,0,.18)!important;
  cursor:pointer;
  transition:transform 90ms ease,filter 140ms ease,box-shadow 90ms ease!important;
  -webkit-tap-highlight-color:transparent;
}
.duduq-smart-ts-confirm:hover:not(:disabled){filter:brightness(1.05) saturate(1.03)!important;}
.duduq-smart-ts-confirm:active:not(:disabled),
.duduq-smart-ts-confirm[data-pressed="true"]{
  transform:translateY(5px)!important;
  transition-duration:45ms!important;
  box-shadow:0 1px 0 #064A92,0 4px 8px rgba(9,103,201,.15),inset 0 2px 0 rgba(255,255,255,.25)!important;
}
.duduq-smart-ts-confirm:disabled{
  border-color:#C7D0DB!important;
  background:#E2E8F0!important;
  color:#64748B!important;
  box-shadow:0 4px 0 #B7C1CC!important;
  text-shadow:none!important;
  cursor:default!important;
}
.duduq-smart-ts-confirm:focus-visible{
  outline:4px solid #111827!important;
  outline-offset:4px!important;
}
@media(max-width:720px){
  .duduq-smart-ts-confirm{min-width:190px!important;min-height:50px!important;font-size:18px!important;}
}
@media(min-width:900px) and (max-height:650px){
  .duduq-smart-ts-confirm{min-height:54px!important;}
}
@media(max-width:380px){
  .duduq-smart-ts-confirm{width:100%!important;min-width:0!important;}
}
`;

  function patchSmartFrame(frame){
    if(!frame||frame.__duduqY3ButtonPatch)return;
    frame.__duduqY3ButtonPatch=true;
    const apply=()=>{
      try{
        const doc=frame.contentDocument;
        if(!doc?.head)return false;
        if(doc.getElementById("duduq-y3-smart-primary-parity"))return true;
        const style=doc.createElement("style");
        style.id="duduq-y3-smart-primary-parity";
        style.dataset.reference="matching-1.0.23";
        style.textContent=SMART_BUTTON_CSS;
        doc.head.appendChild(style);
        return true;
      }catch(_){return false;}
    };
    frame.addEventListener("load",()=>{apply();setTimeout(apply,50);},{passive:true});
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      if(apply()||tries>80)clearInterval(timer);
    },50);
  }

  function scanFrames(){
    if(!root?.document)return;
    root.document.querySelectorAll('iframe[title="DuduQ — Smart Sentence"]').forEach(patchSmartFrame);
  }

  function installButtonParity(){
    if(!root?.document)return false;
    scanFrames();
    const observer=new MutationObserver(scanFrames);
    observer.observe(root.document.documentElement,{subtree:true,childList:true});
    root.__DUDUQ_Y3_SMART_BUTTON_OBSERVER__=observer;
    root.DUDUQ_Y3_PRIMARY_BUTTON_REFERENCE=BUTTON_REFERENCE;
    return true;
  }

  if(root?.document){
    installFactoryWrapper();
    installButtonParity();
  }

  return Object.freeze({
    version:"1.0.0-ux-correction",
    studentInstruction,
    applyPresentation,
    installFactoryWrapper,
    installButtonParity,
    buttonReference:BUTTON_REFERENCE,
    smartButtonCss:SMART_BUTTON_CSS
  });
});
