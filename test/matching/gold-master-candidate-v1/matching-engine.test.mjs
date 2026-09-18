import test from "node:test";
import assert from "node:assert/strict";
import { createMatchingEngine, createMatchingInteraction } from "./src/matching-engine.js";
import { calculateProgress } from "./src/core-components.js";
import { calculateUIScale } from "./src/game-shell.js";

const fixture = {
  question: { id: "q1", label: "instruction" },
  leftItems: [{ id: "l1" }, { id: "l2" }],
  rightItems: [{ id: "r1" }, { id: "r2" }],
  pairs: [{ leftId: "l1", rightId: "r2" }, { leftId: "l2", rightId: "r1" }],
  completed: 4,
  total: 10
};

test("progresso visual é derivado da proporção atual/total", () => {
  assert.equal(calculateProgress(4, 10), .4);
  assert.equal(calculateProgress(5, 10), .5);
  assert.equal(calculateProgress(20, 10), 1);
  assert.equal(calculateUIScale({ width: 1366, height: 768 }), 1);
  assert.equal(calculateUIScale({ width: 1920, height: 1080 }), 1.2);
  assert.equal(calculateUIScale({ width: 1920, height: 360 }), .82);
});

test("MatchingEngine valida pares 1:1 sem acoplamento ao conteúdo", () => {
  const engine = createMatchingEngine(fixture);
  assert.deepEqual(engine.getMatch("l1"), { leftId: "l1", rightId: "r2" });
  assert.equal(engine.progress.completed, 4);
  assert.equal(engine.leftItems.length, 2);
});

test("interação seleciona lados, troca seleção e cria conexão sem validar no clique", () => {
  const interaction = createMatchingInteraction(createMatchingEngine(fixture));
  interaction.select("left", "l1");
  interaction.select("left", "l2");
  assert.equal(interaction.snapshot().selected.left, "l2");
  interaction.select("right", "r1");
  assert.equal(interaction.snapshot().connections.length, 1);
  assert.equal(interaction.snapshot().connections[0].rightId, "r1");
  assert.equal(interaction.snapshot().status, "idle");
});

test("confirma apenas um conjunto completo e identifica acerto/erro; permite retry", () => {
  const engine = createMatchingEngine(fixture);
  const interaction = createMatchingInteraction(engine);
  assert.equal(interaction.confirm().status, "incomplete");
  interaction.select("left", "l1"); interaction.select("right", "r2");
  interaction.select("left", "l2"); interaction.select("right", "r1");
  assert.equal(interaction.confirm().status, "correct");
  interaction.setStatus("loading");
  assert.equal(interaction.snapshot().status, "loading");

  const incorrect = createMatchingInteraction(engine);
  incorrect.select("left", "l1"); incorrect.select("right", "r1");
  incorrect.select("left", "l2"); incorrect.select("right", "r2");
  assert.equal(incorrect.confirm().status, "incorrect");
  assert.equal(incorrect.retry().connections.length, 0);

  const mixedFixture = {
    ...fixture,
    leftItems: [{ id: "a" }, { id: "b" }, { id: "c" }],
    rightItems: [{ id: "x" }, { id: "y" }, { id: "z" }],
    pairs: [{ leftId: "a", rightId: "x" }, { leftId: "b", rightId: "y" }, { leftId: "c", rightId: "z" }]
  };
  const mixed = createMatchingInteraction(createMatchingEngine(mixedFixture));
  mixed.select("left", "a"); mixed.select("right", "x"); // correct, preserved
  mixed.select("left", "b"); mixed.select("right", "z"); // incorrect, removed
  mixed.select("left", "c"); mixed.select("right", "y"); // incorrect, removed
  assert.equal(mixed.confirm().status, "incorrect");
  const retry = mixed.retry();
  assert.deepEqual(retry.connections.map(({ leftId, rightId, state }) => ({ leftId, rightId, state })), [{ leftId: "a", rightId: "x", state: "correct" }]);
  assert.equal(mixed.select("left", "a").connections[0].state, "correct");
});

test("reconectar um endpoint substitui a associação anterior e rejeita lado inválido", () => {
  const interaction = createMatchingInteraction(createMatchingEngine(fixture));
  interaction.select("left", "l1"); interaction.select("right", "r1");
  interaction.select("left", "l1");
  assert.equal(interaction.snapshot().connections.length, 0);
  interaction.select("right", "r2");
  assert.equal(interaction.snapshot().connections.length, 1);
  assert.equal(interaction.snapshot().connections[0].rightId, "r2");
  assert.throws(() => interaction.select("center", "l1"), /Lado/);
});

test("MatchingEngine rejeita IDs repetidos nos itens", () => {
  assert.throws(() => createMatchingEngine({
    ...fixture,
    leftItems: [{ id: "repeat" }, { id: "repeat" }]
  }), /duplicado/);
});

test("MatchingEngine rejeita relações 1:1 ambíguas ou inexistentes", () => {
  assert.throws(() => createMatchingEngine({
    ...fixture,
    pairs: [{ leftId: "l1", rightId: "r1" }, { leftId: "l1", rightId: "r2" }]
  }), /relações 1:1/);
  assert.throws(() => createMatchingEngine({
    ...fixture,
    pairs: [{ leftId: "missing", rightId: "r1" }]
  }), /inexistente/);
});
