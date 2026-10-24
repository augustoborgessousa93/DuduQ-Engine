import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const host = "127.0.0.1";
const port = 4199;
const root = path.resolve("artifacts/qa-1024x559-final");
const allowed = new Set(["ddm", "grouping", "matching"]);
const server = http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "http://127.0.0.1:4187");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  const match = req.url?.match(/^\/capture\/(ddm|grouping|matching)\/(initial|incorrect|correct|candidate)\.(png|jpg)$/);
  if (req.method !== "POST" || !match || !allowed.has(match[1])) {
    res.writeHead(404).end("Not found");
    return;
  }
  const extension = match[3];
  const expectedType = extension === "jpg" ? "image/jpeg" : "image/png";
  if (!String(req.headers["content-type"] || "").startsWith(expectedType)) {
    res.writeHead(415).end(`${expectedType} required`);
    return;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5_000_000) {
      res.writeHead(413).end("Image too large");
      return;
    }
    chunks.push(chunk);
  }
  const dir = path.join(root, match[1]);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, match[2] + "." + extension);
  await fs.writeFile(file, Buffer.concat(chunks), { flag: "w" });
  res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ saved: path.relative(process.cwd(), file), bytes: size }));
});
server.listen(port, host, () => console.log(`Screenshot sink ready at http://${host}:${port}`));
