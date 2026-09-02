import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const URL=`${BASE}/test/drag-drop/smart-confirm-2.0.25/index.html`;
const assert=(c,m)=>{if(!c)throw new Error(m)};
const ASSET="https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/";
const IMG={
  cat:ASSET+"pet-cat-gato.png",
  dog:ASSET+"pet-dog-cachorro.png",
  pencil:ASSET+"school-object-pencil-lapis.png",
  backpack:ASSET+"school-object-backpack-mochila.png"
};
const item=id=>`.duduq-dd2-item[data-dd2-item-id="${id}"]`;
const zone=id=>`.duduq-dd2-target[data-dd2-target-id="${id}"] .duduq-dd2-zone`;

const mediaPayload=()=>({
  id:"media-gap",title:"MEDIA",instruction:"Classifique as imagens.",
  behavior:{shuffleItems:false,shuffleTargets:false,smartSnap:true,magneticRadiusPx:104,snapRadiusPx:44},
  payload:{mode:"classification",strategy:"classification",behavior:{shuffleItems:false,shuffleTargets:false},items:[
    {id:"cat",label:"CAT",imageUrl:IMG.cat,alt:"Cat",targetId:"pets",required:true},
    {id:"dog",label:"DOG",imageUrl:IMG.dog,alt:"Dog",spokenText:"dog",speechLocale:"en-US",audioDescription:"Ouvir dog",targetId:"pets",required:true},
    {id:"pencil",label:"PENCIL",imageUrl:IMG.pencil,alt:"Pencil",targetId:"school",required:true},
    {id:"backpack",label:"BACKPACK",imageUrl:IMG.backpack,alt:"Backpack",targetId:"school",required:true}
  ],targets:[
    {id:"pets",label:"PETS",imageUrl:IMG.dog,alt:"Dog representing pets",spokenText:"pets",speechLocale:"en-US",audioDescription:"Ouvir pets",capacity:2,kind:"category"},
    {id:"school",label:"SCHOOL OBJECTS",imageUrl:IMG.backpack,alt:"Backpack representing school objects",capacity:2,kind:"category"}
  ]}
});

const sequencePayload=()=>({
  id:"sequence-gap",title:"SEQUENCE",instruction:"Organize a sequência.",
  behavior:{shuffleItems:false,shuffleTargets:false},
  payload:{mode:"sequence",strategy:"sequence",behavior:{shuffleItems:false,shuffleTargets:false},items:[
    {id:"C",label:"THIRD",targetId:"line",required:true,sequenceIndex:2},
    {id:"A",label:"FIRST",targetId:"line",required:true,sequenceIndex:0},
    {id:"D",label:"FOURTH",targetId:"line",required:true,sequenceIndex:3},
    {id:"B",label:"SECOND",targetId:"line",required:true,sequenceIndex:1}
  ],targets:[{id:"line",label:"ORDER",capacity:4,kind:"list"}]}
});

async function installTtsStub(page){
  await page.addInitScript(()=>{
    const state={calls:0,last:""};
    const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false;},pause(){},resume(){},speak(u){state.calls++;state.last=String(u?.text||"");this.speaking=true;try{u?.onstart?.({type:"start"})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({type:"end"})}catch{}})}};
    try{Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true});}catch{try{globalThis.speechSynthesis=synth}catch{}}
    globalThis.__DD225_TTS__=state;
  });
}

async function open(browser,name){
  const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true,isMobile:false});
  const page=await context.newPage();
  await installTtsStub(page);
  await page.emulateMedia({reducedMotion:"reduce"});
  const errors=[],critical404=[];
  page.on("pageerror",e=>errors.push(String(e?.message||e)));
  page.on("response",r=>{if(r.status()===404&&(r.url().includes("/engine/")||r.url().includes("/test/drag-drop/")||r.url().includes("Assets-DuduQ")))critical404.push(r.url())});
  const res=await page.goto(`${URL}?gap=${name}`,{waitUntil:"domcontentloaded",timeout:30000});
  assert(res?.ok(),`${name}: harness HTTP ${res?.status()}`);
  await page.waitForFunction(()=>window.dd225Mechanic?.()?.version==="2.0.25",null,{timeout:15000});
  return {context,page,errors,critical404};
}

