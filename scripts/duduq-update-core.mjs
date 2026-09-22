import { runLiveGraph } from "./duduq-live-graph-runner.mjs";
import { ensurePenpotMcp } from "./duduq-penpot-bootstrap.mjs";
export function parseArgs(a){let mode;for(const x of a){if(x==="--dry-run"||x==="--apply"){if(mode)throw Error("INVALID_MODE");mode=x.slice(2)}else throw Error("UNKNOWN_ARGUMENT")}return{mode}}
export async function execute(a){const{mode}=parseArgs(a);return runLiveGraph({dryRun:(mode||"apply")==="dry-run"})}
if(process.argv[1]?.endsWith("duduq-update-core.mjs")){ensurePenpotMcp().then(()=>execute(process.argv.slice(2))).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=2})}
