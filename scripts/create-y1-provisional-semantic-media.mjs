import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const mediaRoot = path.join(root, "content/english/assets/images/year-1/provisional-semantic-v1");
const registryPath = path.join(root, "content/english/media/media-registry.json");
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const ids = new Map();
for (let number = 2; number <= 6; number += 1) {
  const base = path.join(root, `content/english/year-1/module-0${number}/questions.json`);
  const contract = JSON.parse(await readFile(base, "utf8"));
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (typeof value.assetId === "string" && value.status === "IMAGE_REFINEMENT_PENDING") {
      ids.set(value.assetId, { semantic: value.semanticTarget || value.mustInclude || value.assetId, mustNotInclude: value.mustNotInclude || "", answerLeakRisk: value.answerLeakRisk || "LOW" });
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(contract);
}
const visualFor = semantic => {
  const s = semantic.toLowerCase();
  const quantity = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }[s];
  if (quantity) return { quantity, emoji: "⭐", color: "#f5b942" };
  const colors = { red: "#e84b4b", blue: "#3984db", yellow: "#f5cf3d", green: "#49a96a", orange: "#ef8b36", purple: "#8c62c5", gray: "#89939c", grey: "#89939c", brown: "#956344", black: "#313943", white: "#ffffff" };
  const color = Object.keys(colors).find(name => new RegExp(`\\b${name}\\b`).test(s));
  const symbols = [
    [/cat|kitten/, "🐱"], [/dog|puppy/, "🐶"], [/bird/, "🐦"], [/fish/, "🐟"], [/rabbit|bunny/, "🐰"], [/turtle/, "🐢"], [/hamster/, "🐹"], [/spider/, "🕷️"],
    [/eraser/, "🧽"], [/pencil case/, "🖍️"], [/pencil/, "✏️"], [/crayon/, "🖍️"], [/ruler/, "📏"], [/pen/, "🖊️"], [/backpack|bag/, "🎒"],
    [/head/, "🙂"], [/hands?/, "🙌"], [/arms?/, "💪"], [/legs?/, "🦵"], [/feet|foot/, "🦶"],
    [/sit down/, "🪑"], [/stand up/, "🧍"], [/come in/, "🚪"], [/silence, please/, "🤫"], [/thank you/, "🙏"],
    [/big/, "🐘"], [/small/, "🐭"], [/school/, "🏫"]
  ];
  return { emoji: symbols.find(([pattern]) => pattern.test(s))?.[1] || "🖼️", color: color ? colors[color] : "#d8e8f7" };
};
await mkdir(mediaRoot, { recursive: true });
const known = new Set(registry.entries.map(entry => entry.mediaId));
let created = 0;
for (const [assetId, metadata] of ids) {
  if (known.has(assetId)) {
    const oldEntry = registry.entries.find(entry => entry.mediaId === assetId);
    if (oldEntry?.source !== "PROVISIONAL_SEMANTIC_MEDIA_V1") continue;
  }
  const file = `${assetId.toLowerCase()}.svg`;
  const relative = `content/english/assets/images/year-1/provisional-semantic-v1/${file}`;
  const visual = visualFor(metadata.semantic);
  const marks = visual.quantity
    ? Array.from({ length: visual.quantity }, (_, i) => {
      const columns = visual.quantity <= 5 ? visual.quantity : 5;
      const rows = Math.ceil(visual.quantity / columns);
      const col = i % columns, row = Math.floor(i / columns);
      const x = 120 + (col - (columns - 1) / 2) * 34;
      const y = 78 + (row - (rows - 1) / 2) * 42;
      return `<circle cx="${x}" cy="${y}" r="13" fill="${visual.color}" stroke="#66512d" stroke-width="2"/>`;
    }).join("")
    : `<text x="120" y="112" text-anchor="middle" font-size="76" font-family="Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif">${visual.emoji}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img" aria-label="Provisional semantic illustration"><rect width="240" height="180" rx="24" fill="#f1f7ff"/><rect x="40" y="20" width="160" height="120" rx="54" fill="${visual.color}" opacity=".24" stroke="${visual.color}" stroke-width="3"/>${marks}<path d="M24 151h192" stroke="#c9dced" stroke-width="5" stroke-linecap="round"/></svg>`;
  await writeFile(path.join(mediaRoot, file), svg, "utf8");
  const sha256 = createHash("sha256").update(svg).digest("hex");
  const entry = { mediaId: assetId, type: "image", kind: "image", status: "APPROVED", urlOrPath: relative,
    semantic: metadata.semantic, mustNotInclude: metadata.mustNotInclude, answerLeakRisk: metadata.answerLeakRisk,
    description: "Local provisional semantic illustration; replaceable without changing the activity contract.",
    temporary: true, integrationStatus: "IMAGE_REFINEMENT_PENDING", source: "PROVISIONAL_SEMANTIC_MEDIA_V1",
    assets: [{ path: relative, sha256, temporary: true, mediaType: "image/svg+xml" }],
    backlogStatus: "IMAGE_REFINEMENT_PENDING" };
  const existingIndex = registry.entries.findIndex(row => row.mediaId === assetId);
  if (existingIndex >= 0) registry.entries[existingIndex] = entry;
  else registry.entries.push(entry);
  created += 1;
}
await writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ requiredSemanticIds: ids.size, created, registered: ids.size - [...ids.keys()].filter(id => !registry.entries.some(entry => entry.mediaId === id)).length }));
