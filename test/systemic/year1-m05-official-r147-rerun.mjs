import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const sourcePath=path.resolve("test/systemic/year1-m05-official-r147-homologation.mjs");
const tempPath=path.resolve("test/systemic/.tmp-year1-m05-official-r147.mjs");
let source=await fs.readFile(sourcePath,"utf8");
const patches=[
 ["window.DuduQ?.getSession?.totalSteps","window.DuduQ?.getSession?.()?.totalSteps",1],
 ["window.DuduQ?.getSession?.stepIndex","window.DuduQ?.getSession?.()?.stepIndex",2],
 ["1.0.1-m05-local","1.0.3-m05-local",1]
];
for(const [before,after,expected] of patches){const n=source.split(before).length-1;if(n!==expected)throw new Error(`M05 QA patch expected ${expected} occurrence(s), found ${n}: ${before}`);source=source.split(before).join(after)}
if(source.includes("window.DuduQ?.getSession?.totalSteps")||source.includes("window.DuduQ?.getSession?.stepIndex")||source.includes('audit.helper==="1.0.1-m05-local"'))throw new Error("Stale M05 QA contract remains.");
await fs.writeFile(tempPath,source,"utf8");
try{await import(`${pathToFileURL(tempPath).href}?r147=${Date.now()}`)}finally{await fs.rm(tempPath,{force:true})}
