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
      const staged = `<style data-duduq-fonts>${pkg.fonts || ""}</style><style data-duduq-styles>${pkg.styles || ""}</style><div data-duduq-screen="${pkg.manifest.screenId}">${pkg.markup}</div>`;
      root.innerHTML = staged;
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
  }

  global.DuduQScreenRuntime = DuduQScreenRuntime;
  global.DuduQVisualPackages = Object.freeze({ loadVisualPackage });
})(window);
