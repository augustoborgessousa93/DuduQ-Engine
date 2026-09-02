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
const payload={
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
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true});
const page=await context.newPage();
await page.emulateMedia({reducedMotion:"reduce"});
await page.addInitScript(()=>{
  const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false},pause(){},resume(){},speak(u){this.speaking=true;try{u?.onstart?.({})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({})}catch{}})}};
  try{Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true})}catch{}
});
const errors=[];page.on("pageerror",e=>errors.push(String(e?.message||e)));
await page.goto(`${URL}?probe=media`,{waitUntil:"domcontentloaded",timeout:30000});
await page.waitForFunction(()=>window.dd225Mechanic?.()?.version==="2.0.25",null,{timeout:15000});
const valid=await page.evaluate(x=>window.dd225Validate(x),payload);
if(!valid) throw new Error("MEDIA probe payload invalid");
await page.evaluate(x=>window.dd225Mount(x),payload);
await page.waitForFunction(()=>Boolean(document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-dd2-root")),null,{timeout:15000});

async function snap(){return page.evaluate(()=>{
  const f=document.querySelector("#mount iframe"),d=f?.contentDocument,w=f?.contentWindow;
  let cfg=null;try{cfg=JSON.parse(d?.querySelector("#targetShooterConfig")?.textContent||"null")}catch{}
  const stage=cfg?.stages?.[0];
  const items=[...(d?.querySelectorAll(".duduq-dd2-item")||[])];
  const targets=[...(d?.querySelectorAll(".duduq-dd2-target")||[])];
  const imgs=[...(d?.querySelectorAll("img")||[])];
  const mediaImgs=imgs.filter(x=>x.classList.contains("duduq-dd2-item-media")||x.classList.contains("duduq-dd2-target-media"));
  return {
    ready:!!d?.querySelector(".duduq-dd2-root"),
    configAssets:Object.keys(cfg?.assets||{}),
    stageItemKeys:(stage?.items||[]).map(x=>[x.id,x.imageAssetKey||null]),
    stageTargetKeys:(stage?.targets||[]).map(x=>[x.id,x.imageAssetKey||null]),
    globalConfigAssets:Object.keys(w?.DD2_CONFIG?.assets||{}),
    globalContentItems:Object.values(w?.DD2_CONTENTS||{})[0]?.payload?.items?.map?.(x=>[x.id,x.imageAssetKey||null])||null,
    itemMediaFlags:items.map(x=>[x.getAttribute("data-dd2-item-id"),x.getAttribute("data-has-media")]),
    targetCount:targets.length,
    mediaCount:mediaImgs.length,
    allImages:imgs.map(x=>({class:x.className,src:x.getAttribute("src"),nw:x.naturalWidth,nh:x.naturalHeight,visibility:getComputedStyle(x).visibility})),
    rootText:d?.querySelector(".duduq-dd2-root")?.textContent?.slice(0,300)||"",
    errors:[...errors]
  };
});}

const samples=[];
for(let i=0;i<24;i++){
  const s=await snap();samples.push({t:i*150,...s});
  console.log("MEDIA_PROBE",JSON.stringify(samples.at(-1)));
  await sleep(150);
}
const last=samples.at(-1);
if(!last.configAssets.includes("cat-img")) throw new Error("MEDIA registry missing cat-img");
if(!last.stageItemKeys.some(([id,key])=>id==="cat"&&key==="cat-img")) throw new Error("MEDIA normalized item key missing");
if(last.mediaCount<6) throw new Error(`MEDIA image count ${last.mediaCount}; flags=${JSON.stringify(last.itemMediaFlags)}; globals=${JSON.stringify(last.globalConfigAssets)}; allImages=${JSON.stringify(last.allImages)}`);
if(last.allImages.filter(x=>/duduq-dd2-(?:item|target)-media/.test(String(x.class))).some(x=>x.nw<=0||x.nh<=0)) throw new Error("MEDIA image load failure");
console.log("MEDIA PROBE PASS");
await context.close();await browser.close();