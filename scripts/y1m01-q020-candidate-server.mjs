#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const workspace = process.cwd();
const root = path.resolve(workspace, "dist-pages");
const contentPath = path.resolve(workspace, "content/english/year-1/module-01/questions.json");
const port = Number(process.env.DUDUQ_Q020_QA_PORT || 4177);
const overrideUrl = "/content/english/year-1/module-01/questions.json";
const mime = new Map([[".html","text/html; charset=utf-8"],[".js","text/javascript; charset=utf-8"],[".css","text/css; charset=utf-8"],[".json","application/json; charset=utf-8"],[".svg","image/svg+xml"],[".png","image/png"],[".jpg","image/jpeg"],[".jpeg","image/jpeg"],[".mp3","audio/mpeg"],[".wav","audio/wav"],[".woff2","font/woff2"]]);
const questionBytes = await fs.readFile(contentPath);
const contentHash = createHash("sha256").update(questionBytes).digest("hex");

function resolveRequestPath(url) {
  let decoded;
  try { decoded = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname); }
  catch { return null; }
  const requestPath = decoded.endsWith("/") ? `${decoded}index.html` : decoded;
  const resolved = path.resolve(root, `.${requestPath}`);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return;
  }
  if (req.url === "/__qa/status") {
    const body = Buffer.from(JSON.stringify({ status: "ready", mode: "isolated-content-override", port, productionFilesWritten: false, questionRevisionSha256: contentHash }));
    res.writeHead(200, { "Content-Type": mime.get(".json"), "Cache-Control": "no-store", "X-Duduq-QA-Content-SHA256": contentHash });
    res.end(req.method === "HEAD" ? undefined : body); return;
  }
  const requestPath = new URL(req.url, "http://127.0.0.1").pathname;
  const override = decodeURIComponent(requestPath) === overrideUrl;
  const filePath = override ? contentPath : resolveRequestPath(req.url);
  if (!filePath) { res.writeHead(403); res.end("Forbidden"); return; }
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) { res.writeHead(404); res.end("Not Found"); return; }
    const bytes = await fs.readFile(filePath);
    const headers = { "Content-Type": mime.get(path.extname(filePath).toLowerCase()) || "application/octet-stream", "Cache-Control": "no-store", "Content-Length": bytes.length };
    if (override) headers["X-Duduq-QA-Content-SHA256"] = contentHash;
    res.writeHead(200, headers);
    console.log(JSON.stringify({ method: req.method, path: requestPath, status: 200, source: override ? "canonical-content-candidate" : "dist-pages" }));
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 500;
    console.log(JSON.stringify({ method: req.method, path: requestPath, status }));
    res.writeHead(status, { "Cache-Control": "no-store" }); res.end(status === 404 ? "Not Found" : "Server Error");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Y1M01 content-candidate QA at http://127.0.0.1:${port}; override=${contentHash}`));
