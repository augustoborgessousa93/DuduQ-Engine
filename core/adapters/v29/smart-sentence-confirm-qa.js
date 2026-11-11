/*
 * DUDUQ English V29 -- Smart Sentence native confirm state sync, QA ONLY.
 *
 * This is an isolated compatibility candidate. It never chooses an answer,
 * changes the engine, skips audio, or triggers any feedback or progression.
 * It ONLY restores the native disabled property if the already validated
 * canonical Smart Sentence engine says the answer is confirmable and the
 * shared audio/interaction gate is READY.
 *
 * Not approved for production without exhaustive wrong/retry/correct QA.
 */
(() => {
  "use strict";
  if (!location.pathname.startsWith("/play/smart-sentence/")) return;
  const MARK = "__DUDUQ_V29_SMART_CONFIRM_QA__";
  if (window[MARK]) return;
  const stats = {version:"V29_QA_ONLY",registered:false,repaired:0,lastQuestion:null,lastEngineCanConfirm:null,notes:[]};
  Object.defineProperty(window,MARK,{value:stats,writable:false,configurable:false});

  let attachedTo = null;
  let observer = null;
  let ticking = false;
  function sync() {
    if(ticking)return;
    ticking = true;
    try {
      const shell=window.DuduQSmartSentenceShell;
      const engine=shell?.engine;
      if(!engine||typeof engine.snapshot!=="function")return;
      const snap=engine.snapshot();
      const root=document.querySelector("#game");
      const btn=root?.querySelector(".smart-sentence-confirm-action:not(.smart-sentence-order-confirm-action), .smart-sentence-order-confirm-action");
      const ribbon=root?.querySelector(".feedback-ribbon");
      const ready=root?.dataset.duduqInteractionState==="READY";
      const answerReady=Boolean(snap.canConfirm && snap.status==="playing" && ready && ribbon?.hidden!==false);
      stats.lastQuestion=snap.activityId;
      stats.lastEngineCanConfirm=Boolean(snap.canConfirm);
      if(!btn || !answerReady || btn.hidden || !btn.disabled)return;
      btn.disabled=false;
      btn.setAttribute("aria-disabled","false");
      stats.repaired++;
      stats.notes.push({id:snap.activityId,round:snap.roundIndex,repaired:true,engineCanConfirm:true,gate:root.dataset.duduqInteractionState});
    }catch(e){
      stats.notes.push({error:String(e?.message||e).slice(0,180)});
    }finally{ticking=false;}
  }
  function attach() {
    const shell=window.DuduQSmartSentenceShell;
    const root=document.querySelector("#game");
    if(!shell?.engine || !root || attachedTo===shell.engine)return;
    attachedTo=shell.engine;
    stats.registered=true;
    shell.engine.onStateChange(()=>queueMicrotask(sync));
    observer?.disconnect();
    observer=new MutationObserver(()=>queueMicrotask(sync));
    observer.observe(root,{subtree:true,attributes:true,attributeFilter:["disabled","hidden","data-duduq-interaction-state"]});
    queueMicrotask(sync);
  }
  const timer=setInterval(()=>{attach();sync();if(stats.registered)clearInterval(timer);},100);
  window.addEventListener("load",attach,{once:true});
  document.addEventListener("DOMContentLoaded",attach,{once:true});
})();
