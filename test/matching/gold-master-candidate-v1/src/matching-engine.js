/* Engine de domínio sem acoplamento a palavras, animais, assets ou DOM. */
export function createMatchingEngine(input) {
  const leftItems = validateItems(input?.leftItems, "leftItems");
  const rightItems = validateItems(input?.rightItems, "rightItems");
  const pairs = validatePairs(input?.pairs, leftItems, rightItems);

  return Object.freeze({
    question: Object.freeze({ ...input.question }),
    leftItems: Object.freeze(leftItems),
    rightItems: Object.freeze(rightItems),
    pairs: Object.freeze(pairs),
    progress: Object.freeze({ completed: input.completed ?? 0, total: input.total ?? 1 }),
    getMatch(leftId) { return pairs.find((pair) => pair.leftId === leftId) ?? null; }
  });
}

/* Estado de interação independente da camada visual e dos dados pedagógicos. */
export function createMatchingInteraction(engine) {
  const connections = new Map();
  let selected = { left: null, right: null };
  let status = "idle";

  function snapshot() {
    return Object.freeze({
      status,
      selected: Object.freeze({ ...selected }),
      connections: Object.freeze([...connections.values()].map((connection) => Object.freeze({ ...connection })))
    });
  }

  function select(side, id) {
    if (!["left", "right"].includes(side)) throw new TypeError(`Lado de associação inválido: ${side}.`);
    if (["validating", "correct", "loading", "complete"].includes(status)) return snapshot();
    const items = side === "left" ? engine.leftItems : engine.rightItems;
    if (!items.some((item) => item.id === id)) throw new TypeError(`Item ${id} não pertence ao lado ${side}.`);
    if (status === "incorrect") return snapshot();
    // Correct pairs are locked across retries; they never regress to selected/blue.
    const locked = [...connections.values()].some((connection) => connection.state === "correct" && (side === "left" ? connection.leftId === id : connection.rightId === id));
    if (locked) return snapshot();
    const togglingOff = selected[side] === id;
    if (togglingOff) selected[side] = null;
    else {
      for (const [key, connection] of connections) {
        if (side === "left" ? connection.leftId === id : connection.rightId === id) connections.delete(key);
      }
      selected[side] = id;
    }
    status = "idle";

    if (selected.left && selected.right) {
      const leftId = selected.left;
      const rightId = selected.right;
      for (const [key, connection] of connections) {
        if (connection.leftId === leftId || connection.rightId === rightId) connections.delete(key);
      }
      const idKey = `${leftId}::${rightId}`;
      connections.set(idKey, { id: idKey, leftId, rightId, state: "connected" });
      selected = { left: null, right: null };
    }
    return snapshot();
  }

  function confirm() {
    if (connections.size !== engine.pairs.length) return Object.freeze({ status: "incomplete", snapshot: snapshot() });
    let correctCount = 0;
    for (const connection of connections.values()) {
      connection.state = engine.getMatch(connection.leftId)?.rightId === connection.rightId ? "correct" : "incorrect";
      if (connection.state === "correct") correctCount += 1;
    }
    status = correctCount === engine.pairs.length ? "correct" : "incorrect";
    return Object.freeze({ status, correctCount, total: engine.pairs.length, snapshot: snapshot() });
  }

  function retry() {
    for (const [key, connection] of connections) if (connection.state === "incorrect") connections.delete(key);
    selected = { left: null, right: null };
    status = "idle";
    return snapshot();
  }

  function setStatus(next) {
    if (!["validating", "loading", "complete"].includes(next)) throw new TypeError("Estado de sessão inválido.");
    status = next;
    return snapshot();
  }

  function reset() { connections.clear(); selected = { left: null, right: null }; status = "idle"; return snapshot(); }
  return Object.freeze({ select, confirm, retry, setStatus, reset, snapshot });
}

function validateItems(items, field) {
  if (!Array.isArray(items) || items.length < 2) throw new TypeError(`${field} precisa ter ao menos dois itens.`);
  const ids = new Set();
  return items.map((item) => {
    if (!item || typeof item.id !== "string" || ids.has(item.id)) throw new TypeError(`${field}: id ausente ou duplicado.`);
    ids.add(item.id);
    return Object.freeze({ ...item });
  });
}

function validatePairs(pairs, leftItems, rightItems) {
  if (!Array.isArray(pairs) || pairs.length === 0) throw new TypeError("pairs precisa conter ao menos uma relação.");
  const leftIds = new Set(leftItems.map(({ id }) => id));
  const rightIds = new Set(rightItems.map(({ id }) => id));
  const seenLeft = new Set();
  const seenRight = new Set();
  return pairs.map(({ leftId, rightId }) => {
    if (!leftIds.has(leftId) || !rightIds.has(rightId)) throw new TypeError("A relação aponta para um item inexistente.");
    if (seenLeft.has(leftId) || seenRight.has(rightId)) throw new TypeError("Esta versão do Matching requer relações 1:1.");
    seenLeft.add(leftId); seenRight.add(rightId);
    return Object.freeze({ leftId, rightId });
  });
}
