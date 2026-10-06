#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const root=process.cwd();const load=async p=>JSON.parse(await readFile(path.join(root,p),"utf8"));const exists=async p=>access(path.join(root,p)).then(()=>true,()=>false);const sha=async p=>createHash("sha256").update(await readFile(path.join(root,p))).digest("hex");
const media=await load("content/english/media/image-generation-manifest.json"),audio=await load("content/english/audio/audio-generation-manifest.json");const entries=[...media.entries,...audio.entries];const ids=new Set(),paths=new Set();for(const e of entries){const id=e.mediaId||e.audioId;if(ids.has(id)||paths.has(e.outputPath))throw Error(`DUPLICATE_ID_OR_PATH:${id}`);ids.add(id);paths.add(e.outputPath);if(await exists(e.outputPath)){e.sha256=await sha(e.outputPath);e.status="REVIEW_REQUIRED"}};await writeFile(path.join(root,"content/english/media/import-review-report.json"),JSON.stringify({generatedAt:"deterministic",entries},null,2)+"\n");console.log(JSON.stringify({status:"PASS",reviewRequired:entries.filter(e=>e.status==="REVIEW_REQUIRED").length},null,2));
