import { TargetShooterEngine } from "./target-shooter-engine.js";
import { targetShooterFixture } from "./target-shooter-data.js";
import { setupCore, renderTargets, paintTargets, showFeedback } from "./target-shooter-view.js";
const assets = window.DuduQAssets; const game = document.querySelector(".game-screen");
game.style.setProperty("--world", `url("${assets.assets.backgrounds['1']}")`); setupCore(assets, game);
const engine = new TargetShooterEngine(targetShooterFixture); renderTargets(targetShooterFixture.items, assets, id => { engine.selectTarget(id); paintTargets(engine.snapshot()); window.setTimeout(() => engine.evaluateTarget(), 180); });
engine.addEventListener("change", event => { const state = event.detail; paintTargets(state); if (["correct", "incorrect"].includes(state.status)) window.setTimeout(() => showFeedback(assets, state.status, () => { if (state.status === "correct") engine.reset(); else { engine.reset(); paintTargets(engine.snapshot()); } }), 360); });
engine.addEventListener("complete", () => { game.dispatchEvent(new CustomEvent("activity-success", { bubbles: true, detail: { source: "target-shooter" } })); document.querySelector(".celebration").classList.add("is-active"); });
engine.init(); window.DuduQTargetShooter = Object.freeze({ engine });
