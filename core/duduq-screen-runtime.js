(function (global) {
  "use strict";

  function text(value) {
    return value == null ? "" : String(value);
  }

  async function get(url, type) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Visual package request failed: ${response.status} ${url}`);
    return type === "json" ? response.json() : response.text();
  }

  async function loadVisualPackage(baseUrl, packageName) {
    const base = `${text(baseUrl).replace(/\/$/, "")}/${encodeURIComponent(packageName)}`;
    const manifest = await get(`${base}/manifest.json`, "json");
    const [markup, styles, fonts, bindings] = await Promise.all([
      get(`${base}/visual.svg`), get(`${base}/styles.css`), get(`${base}/fonts.css`), get(`${base}/bindings.json`, "json")
    ]);
    return { manifest, markup, styles, fonts, bindings, packageUrl: base };
  }

  class DuduQScreenRuntime {
    constructor(host) {
      if (!host) throw new Error("DuduQScreenRuntime requires a host element.");
      this.host = host;
      this.root = null;
      this.package = null;
      this.bound = new Map();
    }

    mount(pkg) {
      if (!pkg?.manifest || !pkg.markup) throw new Error("Invalid visual package.");
      const root = this.host.shadowRoot || this.host.attachShadow({ mode: "open" });
      const packageUrl = text(pkg.packageUrl || "").replace(/\/$/, "");
      const resolveResources = (value) => String(value || "")
        .replace(/(href|xlink:href)=("|')assets\//g, `$1=$2${packageUrl}/assets/`)
        .replace(/url\((['"]?)assets\//g, `url($1${packageUrl}/assets/`);
      const markup = resolveResources(pkg.markup);
      const styles = resolveResources(pkg.styles);
      const fonts = resolveResources(pkg.fonts);
      const markupHash = text(pkg.manifest?.hashes?.markup);
      // Golden exports are comparison oracles only.  The production surface is
      // always the generated vector markup from the active Visual Package.
      const staged = `<style data-duduq-fonts>${fonts}</style><style data-duduq-styles>${styles}</style><style data-duduq-runtime-stage>.duduq-visual-markup{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}.duduq-visual-markup>svg{display:block;width:100%;height:100%}.duduq-visual-markup svg{max-width:100%;max-height:100%;pointer-events:auto}.duduq-visible-feedback{display:none;position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:4;padding:8px 16px;border-radius:999px;background:rgba(23,92,147,.94);color:#fff;font:700 14px/1.2 system-ui,sans-serif;pointer-events:none}.duduq-visible-feedback[data-visible="true"]{display:block}.duduq-visual-markup [data-duduq-pointer-state="active"]{filter:brightness(1.08) drop-shadow(0 0 8px rgba(52,159,223,.9))}.duduq-visual-markup [data-duduq-pointer-state="selected"],.duduq-visual-markup [data-duduq-pointer-state="connected"]{filter:brightness(1.1) drop-shadow(0 0 10px rgba(52,159,223,.95))}.duduq-visual-markup [data-duduq-pointer-state="hit"]{filter:brightness(1.14) drop-shadow(0 0 12px rgba(53,185,112,.98))}.duduq-visual-markup [data-duduq-pointer-state="incorrect"]{filter:brightness(1.08) drop-shadow(0 0 12px rgba(223,117,109,.98))}</style><div data-duduq-screen="${pkg.manifest.screenId}" data-duduq-visual-package-markup-hash="${markupHash}" data-duduq-runtime-source="LIVE_VISUAL_PACKAGE" style="position:relative;width:100%;height:100%;overflow:hidden"><div class="duduq-visual-markup">${markup}</div><div class="duduq-visible-feedback" data-duduq-visible-feedback data-visible="false" aria-live="polite"></div></div>`;
      root.innerHTML = staged;
      root.querySelector?.(".duduq-visual-markup > svg")?.setAttribute("preserveAspectRatio", "xMidYMid meet");
      this.root = root;
      this.package = pkg;
      this.bound.clear();
      for (const binding of pkg.bindings?.behaviorBindings || []) {
        const node = this.lookup(binding.sourceId);
        if (node) this.bound.set(binding.sourceId, { node, binding });
      }
      return this;
    }

    lookup(sourceId) {
      const id = text(sourceId);
      return this.root?.querySelector?.(`#shape-${CSS.escape(id)},[data-source-id="${CSS.escape(id)}"]`) || null;
    }

    getBinding(sourceId) {
      return this.bound.get(text(sourceId)) || null;
    }

    bind(sourceId, type, listener, options) {
      const entry = this.getBinding(sourceId) || { node: this.lookup(sourceId), binding: null };
      if (!entry.node) return false;
      entry.node.addEventListener(type, listener, options);
      return () => entry.node.removeEventListener(type, listener, options);
    }

    swap(pkg) {
      const prior = this.package;
      try { return this.mount(pkg); }
      catch (error) { if (prior) this.mount(prior); throw error; }
    }

    unmount() {
      if (this.root) this.root.innerHTML = "";
      this.bound.clear();
      this.package = null;
    }

    dispose() {
      this.unmount();
      this.root = null;
      this.host = null;
    }

    bindVisibleGameplay({ frame, mode = "generic" } = {}) {
      const surface = this.root?.querySelector?.('[data-duduq-runtime-source="LIVE_VISUAL_PACKAGE"]');
      const svg = surface?.querySelector?.("svg");
      if (!surface || !svg || !frame) return { active: false, diagnostics: [] };
      const feedback = this.root.querySelector("[data-duduq-visible-feedback]");
      const diagnostics = [];
      let lastNode = null;
      let selectedNode = null;
      let lastIndex = -1;
      let observer = null;
      surface.setAttribute("data-duduq-visible-interaction", "active");
      const setFeedback = (message) => {
        if (!feedback || !message) return;
        feedback.textContent = message;
        feedback.dataset.visible = "true";
      };
      const sourceNode = (event) => {
        const target = event.target?.closest?.(".target-ring");
        if (target) return target;
        const chain = [];
        let node = event.target;
        while (node && node !== surface) {
          if (node.nodeType === 1 && node.id?.startsWith("shape-")) chain.push(node);
          node = node.parentElement;
        }
        return chain.find((candidate) => {
          const box = candidate.getBoundingClientRect?.();
          return box && box.width >= 40 && box.height >= 30;
        }) || chain[0] || svg;
      };
      const visibleNodes = () => [...surface.querySelectorAll('g[id^="shape-"]')].filter((node) => {
        const box = node.getBoundingClientRect?.();
        return box && box.width >= 70 && box.height >= 60 && getComputedStyle(node).display !== "none";
      });
      const targetNodes = () => [...surface.querySelectorAll(".target-ring")];
      const forward = (event, type, node) => {
        const doc = frame.contentDocument;
        if (!doc) return null;
        const surfaceBox = surface.getBoundingClientRect();
        const frameBox = frame.getBoundingClientRect();
        const x = frameBox.left + ((event.clientX - surfaceBox.left) / Math.max(1, surfaceBox.width)) * frameBox.width;
        const y = frameBox.top + ((event.clientY - surfaceBox.top) / Math.max(1, surfaceBox.height)) * frameBox.height;
        let target = doc.elementFromPoint(x - frameBox.left, y - frameBox.top);
        if (mode === "target-shooter" && type === "click") {
          const targets = [...doc.querySelectorAll(".duduq-ts-target")];
          const ring = node.closest?.(".target-ring") || node;
          const index = Math.max(0, targetNodes().indexOf(ring) % Math.max(1, targets.length));
          target = targets[index] || target;
        }
        if (!target) return null;
        const init = { bubbles: true, cancelable: true, composed: true, clientX: x - frameBox.left, clientY: y - frameBox.top, button: event.button, buttons: event.buttons, pointerId: event.pointerId || 1, pointerType: event.pointerType || "mouse" };
        if (type === "click") target.dispatchEvent(new MouseEvent("click", init));
        else target.dispatchEvent(new PointerEvent(type, init));
        return target;
      };
      const handle = (event) => {
        const node = sourceNode(event);
        const sourceId = node.id?.replace(/^shape-/, "") || null;
        const box = node.getBoundingClientRect?.();
        diagnostics.push({ type: event.type, sourceId, target: event.target?.id || event.target?.tagName || null, pointerEvents: getComputedStyle(node).pointerEvents, opacity: getComputedStyle(node).opacity, box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null });
        node.dataset.duduqVisibleNode = "true";
        node.setAttribute("data-duduq-source-id", sourceId || "");
        if (event.type === "pointerdown") { node.dataset.duduqPointerState = "active"; lastNode = node; lastIndex = visibleNodes().indexOf(node); setFeedback("Selecionado"); }
        if (event.type === "pointerup") node.dataset.duduqPointerState = "selected";
        if (event.type === "click") {
          if (selectedNode && selectedNode !== node) { selectedNode.dataset.duduqPointerState = "connected"; node.dataset.duduqPointerState = "connected"; setFeedback("Conectado"); selectedNode = null; }
          else {
            const box = node.getBoundingClientRect?.();
            const surfaceBox = surface.getBoundingClientRect();
            const isConfirm = mode === "matching" && box && box.top > surfaceBox.top + surfaceBox.height * 0.78;
            node.dataset.duduqPointerState = isConfirm ? "confirmed" : "selected";
            setFeedback(isConfirm ? "Confirmado" : mode === "target-shooter" ? "Alvo atingido" : "Selecionado");
            if (mode === "matching" && !isConfirm) selectedNode = node;
          }
          lastNode = node;
          forward(event, "click", node);
        } else forward(event, event.type, node);
      };
      surface.style.pointerEvents = "auto";
      svg.style.pointerEvents = "auto";
      frame.style.pointerEvents = "none";
      ["pointerdown", "pointerup", "click"].forEach((type) => surface.addEventListener(type, handle, true));
      const frameReady = () => {
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        observer?.disconnect();
        observer = new MutationObserver(() => {
          const success = doc.querySelector('[data-feedback-state="success"], .duduq-ts-target[data-state="hit"], [data-state="hit"]');
          const retry = doc.querySelector('[data-feedback-state="retry"], .duduq-ts-target[data-state="miss"], [data-state="incorrect"]');
          if (success && lastNode) { lastNode.dataset.duduqPointerState = "hit"; setFeedback("Acerto"); }
          else if (retry && lastNode) { lastNode.dataset.duduqPointerState = "incorrect"; setFeedback("Tente novamente"); }
        });
        observer.observe(doc.body, { subtree: true, childList: true, attributes: true, characterData: true });
      };
      frame.addEventListener("load", frameReady);
      frameReady();
      const binding = { active: true, diagnostics, surface, frame, dispose: () => { observer?.disconnect(); frame.removeEventListener("load", frameReady); ["pointerdown", "pointerup", "click"].forEach((type) => surface.removeEventListener(type, handle, true)); surface.removeAttribute("data-duduq-visible-interaction"); } };
      surface.__duduqVisibleInteraction = binding;
      return binding;
    }
  }

  global.DuduQScreenRuntime = DuduQScreenRuntime;
  global.DuduQVisualPackages = Object.freeze({ loadVisualPackage });
})(window);