async function mount(page,payload){
  await page.evaluate(p=>window.dd225Mount(p),payload);
  await page.waitForFunction(()=>Boolean(document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-dd2-root")),null,{timeout:15000});
  await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument;return [...(d?.querySelectorAll(".duduq-dd2-item")||[])].some(n=>!n.disabled)},null,{timeout:15000});
  await page.evaluate(()=>{window.__DD225_RESULTS__=[];window.__DD225_COMPLETIONS__=[];});
}

async function snapshot(page){
  return page.evaluate(()=>{
    const d=document.querySelector("#mount iframe")?.contentDocument;
    const locations={};
    d?.querySelectorAll('.duduq-dd2-item[data-dd2-item-id]')?.forEach(n=>{const id=n.getAttribute('data-dd2-item-id');locations[id]=n.closest('[data-dd2-target-id]')?.getAttribute('data-dd2-target-id')||'bank';});
    return {results:window.__DD225_RESULTS__.slice(),completions:window.__DD225_COMPLETIONS__.length,locations,confirm:d?.querySelectorAll('.duduq-dd2-confirm').length||0,overflowX:d?Math.max(0,d.body.scrollWidth-d.documentElement.clientWidth):999};
  });
}

async function freeEdge(locator,touch=true){
  const b=await locator.boundingBox(); assert(b,"target sem bounding box");
  const p={x:Math.max(5,Math.min(b.width-5,8)),y:Math.max(5,Math.min(b.height-5,b.height-8))};
  if(touch)await locator.tap({force:true,position:p});else await locator.click({force:true,position:p});
}

async function tapPlace(frame,id,target){
  const i=frame.locator(item(id)).first(); await i.tap({force:true});
  await frame.locator(`${item(id)}[data-selected="true"]`).waitFor({state:"visible",timeout:2500});
  await freeEdge(frame.locator(zone(target)).first(),true);
  await frame.locator(`${zone(target)} ${item(id)}`).waitFor({state:"visible",timeout:3000});
}

async function keyboardPlace(frame,id,target){
  const i=frame.locator(item(id)).first(),z=frame.locator(zone(target)).first();
  await i.focus(); await i.press("Enter");
  await frame.locator(`${item(id)}[data-selected="true"]`).waitFor({state:"visible",timeout:2500});
  await z.focus(); await z.press("Enter");
  await frame.locator(`${zone(target)} ${item(id)}`).waitFor({state:"visible",timeout:3000});
}

async function sequenceTapPlace(frame,id){
  const i=frame.locator(item(id)).first(); await i.tap({force:true});
  await frame.locator(`${item(id)}[data-selected="true"]`).waitFor({state:"visible",timeout:2500});
  const empty=frame.locator('.duduq-dd2-sequence-slot[data-filled="false"]').first();
  await empty.tap({force:true});
  await frame.locator(`${zone("line")} ${item(id)}`).waitFor({state:"visible",timeout:3000});
}

async function drag(page,from,to,steps=10){
  const a=await from.boundingBox(),b=await to.boundingBox(); assert(a&&b,"drag sem bounding box");
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps}); await page.mouse.up();
}

async function dragNear(page,from,target){
  const a=await from.boundingBox(),b=await target.boundingBox(); assert(a&&b,"smart snap sem bounding box");
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down();
  await page.mouse.move(b.x-20,b.y+b.height/2,{steps:10}); await page.mouse.up();
}

async function dragToBank(page,frame,id){
  const from=frame.locator(item(id)).first(),bank=frame.locator('.duduq-dd2-bank').first();
  const a=await from.boundingBox(),b=await bank.boundingBox(); assert(a&&b,`bank drag ${id}: bounding box ausente`);
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down();
  await page.mouse.move(b.x+b.width-12,b.y+b.height-12,{steps:10}); await page.mouse.up();
  await frame.locator(`.duduq-dd2-bank ${item(id)}`).waitFor({state:"visible",timeout:3000});
}

