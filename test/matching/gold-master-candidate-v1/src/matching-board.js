import { StatusIcon } from "./matching-components.js";
import { MatchingCard } from "./core/ui/index.js";

const svgNS = "http://www.w3.org/2000/svg";

function renderCard(item, kind, index, resolveAsset) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "matching-card";
  card.dataset.id = item.id;
  card.dataset.kind = kind;
  card.dataset.side = kind === "word" ? "left" : "right";
  card.dataset.state = "idle";
  card.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-label", kind === "word" ? item.label : item.alt);
  if (kind === "word") {
    const label = document.createElement("span");
    label.className = "matching-word";
    label.textContent = item.label;
    card.append(label);
  } else {
    const image = document.createElement("img");
    image.className = "matching-image";
    image.alt = item.alt;
    image.decoding = "async";
    image.loading = index < 2 ? "eager" : "lazy";
    image.src = resolveAsset(item.imageAssetKey);
    image.addEventListener("error", () => image.dataset.load = "error", { once: true });
    card.append(image);
  }
  const port = document.createElement("span");
  port.className = "matching-port";
  port.setAttribute("aria-hidden", "true");
  card.append(port);
  const statusBadge = document.createElement("span");
  statusBadge.className = "matching-card-status";
  StatusIcon(statusBadge);
  statusBadge.setAttribute("aria-hidden", "true");
  card.append(statusBadge);
  MatchingCard(card, { connectorSide: kind === "word" ? "right" : "left" });
  return card;
}

function connectorPart(tag, attrs = {}) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

export function MatchingBoard(root, engine, interaction, resolveAsset, onChange) {
  const left = root.querySelector('[data-list="left"]');
  const right = root.querySelector('[data-list="right"]');
  const svg = root.querySelector(".connection-layer");
  engine.leftItems.forEach((item, index) => left.append(renderCard(item, "word", index, resolveAsset)));
  engine.rightItems.forEach((item, index) => right.append(renderCard(item, "image", index, resolveAsset)));
  const cards = [...root.querySelectorAll(".matching-card")];

  function drawConnections() {
    const bounds = root.querySelector(".matching-playfield").getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.replaceChildren();
    for (const connection of interaction.snapshot().connections) {
      const start = root.querySelector(`[data-list="left"] [data-id="${CSS.escape(connection.leftId)}"] .matching-port`).getBoundingClientRect();
      const end = root.querySelector(`[data-list="right"] [data-id="${CSS.escape(connection.rightId)}"] .matching-port`).getBoundingClientRect();
      const x1 = start.left + start.width / 2 - bounds.left;
      const y1 = start.top + start.height / 2 - bounds.top;
      const x2 = end.left + end.width / 2 - bounds.left;
      const y2 = end.top + end.height / 2 - bounds.top;
      const curve = Math.min((x2 - x1) * .44, Math.max(8, width * .18));
      const d = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
      const group = connectorPart("g", { class: `matching-connection is-${connection.state}${connection.state === "connected" ? " is-connecting" : ""}`, "data-connection": connection.id });
      group.append(connectorPart("path", { class: "connection-shadow", d }));
      group.append(connectorPart("path", { class: "connection-glow", d }));
      group.append(connectorPart("path", { class: "connection-cable-shadow", d }));
      const cable = connectorPart("path", { class: "connection-cable", d, pathLength: 1 });
      cable.addEventListener("animationend", (event) => {
        if (event.animationName === "connector-draw") group.classList.remove("is-connecting");
      }, { once: true });
      group.append(cable);
      group.append(connectorPart("path", { class: "connection-core", d }));
      group.append(connectorPart("path", { class: "connection-thread", d }));
      for (const [index, [cx, cy]] of [[x1, y1], [x2, y2]].entries()) {
        const node = index === 0 ? "source" : "target";
        group.append(connectorPart("circle", { class: "connection-node-shadow", cx, cy, r: 11 }));
        group.append(connectorPart("circle", { class: "connection-node", cx, cy, r: 8.5 }));
        group.append(connectorPart("circle", { class: "connection-node-ring", cx, cy, r: 6.2 }));
        group.append(connectorPart("circle", { class: "connection-node-core", cx, cy, r: 3.5, "data-node": node }));
        group.append(connectorPart("circle", { class: "connection-node-highlight", cx: cx - 2.8, cy: cy - 3.1, r: 1.7 }));
      }
      svg.append(group);
    }
  }

  function paint(snapshot = interaction.snapshot()) {
    for (const card of cards) {
      const { id, side } = card.dataset;
      const connection = snapshot.connections.find((line) => side === "left" ? line.leftId === id : line.rightId === id);
      const state = connection?.state ?? (snapshot.selected[side] === id ? "selected" : "idle");
      card.dataset.state = state;
      MatchingCard(card, {
        state,
        connectorSide: side === "left" ? "right" : "left",
        status: state === "correct" || state === "incorrect" ? state : "idle"
      });
      StatusIcon(card.querySelector(".matching-card-status"), state === "correct" ? "correct" : state === "incorrect" ? "incorrect" : "idle");
      // A correct pair remains visibly correct and locked on retry.
      card.disabled = state === "correct" || ["validating", "loading", "complete"].includes(snapshot.status);
      card.setAttribute("aria-pressed", String(state === "selected"));
      card.setAttribute("aria-disabled", String(card.disabled));
      const label = card.dataset.kind === "word" ? card.querySelector(".matching-word").textContent : card.querySelector("img").alt;
      card.setAttribute("aria-label", `${label}${state === "selected" ? ". Selecionado" : state === "connected" ? ". Conectado" : state === "correct" ? ". Correto" : state === "incorrect" ? ". Incorreto" : ""}`);
    }
    root.querySelector(".matching-playfield").dataset.result = snapshot.status;
    drawConnections();
    onChange(snapshot);
  }

  const onCardClick = (event) => {
    const card = event.target.closest(".matching-card");
    if (!card || !root.contains(card)) return;
    paint(interaction.select(card.dataset.side, card.dataset.id));
  };
  root.addEventListener("click", onCardClick);

  let frame = 0;
  const scheduleDraw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawConnections);
  };
  window.addEventListener("resize", scheduleDraw, { passive: true });
  const observer = new ResizeObserver(scheduleDraw);
  observer.observe(root.querySelector(".matching-playfield"));
  cards.forEach((card) => observer.observe(card));
  paint();
  return Object.freeze({
    paint,
    drawConnections,
    destroy() {
      root.removeEventListener("click", onCardClick);
      window.removeEventListener("resize", scheduleDraw);
      observer.disconnect();
      cancelAnimationFrame(frame);
    }
  });
}
