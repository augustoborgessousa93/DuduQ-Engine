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

export async function compile(name = "matching-master", { outputRoot = path.join(root, "design-system/runtime/screens") } = {}) {
  const screen = screens[name];
  if (!screen) throw new Error(`UNKNOWN_SCREEN:${name}`);
  let client = null;
  try {
    let payload;
    client = await connectPenpot();
    const code = `const s=penpotUtils.findShapeById('${screen.id}');if(!s)throw Error('SCREEN_NOT_FOUND');const markup=penpot.generateMarkup([s],{type:'svg'}),styles=penpot.generateStyle([s],{type:'css',withPrelude:true,includeChildren:true}),fonts=await penpot.generateFontFaces([s]);return {markup,styles,fonts}`;
    const result = await client.execute(code);
    const text = result.content.find((item) => item.type === "text")?.text || "";
    const parsed = JSON.parse(text);
    payload = parsed.result ?? parsed;
    const dir = path.join(outputRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    let markup = String(payload.markup || "");
    const imageRe = /<image[^>]+href="([^"]+)"/g;
    const imageEntries = [];
    let imageMatch;
    while ((imageMatch = imageRe.exec(markup))) {
      const prefix = markup.slice(0, imageMatch.index);
      const shapes = [...prefix.matchAll(/<g id="shape-([^"]+)"/g)];
      const shapeId = shapes.at(-1)?.[1];
      if (shapeId && /^https?:\/\//.test(imageMatch[1])) imageEntries.push({ shapeId, remote: imageMatch[1] });
    }
    const assetsDir = path.join(dir, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    for (const entry of [...new Map(imageEntries.map((item) => [item.remote, item])).values()]) {
      const filename = `${sha(entry.remote)}.png`;
      const assetPath = path.join(assetsDir, filename);
      if (!fs.existsSync(assetPath) || fs.statSync(assetPath).size < 100) {
        const exported = await client.exportShape({ shapeId: entry.shapeId, format: "png", mode: "fill", filePath: assetPath });
        const message = exported.content?.find((item) => item.type === "text")?.text || "";
        if (!message.includes("exported")) throw new Error(`PENPOT_ASSET_EXPORT_FAILED:${entry.remote}:${message}`);
      }
      markup = markup.split(entry.remote).join(`assets/${filename}`);
    }
    fs.writeFileSync(path.join(dir, "visual.svg"), markup);
    for (const [key, file] of Object.entries({ styles: "styles.css", fonts: "fonts.css" })) fs.writeFileSync(path.join(dir, file), payload[key]);
    const bindingPath = path.join(dir, "bindings.json");
    const bindings = fs.existsSync(bindingPath) ? JSON.parse(fs.readFileSync(bindingPath, "utf8")) : { screenId: screen.id, behaviorBindings: [] };
    bindings.screenId = screen.id;
    const referencePath = path.join(dir, "visual-reference.png");
    const referenceResult = await client.exportShape({ shapeId: screen.id, format: "png", mode: "shape", filePath: referencePath });
    const referenceMessage = referenceResult.content?.find((item) => item.type === "text")?.text || "";
    if (!referenceMessage.includes("exported")) throw new Error(`PENPOT_REFERENCE_EXPORT_FAILED:${referenceMessage}`);
    const hashes = { markup: sha(markup), styles: sha(payload.styles), fonts: sha(payload.fonts) };
    if (fs.existsSync(referencePath)) hashes.reference = sha(fs.readFileSync(referencePath));
    const manifest = { schemaVersion: 1, compilerVersion: "1.1.0", screenId: screen.id, screenName: screen.name, source: "Penpot MCP generateMarkup/generateStyle/generateFontFaces/export_shape", hashes, generatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(bindingPath, `${JSON.stringify(bindings, null, 2)}\n`);
    return { dir, bytes: Object.values(payload).reduce((sum, value) => sum + Buffer.byteLength(value), 0), manifest };
  } finally { await client?.close?.(); }
}

if (process.argv[1]?.endsWith("compile-penpot-screen.mjs")) compile(process.argv[2]).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 2; });
