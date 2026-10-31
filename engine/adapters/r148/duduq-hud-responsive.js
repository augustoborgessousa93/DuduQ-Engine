/* DUDUQ R148 additive responsive header bridge.
 * Never modifies Core 1.0.12, content, answer keys, or Gold Masters.
 * World Fusion loads its immutable CSS in iframe runtimes;
 * this adapter installs the independently tested new CSS alongside it.
 */
(function () {
 "use strict";
 const VERSION="r148.1";
 if(window.DuduQResponsiveHeaderR148?.version===VERSION)return;
 const source=document.currentScript?.src||window.location.href;
 const href=new URL("./duduq-hud-responsive.css",source).href;
 const seen=new WeakSet(),observed=new WeakSet(),id="duduq-header-r148-frame-style";
 function registerDocument(doc){
  if(!doc?.documentElement)return;
  if(doc!==document&&!doc.getElementById(id)){
   const link=doc.createElement("link");
   link.id=id;link.rel="stylesheet";link.href=href;
   (doc.head||doc.documentElement).appendChild(link);
  }
  if(observed.has(doc))return;
  observed.add(doc);
  let queued=false;
  const scan=()=>{
   if(queued)return;queued=true;
   requestAnimationFrame(()=>{
    queued=false;
    try{doc.querySelectorAll("iframe").forEach(registerFrame);}
    catch(_){/* Never access cross-origin documents. */}
   });
  };
  new MutationObserver(scan).observe(doc.documentElement,{childList:true,subtree:true});
  scan();
 }
 function registerFrame(frame){
  if(!frame)return;
  const connect=()=>{
   try{if(frame.contentDocument)registerDocument(frame.contentDocument);}
   catch(_){/* Cross-origin frames are not owned by DUDUQ. */}
  };
  if(!seen.has(frame)){seen.add(frame);frame.addEventListener("load",connect);}
  connect();
 }
 window.DuduQResponsiveHeaderR148=Object.freeze({version:VERSION,stylesheet:href,release:"r148"});
 registerDocument(document);
})();
