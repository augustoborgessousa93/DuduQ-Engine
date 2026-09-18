import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const candidateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const workspaceRoot = path.resolve(candidateRoot, "../../../");
const port = Number(process.env.PORT || 4185);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

function resolveFile(url) {
  const pathname = decodeURIComponent((url || "/").split("?")[0]);
  const relative = pathname === "/" ? "test/target-shooter/gold-master-candidate-v1/index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(workspaceRoot, relative);
  return file.startsWith(`${workspaceRoot}${path.sep}`) ? file : null;
}

http.createServer(async (request, response) => {
  const file = resolveFile(request.url);
  if (!file || !["GET", "HEAD"].includes(request.method || "")) { response.writeHead(404); response.end("Not found"); return; }
  try {
    const stat = await fs.stat(file);
    const target = stat.isDirectory() ? path.join(file, "index.html") : file;
    const body = await fs.readFile(target);
    response.writeHead(200, { "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Not found"); }
}).listen(port, "127.0.0.1", () => console.log(`Target Shooter candidate: http://127.0.0.1:${port}/test/target-shooter/gold-master-candidate-v1/`));
