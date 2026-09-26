import fs from "node:fs";
import path from "node:path";
import { connectPenpot } from "./penpot-mcp-client.mjs";
import { buildGraph } from "./duduq-design-graph-v2.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "design-system/penpot-sync/graph/current-live.json");
const legacySource = { pageId: "855af85f-faf4-8069-8008-a8e75a3255fd", name: "DUDUQ DESIGN SYSTEM — CONTROL PANEL", kind: "LEGACY_SCREEN_SOURCE" };
const componentSource = { pageId: "98cf88ec-b308-806d-8008-b32bc5bf3f16", boardId: "98cf88ec-b308-806d-8008-b32cd1be3a1d", name: "DUDUQ — 01 Componentes Oficiais", kind: "OFFICIAL_COMPONENT_SOURCE" };
const sources = [legacySource, componentSource];
const code = `const sources=${JSON.stringify(sources)};const serial=s=>{const o={};for(const k of ['id','name','type','x','y','width','height','rotation','fills','strokes','shadows','blur','opacity','visible','hidden','borderRadius','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','align','constraintsHorizontal','constraintsVertical','componentRef','componentId','isComponentInstance']){try{o[k]=s[k]}catch{}}o.children=(s.children||[]).map(serial);return o};const pages=sources.map(source=>{const page=penpotUtils.getPageById(source.pageId);if(!page)throw Error('AUTHORIZED_AUTHORING_SOURCE_NOT_FOUND:'+source.kind);return {id:page.id,name:page.name,sourceKind:source.kind,children:(page.root.children||[]).map(serial)}});return {id:penpot.currentFile.id,pages};`;

export async function capture() {
  const started = Date.now();
  const mcp = await connectPenpot();
  try {
    const result = await mcp.execute(code);
    const text = result.content?.find((item) => item.type === "text")?.text || "";
    const parsed = JSON.parse(text);
    const raw = parsed.result ?? parsed;
    if (!raw.pages?.length) throw Error("LIVE_GRAPH_INCOMPLETE");
    const graph = { ...buildGraph(raw, legacySource), sources };
    const payload = JSON.stringify(graph);
    const nodeCount = (() => { const count = (node) => (node.children || []).reduce((sum, child) => sum + count(child), 1); return graph.pages.reduce((sum, page) => sum + count(page), 0); })();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ ...graph, metadata: { capturedAt: new Date().toISOString(), durationMs: Date.now() - started, payloadBytes: Buffer.byteLength(payload), nodeCount } }, null, 2) + "\n");
    return { path: out, nodes: nodeCount, bytes: Buffer.byteLength(payload), tools: mcp.tools.length };
  } finally { await mcp.close(); }
}

if (process.argv[1]?.endsWith("capture-penpot-graph.mjs")) capture().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 2; });
