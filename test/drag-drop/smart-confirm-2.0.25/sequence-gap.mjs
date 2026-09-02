import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const URL=`${BASE}/test/drag-drop/smart-confirm-2.0.25/index.html`;
const assert=(c,m)=>{if(!c)throw new Error(m)};
const item=id=>`.duduq-dd2-item[data-dd2-item-id="${id}"]`;
const zone='.duduq-dd2-target[data-dd2-target-id="line"] .duduq-dd2-zone';
const q={
  id:"sequence-gap",title:"SEQUENCE",instruction:"Organize a sequência.",behavior:{shuffleItems:false,shuffleTargets:false},
  payload:{mode:"association",strategy:"sequence",items:[
    {id:"C",label:"THIRD",targetId:"line",required:true,sequenceIndex:2},
    {id:"A",label:"FIRST",targetId:"line",required:true,sequenceIndex:0},
    {id:"D",label:"FOURTH",targetId:"line",required:true,sequenceIndex:3},
    {id:"B",label:"SECOND",targetId:"line",required:true,sequenceIndex:1}
  ],targets:[{id:"line",label:"ORDER",capacity:4,kind:"list"}]}
};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true});
const page=await context.newPage();
await page.emulateMedia({reducedMotion:"reduce"});
const errors=[],critical404=[];
page.on("pageerror",e=>errors.push(String(e?.message||e)));
page.on("response",r=>{const u=r.url();if(r.status()===404&&(u.includes("/engine/")||u.includes("/test/drag-drop/")))critical404.push(u)});
const res=await page.goto(`${URL}?gap=sequence`,{waitUntil:"domcontentloaded",timeout:30000});
assert(res?.ok(),`SEQUENCE HTTP ${res?.status()}`);
await page.waitForFunction(()=>window.dd225Mechanic?.()?.version==="2.0.25",null,{timeout:15000});
assert(await page.evaluate(x=>window.dd225Validate(x),q),"SEQUENCE payload invalid");
await page.evaluate(x=>window.dd225Mount(x),q);
await page.waitForFunction(()=>Boolean(document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-dd2-root")),null,{timeout:15000});
await page.waitForFunction(()=>document.querySelector("#mount iframe")?.contentDocument?.querySelectorAll(".duduq-dd2-sequence-slot").length===4,null,{timeout:5000});
const frame=page.frameLocator("#mount iframe");

async function snap(){return page.evaluate(()=>{
  const d=document.querySelector("#mount iframe")?.contentDocument,slots=[...(d?.querySelectorAll(".duduq-dd2-sequence-slot")||[])];
  let cfg=null;try{cfg=JSON.parse(d?.querySelector("#targetShooterConfig")?.textContent||"null")}catch{}
  const stage=cfg?.stages?.[0];
  return {
    strategy:stage?.strategy,kind:stage?.targets?.[0]?.kind,capacity:stage?.targets?.[0]?.capacity,
    normalized:stage?.items?.map(x=>[x.id,x.sequenceIndex,x.targetId])||[],
    bank:[...(d?.querySelectorAll(".duduq-dd2-bank [data-dd2-item-id]")||[])].map(n=>n.getAttribute("data-dd2-item-id")),
    order:slots.map(s=>s.querySelector("[data-dd2-item-id]")?.getAttribute("data-dd2-item-id")||null),
    rects:slots.map(s=>{const a=s.getBoundingClientRect(),i=s.querySelector("[data-dd2-item-id]")?.getBoundingClientRect();return{a:[a.left,a.top,a.right,a.bottom,a.width,a.height],i:i?[i.left,i.top,i.right,i.bottom,i.width,i.height]:null}}),
    disabled:Object.fromEntries([...(d?.querySelectorAll(".duduq-dd2-item[data-dd2-item-id]")||[])].map(n=>[n.getAttribute("data-dd2-item-id"),n.disabled])),
    results:__DD225_RESULTS__.slice(),confirm:d?.querySelectorAll(".duduq-dd2-confirm").length||0,complete:__DD225_COMPLETIONS__.length,
    overflow:d?Math.max(0,d.body.scrollWidth-d.documentElement.clientWidth):999
  };
})}
function layout(s,label){
  assert(s.order.length===4,`${label} slots ${s.order.length}`);assert(s.overflow<=6,`${label} overflow ${s.overflow}`);
  for(const r of s.rects){assert(r.a[4]>20&&r.a[5]>20,`${label} hidden slot`);if(r.i){assert(r.i[4]>10&&r.i[5]>10,`${label} hidden item`);assert(r.i[0]>=r.a[0]-2&&r.i[2]<=r.a[2]+2&&r.i[1]>=r.a[1]-2&&r.i[3]<=r.a[3]+2,`${label} item outside slot`)}}
  for(let x=0;x<s.rects.length;x++)for(let y=x+1;y<s.rects.length;y++){const a=s.rects[x].a,b=s.rects[y].a,o=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));assert(o<4,`${label} overlap ${x}/${y}`)}
}
async function selectTap(id){const x=frame.locator(item(id)).first();await x.tap({force:true});await frame.locator(`${item(id)}[data-selected="true"]`).waitFor({state:"visible",timeout:3000})}
async function tapIntoNextSlot(id){await selectTap(id);const slot=frame.locator('.duduq-dd2-sequence-slot[data-filled="false"]').first();await slot.tap({force:true});await frame.locator(`${zone} ${item(id)}`).waitFor({state:"visible",timeout:3000})}
async function keyIntoZone(id){const x=frame.locator(item(id)).first(),z=frame.locator(zone).first();await x.focus();await x.press("Enter");await frame.locator(`${item(id)}[data-selected="true"]`).waitFor({state:"visible",timeout:3000});await z.focus();await z.press("Enter");await frame.locator(`${zone} ${item(id)}`).waitFor({state:"visible",timeout:3000})}
async function dragTo(id,to){const a=await frame.locator(item(id)).first().boundingBox(),b=await to.boundingBox();assert(a&&b,`SEQUENCE drag box ${id}`);await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up()}
async function dragIntoNextSlot(id){const slot=frame.locator('.duduq-dd2-sequence-slot[data-filled="false"]').first();await dragTo(id,slot);await frame.locator(`${zone} ${item(id)}`).waitFor({state:"visible",timeout:3000})}
async function toBank(id){const bank=frame.locator(".duduq-dd2-bank").first();await dragTo(id,bank);await frame.locator(`.duduq-dd2-bank ${item(id)}`).waitFor({state:"visible",timeout:3000})}

