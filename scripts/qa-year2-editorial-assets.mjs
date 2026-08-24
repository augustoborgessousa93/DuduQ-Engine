import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { console };
sandbox.window = {};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

function run(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
}
function check(condition, message) {
  if (!condition) throw new Error(message);
}
function questions(module) {
  return (module?.activities || []).flatMap((activity) => activity?.questions || []);
}
function sources(question) {
  const out = [];
  const add = (src) => src && out.push(String(src));
  add(question?.image?.src);
  for (const target of question?.metadata?.targets || []) add(target?.imageSrc || target?.image);
  for (const item of question?.metadata?.targetShooter?.items || []) add(item?.image);
  for (const alternative of question?.alternatives || []) add(alternative?.image?.src);
  return Array.from(new Set(out));
}

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-dragdrop-visual-patch.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/module-01/module-01-v22-homolog.js");
for (let m = 2; m <= 6; m += 1) {
  const mm = String(m).padStart(2, "0");
  run(`content/english/year-2/module-${mm}/module-${mm}-v22-homolog.js`);
}

const factory = sandbox.window.DuduQYear2V22Factory;
check(factory?.editorialAssetsPatchVersion === "1.2.0-homolog", "Camada de assets editoriais exatos não carregou");
const exactIds = Array.from(factory.exactEditorialAssetItems || []);
check(exactIds.length === 13, `Esperados 13 itens ligados nesta rodada; atual=${exactIds.length}`);

const y2 = sandbox.window.DUDUQ_CONTENT?.english?.year2 || {};
const modules = Array.from({ length: 6 }, (_, index) => y2[`module${String(index + 1).padStart(2, "0")}v22homolog`]);
const qById = Object.fromEntries(modules.flatMap(questions).map((q) => [q.id, q]));

for (const id of exactIds) {
  const q = qById[id];
  check(q, `${id}: questão não encontrada`);
  const refs = sources(q);
  check(refs.length > 0, `${id}: nenhum asset visual encontrado`);
  check(refs.every((src) => !/^data:image\//i.test(src)), `${id}: ainda contém preview/data URI`);
  check(refs.every((src) => /raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\/main\/Imagens%20Ilustrativa\//.test(src)), `${id}: asset não aponta para Assets-DuduQ/main`);
  check(q.metadata?.assetAudit === "EXACT_EXISTING_REPOSITORY_ASSET", `${id}: marca de auditoria exata ausente`);
  check(q.metadata?.finalAssetRequired === false, `${id}: ainda marcado como finalAssetRequired`);
}

const expectedFiles = {
  "EN2-M3-03": "Train%20-%20trem.png",
  "EN2-M3-04": "Plane%20-%20avi%C3%A3o.png",
  "EN2-M6-01": "Apple%20-%20ma%C3%A7%C3%A3.png",
  "EN2-M6-02": "Banana.png",
  "EN2-M6-03": "Orange%20%20-laranja%20fruta.png",
  "EN2-M6-04": "Grapes%20-%20uvas.png",
  "EN2-M6-05": "Papaya%20-%20mam%C3%A3o.png",
  "EN2-M6-06": "Melon%20-%20mel%C3%A3o.png",
  "EN2-M6-07": "Apple%20-%20ma%C3%A7%C3%A3.png",
  "EN2-M6-08": "Banana.png",
  "EN2-M6-13": "Tomato%20-%20tomate.png"
};
for (const [id, encodedFile] of Object.entries(expectedFiles)) {
  check(sources(qById[id]).some((src) => src.endsWith(encodedFile)), `${id}: arquivo editorial exato divergente`);
}

for (const id of ["EN2-M6-11", "EN2-M6-12"]) {
  const q = qById[id];
  const items = q?.metadata?.targetShooter?.items || [];
  check(items.length === 4, `${id}: quatro imagens devem permanecer`);
  check(items.every((item) => item.display === "image" && item.label === ""), `${id}: proteção áudio→imagem foi alterada`);
  check(items.every((item) => !/^data:image\//i.test(String(item.image || ""))), `${id}: opção ainda usa preview`);
}

for (let m = 1; m <= 6; m += 1) {
  const mm = String(m).padStart(2, "0");
  const html = fs.readFileSync(path.join(root, `content/english/year-2/module-${mm}/homolog-v22-runtime.html`), "utf8");
  check(html.includes('../year2-v22-homolog-editorial-assets.js?v=1'), `M${mm}: runtime não carrega camada de assets editoriais`);
}

console.log("DUDUQ YEAR2 EXACT EDITORIAL ASSETS: PASS");
console.log(JSON.stringify({ wiredItems: exactIds.length, ids: exactIds, source: "Assets-DuduQ/main/Imagens Ilustrativa" }, null, 2));
