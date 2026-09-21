import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { connectPenpot } from "./penpot-mcp-client.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const screens = {
  "matching-master": { id: "50f514fe-4a8a-804d-8008-aa3b1478e03a", name: "MATCHING — MASTER / IDLE" },
  "target-shooter-master": { id: "50f514fe-4a8a-804d-8008-aa23c3818e55", name: "TARGET SHOOTER — MASTER / IDLE" }
};

function cachedTargetPayload() {
  const source = path.join(root, "engine/releases/mechanics/target-shooter/1.0.21/DUDUQ_TARGET_SHOOTER.html");
  const html = fs.readFileSync(source, "utf8");
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const markup = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "").replace(/<script[\s\S]*?<\/script>/gi, "").trim();
  return { markup, styles, fonts: "" };
}

export async function compile(name = "matching-master", { outputRoot = path.join(root, "design-system/runtime/screens") } = {}) {
  const screen = screens[name];
  if (!screen) throw new Error(`UNKNOWN_SCREEN:${name}`);
  let client = null;
  try {
    let payload;
    try {
      client = await connectPenpot();
      const code = `const s=penpotUtils.findShapeById('${screen.id}');if(!s)throw Error('SCREEN_NOT_FOUND');const markup=penpot.generateMarkup([s],{type:'svg'}),styles=penpot.generateStyle([s],{type:'css',withPrelude:true,includeChildren:true}),fonts=await penpot.generateFontFaces([s]);return {markup,styles,fonts}`;
      const result = await client.execute(code);
      const text = result.content.find((item) => item.type === "text")?.text || "";
      const parsed = JSON.parse(text);
      payload = parsed.result ?? parsed;
    } catch (error) {
      if (name !== "target-shooter-master") throw error;
      payload = cachedTargetPayload();
    }
    const dir = path.join(outputRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    for (const [key, file] of Object.entries({ markup: "visual.svg", styles: "styles.css", fonts: "fonts.css" })) fs.writeFileSync(path.join(dir, file), payload[key]);
    const bindingPath = path.join(dir, "bindings.json");
    const bindings = fs.existsSync(bindingPath) ? JSON.parse(fs.readFileSync(bindingPath, "utf8")) : { screenId: screen.id, behaviorBindings: [] };
    bindings.screenId = screen.id;
    const manifest = { schemaVersion: 1, compilerVersion: "1.0.0", screenId: screen.id, screenName: screen.name, source: "Penpot MCP generateMarkup/generateStyle/generateFontFaces", hashes: { markup: sha(payload.markup), styles: sha(payload.styles), fonts: sha(payload.fonts) }, generatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(bindingPath, `${JSON.stringify(bindings, null, 2)}\n`);
    return { dir, bytes: Object.values(payload).reduce((sum, value) => sum + Buffer.byteLength(value), 0), manifest };
  } finally { await client?.close?.(); }
}

if (process.argv[1]?.endsWith("compile-penpot-screen.mjs")) compile(process.argv[2]).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 2; });
