import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root=process.cwd();
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const assert=(c,m)=>{if(!c)throw new Error(m)};
const current=read("engine/channels/canary-v1.json");
const rollback=read("engine/channels/canary-r147-rollback.json");

assert(rollback.revision===147,`rollback revision ${rollback.revision}`);
assert(rollback.core?.release==="1.0.12",`rollback core ${rollback.core?.release}`);
assert(rollback.mechanics?.["drag-drop"]?.release==="2.0.24",`rollback DD ${rollback.mechanics?.["drag-drop"]?.release}`);
assert(current.revision===148,`canary revision ${current.revision}`);
assert(current.core?.release==="1.0.12",`canary core ${current.core?.release}`);
assert(current.mechanics?.["drag-drop"]?.release==="2.0.25",`canary DD ${current.mechanics?.["drag-drop"]?.release}`);
assert(current.mechanics?.["drag-drop"]?.adapter==="/engine/releases/mechanics/drag-drop/2.0.25/drag-drop.js","DD adapter não aponta para 2.0.25");
assert(current.mechanics?.["drag-drop"]?.runtime===rollback.mechanics?.["drag-drop"]?.runtime,"DD runtime base mudou");
assert(fs.existsSync(path.join(root,"engine/releases/mechanics/drag-drop/2.0.25/drag-drop.js")),"release path 2.0.25 ausente");

for(const id of Object.keys(rollback.mechanics||{})){
  if(id==="drag-drop") continue;
  assert(JSON.stringify(current.mechanics[id])===JSON.stringify(rollback.mechanics[id]),`${id} mudou na R148`);
}
assert(JSON.stringify(current.core)===JSON.stringify(rollback.core),"Core mudou na R148");
assert(JSON.stringify(current.policy)===JSON.stringify(rollback.policy),"Policy mudou na R148");
assert(current.channel===rollback.channel&&current.channel==="canary-v1","channel mudou");

const contentDiff=execFileSync("git",["diff","--name-only","730d0737308369a09d904f12e13e49c2fcf1101d...HEAD","--","content/english"],{encoding:"utf8"}).trim();
assert(!contentDiff,`conteúdo alterado durante promoção: ${contentDiff}`);

console.log(JSON.stringify({status:"PASS",contract:"CANARY_R148_DD225",revision:current.revision,core:current.core.release,dragDrop:current.mechanics["drag-drop"].release},null,2));
