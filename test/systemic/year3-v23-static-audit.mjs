#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),Y3=path.join(ROOT,'content/english/year-3');
function fail(m){throw new Error(`[Y3 STATIC AUDIT] ${m}`)}
function read(p){return fs.readFileSync(p,'utf8')}
const factory=read(path.join(Y3,'year3-content-factory-r147.js'));
if(!/Y3_GUIDED_READING/.test(factory))fail('perfil Y3_GUIDED_READING ausente');
if(!/f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f/.test(factory))fail('pin canônico divergente');
if(!/resolveImageDetails/.test(factory))fail('resolver canônico ausente');
if(/data:image|<svg|svgData\(|createElement\(["']canvas|\.getContext\(/i.test(factory))fail('factory contém asset procedural proibido');
if(!/REAL_ASSET_GAP/.test(factory)||!/LOCAL_COMPOSITION_PROVEN/.test(factory)||!/CANONICAL_DIRECT/.test(factory))fail('classificação de assets incompleta');
let total=0;
for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0');
 const src=read(path.join(Y3,`module-${mm}`,`module-${mm}-v1.js`));
 const index=read(path.join(Y3,`module-${mm}`,'index.html'));
 if(!/Revisão Pedagógica Integral v2\.3/.test(src))fail(`M${mm}: fonte v2.3 ausente`);
 if(/data:image|<svg|svgData\(|canvas|getContext\(/i.test(src))fail(`M${mm}: conteúdo procedural`);
 const ids=[...src.matchAll(new RegExp(`EN3-M${m}-\\d{2}`,'g'))].map(x=>x[0]);
 const unique=[...new Set(ids)];
 const expected=Array.from({length:15},(_,i)=>`EN3-M${m}-${String(i+1).padStart(2,'0')}`);
 if(unique.length!==15||unique.join('|')!==expected.join('|'))fail(`M${mm}: IDs/ordem inválidos (${unique.length})`);
 if(!/channel:\s*["']canary-v1["']/.test(index))fail(`M${mm}: não usa canary-v1`);
 if(!/sourceVersion:\s*["']2\.3["']/.test(index))fail(`M${mm}: sourceVersion 2.3 ausente`);
 if(!/R147\/Core 1\.0\.12/.test(index))fail(`M${mm}: Foundation R147/Core 1.0.12 ausente`);
 if(!/year3-content-factory-r147\.js/.test(index)||/year3-content-factory-v1\.js|scale-v1|scale-smart-visual/i.test(index))fail(`M${mm}: entrypoint antigo/proibido`);
 const declared=[...src.matchAll(/"(drag-drop|target-shooter)"/g)].map(x=>x[1]);
 const required=(index.match(/requiredMechanics:\s*(\[[^\]]+\])/)||[])[1]||'';
 for(const mechanic of new Set(declared))if(!required.includes(mechanic))fail(`M${mm}: ${mechanic} ausente de requiredMechanics`);
 total+=15;console.log(`Y3 M${mm} STATIC PASS — 15/15`);
}
if(total!==90)fail(`total esperado 90, obtido ${total}`);
console.log('YEAR3 STATIC PASS — 90/90 — v2.3 + Y3_GUIDED_READING + R147 + canonical assets + entrypoints');
