(function (global) {
  "use strict";
  const cache = new Map();
  const text = (value) => value == null ? "" : String(value);
  const flatten = (items, out = []) => { for (const item of items || []) { out.push(item); flatten(item.children, out); } return out; };
  const descendants = (node, out = []) => { if (!node) return out; out.push(node); for (const child of node.children || []) descendants(child, out); return out; };
  const selector = (entry) => {
    const raw = text(entry.runtimeSelector);
    if (raw === "[data-canonical-header-slot]") return ".game-hud, .duduq-engine-header";
    if (raw === "[data-canonical-question-slot]") return ".question-panel, .duduq-matching-instruction, .duduq-ts-instruction";
    return raw;
  };
  async function load(mechanic, screenId) {
    const key = `${mechanic}:${screenId}`;
    if (!cache.has(key)) cache.set(key, Promise.all([
      fetch("/design-system/duduq-screen-property-map.json", { cache: "no-store" }).then((r) => r.json()),
      fetch("/design-system/penpot-sync/graph/current-live.json", { cache: "no-store" }).then((r) => r.json())
    ]));
    const [map, graph] = await cache.get(key);
    const nodes = flatten(graph.pages);
    const board = nodes.find((node) => node.penpotId === screenId) || nodes.find((node) => node.screenId === screenId && node.geometry?.width === 1366 && node.geometry?.height === 768);
    const screenNodes = board ? descendants(board) : nodes.filter((node) => node.screenId === screenId);
    return board ? { board, nodes, screenNodes, entries: (map.nodes || []).filter((entry) => entry.mechanic === mechanic && entry.scope === "SCREEN_INSTANCE") } : null;
  }
  function findNode(state, entry, used) {
    const ids = text(entry.penpotNodeId).split(",");
    const exact = state.screenNodes.find((node) => ids.includes(node.penpotId) && !used.has(node.penpotId));
    if (exact) return exact;
    const component = text(entry.component).toUpperCase();
    const token = component.includes("QUESTION HUD") ? "QUESTION HUD" : component.includes("WORD CARD") ? "WORD /" : component.includes("IMAGE CARD") ? "IMAGE /" : null;
    if (token) return state.screenNodes.find((node) => !used.has(node.penpotId) && node.type === "group" && text(node.name).toUpperCase().includes(token));
    if (component.includes("TARGET / DOG")) return state.screenNodes.find((node) => !used.has(node.penpotId) && node.type === "group" && /C[AÃ]ES|DOG/i.test(text(node.name)));
    if (component.includes("TARGET / CAT")) return state.screenNodes.find((node) => !used.has(node.penpotId) && node.type === "group" && /GATO|CAT/i.test(text(node.name)));
    if (component.includes("TARGET / RABBIT")) return state.screenNodes.find((node) => !used.has(node.penpotId) && node.type === "group" && /COELHO|RABBIT/i.test(text(node.name)));
    if (component.includes("TARGET / FISH")) return state.screenNodes.find((node) => !used.has(node.penpotId) && node.type === "group" && /PEIXE|FISH/i.test(text(node.name)));
    if (component.includes("LAUNCHER")) return state.screenNodes.find((node) => !used.has(node.penpotId) && node.type === "group" && /CANH[ÃA]O|MAGIC/i.test(text(node.name)));
    if (component.includes("CONFIRM")) return state.nodes.find((node) => !used.has(node.penpotId) && text(node.name).toUpperCase().includes("PRIMARY"));
    return null;
  }
  function apply({ frame, mechanic, screenId }) {
    if (!frame) return Promise.resolve({ applied: 0, divergences: [] });
    return load(mechanic, screenId).then((state) => {
      const doc = frame.contentDocument;
      if (!state || !doc?.documentElement) return { applied: 0, divergences: [] };
      // Geometry is authored in the iframe's own CSS viewport.  Using the
      // outer iframe DOMRect here introduces the browser's letterbox height
      // (for example 792px shell vs 768px document) and shifts every node.
      const viewportWidth = doc.documentElement.clientWidth || frame.clientWidth;
      const viewportHeight = doc.documentElement.clientHeight || frame.clientHeight;
      const scale = Math.min(viewportWidth / state.board.geometry.width, viewportHeight / state.board.geometry.height);
      // The approved Gold Master composition is top-anchored in its screen
      // viewport.  Preserve that reference space while applying one uniform
      // responsive scale; do not introduce an independent vertical reflow.
      const offsetX = (viewportWidth - state.board.geometry.width * scale) / 2;
      const offsetY = 0;
      const used = new Set(), applied = [], selectorUse = new Map();
      for (const entry of state.entries) {
        const node = findNode(state, entry, used);
        if (!node?.geometry) continue;
        used.add(node.penpotId);
        const elements = [...doc.querySelectorAll(selector(entry))].filter((candidate) => {
          const style = doc.defaultView?.getComputedStyle(candidate);
          return candidate.getClientRects().length > 0 && style?.display !== "none" && style?.visibility !== "hidden";
        });
        const key = selector(entry);
        const index = selectorUse.get(key) || 0;
        selectorUse.set(key, index + 1);
        const element = elements[index] || elements[0];
        if (!element) continue;
        const desired = { x: (node.geometry.x - state.board.geometry.x) * scale + offsetX, y: (node.geometry.y - state.board.geometry.y) * scale + offsetY, width: node.geometry.width * scale, height: node.geometry.height * scale };
        const current = element.getBoundingClientRect();
        const base = element.dataset.duduqPenpotBaseTransform ?? getComputedStyle(element).transform;
        element.dataset.duduqPenpotBaseTransform = base === "none" ? "" : base;
        element.style.transform = `${element.dataset.duduqPenpotBaseTransform} translate(${desired.x - current.x}px, ${desired.y - current.y}px)`;
        if (entry.editableProperties?.includes("width")) element.style.width = `${desired.width}px`;
        if (entry.editableProperties?.includes("height")) element.style.height = `${desired.height}px`;
        element.dataset.duduqPenpotGeometry = JSON.stringify(desired);
        applied.push({ node: node.penpotId, desired });
      }
      return { applied: applied.length, divergences: [] };
    }).catch(() => ({ applied: 0, divergences: [] }));
  }
  global.DuduQRuntimeGeometry = Object.freeze({ apply });
})(window);