let s=await snap();
assert(s.strategy==="sequence",`SEQUENCE strategy ${s.strategy}`);assert(s.kind==="list",`SEQUENCE kind ${s.kind}`);assert(s.capacity===4,`SEQUENCE capacity ${s.capacity}`);
assert(JSON.stringify(s.bank)===JSON.stringify(["C","A","D","B"]),`SEQUENCE shuffled bank ${JSON.stringify(s.bank)}`);
assert(JSON.stringify(s.normalized)===JSON.stringify([["C",2,"line"],["A",0,"line"],["D",3,"line"],["B",1,"line"]]),`SEQUENCE normalized ${JSON.stringify(s.normalized)}`);
assert(s.confirm===0&&!s.results.length,"SEQUENCE early feedback");layout(s,"SEQUENCE initial");

await tapIntoNextSlot("A");
await tapIntoNextSlot("C");
await keyIntoZone("B");
await dragIntoNextSlot("D");
s=await snap();assert(JSON.stringify(s.order)===JSON.stringify(["A","C","B","D"]),`SEQUENCE first order ${JSON.stringify(s.order)}`);assert(!s.results.length&&s.confirm===1,"SEQUENCE pre-confirm feedback");layout(s,"SEQUENCE assembled");

await toBank("C");await toBank("B");await dragIntoNextSlot("B");await dragIntoNextSlot("C");
s=await snap();assert(JSON.stringify(s.order)===JSON.stringify(["A","B","C","D"]),`SEQUENCE pre-confirm reposition ${JSON.stringify(s.order)}`);assert(!s.results.length,"SEQUENCE reposition evaluated");layout(s,"SEQUENCE repositioned");

await toBank("B");await toBank("C");await dragIntoNextSlot("C");await dragIntoNextSlot("B");
s=await snap();assert(JSON.stringify(s.order)===JSON.stringify(["A","C","B","D"]),`SEQUENCE retry setup ${JSON.stringify(s.order)}`);assert(!s.results.length,"SEQUENCE retry setup evaluated");
await frame.locator(".duduq-dd2-confirm").click({force:true});
await page.waitForFunction(()=>__DD225_RESULTS__.length===1,null,{timeout:5000});
await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument,A=d?.querySelector('[data-dd2-item-id="A"]'),D=d?.querySelector('[data-dd2-item-id="D"]'),B=d?.querySelector('[data-dd2-item-id="B"]'),C=d?.querySelector('[data-dd2-item-id="C"]');return Boolean(A?.disabled&&D?.disabled&&!B?.disabled&&!C?.disabled&&d?.querySelector('.duduq-dd2-bank [data-dd2-item-id="B"]')&&d?.querySelector('.duduq-dd2-bank [data-dd2-item-id="C"]'))},null,{timeout:5000});
s=await snap();assert(s.results[0]?.isCorrect===false,"SEQUENCE wrong did not retry");assert(s.disabled.A&&s.disabled.D&&!s.disabled.B&&!s.disabled.C,"SEQUENCE partial retry contract");assert(JSON.stringify(s.order)===JSON.stringify(["A",null,null,"D"]),`SEQUENCE preserved positions ${JSON.stringify(s.order)}`);layout(s,"SEQUENCE retry");

await dragIntoNextSlot("B");await dragIntoNextSlot("C");
s=await snap();assert(JSON.stringify(s.order)===JSON.stringify(["A","B","C","D"]),`SEQUENCE final order ${JSON.stringify(s.order)}`);assert(s.results.length===1&&s.confirm===1,"SEQUENCE correction auto-evaluated");layout(s,"SEQUENCE corrected");
await frame.locator(".duduq-dd2-confirm").click({force:true});
await page.waitForFunction(()=>__DD225_RESULTS__.length===2&&__DD225_RESULTS__[1]?.isCorrect===true,null,{timeout:5000});
await page.waitForFunction(()=>__DD225_COMPLETIONS__.length===1,null,{timeout:5000});
assert(!errors.length,`SEQUENCE JS ${errors.join("|")}`);assert(!critical404.length,`SEQUENCE 404 ${critical404.join(",")}`);
console.log("SEQUENCE PASS");
await context.close();await browser.close();