async function assertMediaGeometry(page){
  const report=await page.evaluate(()=>{
    const d=document.querySelector("#mount iframe")?.contentDocument;if(!d)return {ok:false,why:"no-doc"};
    const imgs=[...d.querySelectorAll('.duduq-dd2-item-media,.duduq-dd2-target-media')];
    const rows=imgs.map(img=>{const r=img.getBoundingClientRect(),p=img.parentElement?.getBoundingClientRect(),fit=getComputedStyle(img).objectFit;return {natural:[img.naturalWidth,img.naturalHeight],rect:[r.left,r.top,r.right,r.bottom,r.width,r.height],parent:p?[p.left,p.top,p.right,p.bottom]:null,fit};});
    const placed=[...d.querySelectorAll('.duduq-dd2-zone .duduq-dd2-item[data-dd2-item-id]')].map(n=>{const r=n.getBoundingClientRect(),head=n.closest('.duduq-dd2-target')?.querySelector('.duduq-dd2-target-head')?.getBoundingClientRect();return {r:[r.left,r.top,r.right,r.bottom],head:head?[head.left,head.top,head.right,head.bottom]:null};});
    return {ok:true,count:imgs.length,rows,placed,overflowX:Math.max(0,d.body.scrollWidth-d.documentElement.clientWidth)};
  });
  assert(report.ok&&report.count>=6,`media: imagens esperadas não renderizaram (${JSON.stringify(report)})`);
  for(const row of report.rows){
    assert(row.natural[0]>0&&row.natural[1]>0,"media: imagem não carregada");
    assert(row.fit==="contain","media: object-fit não é contain");
    assert(row.rect[4]>0&&row.rect[5]>0,"media: imagem sem dimensão visível");
    if(row.parent)assert(row.rect[0]>=row.parent[0]-2&&row.rect[2]<=row.parent[2]+2,`media: imagem estourou card ${JSON.stringify(row)}`);
  }
  for(const x of report.placed){if(x.head)assert(x.r[1]>=x.head[3]-3,`media: item colocado invadiu label/head do destino ${JSON.stringify(x)}`);}
  assert(report.overflowX<=6,`media: overflow horizontal ${report.overflowX}px`);
}

