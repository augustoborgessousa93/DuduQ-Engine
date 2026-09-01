import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const sourcePath=path.resolve("test/systemic/year1-m05-official-r147-homologation.mjs");
const tempPath=path.resolve("test/systemic/.tmp-year1-m05-official-r147.mjs");
let source=await fs.readFile(sourcePath,"utf8");
const patches=[["window.DuduQ?.getSession?.totalSteps","window.DuduQ?.getSession?.()?.totalSteps"]];
for(const [before,after] of patches){const n=source.split(before).length-1;if(n!==1)throw new Error(`M05 QA patch expected 1 occurrence, found ${n}: ${before}`);source=source.replace(before,after)}
if(source.includes("window.DuduQ?.getSession?.totalSteps"))throw new Error("Stale M05 getSession totalSteps assertion remains.");
await fs.writeFile(tempPath,source,"utf8");
try{await import(`${pathToFileURL(tempPath).href}?r147=${Date.now()}`)}finally{await fs.rm(tempPath,{force:true})}
