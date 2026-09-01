/* M06 official R147 gate — QA-only resolver provenance correction; fail-closed. */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const sourcePath=path.resolve("test/systemic/year1-m06-official-r147-homologation.mjs");
let source=await fs.readFile(sourcePath,"utf8");
const from='a.raw.includes(PIN)&&!/(data:image|<svg|gap-preview|raw\\.githubusercontent\\.com)/i.test(a.raw)';
const to='a.raw.includes(PIN)&&!/(data:image|<svg|gap-preview)/i.test(a.raw)';
const count=source.split(from).length-1;if(count!==1)throw new Error(`[M06 QA fail-closed] ASSETS assertion marker count=${count}`);source=source.replace(from,to);
const out=path.resolve("test/systemic/.year1-m06-official-r147-runtime.mjs");await fs.writeFile(out,source,"utf8");
try{await import(pathToFileURL(out).href+`?t=${Date.now()}`)}finally{await fs.rm(out,{force:true}).catch(()=>{})}
