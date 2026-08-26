import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const canary = JSON.parse(read("engine/channels/canary-v1.json"));
const publicM03 = read("content/english/year-2/module-03/index.html");
const channel = JSON.parse(read("engine/channels/homolog-m03-r143-visual-v2.json"));
const adapter = read("engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js");
const runtime = read("engine/releases/mechanics/drag-drop/2.0.24/dd2-single-target-runtime-patch.js");
const baseRuntime = read("engine/releases/mechanics/drag-drop/2.0.22/DUDUQ_DRAG_DROP.html");
const contentPatch = read("content/english/year-2/year2-v24-single-target-ux-patch.js");
const harness = read("test/drag-drop/single-target-choice-2.0.24/m03-r143-visual-homolog.html");

expect(canary.revision === 143, `Canary público saiu da R143: R${canary.revision}.`);
expect(canary.mechanics?.["drag-drop"]?.release === "2.0.22", "Canary público não está em drag-drop 2.0.22.");
expect(!publicM03.includes('interactionPilot:"SINGLE_TARGET_CHOICE"'), "M03 público ativou SINGLE_TARGET_CHOICE durante homologação.");
expect(!publicM03.includes('dragDropCandidate:"2.0.24"'), "M03 público vazou candidato 2.0.24.");
expect(!publicM03.includes("2.0.24/dd2-single-target-runtime-patch.js"), "M03 público carrega runtime 2.0.24.");

expect(channel.policy?.homologationOnly === true, "Canal 2.0.24 precisa ser homologationOnly.");
expect(channel.mechanics?.["drag-drop"]?.release === "2.0.24", "Canal isolado não aponta para drag-drop 2.0.24.");
expect(channel.mechanics?.["drag-drop"]?.adapter === "/engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js", "Adapter 2.0.24 incorreto no canal.");
expect(harness.includes('channel: "homolog-m03-r143-visual-v2"'), "Harness não aponta para canal 2.0.24.");
expect(harness.includes('dragDropCandidate: "2.0.24"'), "Harness não declara candidato 2.0.24.");
expect(harness.includes('visualBaseline: "R143"'), "Harness não declara baseline R143.");
expect(harness.includes("year2-v24-single-target-ux-patch.js"), "Harness não carrega patch UX 2.0.24.");
expect(harness.includes("2.0.24/dd2-single-target-runtime-patch.js"), "Harness não carrega runtime patch 2.0.24.");

expect(adapter.includes('const VERSION = "2.0.24"'), "Adapter perdeu identidade 2.0.24.");
expect(adapter.includes('/engine/releases/mechanics/drag-drop/2.0.23/drag-drop.js'), "Adapter 2.0.24 não compõe 2.0.23.");
expect(runtime.includes('/engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js'), "Runtime 2.0.24 não compõe patch 2.0.23.");
expect(runtime.includes('const STYLE_ID = "duduq-dd24-r143-single-target-style"'), "CSS 2.0.24 não tem identidade própria.");

expect(runtime.includes("playSingleTargetSelectionAudio"), "Autoplay de áudio por toque ausente.");
expect(runtime.includes("< 260"), "Debounce curto de áudio ausente.");
expect(runtime.includes('playSingleTargetSelectionAudio(item);'), "Tap/click não dispara áudio da alternativa.");
expect(!runtime.includes("ctx.playChoiceAudio"), "Candidato ainda adiciona um segundo áudio após drag.");
expect(!runtime.includes("playChoiceAudio:"), "Contexto nativo ainda expõe segundo caminho de áudio para drag.");
expect(baseRuntime.includes('if (source === "drop" && (item.audioAssetKey || item.spokenText))'), "Runtime base perdeu autoplay canônico do drag.");
expect(baseRuntime.includes('playValueAudio(item, "item", true);'), "Runtime base perdeu reprodução de áudio no drop.");
expect(contentPatch.includes("selectionAudioAutoplay = true"), "Metadata de autoplay ausente.");
expect(contentPatch.includes("replacePreviousChoice = true"), "Substituição de escolha ausente.");
expect(contentPatch.includes("confirmOnAnySelection = true"), "Confirmação de qualquer escolha ausente.");

expect(contentPatch.includes('question.statement = "VEJA, OUÇA E ESCOLHA"'), "Enunciado limpo ausente.");
expect(contentPatch.includes("alternative.text = letter"), "Alternativas ainda podem manter glyph editorial duplicado.");
expect(contentPatch.includes('audioAffordanceOwner: "runtime-control"'), "Owner único do ícone de áudio não está declarado.");
expect(runtime.includes('.duduq-dd2-capacity {\n  display: none !important;'), "Badge 0/1 não está oculto no candidato.");
expect(runtime.includes("height: 66px !important"), "Drop zone não possui altura estável.");
expect(runtime.includes("max-width: 128px !important"), "Item encaixado não possui variante compacta.");
expect(runtime.includes("object-fit: contain !important"), "Imagem principal não usa contain.");
expect(runtime.includes("flex-direction: row !important"), "Alternativas desktop não preservam organização horizontal R143.");
expect(runtime.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), "Responsividade mobile em duas colunas ausente.");
expect(runtime.includes('html[data-duduq-host-compact-viewport="true"]'), "Overrides compact-host ausentes.");

console.log("PASS — DD 2.0.24: produção R143 congelada, candidato isolado, visual estável e um único caminho de áudio por gesto");
