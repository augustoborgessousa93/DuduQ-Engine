import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root=process.cwd();
const contentRoot=path.join(root,"content","english");
const assert=(c,m)=>{if(!c)throw new Error(m)};

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full));
    else if(/\.(?:js|html|json)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const files=walk(contentRoot);
const consumers=new Map();
for(const file of files){
  const text=fs.readFileSync(file,"utf8");
  if(!/drag-drop|drag_drop|Drag & Drop/i.test(text)) continue;
  const rel=path.relative(root,file).replaceAll(path.sep,"/");
  const match=rel.match(/^content\/english\/(year-\d+)\/(module-\d+)\//);
  if(match){
    const key=`${match[1]}/${match[2]}`;
    if(!consumers.has(key)) consumers.set(key,[]);
    consumers.get(key).push(rel);
  }
}

assert(consumers.size>0,"nenhum módulo publicado consumidor de Drag & Drop foi descoberto");

let changed=[];
try{
  changed=execFileSync("git",["diff","--name-only","730d0737308369a09d904f12e13e49c2fcf1101d...HEAD","--","content/english"],{cwd:root,encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
}catch(error){throw new Error("não foi possível verificar imutabilidade dos conteúdos: "+error.message)}
assert(changed.length===0,"conteúdo publicado foi alterado nesta fase: "+changed.join(", "));

const years=[...new Set([...consumers.keys()].map(k=>k.split("/")[0]))].sort();
console.log(`PUBLISHED_DD_MODULES=${consumers.size}`);
console.log(`PUBLISHED_DD_YEARS=${years.join(",")}`);
for(const [module,paths] of [...consumers].sort()) console.log(`CONSUMER ${module} (${paths.length} file(s))`);
console.log("PASS — published Drag & Drop consumers inventoried; content files unchanged");
