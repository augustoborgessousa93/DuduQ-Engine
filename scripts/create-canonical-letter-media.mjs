import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "content/english/media/media-registry.json");
const outputDir = path.join(root, "content/english/assets/images/shared/letters");
const registry = JSON.parse(await readFile(registryPath, "utf8"));
await mkdir(outputDir, { recursive: true });
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const sha = value => createHash("sha256").update(value).digest("hex");

for (const letter of letters) {
  const mediaId = `MEDIA-LETTER-${letter}`;
  const relativePath = `content/english/assets/images/shared/letters/${letter.toLowerCase()}.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${letter}"><rect width="512" height="512" rx="48" fill="#FFFDF7"/><text x="256" y="276" text-anchor="middle" dominant-baseline="middle" font-family="Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif" font-size="340" font-weight="700" fill="#243B67">${letter}</text></svg>`;
  const fullPath = path.join(root, relativePath);
  await writeFile(fullPath, svg, "utf8");
  const existing = registry.entries.find(entry => entry.mediaId === mediaId);
  const entry = {
    mediaId,
    status: "APPROVED",
    kind: "image",
    semantic: letter.toLowerCase(),
    altText: `Uppercase letter ${letter}`,
    assets: [{ path: relativePath, sha256: sha(svg), source: "DETERMINISTIC_CANONICAL_LETTER_GLYPH" }],
    temporary: false,
    integrationStatus: "CANONICAL_REUSABLE_PEDAGOGICAL_MEDIA"
  };
  if (existing) Object.assign(existing, entry);
  else registry.entries.push(entry);
}
registry.updatedAt = new Date().toISOString();
const temp = `${registryPath}.${process.pid}.tmp`;
await writeFile(temp, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
await rename(temp, registryPath);
console.log(JSON.stringify({ status: "PASS", createdOrRegistered: letters.length, mediaIds: letters.map(letter => `MEDIA-LETTER-${letter}`), outputDir: path.relative(root, outputDir) }, null, 2));
