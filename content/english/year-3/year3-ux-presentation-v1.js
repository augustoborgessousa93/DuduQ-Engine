/* DUDUQ English Year 3 — UX presentation correction.
   - keeps the complete editorial source prompt in metadata.sourceStatement;
   - exposes only a concise studentInstruction;
   - aligns Smart Sentence CONFIRMAR with the real active Matching primary action;
   - keeps Target Shooter visual-to-audio additions inside the Target Shooter visual language.
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
    source:"matching@1.0.23 / .duduq-matching-primary active computed style",
    width:"min(220px, 100%)",
    minHeight:"56px",
    padding:"0 28px",
    border:"2px solid #0B5DB4",
    borderRadius:"18px",
    background:"linear-gradient(180deg,#1984E8 0%,#0868CB 72%,#075EB9 100%)",
    color:"#fff",
    boxShadow:"0 6px 0 #064A92, 0 12px 22px rgba(9,103,201,.20), inset 0 2px 0 rgba(255,255,255,.38)",
    font:"900 19px/1 Fredoka,Nunito,sans-serif",
    focus:"4px solid #111827",
    mobileMinWidth:"190px",
    mobileMinHeight:"50px",
    mobileFontSize:"18px"
  });

  const TARGET_MODE_REFERENCE=Object.freeze({
    source:"target-shooter@1.0.23 visual-to-audio auxiliary controls",
    canonicalBase:"target-shooter@1.0.21 / .duduq-ts-audio-button",
    border:"2px solid #064A92",
    background:"linear-gradient(180deg,#218BEA,#0B70D5 70%,#0864BF)",
    depth:"#064A92",
    focus:"#111827",
    disabledBackground:"#E2E8F0",
    disabledDepth:"#B7C1CC"
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
      if(q.metadata.smartSentence)q.metadata.smartSentence.instruction=instruction;
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
/* Matching 1.0.23 active primary action parity — visual only. */
@keyframes duduq-y3-smart-button-shine{0%{transform:translateX(-180%) skewX(-18deg)}100%{transform:translateX(340%) skewX(-18deg)}}
.duduq-smart-ts-confirm{
  position:relative!important;
  isolation:isolate!important;
  overflow:hidden!important;
  width:min(220px,100%)!important;
  min-width:0!important;
  min-height:56px!important;
  padding:0 28px!important;
  border:2px solid #0B5DB4!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#1984E8 0%,#0868CB 72%,#075EB9 100%)!important;
  color:#fff!important;
  box-shadow:0 6px 0 #064A92,0 12px 22px rgba(9,103,201,.20),inset 0 2px 0 rgba(255,255,255,.38)!important;
  font:900 19px/1 Fredoka,Nunito,sans-serif!important;
  letter-spacing:0!important;
  text-transform:uppercase!important;
  text-shadow:0 1px 0 rgba(0,0,0,.18)!important;
  cursor:pointer;
  transition:transform 90ms ease,filter 140ms ease,box-shadow 90ms ease!important;
  -webkit-tap-highlight-color:transparent;
}
.duduq-smart-ts-confirm::before{
  content:"";position:absolute;z-index:0;inset:2px 8px auto;height:42%;border-radius:999px;
  background:linear-gradient(180deg,rgba(255,255,255,.46),rgba(255,255,255,0));opacity:.8;pointer-events:none;
}
.duduq-smart-ts-confirm::after{
  content:"";position:absolute;z-index:1;top:-45%;bottom:-45%;left:-42%;width:34%;transform:skewX(-18deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.56),transparent);opacity:0;pointer-events:none;
}
.duduq-smart-ts-confirm:hover:not(:disabled){filter:brightness(1.05) saturate(1.03)!important;}
.duduq-smart-ts-confirm:hover:not(:disabled)::after{opacity:.78;animation:duduq-y3-smart-button-shine 760ms ease-out both;}
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

  const TARGET_SHOOTER_MODE_CSS=`
/* Year 3 visual-to-audio mode keeps the canonical Target Shooter control language. */
.duduq-ts-option-audio-panel{
  border:2px solid rgba(132,171,190,.42)!important;
  border-radius:18px!important;
  background:rgba(255,255,255,.97)!important;
  box-shadow:0 4px 0 rgba(161,188,199,.50),0 10px 22px rgba(43,89,110,.08)!important;
}
.duduq-ts-option-audio-prompt{
  border:2px solid rgba(62,132,201,.18)!important;
  border-radius:16px!important;
  background:#F4F9FF!important;
  color:#17395F!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95)!important;
  font-family:Fredoka,Nunito,system-ui,sans-serif!important;
}
.duduq-ts-option-audio-confirm{
  min-width:132px!important;
  min-height:42px!important;
  padding:7px 15px!important;
  border:2px solid #064A92!important;
  border-radius:16px!important;
  background:linear-gradient(180deg,#218BEA 0%,#0B70D5 70%,#0864BF 100%)!important;
  color:#fff!important;
  box-shadow:0 4px 0 #064A92,0 8px 15px rgba(9,103,201,.18),inset 0 2px 0 rgba(255,255,255,.42)!important;
  font:900 15px/1 Fredoka,Nunito,system-ui,sans-serif!important;
  text-shadow:0 1px 0 rgba(0,0,0,.16)!important;
  cursor:pointer!important;
  transition:transform 90ms ease,filter 140ms ease,box-shadow 90ms ease!important;
}
.duduq-ts-option-audio-confirm:hover:not([disabled]){filter:brightness(1.05)!important;}
.duduq-ts-option-audio-confirm:active:not([disabled]){
  transform:translateY(4px)!important;
  box-shadow:0 1px 0 #064A92,0 3px 7px rgba(9,103,201,.13)!important;
}
.duduq-ts-option-audio-confirm:focus-visible{outline:4px solid #111827!important;outline-offset:4px!important;}
.duduq-ts-option-audio-confirm[disabled]{
  border-color:#C7D0DB!important;
  background:#E2E8F0!important;
  color:#6D7D8C!important;
  box-shadow:0 4px 0 #B7C1CC!important;
  text-shadow:none!important;
  cursor:default!important;
}
.duduq-ts-option-audio-confirm:not([disabled]){
  border-color:#064A92!important;
  background:linear-gradient(180deg,#218BEA 0%,#0B70D5 70%,#0864BF 100%)!important;
  color:#fff!important;
  box-shadow:0 4px 0 #064A92,0 8px 15px rgba(9,103,201,.18),inset 0 2px 0 rgba(255,255,255,.42)!important;
  text-shadow:0 1px 0 rgba(0,0,0,.16)!important;
  cursor:pointer!important;
}
@media(max-width:520px){
  .duduq-ts-option-audio-panel{border-radius:16px!important;}
  .duduq-ts-option-audio-confirm{min-width:112px!important;min-height:38px!important;font-size:13px!important;}
  .duduq-ts-option-audio-prompt{border-radius:14px!important;}
}
`;

  function injectFrameStyle(frame,id,reference,css){
    const apply=()=>{
      try{
        const doc=frame.contentDocument;
        if(!doc?.head)return false;
        if(doc.getElementById(id))return true;
        const style=doc.createElement("style");
        style.id=id;
        style.dataset.reference=reference;
        style.textContent=css;
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

  function installTargetControlStateBridge(frame){
    if(!frame||frame.__duduqY3TargetStateBridge)return;
    frame.__duduqY3TargetStateBridge=true;
    const attach=()=>{
      try{
        const doc=frame.contentDocument;
        if(!doc?.documentElement||doc.__duduqY3TargetStateObserver)return false;
        const reconcile=()=>{
          const selected=doc.querySelector('.duduq-ts-target[data-duduq-option-audio-selected="true"]');
          const confirm=doc.querySelector('.duduq-ts-option-audio-confirm');
          if(selected&&confirm&&confirm.disabled)confirm.disabled=false;
        };
        const observer=new MutationObserver(()=>queueMicrotask(reconcile));
        observer.observe(doc.documentElement,{subtree:true,childList:true});
        doc.__duduqY3TargetStateObserver=observer;
        reconcile();
        return true;
      }catch(_){return false;}
    };
    frame.addEventListener("load",()=>{attach();setTimeout(attach,50);},{passive:true});
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      if(attach()||tries>80)clearInterval(timer);
    },50);
  }

  function patchSmartFrame(frame){
    if(!frame||frame.__duduqY3ButtonPatch)return;
    frame.__duduqY3ButtonPatch=true;
    injectFrameStyle(frame,"duduq-y3-smart-primary-parity","matching-1.0.23",SMART_BUTTON_CSS);
  }

  function patchTargetFrame(frame){
    if(!frame||frame.__duduqY3TargetModePatch)return;
    frame.__duduqY3TargetModePatch=true;
    injectFrameStyle(frame,"duduq-y3-target-mode-parity","target-shooter-1.0.23",TARGET_SHOOTER_MODE_CSS);
    installTargetControlStateBridge(frame);
  }

  function scanFrames(){
    if(!root?.document)return;
    root.document.querySelectorAll('iframe[title="DuduQ — Smart Sentence"]').forEach(patchSmartFrame);
    root.document.querySelectorAll('#root iframe').forEach(patchTargetFrame);
  }

  function installVisualParity(){
    if(!root?.document)return false;
    scanFrames();
    const observer=new MutationObserver(scanFrames);
    observer.observe(root.document.documentElement,{subtree:true,childList:true});
    root.__DUDUQ_Y3_VISUAL_PARITY_OBSERVER__=observer;
    root.DUDUQ_Y3_PRIMARY_BUTTON_REFERENCE=BUTTON_REFERENCE;
    root.DUDUQ_Y3_TARGET_SHOOTER_MODE_REFERENCE=TARGET_MODE_REFERENCE;
    return true;
  }

  if(root?.document){
    installFactoryWrapper();
    installVisualParity();
  }

  return Object.freeze({
    version:"1.1.0-ux-correction",
    studentInstruction,
    applyPresentation,
    installFactoryWrapper,
    installButtonParity:installVisualParity,
    installVisualParity,
    buttonReference:BUTTON_REFERENCE,
    targetModeReference:TARGET_MODE_REFERENCE,
    smartButtonCss:SMART_BUTTON_CSS,
    targetShooterModeCss:TARGET_SHOOTER_MODE_CSS
  });
});