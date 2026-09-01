/* M05 official R147 gate entrypoint — resolver-product provenance adapter; fail-closed. */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath=path.resolve("test/systemic/year1-m05-official-r147-homologation.mjs");
let source=await fs.readFile(sourcePath,"utf8");
const patches=[
  ['a.version==="2.3.1-official-r147"','a.version==="2.3.2-official-r147-resolver"'],
  ['a.helper==="1.1.0-m05-local"','a.helper==="1.2.0-m05-resolver-local"'],
  ['same-canonical-size-pair','same-resolved-size-pair'],
  ['person-plus-pet"','person-plus-pet-resolved"']
];
for(const [from,to] of patches){const count=source.split(from).length-1;if(count!==1)throw new Error(`[M05 QA fail-closed] esperado exatamente 1 marcador: ${from}; encontrado ${count}`);source=source.replace(from,to)}
const out=path.resolve("test/systemic/.year1-m05-official-r147-resolver-runtime.mjs");
await fs.writeFile(out,source,"utf8");
try{await import(pathToFileURL(out).href+`?t=${Date.now()}`)}finally{await fs.rm(out,{force:true}).catch(()=>{})}
