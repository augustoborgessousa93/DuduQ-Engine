/* Year 1 M04 local visual composition. Presentation only; fail-closed. */
(function(){
"use strict";
if(window.M04VisualComposition)return;
const MODULE="english/year1/module04",LEGS_Q="EN1-M4-07",LEGS_FILE="body-part-touch-knees-tocar-joelhos.png";
const state={legsApplied:0,targetSemanticsApplied:0,lastQuestionId:""};
function moduleOK(){return Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)&&window.DUDUQ_GAME_CONFIG.modulePath.join("/")===MODULE}
function config(doc){try{const node=doc?.getElementById("targetShooterConfig");if(!node)return null;return JSON.parse(node.textContent||"null")}catch(_){return null}}
function stage(doc){const c=config(doc);return c&&Array.isArray(c.stages)&&c.stages.length===1?c.stages[0]:null}
function style(doc,id,css){let node=doc.getElementById(id);if(node)return node;node=doc.createElement("style");node.id=id;node.textContent=css;(doc.head||doc.documentElement).appendChild(node);return node}
function applyTargetSemantics(doc,s){
 if(!moduleOK()||!s||s.mode!=="audio-to-image"||!Array.isArray(s.items)||s.items.length!==3)return false;
 const targets=[...doc.querySelectorAll(".duduq-ts-target")];if(targets.length!==3)return false;
 const byId=new Map(s.items.map(item=>[String(item.id||""),String(item.accessibleLabel||item.semanticLabel||item.alt||"").trim()]));
 if(byId.size!==3||[...byId.values()].some(v=>!v))return false;
 let changed=false;
 for(const target of targets){
  const current=String(target.getAttribute("aria-label")||"");
  const match=current.match(/alvo\s+([ABC])(?:\b|$)/i);if(!match)continue;
  const id=match[1].toUpperCase(),semantic=byId.get(id);if(!semantic)continue;
  const next=`Lançar estrela no alvo ${id}: ${semantic}`;
  if(current!==next){target.setAttribute("aria-label",next);target.setAttribute("data-m04-semantic-target",id);changed=true}
 }
 if(changed){state.targetSemanticsApplied+=1;state.lastQuestionId=String(s.id||"")}
 return targets.every(t=>t.hasAttribute("data-m04-semantic-target"));
}
function applyLegs(doc,s){
 if(!moduleOK()||s?.id!==LEGS_Q||s?.mode!=="single-choice"||!Array.isArray(s?.targets)||s.targets.length!==1)return false;
 const target=s.targets[0];if(Number(target.capacity)!==1||String(target.alt||"").toLowerCase()!=="corpo com pernas destacadas")return false;
 const root=doc.querySelector(`.duduq-dd2-target[data-dd2-target-id="${CSS.escape(target.id)}"]`);if(!root)return false;
 const img=root.querySelector("img.duduq-dd2-target-media");if(!img||!img.complete||img.naturalWidth<40||img.naturalHeight<40)return false;
 const src=decodeURIComponent(String(img.currentSrc||img.getAttribute("src")||"")).toLowerCase();
 if(!src.includes(LEGS_FILE)||/^(data:|blob:)/i.test(src)||/\.svg(?:\?|$)/i.test(src))return false;
 const head=img.parentElement;if(!head?.classList.contains("duduq-dd2-target-head"))return false;
 doc.documentElement.setAttribute("data-duduq-m04-question",LEGS_Q);
 style(doc,"duduq-m04-legs-highlight-style",`
html[data-duduq-m04-question="${LEGS_Q}"] .duduq-dd2-target-head[data-m04-legs-context="true"]{position:relative!important;isolation:isolate!important;overflow:hidden!important}
html[data-duduq-m04-question="${LEGS_Q}"] .duduq-dd2-target-head[data-m04-legs-context="true"] img.duduq-dd2-target-media{position:relative!important;z-index:1!important}
html[data-duduq-m04-question="${LEGS_Q}"] .duduq-m04-legs-highlight{position:absolute!important;z-index:3!important;pointer-events:none!important;left:25%!important;right:25%!important;top:53%!important;bottom:5%!important;border:clamp(4px,.55vw,7px) solid #ff8a00!important;border-radius:48% 48% 40% 40%/34% 34% 54% 54%!important;background:rgba(255,196,0,.12)!important;box-shadow:0 0 0 3px rgba(255,255,255,.88),0 6px 18px rgba(173,86,0,.22),inset 0 0 18px rgba(255,196,0,.12)!important}
@media(max-width:520px){html[data-duduq-m04-question="${LEGS_Q}"] .duduq-m04-legs-highlight{left:22%!important;right:22%!important;top:51%!important;bottom:4%!important}}
@media(prefers-reduced-motion:reduce){html[data-duduq-m04-question="${LEGS_Q}"] .duduq-m04-legs-highlight{animation:none!important;transition:none!important}}
`);
 head.setAttribute("data-m04-legs-context","true");root.setAttribute("data-m04-legs-highlight","true");root.setAttribute("aria-label","Contexto visual: pernas destacadas");
 let overlay=head.querySelector(".duduq-m04-legs-highlight");if(!overlay){overlay=doc.createElement("span");overlay.className="duduq-m04-legs-highlight";overlay.setAttribute("aria-hidden","true");overlay.setAttribute("role","presentation");head.appendChild(overlay);state.legsApplied+=1;state.lastQuestionId=LEGS_Q}
 return true;
}
function inspectFrame(frame){if(!moduleOK())return;let doc;try{doc=frame.contentDocument}catch(_){return}if(!doc)return;const apply=()=>{const s=stage(doc);if(!s)return;if(s.mode==="audio-to-image")applyTargetSemantics(doc,s);if(s.id===LEGS_Q)applyLegs(doc,s)};if(doc.body&&!doc.__DUDUQ_M04_OBSERVER__){const o=new MutationObserver(apply);o.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:["src","data-dd2-target-id","aria-label"]});doc.__DUDUQ_M04_OBSERVER__=o}apply()}
function scan(){if(!moduleOK())return;document.querySelectorAll("iframe").forEach(frame=>{if(!frame.__DUDUQ_M04_LOAD__){frame.addEventListener("load",()=>inspectFrame(frame));frame.__DUDUQ_M04_LOAD__=true}inspectFrame(frame)})}
if(moduleOK()){new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener("DOMContentLoaded",scan,{once:true});setInterval(scan,180)}
window.M04VisualComposition=Object.freeze({version:"1.0.1-m04-local",getState:()=>({...state}),scan});
})();