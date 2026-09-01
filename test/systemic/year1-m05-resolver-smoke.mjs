import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
function ok(v,msg){if(!v)throw new Error(msg)}
async function httpOK(page,url,label){ok(/^https?:\/\//i.test(url),`${label}: URL não HTTP ${url}`);ok(!/^(data:|blob:)/i.test(url)&&!/\.svg(?:\?|$)/i.test(url),`${label}: fallback/procedural ${url}`);const r=await page.request.get(url,{timeout:15000});ok(r.ok(),`${label}: HTTP ${r.status()} ${url}`)}
async function imageOK(page,url,label){const r=await page.evaluate(async url=>{const img=new Image();return await new Promise(resolve=>{const done=()=>resolve({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight});img.onload=done;img.onerror=done;img.src=url;if(img.complete)setTimeout(done,0)})},url);ok(r.complete&&r.naturalWidth>0&&r.naturalHeight>0,`${label}: imagem não carregou ${url}`);return r}

const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],notFound=[];
 page.on("pageerror",e=>errors.push(String(e?.message||e)));
 page.on("response",r=>{if(r.status()===404&&(r.url().includes("Assets-DuduQ")||r.url().includes("/module-05/")||r.url().includes("/engine/")))notFound.push(r.url())});
 const entry=await page.goto(`${BASE}/content/english/year-1/module-05/?qa=resolver-smoke-directed`,{waitUntil:"domcontentloaded",timeout:30000});ok(entry?.ok(),"M05 smoke entry HTTP");
 await page.waitForFunction(()=>Boolean(window.DuduQAssets?.resolveImageDetails&&window.DUDUQ_CONTENT?.english?.year1?.module05),null,{timeout:30000});
 const data=await page.evaluate(()=>{
   const m=window.DUDUQ_CONTENT.english.year1.module05;
   const qs=(m.activities||[]).flatMap(a=>a.questions||[]);
   const by=id=>qs.find(q=>q.id===id);
   const resolve=key=>{const d=window.DuduQAssets.resolveImageDetails(key),u=d?.url||window.DuduQAssets.resolveImage(key)||"";return u?new URL(u,location.href).href:""};
   const q07=by("EN1-M5-07"),q08=by("EN1-M5-08"),q11=by("EN1-M5-11");
   const target=q=>q?.payload?.targets?.[0];
   const q11items=q11?.metadata?.targetShooter?.items||[];
   return {
     version:m.version,policy:m.assetResolutionPolicy,helper:window.M05VisualComposition?.version||"",
     q07:{key:target(q07)?.imageAsset||target(q07)?.imageAssetKey||"",url:new URL(target(q07)?.image?.src||target(q07)?.imageUrl||"",location.href).href},
     q08:{key:target(q08)?.imageAsset||target(q08)?.imageAssetKey||"",url:new URL(target(q08)?.image?.src||target(q08)?.imageUrl||"",location.href).href},
     q11:q11items.map(i=>({id:i.id,key:i.imageAsset||i.imageAssetKey||"",url:i.imageUrl?new URL(i.imageUrl,location.href).href:(i.image?new URL(i.image,location.href).href:"")})),
     resolved:{dog:resolve("dog"),cat:resolve("cat"),boy:resolve("boy"),rabbit:resolve("rabbit")},raw:JSON.stringify(m)
   };
 });
 ok(data.policy?.resolver==="DuduQAssets.resolveImageDetails/resolveImage"&&data.policy?.manualImagePaths===false&&data.policy?.proceduralFallback===false,"M05 resolver policy");
 ok(!/(data:image|gap-preview|simplePet|pairSizePreview)/i.test(data.raw),"M05 procedural fallback found");
 ok(data.helper==="1.2.0-m05-resolver-local","M05 helper resolver version");
 ok(data.q07.key==="dog"&&data.q07.url===data.resolved.dog,"Q07 não consome URL retornada pelo resolver");
 ok(data.q08.key==="cat"&&data.q08.url===data.resolved.cat,"Q08 não consome URL retornada pelo resolver");
 ok(data.q11.length===3,"Q11 precisa de 3 alvos");
 for(const [k,u] of Object.entries(data.resolved)){ok(u,`resolver vazio: ${k}`);await httpOK(page,u,k);await imageOK(page,u,k)}
 const helperText=await (await page.request.get(`${BASE}/content/english/year-1/module-05/m05-visual-composition.js`,{timeout:15000})).text();
 ok(/resolveImageDetails|resolveImage/.test(helperText)&&/currentSrc/.test(helperText),"helper não usa resolver/currentSrc");
 ok(!/raw\.githubusercontent\.com|data:image|gap-preview/i.test(helperText),"helper contém path/fallback proibido");
 for(const item of data.q11){ok(item.key&&item.url,"Q11 item sem asset resolvido");const expected=data.resolved[item.key]||"";ok(expected&&item.url===expected,`Q11 ${item.id} não consome resolver (${item.key})`)}
 ok(errors.length===0,`M05 smoke pageErrors ${errors.join(" | ")}`);ok(notFound.length===0,`M05 smoke 404 ${notFound.join(" | ")}`);
 console.log("M05 resolver smoke PASS — Q07/Q08/Q11: resolver URL, HTTP, image naturalWidth, no 404/procedural fallback");
}finally{await browser.close()}