async function runMedia(browser){
  const {context,page,errors,critical404}=await open(browser,"media");
  try{
    const payload=mediaPayload(); assert(await page.evaluate(p=>window.dd225Validate(p),payload),"media: payload rejeitado");
    await mount(page,payload); const frame=page.frameLocator("#mount iframe");
    await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument;const imgs=[...(d?.querySelectorAll('.duduq-dd2-item-media,.duduq-dd2-target-media')||[])];return imgs.length>=6&&imgs.every(i=>i.complete&&i.naturalWidth>0);},null,{timeout:20000});
    await assertMediaGeometry(page);

    const before=await snapshot(page);
    await frame.locator('.duduq-dd2-target[data-dd2-target-id="pets"] .duduq-dd2-target-audio').click({force:true});
    await page.waitForTimeout(80);
    let s=await snapshot(page);
    assert(s.results.length===0&&s.confirm===0,"media: áudio confirmou/avaliou");
    assert(JSON.stringify(s.locations)===JSON.stringify(before.locations),"media: áudio moveu item");

    await tapPlace(frame,"cat","pets");
    await tapPlace(frame,"pencil","school");
    await dragNear(page,frame.locator(item("backpack")).first(),frame.locator('.duduq-dd2-target[data-dd2-target-id="pets"]').first());
    await frame.locator(`${zone("pets")} ${item("backpack")}`).waitFor({state:"visible",timeout:3000});
    s=await snapshot(page); assert(s.results.length===0,"media: smart snap errado avaliou antes do Confirmar");
    await tapPlace(frame,"dog","school");
    s=await snapshot(page); assert(s.results.length===0&&s.confirm===1,"media: avaliação ocorreu antes do Confirmar ou Confirmar ausente");
    await assertMediaGeometry(page);

    await frame.locator('.duduq-dd2-confirm').click({force:true});
    await page.waitForFunction(()=>window.__DD225_RESULTS__.length===1,null,{timeout:5000});
    s=await snapshot(page); assert(s.results[0]?.isCorrect===false,"media: montagem errada não gerou retry");
    await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument;return Boolean(d?.querySelector('.duduq-dd2-bank [data-dd2-item-id="dog"]')&&d?.querySelector('.duduq-dd2-bank [data-dd2-item-id="backpack"]')&&d?.querySelector(`${'.duduq-dd2-zone [data-dd2-item-id="cat"]'}:disabled`)&&d?.querySelector(`${'.duduq-dd2-zone [data-dd2-item-id="pencil"]'}:disabled`));},null,{timeout:5000});

    await tapPlace(frame,"dog","pets");
    await drag(page,frame.locator(item("backpack")).first(),frame.locator(zone("school")).first());
    await frame.locator(`${zone("school")} ${item("backpack")}`).waitFor({state:"visible",timeout:3000});
    s=await snapshot(page); assert(s.results.length===1&&s.confirm===1,"media: correção avaliou antes do segundo Confirmar");
    await frame.locator('.duduq-dd2-confirm').click({force:true});
    await page.waitForFunction(()=>window.__DD225_RESULTS__.length===2&&window.__DD225_RESULTS__[1]?.isCorrect===true,null,{timeout:5000});
    await page.waitForFunction(()=>window.__DD225_COMPLETIONS__.length===1,null,{timeout:5000});
    await assertMediaGeometry(page);
    assert(errors.length===0,`media: JS errors ${errors.join(" | ")}`); assert(critical404.length===0,`media: critical404 ${critical404.join(",")}`);
    console.log("MEDIA PASS");
  }finally{await context.close();}
}

async function sequenceState(page){
  return page.evaluate(()=>{
    const d=document.querySelector("#mount iframe")?.contentDocument;
    const slots=[...(d?.querySelectorAll('.duduq-dd2-sequence-slot')||[])];
    const order=slots.map(s=>s.querySelector('[data-dd2-item-id]')?.getAttribute('data-dd2-item-id')||null);
    const rects=slots.map(s=>{const r=s.getBoundingClientRect();const item=s.querySelector('[data-dd2-item-id]')?.getBoundingClientRect();return {slot:[r.left,r.top,r.right,r.bottom,r.width,r.height],item:item?[item.left,item.top,item.right,item.bottom,item.width,item.height]:null};});
    return {order,rects,results:window.__DD225_RESULTS__.slice(),confirm:d?.querySelectorAll('.duduq-dd2-confirm').length||0,overflowX:d?Math.max(0,d.body.scrollWidth-d.documentElement.clientWidth):999};
  });
}

function assertSequenceLayout(s,label){
  assert(s.order.length===4,`${label}: esperado 4 slots, recebeu ${s.order.length}`);
  assert(s.overflowX<=6,`${label}: overflow horizontal ${s.overflowX}px`);
  for(const r of s.rects){assert(r.slot[4]>20&&r.slot[5]>20,`${label}: slot escondido`);if(r.item){assert(r.item[4]>10&&r.item[5]>10,`${label}: item escondido`);assert(r.item[0]>=r.slot[0]-2&&r.item[2]<=r.slot[2]+2&&r.item[1]>=r.slot[1]-2&&r.item[3]<=r.slot[3]+2,`${label}: item saiu do slot`);}}
  for(let i=0;i<s.rects.length;i++)for(let j=i+1;j<s.rects.length;j++){const a=s.rects[i].slot,b=s.rects[j].slot;const overlap=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));assert(overlap<4,`${label}: slots sobrepostos ${i}/${j}`);}
}

