/* DUDUQ Year2 v2.3 — M01-12 first-listen gate
   Homologation/runtime bridge for the v2.3 regrouped activity id.
   Commercial recorded audio is still required; speechSynthesis is fallback only.
*/
(function(){
  "use strict";

  const STEP_ID="en2-m1-12-drag-drop-alphabet";
  const GATE_ATTR="data-duduq-m1-12-first-listen";
  const FRAME_ATTR="data-duduq-m1-12-gated-frame";
  const OVERLAY_ID="duduq-m1-12-first-listen-overlay";
  const STIMULUS="L. E. O.";

  let active=false;
  let frame=null;
  let overlay=null;
  let speechTimeout=null;
  let childCancelTimer=null;
  let restoreChildSpeak=null;

  function setState(value){document.documentElement.setAttribute(GATE_ATTR,value)}
  function clearSpeechTimeout(){if(speechTimeout!==null){clearTimeout(speechTimeout);speechTimeout=null}}
  function stopChildCancelLoop(){if(childCancelTimer!==null){clearInterval(childCancelTimer);childCancelTimer=null}}
  function cancelChildSpeech(){try{frame?.contentWindow?.speechSynthesis?.cancel?.()}catch(_){}}

  function restoreChildSpeech(){
    if(typeof restoreChildSpeak==="function"){
      try{restoreChildSpeak()}catch(_){}
      restoreChildSpeak=null;
    }
  }

  function suppressChildAutoplay(targetFrame){
    frame=targetFrame;
    const patch=()=>{
      if(!active||!frame)return;
      try{
        const synth=frame.contentWindow?.speechSynthesis;
        if(!synth||synth.__DUDUQ_M1_12_V23_PATCHED__)return;
        const originalSpeak=synth.speak;
        if(typeof originalSpeak!=="function")return;
        synth.__DUDUQ_M1_12_V23_PATCHED__=true;
        try{
          synth.speak=function(utterance){if(active)return;return originalSpeak.call(synth,utterance)};
          restoreChildSpeak=()=>{
            try{synth.speak=originalSpeak;delete synth.__DUDUQ_M1_12_V23_PATCHED__}catch(_){}
          };
        }catch(_){}
        synth.cancel?.();
      }catch(_){}
    };
    try{targetFrame.addEventListener("load",patch,{once:true})}catch(_){}
    patch();
    stopChildCancelLoop();
    childCancelTimer=setInterval(()=>{
      if(!active){stopChildCancelLoop();return}
      cancelChildSpeech();
      patch();
    },90);
  }

  function hideFrame(targetFrame){
    if(!targetFrame||targetFrame.hasAttribute(FRAME_ATTR))return;
    targetFrame.setAttribute(FRAME_ATTR,"true");
    targetFrame.setAttribute("aria-hidden","true");
    targetFrame.style.setProperty("visibility","hidden","important");
    targetFrame.style.setProperty("opacity","0","important");
    targetFrame.style.setProperty("pointer-events","none","important");
    suppressChildAutoplay(targetFrame);
  }

  function revealFrame(){
    if(!active||!frame)return false;
    clearSpeechTimeout();
    stopChildCancelLoop();
    restoreChildSpeech();
    try{window.speechSynthesis?.cancel?.()}catch(_){}
    if(frame.hasAttribute(FRAME_ATTR)){
      frame.removeAttribute(FRAME_ATTR);
      frame.removeAttribute("aria-hidden");
      frame.style.removeProperty("visibility");
      frame.style.removeProperty("opacity");
      frame.style.removeProperty("pointer-events");
    }
    overlay?.remove?.();
    overlay=null;
    active=false;
    setState("revealed");
    try{window.dispatchEvent(new CustomEvent("duduq:m1-12-first-listen-revealed",{detail:{stepId:STEP_ID}}))}catch(_){}
    return true;
  }

  function failPlayback(button,status,message){
    clearSpeechTimeout();
    try{window.speechSynthesis?.cancel?.()}catch(_){}
    if(button){button.disabled=false;button.textContent="TENTAR OUVIR NOVAMENTE"}
    if(status)status.textContent=message||"Não foi possível concluir o áudio. Tente novamente.";
    setState("waiting");
  }

  function playFirstListen(button,status){
    if(!active)return;
    const synth=window.speechSynthesis;
    const Utterance=window.SpeechSynthesisUtterance;
    if(!synth||typeof Utterance!=="function"){
      failPlayback(button,status,"Áudio provisório indisponível. Tente novamente.");
      return;
    }
    clearSpeechTimeout();
    try{synth.cancel()}catch(_){}
    cancelChildSpeech();
    button.disabled=true;
    button.textContent="OUVINDO...";
    status.textContent="Ouça até o fim. As letras continuam escondidas.";
    setState("playing");
    const utterance=new Utterance(STIMULUS);
    utterance.lang="en-US";
    utterance.rate=.72;
    utterance.pitch=1;
    utterance.volume=1;
    let ended=false;
    utterance.onend=()=>{
      if(ended||!active)return;
      ended=true;
      clearSpeechTimeout();
      status.textContent="Áudio concluído. Agora você pode montar o nome.";
      setTimeout(revealFrame,180);
    };
    utterance.onerror=()=>{
      if(ended)return;
      ended=true;
      failPlayback(button,status,"O áudio não terminou corretamente. Tente novamente.");
    };
    speechTimeout=setTimeout(()=>{
      if(ended||!active)return;
      ended=true;
      failPlayback(button,status,"O áudio demorou mais que o esperado. Tente novamente.");
    },10000);
    try{synth.speak(utterance)}catch(_){
      ended=true;
      failPlayback(button,status,"Não foi possível iniciar o áudio. Tente novamente.");
    }
  }

  function createOverlay(){
    if(!active||overlay?.isConnected)return;
    const root=document.getElementById("root")||document.body;
    overlay=document.createElement("div");
    overlay.id=OVERLAY_ID;
    overlay.setAttribute("role","region");
    overlay.setAttribute("aria-label","Primeira escuta da soletração");
    Object.assign(overlay.style,{
      position:"fixed",inset:"0",zIndex:"2147482500",display:"grid",placeItems:"center",
      padding:"20px",boxSizing:"border-box",background:"linear-gradient(180deg,rgba(240,248,255,.99),rgba(255,255,255,.99))"
    });
    const card=document.createElement("div");
    Object.assign(card.style,{
      width:"min(560px,92vw)",padding:"clamp(24px,5vw,42px)",borderRadius:"30px",boxSizing:"border-box",
      background:"#fff",color:"#173b64",textAlign:"center",fontFamily:"Nunito,system-ui,sans-serif",
      boxShadow:"0 18px 48px rgba(38,86,125,.16)",border:"2px solid #d9e9f7"
    });
    const icon=document.createElement("div");icon.textContent="🔊";icon.setAttribute("aria-hidden","true");icon.style.fontSize="clamp(48px,10vw,76px)";
    const title=document.createElement("h2");title.textContent="OUÇA PRIMEIRO";Object.assign(title.style,{margin:"10px 0 8px",fontSize:"clamp(24px,6vw,36px)",lineHeight:"1.08",color:"#0c6fc7"});
    const copy=document.createElement("p");copy.textContent="Primeiro, ouça a soletração com atenção. As letras móveis aparecerão somente depois do áudio.";Object.assign(copy.style,{margin:"0 auto 22px",maxWidth:"440px",fontSize:"clamp(16px,4vw,20px)",lineHeight:"1.45"});
    const button=document.createElement("button");button.type="button";button.textContent="OUVIR SOLETRAÇÃO";Object.assign(button.style,{minWidth:"min(330px,86vw)",minHeight:"56px",padding:"14px 24px",border:"0",borderRadius:"18px",background:"#117bd1",color:"#fff",font:"800 clamp(16px,4vw,19px)/1.1 Nunito,system-ui,sans-serif",cursor:"pointer",boxShadow:"0 5px 0 #075ca3"});
    const status=document.createElement("p");status.setAttribute("data-gate-status","true");status.setAttribute("aria-live","polite");status.textContent="Nenhuma letra é mostrada antes desta primeira escuta.";Object.assign(status.style,{margin:"18px 0 0",fontSize:"14px",lineHeight:"1.35",color:"#526a80"});
    button.addEventListener("click",()=>playFirstListen(button,status));
    card.append(icon,title,copy,button,status);overlay.appendChild(card);root.appendChild(overlay);
    try{window.dispatchEvent(new CustomEvent("duduq:m1-12-first-listen-ready",{detail:{stepId:STEP_ID}}))}catch(_){}
  }

  function attachToFrame(targetFrame){if(!active||frame===targetFrame)return;hideFrame(targetFrame);createOverlay()}
  function scan(){if(!active)return;const targetFrame=document.querySelector("#root iframe");if(targetFrame)attachToFrame(targetFrame)}

  function cleanup(options={}){
    clearSpeechTimeout();stopChildCancelLoop();
    try{window.speechSynthesis?.cancel?.()}catch(_){}
    cancelChildSpeech();restoreChildSpeech();active=false;
    if(frame?.hasAttribute?.(FRAME_ATTR)){
      frame.removeAttribute(FRAME_ATTR);frame.removeAttribute("aria-hidden");
      frame.style.removeProperty("visibility");frame.style.removeProperty("opacity");frame.style.removeProperty("pointer-events");
    }
    overlay?.remove?.();overlay=null;frame=null;
    if(options.keepState!==true)document.documentElement.removeAttribute(GATE_ATTR);
  }

  window.addEventListener("duduq:step-start",event=>{
    const stepId=String(event?.detail?.stepId||"");
    if(stepId!==STEP_ID){if(active||overlay)cleanup();return}
    cleanup();active=true;setState("waiting");scan();
  });
  window.addEventListener("duduq:step-complete",event=>{if(String(event?.detail?.stepId||"")===STEP_ID)cleanup()});
  const observer=new MutationObserver(scan);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("beforeunload",()=>{observer.disconnect();cleanup()},{once:true});
})();
