import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { connectPenpot } from "./penpot-mcp-client.mjs";
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
function detached(command, args, cwd, logName) {
  const logDir = path.join(root, "artifacts");
  fs.mkdirSync(logDir, { recursive: true });
  const out = fs.openSync(path.join(logDir, `${logName}.out.log`), "a");
  const err = fs.openSync(path.join(logDir, `${logName}.err.log`), "a");
  const child = spawn(command, args, { cwd, detached: true, windowsHide: true, stdio: ["ignore", out, err], env: process.env });
  child.unref();
  return child.pid;
}
async function waitReady(check, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { if (await check()) return true; await wait(250); }
  return false;
}

export async function ensurePenpotMcp({ startOnly = false } = {}) {
  const before = { plugin: await httpHealth("http://localhost:4400/manifest.json"), mcp: await httpHealth("http://localhost:4401/mcp"), websocket: await tcpHealth(4402) };
  const started = { plugin: false, mcp: false, websocket: false };
  if (!before.mcp || !before.websocket) {
    detached(process.execPath, [path.join(installation.serverRoot, "dist", "index.js")], installation.serverRoot, "penpot-mcp-server");
    started.mcp = !before.mcp;
    started.websocket = !before.websocket;
  }
  if (!before.plugin) {
    const vite = path.join(installation.pluginRoot, "node_modules", "vite", "bin", "vite.js");
    detached(process.execPath, [vite, "preview", "--host", "localhost", "--port", "4400"], installation.pluginRoot, "penpot-mcp-plugin");
    started.plugin = true;
  }
  const ready = {
    plugin: await waitReady(() => httpHealth("http://localhost:4400/manifest.json")),
    mcp: await waitReady(() => httpHealth("http://localhost:4401/mcp")),
    websocket: await waitReady(() => tcpHealth(4402))
  };
  if (!ready.plugin || !ready.mcp || !ready.websocket) throw new Error("PENPOT_MCP_SERVICES_NOT_READY");
  if (startOnly) return { before, ready, started, pluginConnected: null };
  let pluginConnected = false;
  const mcp = await connectPenpot();
  try {
    const result = await mcp.execute("return {ok:true};");
    pluginConnected = Boolean(result?.content?.some((item) => item.type === "text" && item.text.includes('"ok": true')));
  } catch (error) {
    if (/No Penpot plugin instances|plugin.*connected/i.test(String(error.message))) throw new Error("PENPOT_PLUGIN_NOT_CONNECTED:\nAbra o Plugin Penpot MCP no Penpot e clique em Connect.");
    throw error;
  } finally { await mcp.close(); }
  if (!pluginConnected) throw new Error("PENPOT_PLUGIN_NOT_CONNECTED:\nAbra o Plugin Penpot MCP no Penpot e clique em Connect.");
  return { before, ready, started, pluginConnected };
}

if (process.argv[1]?.endsWith("duduq-penpot-bootstrap.mjs")) {
  ensurePenpotMcp({ startOnly: process.argv.includes("--start-only") })
    .then(async (result) => { if (process.argv.includes("--start-only")) result.preview = await ensurePreviewServer(); console.log(JSON.stringify(result, null, 2)); })
    .catch((error) => { console.error(error.message); process.exitCode = 2; });
}
