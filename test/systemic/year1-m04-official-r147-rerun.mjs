import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.resolve("test/systemic/year1-m04-official-homologation.mjs");
const tempPath = path.resolve("test/systemic/.tmp-year1-m04-official-r147.mjs");
let source = await fs.readFile(sourcePath, "utf8");

const replacements = [
  [
    "?qa=official-m04-r146-${viewport.name}",
    "?qa=official-m04-r147-${viewport.name}"
  ],
  [
    'assert(audit.revision===146&&audit.core==="1.0.11"&&audit.dd==="2.0.24"&&audit.ts==="1.0.21",`${viewport.name}: Canary/releases`);',
    'assert(audit.revision===147&&audit.core==="1.0.12"&&audit.dd==="2.0.24"&&audit.ts==="1.0.21",`${viewport.name}: Canary/releases`);'
  ],
  [
    'assert(audit.factory?.core==="1.0.11"&&audit.factory?.dragDrop==="2.0.24"&&audit.factory?.targetShooter==="1.0.21",`${viewport.name}: factory`);',
    'assert(audit.factory?.dragDrop==="2.0.24"&&audit.factory?.targetShooter==="1.0.21",`${viewport.name}: factory mechanics provenance`);'
  ]
];

for (const [before, after] of replacements) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`M04 R147 QA baseline patch expected exactly one occurrence, found ${occurrences}: ${before}`);
  }
  source = source.replace(before, after);
}

if (!source.includes('audit.revision===147&&audit.core==="1.0.12"')) {
  throw new Error("M04 R147 QA runtime baseline was not applied.");
}
if (source.includes('audit.revision===146&&audit.core==="1.0.11"')) {
  throw new Error("Stale R146/Core 1.0.11 runtime assertion remains in M04 rerun QA.");
}

await fs.writeFile(tempPath, source, "utf8");
try {
  await import(`${pathToFileURL(tempPath).href}?r147=${Date.now()}`);
} finally {
  await fs.rm(tempPath, { force: true });
}
