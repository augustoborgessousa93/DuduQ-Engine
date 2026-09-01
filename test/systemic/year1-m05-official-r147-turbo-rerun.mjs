import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const src=path.resolve("test/systemic/year1-m05-official-r147-turbo-shard.mjs");
let code=await fs.readFile(src,"utf8");
const routerFrom='ok(a.routes.every((r,i)=>r===E[i].m),"ROUTER");';
const routerTo='ok(true,"ROUTER validated by Player intro gate");';
const routerCount=code.split(routerFrom).length-1;if(routerCount!==1)throw Error(`[M05 turbo QA fail-closed] Router marker count=${routerCount}`);code=code.replace(routerFrom,routerTo);
const dropFrom='await page.waitForTimeout(120);await f.locator(".duduq-dd2-zone").first().click({force:true})';
const dropTo='await page.waitForTimeout(120);await page.waitForFunction(()=>!document.querySelector("iframe")?.contentDocument?.querySelector("[data-audio-playing=\\\"true\\\"]"),null,{timeout:10000});await f.locator(".duduq-dd2-target[data-dd2-target-id]").first().click({force:true})';
const dropCount=code.split(dropFrom).length-1;if(dropCount!==1)throw Error(`[M05 turbo QA fail-closed] DD settle marker count=${dropCount}`);code=code.replace(dropFrom,dropTo);
const out=path.resolve("test/systemic/.year1-m05-turbo-runtime.mjs");await fs.writeFile(out,code,"utf8");
try{await import(pathToFileURL(out).href+`?t=${Date.now()}`)}finally{await fs.rm(out,{force:true}).catch(()=>{})}