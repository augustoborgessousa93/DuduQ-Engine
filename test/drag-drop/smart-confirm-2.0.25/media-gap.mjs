import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const URL=`${BASE}/test/drag-drop/smart-confirm-2.0.25/index.html`;
const ROOT="https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/";
const ASSETS={
  "cat-img":ROOT+"pet-cat-gato.png",
  "dog-img":ROOT+"pet-dog-cachorro.png",
  "pencil-img":ROOT+"school-object-pencil-lapis.png",
  "backpack-img":ROOT+"school-object-backpack-mochila.png"
};
const q={
  id:"media-gap",title:"MEDIA",instruction:"Classifique as imagens.",assets:ASSETS,
  behavior:{shuffleItems:false,shuffleTargets:false},
  payload:{mode:"classification",strategy:"classification",items:[
    {id:"cat",label:"CAT",imageAsset:{assetKey:"cat-img"},alt:"Cat",targetId:"pets",required:true},
    {id:"dog",label:"DOG",imageAsset:{assetKey:"dog-img"},alt:"Dog",spokenText:"dog",speechLocale:"en-US",audioDescription:"Ouvir dog",targetId:"pets",required:true},
    {id:"pencil",label:"PENCIL",imageAsset:{assetKey:"pencil-img"},alt:"Pencil",targetId:"school",required:true},
    {id:"backpack",label:"BACKPACK",imageAsset:{assetKey:"backpack-img"},alt:"Backpack",targetId:"school",required:true}
  ],targets:[
    {id:"pets",label:"PETS",imageAsset:{assetKey:"dog-img"},alt:"Dog representing pets",spokenText:"pets",speechLocale:"en-US",audioDescription:"Ouvir pets",capacity:2,kind:"category"},
    {id:"school",label:"SCHOOL OBJECTS",imageAsset:{assetKey:"backpack-img"},alt:"Backpack representing school objects",capacity:2,kind:"category"}
  ]}
};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const item=id=>`.duduq-dd2-item[data-dd2-item-id="${id}"]`;
const zone=id=>`.duduq-dd2-target[data-dd2-target-id="${id}"] .duduq-dd2-zone`;

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true});
const page=await context.newPage();
await page.emulateMedia({reducedMotion:"reduce"});
await page.addInitScript(()=>{
  const state={calls:0,last:""};
  const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false},pause(){},resume(){},speak(u){state.calls++;state.last=String(u?.text||"");this.speaking=true;try{u?.onstart?.({})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({})}catch{}})}};
  try{Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true})}catch{}
  globalThis.__DD225_TTS__=state;
});
const errors=[],critical404=[];
page.on("pageerror",e=>errors.push(String(e?.message||e)));
page.on("response",r=>{if(r.status()===404&&(r.url().includes("/engine/")||r.url().includes("/test/drag-drop/")||r.url().includes("Assets-DuduQ")))critical404.push(r.url())});
const res=await page.goto(`${URL}?gap=media`,{waitUntil:"domcontentloaded",timeout:30000});
assert(res?.ok(),`MEDIA HTTP ${res?.status()}`);
await page.waitForFunction(()=>window.dd225Mechanic?.()?.version==="2.0.25",null,{timeout:15000});
assert(await page.evaluate(x=>window.dd225Validate(x),q),"MEDIA payload invalid");
await page.evaluate(x=>window.dd225Mount(x),q);
await page.waitForFunction(()=>Boolean(document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-dd2-root")),null,{timeout:15000});
await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument,a=[...(d?.querySelectorAll(".duduq-dd2-item-media,.duduq-dd2-target-media")||[])];return a.length>=6&&a.every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0)},null,{timeout:20000});
const frame=page.frameLocator("#mount iframe");

