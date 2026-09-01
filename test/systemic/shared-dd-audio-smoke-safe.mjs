import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const src = path.resolve("test/systemic/shared-dd-audio-smoke.mjs");
let code = await fs.readFile(src, "utf8");
code = code.replace('./lib/turbo-item-guard.mjs', './lib/turbo-item-guard-v2.mjs');
code = 'import {installHeadlessTtsSafety} from "./lib/headless-tts-safety.mjs";\n' + code;
const marker = 'const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });';
const count = code.split(marker).length - 1;
if (count !== 1) throw new Error(`Shared smoke safety marker count=${count}`);
code = code.replace(marker, `${marker}\nawait installHeadlessTtsSafety(page);`);
const out = path.resolve(`test/systemic/.shared-dd-audio-smoke-safe-${process.pid}.mjs`);
await fs.writeFile(out, code, "utf8");
try {
  await import(pathToFileURL(out).href + `?t=${Date.now()}`);
} finally {
  await fs.rm(out, { force: true }).catch(() => {});
}