async function runSequence(browser){
  const {context,page,errors,critical404}=await open(browser,"sequence");
  try{
    const payload=sequencePayload(); assert(await page.evaluate(p=>window.dd225Validate(p),payload),"sequence: payload rejeitado");
    await mount(page,payload); const frame=page.frameLocator("#mount iframe");
    await page.waitForFunction(()=>document.querySelector("#mount iframe")?.contentDocument?.querySelectorAll('.duduq-dd2-sequence-slot').length===4,null,{timeout:5000});
    let s=await sequenceState(page); assertSequenceLayout(s,"sequence inicial"); assert(s.confirm===0,"sequence: Confirmar apareceu cedo");

    await drag(page,frame.locator(item("A")).first(),frame.locator(zone("line")).first());
    await frame.locator(`${zone("line")} ${item("A")}`).waitFor({state:"visible",timeout:3000});
    await sequenceTapPlace(frame,"C");
    await keyboardPlace(frame,"B","line");
    await sequenceTapPlace(frame,"D");
    s=await sequenceState(page); assert(JSON.stringify(s.order)===JSON.stringify(["A","C","B","D"]),`sequence: montagem errada inesperada ${JSON.stringify(s.order)}`); assert(s.results.length===0&&s.confirm===1,"sequence: feedback antes do Confirmar"); assertSequenceLayout(s,"sequence montagem");

    await dragToBank(page,frame,"C"); await dragToBank(page,frame,"B");
    await keyboardPlace(frame,"B","line"); await sequenceTapPlace(frame,"C");
    s=await sequenceState(page); assert(JSON.stringify(s.order)===JSON.stringify(["A","B","C","D"]),`sequence: troca pré-confirmar falhou ${JSON.stringify(s.order)}`); assert(s.results.length===0,"sequence: troca pré-confirmar avaliou");

    await dragToBank(page,frame,"B"); await dragToBank(page,frame,"C");
    await sequenceTapPlace(frame,"C"); await keyboardPlace(frame,"B","line");
    s=await sequenceState(page); assert(JSON.stringify(s.order)===JSON.stringify(["A","C","B","D"]),"sequence: preparação de retry falhou"); assert(s.results.length===0,"sequence: feedback antes do Confirmar no retry setup");
    await frame.locator('.duduq-dd2-confirm').click({force:true});
    await page.waitForFunction(()=>window.__DD225_RESULTS__.length===1,null,{timeout:5000});
    s=await sequenceState(page); assert(s.results[0]?.isCorrect===false,"sequence: ordem errada não gerou retry");
    await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument;const A=d?.querySelector('[data-dd2-item-id="A"]'),D=d?.querySelector('[data-dd2-item-id="D"]'),B=d?.querySelector('[data-dd2-item-id="B"]'),C=d?.querySelector('[data-dd2-item-id="C"]');return Boolean(A?.disabled&&D?.disabled&&!B?.disabled&&!C?.disabled);},null,{timeout:5000});

    await dragToBank(page,frame,"C"); await dragToBank(page,frame,"B");
    await sequenceTapPlace(frame,"B"); await keyboardPlace(frame,"C","line");
    s=await sequenceState(page); assert(JSON.stringify(s.order)===JSON.stringify(["A","B","C","D"]),`sequence: correção final falhou ${JSON.stringify(s.order)}`); assert(s.results.length===1&&s.confirm===1,"sequence: segunda avaliação ocorreu antes do Confirmar"); assertSequenceLayout(s,"sequence corrigida");
    await frame.locator('.duduq-dd2-confirm').click({force:true});
    await page.waitForFunction(()=>window.__DD225_RESULTS__.length===2&&window.__DD225_RESULTS__[1]?.isCorrect===true,null,{timeout:5000});
    await page.waitForFunction(()=>window.__DD225_COMPLETIONS__.length===1,null,{timeout:5000});
    assert(errors.length===0,`sequence: JS errors ${errors.join(" | ")}`); assert(critical404.length===0,`sequence: critical404 ${critical404.join(",")}`);
    console.log("SEQUENCE PASS");
  }finally{await context.close();}
}

const browser=await chromium.launch({headless:true});
try{await runMedia(browser);await runSequence(browser);}finally{await browser.close();}
console.log("PASS — Drag & Drop 2.0.25 media + sequence gaps");