async function state(){return page.evaluate(()=>{
  const d=document.querySelector("#mount iframe")?.contentDocument,l={};
  d?.querySelectorAll(".duduq-dd2-item[data-dd2-item-id]")?.forEach(n=>{const id=n.getAttribute("data-dd2-item-id");l[id]=n.closest("[data-dd2-target-id]")?.getAttribute("data-dd2-target-id")||"bank"});
  return {locations:l,results:__DD225_RESULTS__.slice(),confirm:d?.querySelectorAll(".duduq-dd2-confirm").length||0,complete:__DD225_COMPLETIONS__.length,tts:d?.defaultView?.__DD225_TTS__?.calls||0};
})}
async function evidence(label){
  const r=await page.evaluate(()=>{
    const d=document.querySelector("#mount iframe")?.contentDocument;let cfg=null;try{cfg=JSON.parse(d?.querySelector("#targetShooterConfig")?.textContent||"null")}catch{}
    const stage=cfg?.stages?.[0],imgs=[...(d?.querySelectorAll(".duduq-dd2-item-media,.duduq-dd2-target-media")||[])];
    return {keys:Object.keys(cfg?.assets||{}),stageKeys:[...(stage?.items||[]),...(stage?.targets||[])].map(x=>x.imageAssetKey).filter(Boolean),imgs:imgs.map(i=>{const a=i.getBoundingClientRect(),p=i.parentElement?.getBoundingClientRect();return{src:i.src,nw:i.naturalWidth,nh:i.naturalHeight,fit:getComputedStyle(i).objectFit,a:[a.left,a.top,a.right,a.bottom,a.width,a.height],p:p?[p.left,p.top,p.right,p.bottom]:null}}),placed:[...(d?.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item[data-dd2-item-id]")||[])].map(n=>{const a=n.getBoundingClientRect(),h=n.closest(".duduq-dd2-target")?.querySelector(".duduq-dd2-target-head")?.getBoundingClientRect();return{a:[a.left,a.top,a.right,a.bottom],h:h?[h.left,h.top,h.right,h.bottom]:null}}),overflow:d?Math.max(0,d.body.scrollWidth-d.documentElement.clientWidth):999};
  });
  assert(r.keys.includes("cat-img")&&r.stageKeys.includes("cat-img")&&r.stageKeys.includes("dog-img"),`${label} registry/config`);
  assert(r.imgs.length>=6,`${label} image count ${r.imgs.length}`);
  for(const x of r.imgs){assert(x.nw>0&&x.nh>0,`${label} image load`);assert(x.fit==="contain",`${label} object-fit ${x.fit}`);assert(x.a[4]>0&&x.a[5]>0,`${label} hidden image`);assert(/^https:\/\/raw\.githubusercontent\.com\//.test(x.src),`${label} noncanonical src ${x.src}`);if(x.p)assert(x.a[0]>=x.p[0]-2&&x.a[2]<=x.p[2]+2,`${label} image overflow card`)}
  for(const x of r.placed)if(x.h)assert(x.a[1]>=x.h[3]-3,`${label} item overlaps target label`);
  assert(r.overflow<=6,`${label} overflow ${r.overflow}`);
}
async function selectTap(id){const x=frame.locator(item(id)).first();await x.tap({force:true});await frame.locator(`${item(id)}[data-selected="true"]`).waitFor({state:"visible",timeout:3000})}
async function zoneTap(id,target){const z=frame.locator(zone(target)).first(),occupied=await z.locator(".duduq-dd2-item[data-dd2-item-id]").count();if(!occupied)await z.tap({force:true});else{const b=await z.boundingBox();assert(b,"MEDIA zone box");await z.tap({force:true,position:{x:8,y:Math.max(5,b.height-8)}})}await frame.locator(`${zone(target)} ${item(id)}`).waitFor({state:"visible",timeout:3000})}
async function placeKey(id,target){const x=frame.locator(item(id)).first(),z=frame.locator(zone(target)).first();await x.focus();await x.press("Enter");await frame.locator(`${item(id)}[data-selected="true"]`).waitFor({state:"visible",timeout:3000});await z.focus();await z.press("Enter");await frame.locator(`${zone(target)} ${item(id)}`).waitFor({state:"visible",timeout:3000})}
async function drag(id,target){const a=await frame.locator(item(id)).first().boundingBox(),b=await frame.locator(zone(target)).first().boundingBox();assert(a&&b,"MEDIA drag box");await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();await frame.locator(`${zone(target)} ${item(id)}`).waitFor({state:"visible",timeout:3000})}

await evidence("MEDIA initial");
const before=await state();
await frame.locator('.duduq-dd2-target[data-dd2-target-id="pets"] .duduq-dd2-target-audio').click({force:true});
await page.waitForTimeout(50);
let s=await state();assert(!s.results.length&&s.confirm===0,"MEDIA target audio evaluated");assert(JSON.stringify(s.locations)===JSON.stringify(before.locations),"MEDIA target audio moved item");
await selectTap("cat");await zoneTap("cat","pets");
await selectTap("dog");s=await state();assert(s.locations.dog==="bank"&&!s.results.length,"MEDIA item audio moved/evaluated");await zoneTap("dog","school");
await placeKey("pencil","school");
await drag("backpack","pets");
s=await state();assert(!s.results.length&&s.confirm===1,"MEDIA pre-confirm evaluation");await evidence("MEDIA assembled");
await frame.locator(".duduq-dd2-confirm").click({force:true});
await page.waitForFunction(()=>__DD225_RESULTS__.length===1,null,{timeout:5000});
s=await state();assert(s.results[0]?.isCorrect===false,"MEDIA wrong did not retry");
await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument;return Boolean(d?.querySelector('.duduq-dd2-bank [data-dd2-item-id="dog"]')&&d?.querySelector('.duduq-dd2-bank [data-dd2-item-id="backpack"]')&&d?.querySelector('.duduq-dd2-zone [data-dd2-item-id="cat"]:disabled')&&d?.querySelector('.duduq-dd2-zone [data-dd2-item-id="pencil"]:disabled'))},null,{timeout:5000});
await evidence("MEDIA retry");
await placeKey("dog","pets");
await drag("backpack","school");
s=await state();assert(s.results.length===1&&s.confirm===1,"MEDIA correction auto-evaluated");await evidence("MEDIA corrected");
await frame.locator(".duduq-dd2-confirm").click({force:true});
await page.waitForFunction(()=>__DD225_RESULTS__.length===2&&__DD225_RESULTS__[1]?.isCorrect===true,null,{timeout:5000});
await page.waitForFunction(()=>__DD225_COMPLETIONS__.length===1,null,{timeout:5000});
assert(!errors.length,`MEDIA JS ${errors.join("|")}`);assert(!critical404.length,`MEDIA 404 ${critical404.join(",")}`);
console.log("MEDIA PASS");
await context.close();await browser.close();