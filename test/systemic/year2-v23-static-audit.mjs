#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const ROOT=process.cwd(),YEAR2=path.join(ROOT,"content/english/year-2");
const SIGNATURES=JSON.parse(fs.readFileSync(path.join(YEAR2,"YEAR2_V23_SOURCE_SIGNATURES.json"),"utf8"));
const EXPECTED_SOURCE_OVERALL="516c90ed4af8ce3780e29f61454fd1de429d83dd7e8d6e3f47c4adac50a28995";
const EXPECTED_FULL=Object.freeze({"01":"02a2c1385b5692243aed87394e9270b9b8576c90b1559870c054136fdb7fad1e","02":"29dc6a5d02f26b62cf2221431e923ccd071f4dc1fb7307cf81ebafa7c32739a7","03":"10b38a34e7cd3b1024e1a119a64abc6d695b22423849ab4bef03bf29371c95fd","04":"c0aaa60c1c3f470211413ac1f1a74d8e7a54fa7317bc1880b8c2df0ca8a1fee7","05":"eacb231b379ac3214f070e76d0f23472e2c407dfb79eb1c32fe528094633d2e9","06":"5a7aebd5e2e51e69825243437ca1965a5b5fa39d948f7fc6a9294fe045251e7a"});
const fail=m=>{throw new Error(`[Y2 STATIC AUDIT] ${m}`)},sha=v=>crypto.createHash("sha256").update(v).digest("hex"),compact=v=>JSON.stringify(v),read=f=>fs.readFileSync(f,"utf8");
function extract(source,a,b){const s=source.indexOf(a),e=source.indexOf(b,s+a.length);if(s<0||e<0)fail(`tokens ausentes ${a}`);return JSON.parse(source.slice(s+a.length,e).trim().replace(/;$/,"") )}
function req(index){const m=index.match(/requiredMechanics\s*:\s*(\[[^\]]*\])/);if(!m)fail("requiredMechanics ausente");return JSON.parse(m[1].replace(/'/g,'"'))}
const canonicalRows=[];
for(let n=1;n<=6;n++){const mm=String(n).padStart(2,"0"),source=read(path.join(YEAR2,`module-${mm}`,`module-${mm}-v23-multimodal.js`)),index=read(path.join(YEAR2,`module-${mm}`,"index.html"));
if(/data:image|<svg|canvas|getContext\(|createElement\(["']canvas["']\)/i.test(source))fail(`M${mm}: asset procedural`);if(!/Source:\s*DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2\.3/.test(source))fail(`M${mm}: fonte`);if(!/sourceVersion\s*:\s*["']2\.3["']/.test(index)||!/R147\/Core 1\.0\.12/.test(index)||!/year2-v23-multimodal-adapter\.js/.test(index))fail(`M${mm}: entrypoint`);
const items=extract(source,"const items=",";\nconst plan=");if(items.length!==15)fail(`M${mm}: quantidade`);const expected=Array.from({length:15},(_,i)=>`EN2-M${n}-${String(i+1).padStart(2,"0")}`);if(items.map(x=>x.id).join("|")!==expected.join("|"))fail(`M${mm}: IDs`);
for(const item of items){if(!String(item.media).includes("Leitura=NÃO")||!String(item.media).includes("Assets=áudio repetível")||!String(item.media).includes("Mecânica="))fail(`${item.id}: mídia`);const c=[item.id,item.prompt,item.alternatives,item.answer];if(SIGNATURES.items?.[item.id]!==sha(compact(c)))fail(`${item.id}: assinatura editorial`);canonicalRows.push(c)}
const full=sha(compact(items.map(item=>[item.id,item.status,item.difficulty,item.skill,item.ability,item.prompt,item.alternatives,item.answer,item.media])));if(full!==EXPECTED_FULL[mm])fail(`M${mm}: full=${full}; expected=${EXPECTED_FULL[mm]}`);
const plan=source.slice(source.indexOf("const plan="));for(const id of expected)if(!plan.includes(`"${id}"`))fail(`${id}: plano`);const used=new Set([...plan.matchAll(/"mechanic"\s*:\s*"([^"]+)"/g)].map(x=>x[1])),required=new Set(req(index));for(const mechanic of used)if(!required.has(mechanic))fail(`M${mm}: mechanic ${mechanic}`);console.log(`Y2 M${mm} STATIC PASS — 15/15`)}
const overall=sha(compact(canonicalRows));if(overall!==EXPECTED_SOURCE_OVERALL||SIGNATURES.overallSha256!==EXPECTED_SOURCE_OVERALL)fail(`overall=${overall}`);console.log("YEAR2 STATIC PASS — 90/90");
