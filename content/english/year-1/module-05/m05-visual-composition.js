/* Year 1 M05 local canonical visual composition. DOM only; presentation only; fail-closed. */
(function(){
"use strict";
if(window.M05VisualComposition)return;
const MODULE="english/year1/module05",PAIR_Q=new Set(["EN1-M5-07","EN1-M5-08"]),PERSON_PET_Q="EN1-M5-11";
const state={pairApplied:0,personPetApplied:0,lastQuestionId:""};
function moduleOK(){return Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)&&window.DUDUQ_GAME_CONFIG.modulePath.join("/")===MODULE}
function parse(doc,id){try{const n=doc?.getElementById(id);return n?JSON.parse(n.textContent||"null"):null}catch(_){return null}}
function stage(doc){const a=parse(doc,"dragDropConfig"),b=parse(doc,"targetShooterConfig"),c=a||b;return c&&Array.isArray(c.stages)&&c.stages.length===1?c.stages[0]:null}
function style(doc,id,css){let n=doc.getElementById(id);if(n)return n;n=doc.createElement("style");n.id=id;n.textContent=css;(doc.head||doc.documentElement).appendChild(n);return n}
function safeHttp(url){return /^https:\/\//i.test(String(url||""))&&!/^(data:|blob:)/i.test(String(url||""))&&!/\.svg(?:\?|$)/i.test(String(url||""))}
function applyPair(doc,s){
 if(!moduleOK()||!PAIR_Q.has(String(s?.id||""))||s?.mode!=="single-choice"||!Array.isArray(s.targets)||s.targets.length!==1)return false;
 const t=s.targets[0],c=t?.localComposition;if(c?.type!=="canonical-size-pair"||!safeHttp(c.large)||!safeHttp(c.small))return false;
 const root=doc.querySelector(`.duduq-dd2-target[data-dd2-target-id="${CSS.escape(String(t.id||""))}"]`),head=root?.querySelector(".duduq-dd2-target-head");if(!root||!head)return false;
 style(doc,"duduq-m05-pair-style",`.duduq-m05-pair{width:100%;min-height:170px;display:flex;align-items:flex-end;justify-content:center;gap:clamp(10px,3vw,42px);overflow:hidden}.duduq-m05-pair img{object-fit:contain;display:block;width:auto}.duduq-m05-pair .small{height:88px;max-width:40%}.duduq-m05-pair .big{height:154px;max-width:52%}@media(max-width:520px){.duduq-m05-pair{min-height:132px}.duduq-m05-pair .small{height:68px}.duduq-m05-pair .big{height:116px}}`);
 if(head.querySelector(".duduq-m05-pair"))return true;const original=head.querySelector("img.duduq-dd2-target-media");if(original)original.hidden=true;
 const pair=doc.createElement("span");pair.className="duduq-m05-pair";pair.setAttribute("role","img");pair.setAttribute("aria-label",String(t.alt||"Um animal grande e um pequeno"));
 for(const [cls,src] of [["big",c.large],["small",c.small]]){const img=doc.createElement("img");img.className=cls;img.src=src;img.alt="";img.setAttribute("aria-hidden","true");pair.appendChild(img)}
 head.appendChild(pair);root.setAttribute("data-m05-local-composition","canonical-size-pair");state.pairApplied+=1;state.lastQuestionId=String(s.id);return true;
}
function targetId(target){const a=String(target.getAttribute("aria-label")||"");const m=a.match(/alvo\s+([ABC])(?:\b|$)/i);return m?m[1].toUpperCase():String(target.dataset?.targetId||target.getAttribute("data-target-id")||"").toUpperCase()}
function applyPersonPet(doc,s){
 if(!moduleOK()||String(s?.id||"")!==PERSON_PET_Q||s?.mode!=="audio-to-visual"||!Array.isArray(s.targets)||s.targets.length!==3)return false;
 const items=new Map(s.targets.map(i=>[String(i.id||"").toUpperCase(),i]));const targets=[...doc.querySelectorAll(".duduq-ts-target")];if(targets.length!==3)return false;
 style(doc,"duduq-m05-person-pet-style",`.duduq-m05-person-pet{position:absolute;inset:10%;display:flex;align-items:flex-end;justify-content:center;gap:5%;pointer-events:none}.duduq-m05-person-pet img{display:block;object-fit:contain;max-width:54%;max-height:82%}.duduq-m05-person-pet .pet{max-width:42%;max-height:56%}`);
 let applied=0;for(const target of targets){const id=targetId(target),item=items.get(id);if(!item||item.localComposition?.type!=="canonical-person-plus-pet"||!safeHttp(item.localComposition.person)||!safeHttp(item.localComposition.pet))continue;
  if(!target.querySelector(".duduq-m05-person-pet")){target.querySelectorAll("img").forEach(img=>img.hidden=true);const scene=doc.createElement("span");scene.className="duduq-m05-person-pet";scene.setAttribute("role","presentation");scene.setAttribute("aria-hidden","true");for(const [cls,src] of [["person",item.localComposition.person],["pet",item.localComposition.pet]]){const img=doc.createElement("img");img.className=cls;img.src=src;img.alt="";scene.appendChild(img)}target.appendChild(scene);state.personPetApplied+=1}
  const label=String(item.accessibleLabel||item.alt||"").trim();if(!label)return false;target.setAttribute("aria-label",`Lançar estrela no alvo ${id}: ${label}`);target.setAttribute("data-m05-local-composition","person-plus-pet");applied+=1;
 }
 if(applied===3)state.lastQuestionId=PERSON_PET_Q;return applied===3;
}
function inspect(frame){if(!moduleOK())return;let doc;try{doc=frame.contentDocument}catch(_){return}if(!doc)return;const apply=()=>{const s=stage(doc);if(!s)return;applyPair(doc,s);applyPersonPet(doc,s)};if(doc.body&&!doc.__DUDUQ_M05_OBSERVER__){const o=new MutationObserver(apply);o.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:["src","aria-label","data-dd2-target-id","data-target-id"]});doc.__DUDUQ_M05_OBSERVER__=o}apply()}
function scan(){if(!moduleOK())return;document.querySelectorAll("iframe").forEach(f=>{if(!f.__DUDUQ_M05_LOAD__){f.addEventListener("load",()=>inspect(f));f.__DUDUQ_M05_LOAD__=true}inspect(f)})}
if(moduleOK()){new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener("DOMContentLoaded",scan,{once:true});setInterval(scan,180)}
window.M05VisualComposition=Object.freeze({version:"1.0.1-m05-local",getState:()=>({...state}),scan});
})();