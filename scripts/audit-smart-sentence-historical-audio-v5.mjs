import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = new Map([
  ["content/english/audio/audio-registry.json", "9af8c704fe86f34526f5df95a3a3ea081c0dca6c121aa9cc01c07448052d9009"],
  ["content/english/audio/audio-generation-manifest.json", "9b87e183768cc67af6f2578c9b7206101562d9d432850fba168ace18489103c4"]
]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const currentSizes = new Map();
for (const file of targets.keys()) currentSizes.set(file, (await readFile(path.join(root, file))).length);
const reachable = [];
for (const file of targets.keys()) {
  const commits = execFileSync("git", ["log", "--all", "--format=%H", "--", file], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  for (const commit of commits) {
    try {
      const bytes = execFileSync("git", ["show", `${commit}:${file}`]);
      const hash = sha256(bytes);
      if (targets.get(file) === hash) reachable.push({ file, commit, hash });
    } catch {}
  }
}

const fsck = execFileSync("git", ["fsck", "--unreachable", "--no-reflogs"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const objectIds = fsck.split(/\r?\n/).map(line => line.match(/^unreachable blob ([0-9a-f]{40})$/)?.[1]).filter(Boolean);
const metadata = objectIds.length ? execFileSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], { input: `${objectIds.join("\n")}\n`, encoding: "utf8" }).trim().split(/\r?\n/) : [];
const candidateIds = new Set();
for (const line of metadata) {
  const [oid, type, sizeText] = line.split(" ");
  if (type !== "blob") continue;
  const size = Number(sizeText);
  // Old manifests can be smaller than current after the 29 V3 additions;
  // restrict raw blob reads to a broad size window around current files.
  if ([...currentSizes.values()].some(current => Math.abs(current - size) <= 1_000_000)) candidateIds.add(oid);
}
const unreachable = [];
if (candidateIds.size) {
  const stream = execFileSync("git", ["cat-file", "--batch"], { input: `${[...candidateIds].join("\n")}\n`, maxBuffer: 256 * 1024 * 1024 });
  let offset = 0;
  while (offset < stream.length) {
    const headerEnd = stream.indexOf(10, offset);
    const [oid, type, sizeText] = stream.subarray(offset, headerEnd).toString("ascii").split(" ");
    const size = Number(sizeText), start = headerEnd + 1, bytes = stream.subarray(start, start + size);
    const hash = sha256(bytes);
    for (const [file, targetHash] of targets) if (hash === targetHash) unreachable.push({ file, oid, hash, bytes: bytes.toString("utf8") });
    offset = start + size + 1;
  }
}

const productionArtifactChecks = [];
for (const file of targets.keys()) {
  const paths = [path.join(root, "dist-pages", file), path.join(root, "artifacts", "build", file)];
  const found = [];
  for (const candidate of paths) {
    try { const bytes = await readFile(candidate); found.push({ path: path.relative(root, candidate), sha256: sha256(bytes), exactProtectedHash: sha256(bytes) === targets.get(file) }); } catch {}
  }
  productionArtifactChecks.push({ file, checked: paths.map(p => path.relative(root, p)), matches: found });
}

const report = {
  feature: "DUDUQ_SMART_SENTENCE_HISTORICAL_AUDIO_RECOVERY_V5",
  generatedAt: new Date().toISOString(),
  targets: [...targets].map(([file, protectedSha256]) => ({ file, protectedSha256 })),
  reachableGit: { method: "git log --all:path revisions + raw SHA-256", exactMatches: reachable },
  unreachableGit: { fsckUnreachableBlobsExamined: objectIds.length, exactMatches: unreachable.map(({ file, oid, hash }) => ({ file, oid, hash })) },
  localBuildArtifacts: productionArtifactChecks,
  recoverableManifestBytes: [...new Set([...reachable.map(x => x.file), ...unreachable.map(x => x.file)])],
  result: [...targets.keys()].every(file => reachable.some(x => x.file === file) || unreachable.some(x => x.file === file)) ? "EXACT_HISTORY_RECOVERED" : "HISTORICAL_BYTES_NOT_RECOVERED",
  safety: { historicalFreezeModified: false, registryModified: false, generationManifestModified: false, successorActivated: false }
};
await writeFile("docs/qa/DUDUQ_SMART_SENTENCE_HISTORICAL_AUDIO_RECOVERY_V5.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ result: report.result, reachableMatches: reachable.length, unreachableBlobsExamined: objectIds.length, unreachableMatches: unreachable.length, output: "docs/qa/DUDUQ_SMART_SENTENCE_HISTORICAL_AUDIO_RECOVERY_V5.json" }, null, 2));
