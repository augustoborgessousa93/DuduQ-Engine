import { runLiveGraph } from "./duduq-live-graph-runner.mjs";
import { ensurePenpotMcp } from "./duduq-penpot-bootstrap.mjs";
import { screens } from "./compile-penpot-screen.mjs";
export function parseArgs(a){let mode,screen;for(let i=0;i<a.length;i++){const x=a[i];if(x==="--dry-run"||x==="--apply"){if(mode)throw Error("INVALID_MODE");mode=x.slice(2)}else if(x==="--screen"){if(screen||!a[i+1]||!screens[a[i+1]])throw Error("UNKNOWN_SCREEN");screen=a[++i]}else throw Error("UNKNOWN_ARGUMENT")}return{mode,screen}}
export async function execute(a){const{mode,screen}=parseArgs(a);return runLiveGraph({dryRun:(mode||"apply")==="dry-run",screen})}
if(process.argv[1]?.endsWith("duduq-update-core.mjs")){ensurePenpotMcp().then(()=>execute(process.argv.slice(2))).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=2})}
