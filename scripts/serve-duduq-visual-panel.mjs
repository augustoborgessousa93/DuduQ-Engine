import http from 'node:http';
import path from 'node:path';
import { createReadStream, promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../artifacts/qa-final-closeout/visual-panel');
const host = '127.0.0.1';
const port = Number(process.env.DUDUQ_PANEL_PORT || 8891);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
]);

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const raw = new URL(req.url || '/', `http://${host}:${port}`).pathname;
    const decoded = decodeURIComponent(raw);
    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const stat = await fs.stat(target);
    if (!stat.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': mime.get(path.extname(target).toLowerCase()) || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'self' data:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(target).pipe(res);
  } catch (error) {
    const status = error?.code === 'ENOENT' ? 404 : 400;
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' }).end(status === 404 ? 'Not found' : 'Bad request');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`DUDUQ visual panel: http://${host}:${port}/\nServing only: ${root}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
