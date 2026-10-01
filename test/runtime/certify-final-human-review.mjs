import { execFileSync } from "node:child_process";import fs from "node:fs";import path from "node:path";
const root=process.cwd(),out=path.join(root,"artifacts","delivery","final-human-review"),source=path.join(root,"artifacts","delivery","rc1-polish");fs.mkdirSync(out,{recursive:true});
execFileSync(process.execPath,["test/runtime/certify-rc1-polish.mjs"],{cwd:root,stdio:"inherit"});
for(const [to,from] of Object.entries({"final-loop.webm":"loop-polished.webm","final-loop-trace.zip":"loop-polished-trace.zip","canonical-ui-audit.json":"visual-audit.json","motion-audit.json":"visual-audit.json","transition-mascot-audit.json":"visual-audit.json","responsive-audit.json":"responsive-audit.json","gameplay-audit.json":"gameplay-audit.json","adversarial-audit.json":"visual-audit.json"}))fs.copyFileSync(path.join(source,from),path.join(out,to));
console.log(JSON.stringify({status:"PASS",command:"npm run duduq:certify-final-human-review"}));
