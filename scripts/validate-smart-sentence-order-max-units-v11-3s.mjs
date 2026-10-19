import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
export const ORDER_MAX_UNITS = 6;

function read(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

const orderItems = [];
let modules = 0;
let activities = 0;
for (let year = 1; year <= 5; year += 1) {
  for (let module = 1; module <= 6; module += 1) {
    const moduleId = `Y${year}M${String(module).padStart(2, "0")}`;
    const relative = `content/english/year-${year}/module-${String(module).padStart(2, "0")}/questions.json`;
    const data = read(relative);
    modules += 1;
    activities += (data.items || []).length;
    for (const item of data.items || []) {
      if (item.mechanicId !== "smart-sentence-order") continue;
      const tokens = Array.isArray(item.orderedTokens) ? item.orderedTokens : [];
      orderItems.push({ moduleId, itemId: item.item_id || item.itemId, count: tokens.length, result: tokens.join(" ") });
    }
  }
}

const violations = orderItems.filter((item) => item.count > ORDER_MAX_UNITS);
if (violations.length) {
  for (const item of violations) {
    console.error(["SMART_SENTENCE_ORDER_MAX_UNITS_EXCEEDED", item.moduleId, item.itemId, `actual: ${item.count}`, `max: ${ORDER_MAX_UNITS}`].join("\n"));
  }
  process.exitCode = 1;
}

const deterministic = read("content/english/production/v11-1b/deterministic-activity-contracts.json");
const deterministicById = new Map();
const visit = (value) => {
  if (!value || typeof value !== "object") return;
  const itemId = value.itemId || value.item_id;
  if (itemId && value.mechanicId === "smart-sentence-order") deterministicById.set(itemId, value);
  for (const child of Object.values(value)) visit(child);
};
visit(deterministic);
for (const item of orderItems) {
  const contract = deterministicById.get(item.itemId);
  if (!contract) throw new Error(`SMART_SENTENCE_ORDER_CONTRACT_MISSING:${item.itemId}`);
  const count = (contract.orderedTokens || contract.studentStimuli?.canonicalOrder || []).length;
  if (count !== item.count) throw new Error(`SMART_SENTENCE_ORDER_LAYER_MISMATCH:${item.itemId}:questions=${item.count}:contracts=${count}`);
}

if (modules !== 30 || activities !== 600 || orderItems.length !== 15) {
  throw new Error(`SMART_SENTENCE_ORDER_PRODUCT_COUNT_MISMATCH:modules=${modules}:activities=${activities}:order=${orderItems.length}`);
}

console.log(JSON.stringify({
  status: violations.length ? "ISSUE" : "PASS",
  orderMaxUnits: ORDER_MAX_UNITS,
  modules,
  activities,
  totalOrderActivities: orderItems.length,
  oneToSix: orderItems.filter((item) => item.count >= 1 && item.count <= ORDER_MAX_UNITS).length,
  aboveSix: violations.length,
  items: orderItems
}, null, 2));
