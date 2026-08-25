import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const yearDir = path.join(root, "content", "english", "year-2");
const policyPath = path.join(yearDir, "HOMOLOGATION_VISUAL_POLICY.json");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(fs.existsSync(policyPath), "Política visual provisória do Year 2 ausente");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
check(policy.mode === "PROVISIONAL_EMOJI_VECTOR", "Modo visual provisório divergente");
check(policy.status === "ACTIVE_FOR_TECHNICAL_HOMOLOGATION", "Política visual não está ativa para homologação técnica");
check(policy.rules?.finalAssetsDeferred === true, "Assets finais devem estar explicitamente adiados");
check(policy.rules?.blocksTechnicalQA === false, "Assets finais não podem bloquear QA técnico nesta etapa");
check(policy.rules?.futureAssetRepository === "augustoborgessousa93/Assets-DuduQ", "Repositório futuro de assets divergente");
check(policy.runtime?.useFactoryPreviewVisuals === true, "Runtime deve usar previews da Factory");
check(policy.runtime?.loadEditorialAssetPatch === false, "Runtime não deve carregar patch de assets editoriais nesta etapa");
check(policy.runtime?.loadSemanticFinalAssetPatch === false, "Runtime não deve carregar patch de assets finais nesta etapa");

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  const htmlPath = path.join(yearDir, `module-${mm}`, "homolog-v22-runtime.html");
  check(fs.existsSync(htmlPath), `M${mm}: runtime de homologação ausente`);
  const html = fs.readFileSync(htmlPath, "utf8");
  check(html.includes("PROVISIONAL_EMOJI_VECTOR"), `M${mm}: política provisória não declarada no runtime`);
  check(!html.includes("year2-v22-homolog-editorial-assets.js"), `M${mm}: patch de asset editorial não deve ser carregado`);
  check(!html.includes("year2-v22-homolog-semantic-vectors.js"), `M${mm}: patch de asset final/vetor não deve ser carregado`);
  check(html.includes("year2-v22-homolog-core.js"), `M${mm}: Factory core deve permanecer carregada`);
  check(html.includes("year2-v22-homolog-layout.js"), `M${mm}: bridge responsivo deve permanecer carregado`);
}

console.log("DUDUQ YEAR2 PROVISIONAL VISUAL POLICY: PASS");
console.log(JSON.stringify({
  mode: policy.mode,
  finalAssetsDeferred: policy.rules.finalAssetsDeferred,
  technicalQaBlocked: policy.rules.blocksTechnicalQA,
  futureAssetRepository: policy.rules.futureAssetRepository,
  modulesValidated: 6
}, null, 2));
