#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const YEAR2 = path.join(ROOT, "content/english/year-2");
const SIGNATURES = JSON.parse(fs.readFileSync(path.join(YEAR2, "YEAR2_V23_SOURCE_SIGNATURES.json"), "utf8"));
const EXPECTED_SOURCE_OVERALL = "516c90ed4af8ce3780e29f61454fd1de429d83dd7e8d6e3f47c4adac50a28995";
const EXPECTED_FULL = Object.freeze({
  "01":"02a2c1385b5692243aed87394e9270b9b8576c90b1559870c054136fdb7fad1e",
  "02":"29dc6a5d02f26b62cf2221431e923ccd071f4dc1fb7307cf81ebafa7c32739a7",
  "03":"10b38a34e7cd3b1024e1a119a64abc6d695b22423849ab4bef03bf29371c95fd",
  "04":"c0aaa60c1c3f470211413ac1f1a74d8e7a54fa7317bc1880b8c2df0ca8a1fee7",
  "05":"eacb231b379ac3214f070e76d0f23472e2c407dfb79eb1c32fe528094633d2e9",
  "06":"5a7aebd5e2e51e69825243437ca1965a5b5fa39d948f7fc6a9294fe045251e7a"
});

function fail(message){ throw new Error(`[Y2 STATIC AUDIT] ${message}`); }
function sha(value){ return crypto.createHash("sha256").update(value).digest("hex"); }
function compact(value){ return JSON.stringify(value); }
function read(file){ return fs.readFileSync(file, "utf8"); }

function extractJsonLiteral(source, startToken, endToken){
  const start = source.indexOf(startToken);
  if(start < 0) fail(`token ausente: ${startToken}`);
  const from = start + startToken.length;
  const end = source.indexOf(endToken, from);
  if(end < 0) fail(`token final ausente: ${endToken}`);
  const raw = source.slice(from, end).trim().replace(/;$/, "");
  try { return JSON.parse(raw); }
  catch(error){ fail(`JSON literal inválido entre ${startToken} e ${endToken}: ${error.message}`); }
}

function requiredMechanics(index){
  const m = index.match(/requiredMechanics\s*:\s*(\[[^\]]*\])/);
  if(!m) fail("requiredMechanics ausente no index");
  return JSON.parse(m[1].replace(/'/g, '"'));
}

const canonicalRows = [];
for(let moduleNumber=1; moduleNumber<=6; moduleNumber++){
  const mm = String(moduleNumber).padStart(2,"0");
  const moduleFile = path.join(YEAR2, `module-${mm}`, `module-${mm}-v23-multimodal.js`);
  const indexFile = path.join(YEAR2, `module-${mm}`, "index.html");
  const source = read(moduleFile);
  const index = read(indexFile);

  if(/data:image|<svg|canvas|getContext\(|createElement\(["']canvas["']\)|procedural/i.test(source))
    fail(`M${mm}: asset procedural/data URI detectado`);
  if(!/Source:\s*DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2\.3/.test(source))
    fail(`M${mm}: declaração de fonte v2.3 ausente`);
  if(!/sourceVersion\s*:\s*["']2\.3["']/.test(index))
    fail(`M${mm}: sourceVersion 2.3 ausente no entrypoint`);
  if(!/R147\/Core 1\.0\.12/.test(index))
    fail(`M${mm}: entrypoint não declara Foundation R147/Core 1.0.12`);
  if(!/year2-v23-multimodal-adapter\.js/.test(index))
    fail(`M${mm}: adapter multimodal v2.3 ausente`);

  const items = extractJsonLiteral(source, "const items=", ";\nconst plan=");
  if(!Array.isArray(items) || items.length !== 15) fail(`M${mm}: esperado 15 itens`);

  const expectedIds = Array.from({length:15},(_,i)=>`EN2-M${moduleNumber}-${String(i+1).padStart(2,"0")}`);
  const ids = items.map(item=>item.id);
  if(compact(ids) !== compact(expectedIds)) fail(`M${mm}: IDs/ordem divergentes`);

  for(const item of items){
    if(!String(item.media||"").includes("Leitura=NÃO")) fail(`${item.id}: leitura deveria ser NÃO`);
    if(!String(item.media||"").includes("Assets=áudio repetível")) fail(`${item.id}: áudio repetível ausente`);
    if(!String(item.media||"").includes("Mecânica=")) fail(`${item.id}: modalidade editorial ausente`);
    const canonical = [item.id,item.prompt,item.alternatives,item.answer];
    const itemSig = sha(compact(canonical));
    if(SIGNATURES.items?.[item.id] !== itemSig) fail(`${item.id}: ID/prompt/alternativas/gabarito divergem da v2.3`);
    canonicalRows.push(canonical);
  }

  const fullRows = items.map(item=>[
    item.id,item.status,item.difficulty,item.skill,item.ability,
    item.prompt,item.alternatives,item.answer,item.media
  ]);
  const full = sha(compact(fullRows));
  if(full !== EXPECTED_FULL[mm]) fail(`M${mm}: skill/status/modalidade/conteúdo divergem da autoridade v2.3`);

  const planText = source.slice(source.indexOf("const plan="));
  const planIds = [...planText.matchAll(/"EN2-M\d-\d{2}"\s*:/g)].map(m=>m[0].match(/EN2-M\d-\d{2}/)[0]);
  for(const id of expectedIds) if(!planIds.includes(id)) fail(`${id}: plano de entrega ausente`);

  const used = new Set([...planText.matchAll(/"mechanic"\s*:\s*"([^"]+)"/g)].map(m=>m[1]));
  if(used.size === 0) fail(`M${mm}: nenhuma mecânica planejada`);
  const required = new Set(requiredMechanics(index));
  for(const mechanic of used) if(!required.has(mechanic))
    fail(`M${mm}: mecânica ${mechanic} usada mas ausente de requiredMechanics`);

  console.log(`Y2 M${mm} STATIC PASS — 15/15`);
}

const canonicalOverall = sha(compact(canonicalRows));
if(canonicalOverall !== EXPECTED_SOURCE_OVERALL || SIGNATURES.overallSha256 !== EXPECTED_SOURCE_OVERALL)
  fail(`assinatura agregada v2.3 divergente: ${canonicalOverall}`);

console.log("YEAR2 STATIC PASS — 90/90 — editorial + modality + reading + asset policy + requiredMechanics");
