/* DUDUQ shared runtime frame sync v1.0.0
   Cross-year / cross-mechanic lifecycle guard.

   Purpose:
   - mechanics may create an iframe in about:blank and fill it later with srcdoc;
   - World Fusion can observe the provisional document before the final runtime exists;
   - on every final iframe load, refresh shared runtime integrations against the
     current contentDocument without changing the mechanic release itself.
*/
(function(){
  "use strict";
  const VERSION="1.0.0";
  if(window.__DUDUQ_SHARED_RUNTIME_FRAME_SYNC__?.version===VERSION)return;

  const watched=new WeakSet();
  let refreshTimer=null;

  function refreshShared(){
    try{window.DuduQWorldFusion?.refresh?.();}catch(_){}
    try{window.DuduQContentAudio?.refresh?.();}catch(_){}
  }

  function refreshSoon(){
    try{window.requestAnimationFrame(refreshShared);}catch(_){refreshShared();}
    if(refreshTimer!==null)window.clearTimeout(refreshTimer);
    refreshTimer=window.setTimeout(function(){
      refreshTimer=null;
      refreshShared();
    },80);
  }

  function watch(frame){
    if(!frame||frame.tagName!=="IFRAME"||watched.has(frame))return;
    watched.add(frame);
    frame.addEventListener("load",refreshSoon);
    refreshSoon();
  }

  function scan(root){
    if(!root)return;
    if(root.tagName==="IFRAME")watch(root);
    root.querySelectorAll?.("iframe")?.forEach(watch);
  }

  const observer=new MutationObserver(function(records){
    records.forEach(function(record){
      record.addedNodes?.forEach(function(node){
        if(node?.nodeType===1)scan(node);
      });
    });
  });

  function start(){
    scan(document);
    observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
    refreshSoon();
  }

  window.__DUDUQ_SHARED_RUNTIME_FRAME_SYNC__=Object.freeze({
    version:VERSION,
    scope:"all-years-all-mechanics",
    releaseModified:false,
    refresh:refreshSoon
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
