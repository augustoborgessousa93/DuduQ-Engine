import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const inventory = read("design-system/duduq-component-inventory.json");
const compositions = read("design-system/duduq-screen-composition-map.json");
const manifest = read("design-system/duduq-component-manifest.json");
const required = ["Matching", "Target Shooter", "Drag & Drop"];
for (const name of required) {
  if (!compositions.compositions[name]) throw new Error(`missing composition: ${name}`);
  if (!inventory.classification.mechanicSpecific[name]) throw new Error(`missing inventory: ${name}`);
}
for (const component of manifest.components) {
  if (component.penpotMainId && !/^[0-9a-f-]{36}$/.test(component.penpotMainId)) throw new Error(`invalid Penpot Main ID: ${component.name}`);
}
for (const file of ["test/matching/gold-master-candidate-v1/index.html", "test/target-shooter/gold-master-clean-v2/index.html", "test/drag-drop/gold-master-candidate-v1/index.html"]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`missing runtime evidence: ${file}`);
}
console.log("DuduQScreenCompositionGuard PASS — runtime inventory and honest Penpot composition map are valid.");
