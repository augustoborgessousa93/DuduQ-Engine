#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const writeJson = async (file, value) => { const target = path.join(root, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(value, null, 2)}\n`); };
const normal = (value) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
const dedupeKey = (value) => createHash("sha256").update([normal(value.transcript), normal(value.language), normal(value.speakerRole), normal(value.voiceProfile), normal(value.prosodyProfile)].join("|"), "utf8").digest("hex");

const requirements = [
  ["Y1M01-MEDIA-01",["Y1M01-Q001"],"greeting","waving","school","day","two children",["two children waving","no visible text"],["farewell action","written answer"],"single scene"],
  ["Y1M01-MEDIA-02",["Y1M01-Q002"],"informal greeting","waving","school","day","one child",["friendly wave"],["farewell action"],"single scene"],
  ["Y1M01-MEDIA-03",["Y1M01-Q003","Y1M01-Q006"],"morning greeting","arrival","school gate","morning","two children",["low morning sun","school arrival"],["afternoon light","leaving"],"single scene reusable only for morning items"],
  ["Y1M01-MEDIA-04",["Y1M01-Q004","Y1M01-Q007"],"afternoon greeting","play","school playground","afternoon","children",["afternoon light","school context"],["morning sun","leaving"],"single scene reusable only for afternoon items"],
  ["Y1M01-MEDIA-05",["Y1M01-Q005","Y1M01-Q008"],"farewell","leaving and waving","school exit","day","child",["one child leaving","clear wave"],["arrival"],"single scene reusable only for farewell items"],
  ["Y1M01-MEDIA-06",["Y1M01-Q009"],"time of day contrast","three scenes","school","morning afternoon farewell","children",["three clearly separated scenes"],["ambiguous lighting"],"three-panel sequence"],
  ["Y1M01-MEDIA-07",["Y1M01-Q010"],"hello hi dialogue","greeting","school","day","two children",["two speakers","greeting gesture"],["visible dialogue transcript"],"single scene"],
  ["Y1M01-MEDIA-08",["Y1M01-Q011"],"asking a name","speaking","school","day","two children",["one speaker","question audio icon"],["written question"],"single scene"],
  ["Y1M01-MEDIA-09",["Y1M01-Q012"],"name Leo","introduction","school","day","three children",["one child clearly identified as Leo","short name tag"],["other name ambiguity"],"single scene"],
  ["Y1M01-MEDIA-10",["Y1M01-Q013"],"name Mia","introduction","school","day","three children",["Mia Leo Ana name tags","Mia identifiable"],["long text"],"single scene"],
  ["Y1M01-MEDIA-11",["Y1M01-Q014"],"name tags","identification","school","day","three children",["ANA MIA LEO tags"],["sentence text"],"character card set"],
  ["Y1M01-MEDIA-12",["Y1M01-Q015"],"question answer turn","speaking","school","day","two children",["question and response audio icons"],["written dialogue"],"two-card scene"],
  ["Y1M01-MEDIA-13",["Y1M01-Q016","Y1M01-Q017"],"boy girl distinction","standing","neutral school setting","day","boy girl adult",["diverse characters","neutral clothing"],["gender stereotypes","color-only clue"],"reusable character trio"],
  ["Y1M01-MEDIA-14",["Y1M01-Q018"],"Mia introduction","greeting","school","day","three children",["girl Mia identifiable","short tag"],["ambiguous identity"],"single scene"],
  ["Y1M01-MEDIA-15",["Y1M01-Q019"],"Leo morning introduction","arrival","school","morning afternoon farewell","Leo Mia Ana",["three time/name contrast scenes"],["shared time cues"],"three-panel sequence"],
  ["Y1M01-MEDIA-16",["Y1M01-Q020"],"Ana farewell","leaving","school exit","day","Ana and peers",["Ana leaving","peers staying"],["arrival"],"single scene"]
].map(([requirementId,usedByItems,concept,action,setting,timeOfDay,characters,mustShow,mustNotShow,composition]) => ({requirementId,usedByItems,concept,action,setting,timeOfDay,characters,requiredAttributes:mustShow,forbiddenAttributes:mustNotShow,aspectRatio:"16:9",transparentBackground:false,pedagogicalPurpose:"Audio-visual discrimination without independent reading",reusePolicy:usedByItems.length>1?"REUSE_ONLY_WITHIN_EQUIVALENT_CUE":"SINGLE_REQUIREMENT",resolvedMediaId:null,status:"MISSING",composition}));

const seed = await readJson("content/english/audio/audio-registry-seed.json");
const questions = await readJson("content/english/year-1/module-01/questions.json");
const registryEntries = seed.entries.map((entry) => ({...entry, dedupeKey:dedupeKey(entry), status:"TO_GENERATE", urlOrPath:""}));
const byTranscript = new Map(registryEntries.map((entry) => [normal(entry.transcript), entry]));
const audioManifest = registryEntries.map((entry) => ({audioId:entry.audioId,type:entry.type,transcript:entry.transcript,language:entry.language,speakerRole:entry.speakerRole,voiceProfile:entry.voiceProfile,prosodyProfile:entry.prosodyProfile,usedByItems:questions.items.filter((item)=>normal(item.audio_transcript)===normal(entry.transcript)).map((item)=>item.item_id),reuseScope:entry.type==="ui_instruction"?"GLOBAL_COLLECTION":entry.type.includes("lexeme")?"CROSS_MODULE":"MODULE_OR_CROSS_MODULE_IF_EXACT_MATCH",dedupeKey:entry.dedupeKey,status:"TO_GENERATE",urlOrPath:""}));
const imageManifest = requirements.map((item) => ({requirementId:item.requirementId,proposedMediaId:`MEDIA-${item.requirementId.replace("Y1M01-","")}`,usedByItems:item.usedByItems,productionBrief:`DuduQ English Year 1 ${item.concept}: ${item.composition}; ${item.requiredAttributes.join(", ")}.`,pedagogicalPurpose:item.pedagogicalPurpose,mustShow:item.requiredAttributes,mustNotShow:item.forbiddenAttributes,composition:item.composition,ageAppropriateness:"Year 1, inclusive, calm, non-stereotyped",visualConsistencyRules:"Use established DuduQ child-friendly editorial style; no embedded answer text.",aspectRatio:item.aspectRatio,backgroundRequirement:item.setting,altTextDraft:`${item.concept} scene for English Year 1`}));
const mediaRegistry = {schemaVersion:"1.0",source:"workspace approved canonical assets inventory",entries:[]};
const itemAudioMap = Object.fromEntries(questions.items.map((item)=>[item.item_id,byTranscript.get(normal(item.audio_transcript))?.audioId ?? null]));
await writeJson("content/english/media/media-registry.json",mediaRegistry);
await writeJson("content/english/year-1/module-01/media-requirements.json",{schemaVersion:"1.0",moduleId:"Y1M01",requirements});
await writeJson("content/english/year-1/module-01/image-production-manifest.json",{schemaVersion:"1.0",moduleId:"Y1M01",assets:imageManifest});
await writeJson("content/english/audio/audio-registry.json",{schemaVersion:"1.0",policy:"audio-policy.json",entries:registryEntries});
await writeJson("content/english/year-1/module-01/audio-production-manifest.json",{schemaVersion:"1.0",moduleId:"Y1M01",items:itemAudioMap,utterances:audioManifest});
console.log(JSON.stringify({requirements:requirements.length,uniqueAudio:audioManifest.length,itemAudioMappings:Object.values(itemAudioMap).filter(Boolean).length},null,2));
