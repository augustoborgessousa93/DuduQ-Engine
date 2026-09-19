#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(process.env.DUDUQ_TEST_PORT || 4175);
const ROOT = process.cwd();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function safePath(urlPath) {
  const raw = decodeURIComponent((urlPath || "/").split("?")[0]);
  const withIndex = raw.endsWith("/") ? raw + "index.html" : raw;
  const resolved = path.resolve(ROOT, "." + withIndex);
  return resolved.startsWith(ROOT) ? resolved : null;
}

const server = http.createServer((req, res) => {
  const file = safePath(req.url);
  if (!file) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  fs.stat(file, (statErr, stat) => {
    let target = file;
    if (!statErr && stat.isDirectory()) target = path.join(file, "index.html");
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(err.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        res.end(err.code === "ENOENT" ? "Not Found" : "Server Error");
        return;
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(data);
    });
  });
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.log(`DUDUQ test server already available on http://${HOST}:${PORT}`);
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`DUDUQ test server: http://${HOST}:${PORT}`);
});
