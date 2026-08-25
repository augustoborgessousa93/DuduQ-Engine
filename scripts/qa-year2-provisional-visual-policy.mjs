import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const yearDir = path.join(root, "content", "english", "year-2");
const policyPath = path.join(yearDir, "HOMOLOGATION_VISUAL_POLICY.json");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(fs.existsSync(policyPath), "Política visual do Year 2 ausente");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
check(policy.mode === "EXISTING_ASSET_PLUS_PROVISIONAL", "Modo visual misto divergente");
check(policy.status === "ACTIVE_FOR_TECHNICAL_HOMOLOGATION", "Política visual não está ativa para homologação técnica");
check(policy.rules?.preferExistingRepositoryAssets === true, "Assets já existentes devem ter prioridade");
check(policy.rules?.missingAssetsUseProvisionalEmojiVector === true, "Itens sem asset devem manter fallback provisório");
check(policy.rules?.blocksTechnicalQA === false, "Falta de asset final não pode bloquear QA técnico nesta etapa");
check(policy.rules?.assetRepository === "augustoborgessousa93/Assets-DuduQ", "Repositório de assets divergente");
check(policy.runtime?.useFactoryPreviewVisualsAsFallback === true, "Factory deve permanecer disponível como fallback visual");
check(policy.runtime?.loadEditorialAssetPatch === true, "Runtime deve carregar os assets editoriais exatos já existentes");
check(policy.runtime?.loadSemanticFinalAssetPatch === false, "Patch semântico final não deve ser carregado nesta etapa");

const editorialPatch = path.join(yearDir, "year2-v22-homolog-editorial-assets.js");
check(fs.existsSync(editorialPatch), "Patch de assets editoriais exatos ausente");

for (let module = 1; module <= 6; module += 1) {
  const mm = String(module).padStart(2, "0");
  const htmlPath = path.join(yearDir, `module-${mm}`, "homolog-v22-runtime.html");
  check(fs.existsSync(htmlPath), `M${mm}: runtime de homologação ausente`);
  const html = fs.readFileSync(htmlPath, "utf8");
  check(html.includes("EXISTING_ASSET_PLUS_PROVISIONAL"), `M${mm}: política visual mista não declarada no runtime`);
  check(html.includes("year2-v22-homolog-editorial-assets.js"), `M${mm}: assets existentes não estão sendo carregados`);
  check(!html.includes("year2-v22-homolog-semantic-vectors.js"), `M${mm}: patch semântico final não deve ser carregado`);
  check(html.includes("year2-v22-homolog-core.js"), `M${mm}: Factory core deve permanecer carregada para fallback provisório`);
  check(html.includes("year2-v22-homolog-layout.js"), `M${mm}: bridge responsivo deve permanecer carregado`);
}

console.log("DUDUQ YEAR2 EXISTING ASSET + PROVISIONAL FALLBACK POLICY: PASS");
console.log(JSON.stringify({
  mode: policy.mode,
  preferExistingRepositoryAssets: policy.rules.preferExistingRepositoryAssets,
  missingAssetsUseProvisionalEmojiVector: policy.rules.missingAssetsUseProvisionalEmojiVector,
  technicalQaBlocked: policy.rules.blocksTechnicalQA,
  assetRepository: policy.rules.assetRepository,
  modulesValidated: 6
}, null, 2));
