#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const root=process.cwd(); const read=async p=>JSON.parse(await readFile(path.join(root,p),"utf8")); const write=async(p,v)=>{const f=path.join(root,p);await mkdir(path.dirname(f),{recursive:true});await writeFile(f,JSON.stringify(v,null,2)+"\n")};
const slug=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const audio=(await read("content/english/audio/audio-registry.json")).entries; const images=(await read("content/english/year-1/module-01/image-production-manifest.json")).assets;
const classify=e=>e.type==="ui_instruction"?"GLOBAL_UI":/^(Hello!|Hi!|Good morning!|Good afternoon!|Goodbye!|Boy\.|Girl\.)$/.test(e.transcript)?"LEXICAL":e.type==="dialogue"?"DIALOGUE":e.transcript==="What's your name?"?"FUNCTIONAL_CHUNK":"CONTEXT_SENTENCE";
const folder={GLOBAL_UI:"ui",LEXICAL:"lexical",FUNCTIONAL_CHUNK:"chunks",CONTEXT_SENTENCE:"chunks",DIALOGUE:"dialogues"};
const audioEntries=audio.map(e=>{const category=classify(e), filename=`${e.audioId.toLowerCase()}-${slug(e.transcript)}.mp3`, scope=category==="GLOBAL_UI"?"GLOBAL_COLLECTION":(category==="LEXICAL"||category==="FUNCTIONAL_CHUNK")?"CROSS_MODULE":"MODULE_OR_CROSS_MODULE_IF_EXACT_MATCH";return {...e,category,filename,outputPath:`content/english/assets/audio/${folder[category]}/${filename}`,speakingRate:"normal_clear",reuseScope:scope,usedByItems:e.usedByItems ?? [],status:"TO_GENERATE",crossModuleCandidate:scope==="CROSS_MODULE"}});
const imageEntries=images.map((e)=>{const filename=`${e.proposedMediaId.toLowerCase()}.webp`;return {...e,mediaId:e.proposedMediaId,filename,outputPath:`content/english/assets/images/year-1/module-01/${filename}`,styleProfile:"DUDUQ_ENGLISH_EDITORIAL_V1",status:"TO_GENERATE"}});
await Promise.all(["content/english/assets/images/year-1/module-01","content/english/assets/images/shared","content/english/assets/audio/ui","content/english/assets/audio/lexical","content/english/assets/audio/chunks","content/english/assets/audio/dialogues"].map(p=>mkdir(path.join(root,p),{recursive:true})));
await write("content/english/audio/audio-generation-manifest.json",{schemaVersion:"1.0",provider:"NEUTRAL",entries:audioEntries});
await write("content/english/media/image-generation-manifest.json",{schemaVersion:"1.0",provider:"NEUTRAL",styleProfile:"DUDUQ_ENGLISH_EDITORIAL_V1",entries:imageEntries});
console.log(JSON.stringify({images:imageEntries.length,audio:audioEntries.length},null,2));
