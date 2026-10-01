import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const commit = "c9803dca253a4208bbb3a05d505ff43c8ef403c5";
const files = [
  ["click.mp3", 2968, "0bb3f19efcd0d965d89c62c324a678906bde5e46"],
  ["swoosh-sound-effect--transitions.mp3", 11520, "f911f10c78f198f62e80aa6dd3be5c5e47b49351"],
  ["pop.mp3", 12581, "98a6454354c6de9c1fd3c39c8a52edd6ea7aaed8"],
  ["correct.mp3", 22194, "5fbe52c75ea4a705fc4598613b1dcb0180a56ec3"],
  ["error.mp3", 29300, "19ed23d1bde1763748b80b2b396765da0cec9242"],
  ["you win.mp3", 326844, "b5a300c647b3effee48f68cd076023618edab642"]
];
const destination = resolve("play/drag-drop/assets/audio");
await mkdir(destination, { recursive: true });
const result = [];
for (const [name, expectedSize, expectedSha] of files) {
  const url = `https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/${commit}/Efeitos%20sonoros/${encodeURIComponent(name)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const gitSha = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  if (bytes.length !== expectedSize || gitSha !== expectedSha) throw new Error(`${name}: repo blob mismatch (${bytes.length}, ${gitSha})`);
  if (bytes.length < 3 || (bytes.toString("ascii", 0, 3) !== "ID3" && !(bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) throw new Error(`${name}: invalid MP3 signature`);
  await writeFile(resolve(destination, name), bytes);
  result.push({ name, bytes: bytes.length, gitSha, local: `play/drag-drop/assets/audio/${name}` });
}
console.log(JSON.stringify({ repository: "augustoborgessousa93/Assets-DuduQ", commit, files: result }));
