import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { connectPenpot } from "./penpot-mcp-client.mjs";
import { resolvePenpotFrame } from "./lib/penpot-frame-discovery.mjs";
import { ensurePreviewServer } from "./duduq-verification-links.mjs";

const root = path.resolve(import.meta.dirname, "..");
const state = JSON.parse(fs.readFileSync(path.join(root, "DUDUQ_PROJECT_STATE.json"), "utf8"));
const installation = state.penpot?.installation;
if (!installation?.serverRoot || !installation?.pluginRoot) throw new Error("PENPOT_MCP_INSTALLATION_NOT_REGISTERED");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function httpHealth(url) {
  try { const response = await fetch(url); return response.status < 500; } catch { return false; }
}
function tcpHealth(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (value) => { socket.destroy(); resolve(value); };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1200, () => done(false));
  });
}
function detachedNode(cwd, args, logName, envOverrides = {}) {
  const logDir = path.join(root, "artifacts");
  fs.mkdirSync(logDir, { recursive: true });
  const out = fs.openSync(path.join(logDir, `${logName}.out.log`), "a");
  const err = fs.openSync(path.join(logDir, `${logName}.err.log`), "a");
  const child = spawn(process.execPath, args, { cwd, detached: true, windowsHide: true, stdio: ["ignore", out, err], env: { ...process.env, ...envOverrides } });
  child.unref();
  return child.pid;
}
async function waitReady(check, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { if (await check()) return true; await wait(250); }
  return false;
}

function stringifyRaw(value) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function classifyToolError(raw, structured = false) {
  if (/plugin tab appears to be suspended|plugin.*suspend/i.test(raw)) return "PENPOT_PLUGIN_SUSPENDED";
  if (/heartbeat.*(?:timeout|missing|no heartbeat)|(?:timeout|missing).*heartbeat/i.test(raw)) return "PENPOT_HEARTBEAT_TIMEOUT";
  return structured ? "MCP_TOOL_ERROR" : "TOOL_ERROR_TEXT";
}

/** Parse MCP CallToolResult without treating arbitrary tool text as JSON. */
export function parseMcpToolResult(result) {
  if (!result || typeof result !== "object") {
    return { status: "EMPTY_RESULT", value: null, raw: stringifyRaw(result ?? "") };
  }

  const content = Array.isArray(result.content) ? result.content : [];
  const text = content.filter((item) => item?.type === "text" && typeof item.text === "string").map((item) => item.text).join("\n");
  const structuredValue = result.structuredContent;
  const raw = text || stringifyRaw(structuredValue ?? result);

  if (result.isError === true) {
    return { status: classifyToolError(raw, true), value: structuredValue ?? null, raw };
  }
  if (text.trim() && (text.trim().startsWith("Tool execution failed:") || /^Error:/i.test(text.trim()))) {
    return { status: classifyToolError(text.trim()), value: null, raw: text };
  }
  if (structuredValue && typeof structuredValue === "object") {
    return { status: "SUCCESS", value: structuredValue, raw };
  }
  if (!content.length) {
    // A direct structured value is accepted for adapters that unwrap MCP results.
    if (Object.hasOwn(result, "document") || Object.hasOwn(result, "result")) {
      return { status: "SUCCESS", value: result.result ?? result, raw };
    }
    return { status: "EMPTY_RESULT", value: null, raw: text };
  }
  if (!text.trim()) return { status: "EMPTY_RESULT", value: null, raw: text };

  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return { status: "TEXT_RESPONSE", value: text, raw: text };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return { status: "SUCCESS", value: parsed?.result ?? parsed, raw: text };
  } catch {
    return { status: "INVALID_JSON_PAYLOAD", value: null, raw: text };
  }
}

export async function executeMcpSafely(execute, code) {
  try {
    return parseMcpToolResult(await execute(code));
  } catch (error) {
    return { status: "MCP_TRANSPORT_ERROR", value: null, raw: String(error?.message ?? error) };
  }
}

export async function ensurePenpotMcp({ startOnly = false } = {}) {
  const before = { plugin: await httpHealth("http://127.0.0.1:4400/manifest.json"), mcp: await httpHealth("http://127.0.0.1:4401/mcp"), websocket: await tcpHealth(4402) };
  const started = { plugin: false, mcp: false, websocket: false };
  if (!before.mcp || !before.websocket) {
    detachedNode(installation.serverRoot, ["dist/index.js"], "penpot-mcp-server", { PENPOT_MCP_SERVER_HOST: "127.0.0.1" });
    started.mcp = !before.mcp;
    started.websocket = !before.websocket;
  }
  if (!before.plugin) {
    detachedNode(installation.pluginRoot, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4400"], "penpot-mcp-plugin");
    started.plugin = true;
  }
  const ready = {
    plugin: await waitReady(() => httpHealth("http://127.0.0.1:4400/manifest.json")),
    mcp: await waitReady(() => httpHealth("http://127.0.0.1:4401/mcp")),
    websocket: await waitReady(() => tcpHealth(4402))
  };
  if (!ready.plugin || !ready.mcp || !ready.websocket) throw new Error("PENPOT_MCP_SERVICES_NOT_READY");
  if (startOnly) return { before, ready, started, pluginConnected: null };
  let pluginConnected = false;
  let liveDocumentRead = false;
  const mcp = await connectPenpot();
  try {
    const config={fileId:"d8ac01df-6646-81d2-8008-a2900d806e30",pageId:"855af85f-faf4-8069-8008-a8e75a3255fd",frameName:"TARGET SHOOTER — MASTER / IDLE",aliases:["ATIRADOR DE ALVO — MESTRE / OCIOSO"]};
    const execution = await executeMcpSafely(mcp.execute, `const p=penpotUtils.getPageById('${config.pageId}');const s=n=>({id:n.id,name:n.name,type:n.type,x:n.x,y:n.y,width:n.width,height:n.height,children:(n.children||[]).map(s)});return {ok:true,document:{id:'${config.fileId}',pages:p?[{id:p.id,name:p.name,root:{children:(p.root.children||[]).map(s)}}]:[]}};`);
    if (execution.status !== "SUCCESS") {
      throw new Error(`${execution.status}\nRAW_TOOL_RESPONSE:\n${execution.raw || "<empty>"}`);
    }
    const payload = execution.value;
    pluginConnected = payload?.ok === true;
    const frame=resolvePenpotFrame({...config,document:payload?.document}); liveDocumentRead=Boolean(frame?.frameId);
  } finally { await mcp.close(); }
  if (!pluginConnected) throw new Error("PENPOT_PLUGIN_NOT_CONNECTED:\nAbra o Plugin Penpot MCP no Penpot e clique em Connect.");
  if (!liveDocumentRead) throw new Error("LIVE_PENPOT_DOCUMENT_READ_FAILED");
  return { before, ready, started, pluginConnected, liveDocumentRead, preflight: { PLUGIN_SERVER_4400: "PASS", MCP_4401: "PASS", WEBSOCKET_4402: "PASS", PLUGIN_CONNECTED: "PASS", LIVE_PENPOT_DOCUMENT_READ: "PASS" } };
}

if (process.argv[1]?.endsWith("duduq-penpot-bootstrap.mjs")) {
  ensurePenpotMcp({ startOnly: process.argv.includes("--start-only") })
    .then(async (result) => { if (process.argv.includes("--start-only")) result.preview = await ensurePreviewServer(); console.log(JSON.stringify(result, null, 2)); })
    .catch((error) => { console.error(error.message); process.exitCode = 2; });
}
