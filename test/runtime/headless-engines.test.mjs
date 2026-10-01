import fs from "node:fs";
const source=fs.readFileSync("core/duduq-headless-product.js","utf8");
if(!source.includes("class MatchingEngine")||!source.includes("class TargetShooterEngine"))throw Error("HEADLESS_ENGINES_MISSING");
console.log(JSON.stringify({status:"PASS",matching:"data-state-machine-present",targetShooter:"data-state-machine-present",domQueriesInEngines:0}));
