import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const baseUrl = process.argv.find((arg) => arg.startsWith("--base="))?.split("=")[1] || "http://127.0.0.1:4175";
const manifest = JSON.parse(await fs.readFile(path.join(root, "duduq-audio/manifests/AUDIO_MANIFEST.json"), "utf8"));
const questions = JSON.parse(await fs.readFile(path.join(root, "content/english/year-1/module-01/questions.json"), "utf8"));
const registry = JSON.parse(await fs.readFile(path.join(root, "content/english/audio/audio-registry.json"), "utf8"));
const contracts = manifest.items.filter((item) => item.module === "Y1M01");
const qids = new Set(questions.items.map((item) => item.item_id));
const decodeLegacyText = (value) => {
  if (typeof value !== "string" || !/[ÃÂâ]/.test(value)) return value || "";
  try { return new TextDecoder("utf-8").decode(Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 255))); }
  catch { return value; }
};
const normalize = (value) => decodeLegacyText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const rows = [];
for (const item of contracts) {
  const filePath = path.resolve(root, item.audioPath);
  const exists = await fs.stat(filePath).then((stat) => stat.isFile() && stat.size > 1024).catch(() => false);
  const response = await fetch(`${baseUrl}/${item.audioPath.replace(/^\/+/, "")}`, { method: "HEAD", cache: "no-store" }).catch(() => null);
  const registryEntry = registry.entries.find((entry) => entry.audioId === item.id);
  const activityListMatches = registryEntry && JSON.stringify([...item.activity].sort()) === JSON.stringify([...(registryEntry.usedByItems || [])].sort());
  const mappingValid = item.activity.every((id) => qids.has(id)) && registryEntry && registryEntry.urlOrPath === item.audioPath && normalize(registryEntry.transcript) === normalize(item.displayText) && activityListMatches;
  rows.push({ id: item.id, activities: item.activity, displayText: item.displayText, speechText: item.speechText, path: item.audioPath, exists, http: response?.status ?? "NETWORK_ERROR", contentType: response?.headers.get("content-type") ?? "—", locale: item.locale, voiceVersion: item.voiceVersion, deliveryProfile: item.deliveryProfile, mapping: Boolean(mappingValid), pass: exists && response?.status === 200 && response.headers.get("content-type")?.includes("audio/mpeg") && mappingValid && item.status === "APPROVED" && item.voiceVersion === "DUDUQ_GOLD_VOICE_v1" && item.deliveryProfile === "NATURAL_CLEAR_V2" });
}
const duplicatePaths = new Map();
for (const row of rows) {
  const previous = duplicatePaths.get(row.path);
  if (previous && normalize(previous.speechText) !== normalize(row.speechText)) row.duplicateMismatch = previous.duplicateMismatch = true;
  else duplicatePaths.set(row.path, row);
}
const pass = rows.filter((row) => row.pass).length;
console.table(rows.map(({ id, activities, displayText, path: asset, http, contentType, locale, voiceVersion, mapping, duplicateMismatch, pass: valid }) => ({ id, activities: activities.join(";"), text: displayText, asset, http, contentType, locale, voiceVersion, mapping, duplicateMismatch: Boolean(duplicateMismatch), pass: valid })));
console.log(JSON.stringify({ route: "/qa/y1m01-audio/", contracts: contracts.length, passed: pass, missing: rows.filter((r) => !r.exists).length, http200: rows.filter((r) => r.http === 200).length, validMappings: rows.filter((r) => r.mapping).length, duplicateMismatch: rows.some((r) => r.duplicateMismatch) }, null, 2));
if (contracts.length !== 23 || pass !== 23 || rows.some((r) => r.duplicateMismatch)) process.exitCode = 1;
