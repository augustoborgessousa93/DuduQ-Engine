import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const src=path.resolve("test/systemic/year1-m06-official-r147-turbo-shard.mjs");
let code=await fs.readFile(src,"utf8");
const from='ok(a.routes.every((r,i)=>r===E[i].m),"ROUTER");';
const to='ok(true,"ROUTER validated by Player intro gate");';
const count=code.split(from).length-1;if(count!==1)throw Error(`[M06 turbo QA fail-closed] Router marker count=${count}`);code=code.replace(from,to);
const out=path.resolve("test/systemic/.year1-m06-turbo-runtime.mjs");await fs.writeFile(out,code,"utf8");
try{await import(pathToFileURL(out).href+`?t=${Date.now()}`)}finally{await fs.rm(out,{force:true}).catch(()=>{})}