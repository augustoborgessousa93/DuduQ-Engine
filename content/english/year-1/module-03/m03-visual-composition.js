/* Year 1 M03 local visual composition. Presentation only; fail-closed. */
(function(){
"use strict";
if(window.M03VisualComposition)return;
const MODULE="english/year1/module03",Q09="EN1-M3-09",Q10="EN1-M3-10";
const state={q09Applied:0,q10Applied:0,lastQuestionId:""};
function moduleOK(){return Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)&&window.DUDUQ_GAME_CONFIG.modulePath.join("/")===MODULE}
function config(doc){try{const node=doc?.getElementById("targetShooterConfig");if(!node)return null;return JSON.parse(node.textContent||"null")}catch(_){return null}}
function stage(doc){const c=config(doc);return c&&Array.isArray(c.stages)&&c.stages.length===1?c.stages[0]:null}
function style(doc,id,css){let node=doc.getElementById(id);if(node)return node;node=doc.createElement("style");node.id=id;node.textContent=css;(doc.head||doc.documentElement).appendChild(node);return node}
function applyQ09(doc,s){
 if(!moduleOK()||s?.id!==Q09||s?.mode!=="audio-to-visual"||String(s?.audioText||"").toLowerCase()!=="purple"||!Array.isArray(s?.items)||s.items.length!==3)return false;
 const expected=new Map(s.items.map(item=>[String(item.accent||"").toLowerCase(),String(item.accessibleLabel||item.semanticLabel||item.id)]));
 if(expected.size!==3||!s.items.every(item=>["A","B","C"].includes(item.label)&&item.accent))return false;
 doc.documentElement.setAttribute("data-duduq-m03-question",Q09);
 style(doc,"duduq-m03-q09-swatches",`
html[data-duduq-m03-question="${Q09}"] .duduq-ts-target-shell{background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 72%,#fff) 0 18%,var(--accent) 42% 76%,color-mix(in srgb,var(--accent) 78%,#111827) 100%)!important;border:4px solid color-mix(in srgb,var(--accent) 58%,#172033)!important;box-shadow:0 6px 0 color-mix(in srgb,var(--accent) 62%,#172033),0 14px 24px rgba(31,65,99,.14),inset 0 3px 0 rgba(255,255,255,.72)!important}
html[data-duduq-m03-question="${Q09}"] .duduq-ts-target-shell::before{border-color:rgba(255,255,255,.68)!important}
html[data-duduq-m03-question="${Q09}"] .duduq-ts-label{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
`);
 const targets=[...doc.querySelectorAll(".duduq-ts-target")];if(targets.length!==3)return false;
 let changed=false;
 for(const target of targets){const accent=String(target.style.getPropertyValue("--accent")||"").trim().toLowerCase();const name=expected.get(accent);if(!name)return false;const aria=`Alvo visual: ${name}`;if(target.getAttribute("aria-label")!==aria){target.setAttribute("aria-label",aria);changed=true}if(target.getAttribute("data-m03-swatch")!=="true"){target.setAttribute("data-m03-swatch","true");changed=true}}
 if(changed){state.q09Applied+=1;state.lastQuestionId=Q09}return true;
}
function applyQ10(doc,s){
 if(!moduleOK()||s?.id!==Q10||s?.mode!=="single-choice"||!Array.isArray(s?.targets)||s.targets.length!==1)return false;
 const target=s.targets[0];if(Number(target.capacity)!==1||String(target.alt||"").toLowerCase()!=="três réguas")return false;
 const root=doc.querySelector(`.duduq-dd2-target[data-dd2-target-id="${CSS.escape(target.id)}"]`);if(!root)return false;
 const original=root.querySelector("img.duduq-dd2-target-media:not([data-m03-ruler-copy])");if(!original)return false;
 const src=original.currentSrc||original.getAttribute("src")||"";if(!src||/^(data:|blob:)/i.test(src)||/\.svg(?:\?|$)/i.test(src))return false;
 const head=original.parentElement;if(!head?.classList.contains("duduq-dd2-target-head"))return false;
 doc.documentElement.setAttribute("data-duduq-m03-question",Q10);
 style(doc,"duduq-m03-q10-rulers",`
html[data-duduq-m03-question="${Q10}"] .duduq-dd2-target-head[data-m03-ruler-set="true"]{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;align-items:center!important;justify-items:center!important;gap:clamp(8px,1.5vw,18px)!important;padding-inline:clamp(4px,1vw,10px)!important;box-sizing:border-box!important}
html[data-duduq-m03-question="${Q10}"] .duduq-dd2-target-head[data-m03-ruler-set="true"] img.duduq-dd2-target-media{display:block!important;width:100%!important;max-width:150px!important;height:auto!important;max-height:120px!important;object-fit:contain!important;min-width:0!important}
@media(max-width:520px){html[data-duduq-m03-question="${Q10}"] .duduq-dd2-target-head[data-m03-ruler-set="true"]{gap:6px!important}html[data-duduq-m03-question="${Q10}"] .duduq-dd2-target-head[data-m03-ruler-set="true"] img.duduq-dd2-target-media{max-height:88px!important}}
`);
 const current=[...root.querySelectorAll("img.duduq-dd2-target-media")];const copies=current.filter(img=>img.hasAttribute("data-m03-ruler-copy"));
 if(root.getAttribute("data-m03-composed")==="true"&&current.length===3&&copies.length===2&&current.every(img=>(img.currentSrc||img.src)===src))return true;
 copies.forEach(node=>node.remove());original.alt="três réguas";original.setAttribute("data-m03-ruler-original","true");
 for(let i=0;i<2;i+=1){const clone=original.cloneNode(false);clone.src=src;clone.alt="";clone.setAttribute("aria-hidden","true");clone.setAttribute("role","presentation");clone.setAttribute("data-m03-ruler-copy",String(i+1));clone.removeAttribute("data-m03-ruler-original");head.insertBefore(clone,original.nextSibling)}
 head.setAttribute("data-m03-ruler-set","true");root.setAttribute("aria-label","Contexto visual: três réguas");root.setAttribute("data-m03-composed","true");
 const imgs=[...root.querySelectorAll("img.duduq-dd2-target-media")];if(imgs.length!==3||!imgs.every(img=>(img.currentSrc||img.src)===src))return false;
 state.q10Applied+=1;state.lastQuestionId=Q10;return true;
}
function inspectFrame(frame){if(!moduleOK())return;let doc;try{doc=frame.contentDocument}catch(_){return}if(!doc)return;const s=stage(doc);if(!s||![Q09,Q10].includes(s.id))return;if(s.id===Q09)applyQ09(doc,s);else applyQ10(doc,s);if(!doc.__DUDUQ_M03_OBSERVER__&&doc.body){const o=new MutationObserver(()=>{const current=stage(doc);if(current?.id===Q09)applyQ09(doc,current);else if(current?.id===Q10)applyQ10(doc,current)});o.observe(doc.body,{childList:true,subtree:true});doc.__DUDUQ_M03_OBSERVER__=o}}
function scan(){if(!moduleOK())return;document.querySelectorAll("iframe").forEach(frame=>{if(!frame.__DUDUQ_M03_LOAD__){frame.addEventListener("load",()=>inspectFrame(frame));frame.__DUDUQ_M03_LOAD__=true}inspectFrame(frame)})}
if(moduleOK()){new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener("DOMContentLoaded",scan,{once:true});setInterval(scan,180)}
window.M03VisualComposition=Object.freeze({version:"1.0.1-m03-local",getState:()=>({...state}),scan});
})();