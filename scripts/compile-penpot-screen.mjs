import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { connectPenpot } from "./penpot-mcp-client.mjs";
import { resolvePenpotFrame } from "./lib/penpot-frame-discovery.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const screens = {
  "matching-master": { id: "50f514fe-4a8a-804d-8008-aa3b1478e03a", name: "MATCHING — MASTER / IDLE" },
  "target-shooter-master": { id: "50f514fe-4a8a-804d-8008-aa23c3818e55", name: "TARGET SHOOTER — MASTER / IDLE" },
  "module-final": { id: "319040d2-417a-8033-8008-c512b99b9068", name: "MASTER - TELA FINAL", presentation: "PENPOT_NATIVE_LAYER_COMPOSITION" }
};

export async function compile(name = "matching-master", { outputRoot = path.join(root, "design-system/runtime/screens") } = {}) {
  const screen = screens[name];
  if (!screen) throw new Error(`UNKNOWN_SCREEN:${name}`);
  let client = null;
  try {
    let payload;
    client = await connectPenpot();
    if (name === "module-final") return await compileModuleFinalNative(client, { outputRoot, screen });
    const pageId="855af85f-faf4-8069-8008-a8e75a3255fd",aliases=screen.name.includes("TARGET")?["ATIRADOR DE ALVO — MESTRE / OCIOSO"]:[]; const discovered=await client.execute(`const p=penpotUtils.getPageById('${pageId}');const s=n=>({id:n.id,name:n.name,type:n.type,x:n.x,y:n.y,width:n.width,height:n.height,children:(n.children||[]).map(s)});return {document:{id:'d8ac01df-6646-81d2-8008-a2900d806e30',pages:[{id:p.id,root:{children:(p.root.children||[]).map(s)}}]}};`);const dtext=discovered.content.find(x=>x.type==='text')?.text||'{}';const resolved=resolvePenpotFrame({document:JSON.parse(dtext).result?.document??JSON.parse(dtext).document,fileId:'d8ac01df-6646-81d2-8008-a2900d806e30',pageId,frameId:screen.id,frameName:screen.name,aliases});screen.id=resolved.frameId;screen.name=resolved.frameName;
    const finalLayerIds = [
      "319040d2-417a-8033-8008-c512d38713c9", // Penpot rustic panel / frame
      "319040d2-417a-8033-8008-c5406cca5a0b", // independent trophy/decorative raster
      "150dce61-6b7e-8093-8008-c5443243aa00", // approved return button vectors
      "150dce61-6b7e-8093-8008-c544255b40a0"  // approved mascot board
    ];
    const finalBackgroundLayerId = "319040d2-417a-8033-8008-c53f5f2811d9";
    const code = name === "module-final"
      ? `const s=penpotUtils.findShapeById('${screen.id}');if(!s)throw Error('SCREEN_NOT_FOUND');const selected=${JSON.stringify(finalLayerIds)}.map(id=>penpotUtils.findShapeById(id));if(selected.some(x=>!x))throw Error('FINAL_SCREEN_LAYER_MISSING');const markup=penpot.generateMarkup(selected,{type:'svg'}),styles=penpot.generateStyle(selected,{type:'css',withPrelude:true,includeChildren:true}),fonts=await penpot.generateFontFaces(selected);const bg=penpotUtils.findShapeById('${finalBackgroundLayerId}');if(!bg)throw Error('FINAL_SCREEN_BACKGROUND_MISSING');return {markup,styles,fonts,frame:{x:s.x,y:s.y,width:s.width,height:s.height},background:{shapeId:bg.id}}`
      : `const s=penpotUtils.findShapeById('${screen.id}');if(!s)throw Error('SCREEN_NOT_FOUND');const markup=penpot.generateMarkup([s],{type:'svg'}),styles=penpot.generateStyle([s],{type:'css',withPrelude:true,includeChildren:true}),fonts=await penpot.generateFontFaces([s]);return {markup,styles,fonts,frame:{x:s.x,y:s.y,width:s.width,height:s.height}}`;
    const result = await client.execute(code);
    const text = result.content.find((item) => item.type === "text")?.text || "";
    const parsed = JSON.parse(text);
    payload = parsed.result ?? parsed;
    if (!payload.frame || !Number.isFinite(payload.frame.x) || !Number.isFinite(payload.frame.y) || !(payload.frame.width > 0) || !(payload.frame.height > 0)) {
      throw new Error("PENPOT_SCREEN_FRAME_BOUNDS_MISSING");
    }
    const dir = path.join(outputRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    let markup = String(payload.markup || "");
    // Penpot can include off-board descendants and nearby components in its
    // generated SVG's outer canvas. Keep the complete authored SVG tree, but
    // crop its viewport to the live selected screen frame for every package.
    const frame = payload.frame;
    markup = markup.replace(/<svg\b([^>]*)>/, (_tag, attributes) => {
      const setAttribute = (source, name, value) => {
        const pattern = new RegExp(`\\b${name}="[^"]*"`);
        return pattern.test(source) ? source.replace(pattern, `${name}="${value}"`) : `${source} ${name}="${value}"`;
      };
      let normalized = setAttribute(attributes, "width", frame.width);
      normalized = setAttribute(normalized, "height", frame.height);
      normalized = setAttribute(normalized, "viewBox", `${frame.x} ${frame.y} ${frame.width} ${frame.height}`);
      return `<svg${normalized}>`;
    });
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
    const finalAssetNames = {
      "319040d2-417a-8033-8008-c512d38713c9": "module-final-panel.png",
      "319040d2-417a-8033-8008-c5406cca5a0b": "module-final-trophy.png",
      "319040d2-417a-8033-8008-c5437571842f": "module-final-mascot.png"
    };
    for (const entry of [...new Map(imageEntries.map((item) => [item.remote, item])).values()]) {
      const filename = screen.presentation === "PENPOT_NATIVE_LAYER_COMPOSITION"
        ? finalAssetNames[entry.shapeId]
        : `${sha(entry.remote)}.png`;
      if (!filename) throw new Error(`FINAL_SCREEN_IMAGE_WITHOUT_SEMANTIC_OWNER:${entry.shapeId}`);
      const assetPath = path.join(assetsDir, filename);
      if (!fs.existsSync(assetPath) || fs.statSync(assetPath).size < 100) {
        const exported = await client.exportShape({ shapeId: entry.shapeId, format: "png", mode: "fill", filePath: assetPath });
        const message = exported.content?.find((item) => item.type === "text")?.text || "";
        if (!message.includes("exported")) throw new Error(`PENPOT_ASSET_EXPORT_FAILED:${entry.remote}:${message}`);
      }
      const assetUrl = screen.presentation === "PENPOT_NATIVE_LAYER_COMPOSITION"
        ? `/design-system/runtime/screens/${name}/assets/${filename}`
        : `assets/${filename}`;
      markup = markup.split(entry.remote).join(assetUrl);
    }
    const bindingPath = path.join(dir, "bindings.json");
    const bindings = fs.existsSync(bindingPath) ? JSON.parse(fs.readFileSync(bindingPath, "utf8")) : { screenId: screen.id, behaviorBindings: [] };
    bindings.screenId = screen.id;
    const referencePath = path.join(dir, "visual-reference.png");
    const referenceResult = await client.exportShape({ shapeId: screen.id, format: "png", mode: "shape", filePath: referencePath });
    const referenceMessage = referenceResult.content?.find((item) => item.type === "text")?.text || "";
    if (!referenceMessage.includes("exported")) throw new Error(`PENPOT_REFERENCE_EXPORT_FAILED:${referenceMessage}`);
    const referenceBytes = fs.readFileSync(referencePath);
    let backgroundPath = null;
    if (screen.presentation === "PENPOT_NATIVE_LAYER_COMPOSITION") {
      backgroundPath = path.join(assetsDir, "module-final-background.png");
      const backgroundResult = await client.exportShape({ shapeId: payload.background.shapeId, format: "png", mode: "fill", filePath: backgroundPath });
      const backgroundMessage = backgroundResult.content?.find((item) => item.type === "text")?.text || "";
      if (!backgroundMessage.includes("exported")) throw new Error(`PENPOT_BACKGROUND_EXPORT_FAILED:${backgroundMessage}`);
      const hiddenTextIds = [
        "319040d2-417a-8033-8008-c54099b144c6", // hidden source component label (CONFIRMAR)
        "319040d2-417a-8033-8008-c54099b144c8"  // live HTML label replaces the Penpot text node
      ];
      markup = markup.replace(/<\/svg>\s*$/, `<style>${hiddenTextIds.map((id) => `#shape-${id}{display:none!important}`).join(";")}</style></svg>`);
    }
    fs.writeFileSync(path.join(dir, "visual.svg"), markup);
    for (const [key, file] of Object.entries({ styles: "styles.css", fonts: "fonts.css" })) fs.writeFileSync(path.join(dir, file), payload[key]);
    const hashes = { markup: sha(markup), styles: sha(payload.styles), fonts: sha(payload.fonts) };
    hashes.reference = sha(referenceBytes);
    if (backgroundPath) hashes.background = sha(fs.readFileSync(backgroundPath));
    const manifest = { schemaVersion: 1, compilerVersion: "1.2.0", screenId: screen.id, screenName: screen.name, presentation: screen.presentation || "PENPOT_GENERATED_VECTOR", source: "Penpot MCP native shape selection + generated SVG/style/font payload + original fill exports; complete-board PNG retained as QA reference only", assetPolicy: screen.presentation === "PENPOT_NATIVE_LAYER_COMPOSITION" ? { runtimeUsesFlattenedBoard: false, background: "RASTER_NATIVE", panel: "RASTER_NATIVE", mascot: "RASTER_NATIVE", trophy: "RASTER_NATIVE", headline: "LIVE_TEXT", returnButton: "PENPOT_VECTOR_WITH_LIVE_HTML_LABEL" } : undefined, hashes, generatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(bindingPath, `${JSON.stringify(bindings, null, 2)}\n`);
    return { dir, bytes: [markup, payload.styles, payload.fonts].reduce((sum, value) => sum + Buffer.byteLength(value), referenceBytes.length), manifest };
  } finally { await client?.close?.(); }
}

async function compileModuleFinalNative(client, { outputRoot, screen }) {
  const boardId = "319040d2-417a-8033-8008-c512b99b9068";
  const ids = {
    background: "319040d2-417a-8033-8008-c53f5f2811d9",
    panel: "319040d2-417a-8033-8008-c512d38713c9",
    mascotBoard: "150dce61-6b7e-8093-8008-c544255b40a0",
    mascotImage: "319040d2-417a-8033-8008-c5437571842f",
    trophy: "319040d2-417a-8033-8008-c5406cca5a0b",
    button: "150dce61-6b7e-8093-8008-c5443243aa00",
    headline: "319040d2-417a-8033-8008-c53fa9232968",
    message: "319040d2-417a-8033-8008-c53ffd125a21"
  };
  const code = `const b=penpotUtils.findShapeById('${boardId}');if(!b)throw Error('MODULE_FINAL_BOARD_NOT_FOUND');const ids=${JSON.stringify(ids)};const s=Object.fromEntries(Object.entries(ids).map(([k,id])=>[k,penpotUtils.findShapeById(id)]));if(Object.values(s).some(v=>!v))throw Error('MODULE_FINAL_PENPOT_LAYER_MISSING');const box=n=>({x:n.x-b.x,y:n.y-b.y,width:n.width,height:n.height});const fill=n=>(n.fills||[]).find(v=>v&&v.fillImage)?.fillImage;const h=s.headline.getRange(0,s.headline.characters.replace(/\\n/g,'').length);return {board:{id:b.id,name:b.name,width:b.width,height:b.height},layers:{background:{id:s.background.id,...box(s.background),asset:fill(s.background)},panel:{id:s.panel.id,name:s.panel.name,...box(s.panel),asset:fill(s.panel)},mascot:{boardId:s.mascotBoard.id,id:s.mascotImage.id,...box(s.mascotBoard),asset:fill(s.mascotImage)},trophy:{id:s.trophy.id,name:s.trophy.name,...box(s.trophy),asset:fill(s.trophy)},button:{id:s.button.id,name:s.button.name,...box(s.button)},headline:{id:s.headline.id,...box(s.headline),characters:s.headline.characters,style:{fontFamily:h.fontFamily,fontSize:h.fontSize,fontWeight:h.fontWeight,lineHeight:h.lineHeight,letterSpacing:h.letterSpacing,align:h.align,color:(h.fills||[])[0]?.fillColor}},message:{id:s.message.id,...box(s.message),characters:s.message.characters,style:{fontFamily:s.message.fontFamily,fontSize:s.message.fontSize,fontWeight:s.message.fontWeight,lineHeight:s.message.lineHeight,letterSpacing:s.message.letterSpacing,align:s.message.align,color:(s.message.fills||[])[0]?.fillColor}}}}`;
  const result = await client.execute(code);
  const raw = result.content?.find((item) => item.type === "text")?.text || "{}";
  const parsed = JSON.parse(raw);
  const live = parsed.result ?? parsed;
  if (live.board.name !== screen.name || live.board.id !== boardId || live.board.width !== 1366 || live.board.height !== 768) throw new Error("MODULE_FINAL_LIVE_BOARD_AUTHORITY_MISMATCH");
  if (live.layers.headline.characters.trim() !== "Congratulations!" || live.layers.message.characters !== "MISSÃO CONCLUÍDA COM SUCESSO!") throw new Error("MODULE_FINAL_LIVE_COPY_MISMATCH");
  const dir = path.join(outputRoot, "module-final");
  const assetsDir = path.join(dir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const assetFiles = {
    background: "module-final-background.png",
    panel: "module-final-panel.png",
    mascot: "module-final-mascot.png",
    trophy: "module-final-trophy.png",
    button: "module-final-return-button-shape.svg",
    buttonSource: "module-final-return-button.svg"
  };
  const expectedPngSizes = {
    background: live.layers.background.asset,
    panel: live.layers.panel.asset,
    mascot: live.layers.mascot.asset,
    trophy: live.layers.trophy.asset
  };
  for (const [role, asset] of Object.entries(expectedPngSizes)) {
    const file = path.join(assetsDir, assetFiles[role]);
    if (!asset?.width || !asset?.height || !fs.existsSync(file)) throw new Error(`MODULE_FINAL_PENPOT_SOURCE_ASSET_MISSING:${role}`);
    const bytes = fs.readFileSync(file);
    if (bytes.toString("ascii", 1, 4) !== "PNG" || bytes.readUInt32BE(16) !== asset.width || bytes.readUInt32BE(20) !== asset.height) throw new Error(`MODULE_FINAL_ASSET_SOURCE_DIMENSION_MISMATCH:${role}`);
  }
  const buttonSourceFile = path.join(assetsDir, assetFiles.buttonSource);
  if (!fs.existsSync(buttonSourceFile)) throw new Error("MODULE_FINAL_PENPOT_VECTOR_BUTTON_MISSING");
  const buttonSource = fs.readFileSync(buttonSourceFile, "utf8");
  if (!buttonSource.includes(`screenshot-${ids.button}`) || !buttonSource.includes("VOLTAR AO INÍCIO")) throw new Error("MODULE_FINAL_PENPOT_VECTOR_BUTTON_AUTHORITY_MISMATCH");
  const labelGroup = '<g id="shape-319040d2-417a-8033-8008-c54099b144c8">';
  const labelStart = buttonSource.indexOf(labelGroup);
  if (labelStart < 0) throw new Error("MODULE_FINAL_PENPOT_BUTTON_LABEL_GROUP_MISSING");
  const tagPattern = /<g\b[^>]*>|<\/g>/g;
  tagPattern.lastIndex = labelStart;
  let depth = 0;
  let labelEnd = -1;
  for (let match; (match = tagPattern.exec(buttonSource));) {
    depth += match[0] === "</g>" ? -1 : 1;
    if (depth === 0) { labelEnd = tagPattern.lastIndex; break; }
  }
  if (labelEnd < 0) throw new Error("MODULE_FINAL_PENPOT_BUTTON_LABEL_GROUP_UNCLOSED");
  const buttonShape = buttonSource.slice(0, labelStart) + buttonSource.slice(labelEnd);
  if (buttonShape === buttonSource || buttonShape.includes("VOLTAR AO INÍCIO")) throw new Error("MODULE_FINAL_BUTTON_LIVE_LABEL_EXTRACTION_FAILED");
  fs.writeFileSync(path.join(assetsDir, assetFiles.button), buttonShape);
  const p = live.layers;
  const n = (v) => Number(v.toFixed(4));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1366" height="768" viewBox="0 0 1366 768" preserveAspectRatio="xMidYMid meet"><style>.module-final-button-mobile{display:none}@media(max-width:500px){.module-final-button-desktop{display:none}.module-final-button-mobile{display:block}}</style><image data-role="module-final-panel" href="/design-system/runtime/screens/module-final/assets/${assetFiles.panel}" x="${n(p.panel.x)}" y="${n(p.panel.y)}" width="${n(p.panel.width)}" height="${n(p.panel.height)}" preserveAspectRatio="xMidYMid meet"/><image class="module-final-button-desktop" data-role="module-final-button" href="/design-system/runtime/screens/module-final/assets/${assetFiles.button}" x="476" y="476" width="370" height="157" preserveAspectRatio="xMidYMid meet"/><image class="module-final-button-mobile" data-role="module-final-button" href="/design-system/runtime/screens/module-final/assets/${assetFiles.button}" x="402" y="444.6" width="518" height="219.8" preserveAspectRatio="xMidYMid meet"/></svg>`;
  const styleText = "/* All foreground artwork is compiled from individual Penpot authorities. */\n";
  const fontsText = "";
  fs.writeFileSync(path.join(dir, "visual.svg"), svg);
  fs.writeFileSync(path.join(dir, "styles.css"), styleText);
  fs.writeFileSync(path.join(dir, "fonts.css"), fontsText);
  const previousManifest = fs.existsSync(path.join(dir, "manifest.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")) : {};
  const referenceFile = path.join(dir, "visual-reference.png");
  const hashes = {
    markup: sha(svg),
    styles: sha(styleText),
    fonts: sha(fontsText),
    reference: fs.existsSync(referenceFile) ? sha(fs.readFileSync(referenceFile)) : previousManifest.hashes?.reference || "NOT_CAPTURED"
  };
  const assets = Object.fromEntries(Object.entries(assetFiles).map(([role, file]) => [role, { file: `assets/${file}`, source: role === "buttonSource" ? "PENPOT_VECTOR_EXPORT" : role === "button" ? "PENPOT_VECTOR_EXPORT_WITH_LIVE_TEXT_LABEL" : "PENPOT_ORIGINAL_FILL_EXPORT", sha256: sha(fs.readFileSync(path.join(assetsDir, file))) }]));
  const manifest = {
    schemaVersion: 1,
    compilerVersion: "1.2.0",
    screenId: boardId,
    screenName: live.board.name,
    presentation: "PENPOT_NATIVE_LAYER_COMPOSITION",
    source: "LIVE_PENPOT_BOARD + INDIVIDUAL_PENPOT_ASSET_EXPORTS",
    board: live.board,
    elements: live.layers,
    assets,
    assetPolicy: { runtimeUsesFlattenedBoard: false, background: "RASTER_NATIVE_COVER", panel: "RASTER_NATIVE", mascot: "RASTER_NATIVE", trophy: "RASTER_NATIVE", headline: "LIVE_TEXT", returnButton: "PENPOT_VECTOR_EXPORT" },
    hashes,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const bindingPath = path.join(dir, "bindings.json");
  const bindings = fs.existsSync(bindingPath) ? JSON.parse(fs.readFileSync(bindingPath, "utf8")) : { behaviorBindings: [] };
  bindings.screenId = boardId;
  fs.writeFileSync(bindingPath, `${JSON.stringify(bindings, null, 2)}\n`);
  return { dir, bytes: Buffer.byteLength(svg) + Object.values(assets).reduce((total, asset) => total + fs.statSync(path.join(dir, asset.file)).size, 0), manifest };
}

if (process.argv[1]?.endsWith("compile-penpot-screen.mjs")) compile(process.argv[2]).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 2; });
