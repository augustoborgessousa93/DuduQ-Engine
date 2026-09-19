#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";

const host = "127.0.0.1";
const port = 4175;
const urls = [
  `http://${host}:${port}/test/matching/gold-master-candidate-v1/index.html`,
  `http://${host}:${port}/test/target-shooter/gold-master-clean-v2/index.html`,
  `http://${host}:${port}/test/drag-drop/gold-master-candidate-v1/index.html`
];

function ping() {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: "/", timeout: 600 }, (res) => {
      res.resume(); resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

if (!(await ping())) {
  const child = spawn(process.execPath, ["scripts/duduq-test-server.mjs"], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
  await new Promise(r => setTimeout(r, 900));
}

for (const url of urls) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

console.log(urls.join("\n"));
