import fs from "node:fs/promises";
import path from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = path.resolve("content/english/year-2");
const typographyPath = path.join(root, "year2-v23-gamified-typography.js");
const tactilePath = path.join(root, "year2-v23-tactile-buttons-3d.js");

const typography = await fs.readFile(typographyPath, "utf8");
const tactile = await fs.readFile(tactilePath, "utf8");

for (let module = 1; module <= 6; module += 1) {
  const dir = `module-${String(module).padStart(2, "0")}`;
  const html = await fs.readFile(path.join(root, dir, "index.html"), "utf8");
  assert(
    html.includes("year2-v23-gamified-typography.js?v=gamified-typography-online-rc1"),
    `${dir}: camada de tipografia Nunito online ausente.`
  );
  assert(
    html.includes("year2-v23-tactile-buttons-3d.js?v=tactile-buttons-3d-rc1"),
    `${dir}: camada de botões 3D táteis ausente.`
  );
  assert(
    html.indexOf("year2-v23-gamified-typography.js") < html.indexOf("year2-v23-tactile-buttons-3d.js"),
    `${dir}: ordem visual inválida; tipografia deve carregar antes do efeito tátil.`
  );
}

assert(
  typography.includes("https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"),
  "Tipografia: import online da Nunito 400/600/700/800/900 não está configurado."
);
assert(typography.includes('preferredFamily: "Nunito"'), "Tipografia: Nunito não é a família preferencial.");
assert(typography.includes("remoteFontImport: true"), "Tipografia: camada não declara fonte remota ativa.");
assert(typography.includes("font-weight: 900 !important"), "Tipografia: CTA peso 900 não protegido.");
assert(typography.includes("text-transform: uppercase !important"), "Tipografia: CTA uppercase não protegido.");
assert(typography.includes("letter-spacing: 1px !important"), "Tipografia: CTA letter-spacing de 1px não protegido.");
assert(typography.includes("font-weight: 700 !important"), "Tipografia: instruções em peso 700 não protegidas.");
assert(typography.includes("-webkit-font-smoothing: antialiased"), "Tipografia: antialiasing WebKit ausente.");

assert(tactile.includes("--duduq-tactile-depth: 6px"), "Botão tátil: profundidade normal de 6px ausente.");
assert(tactile.includes("box-shadow: 0 3px 0 var(--duduq-tactile-shadow)"), "Botão tátil: sombra hover de 3px ausente.");
assert(tactile.includes("translateY(3px)"), "Botão tátil: deslocamento hover de 3px ausente.");
assert(tactile.includes("translateY(6px)"), "Botão tátil: deslocamento active de 6px ausente.");
assert(tactile.includes("box-shadow: 0 0 0 transparent"), "Botão tátil: colapso total da sombra no clique ausente.");
assert(tactile.includes(".12s"), "Botão tátil: transição rápida de 120ms ausente.");
assert(tactile.includes("preservesExistingMechanicTransforms: true"), "Botão tátil: proteção de transforms das mecânicas ausente.");
assert(tactile.includes("optionAudioHaloPreserved: true"), "Botão tátil: halo do áudio não está protegido.");

console.log(JSON.stringify({
  status: "PASS",
  contract: "YEAR2_GAMIFIED_UI_CONTRACT_RC1",
  modules: 6,
  font: {
    family: "Nunito",
    source: "Google Fonts",
    weights: [400, 600, 700, 800, 900],
    display: "swap"
  },
  tactile: {
    normalDepthPx: 6,
    hoverOffsetPx: 3,
    hoverDepthPx: 3,
    activeOffsetPx: 6,
    activeDepthPx: 0,
    transitionMs: 120
  }
}, null, 2));
