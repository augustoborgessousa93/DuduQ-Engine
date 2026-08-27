import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const OUTPUT_DIR = path.resolve("test-results/year2-gamification-diversity-rc1/mechanics-regression-rc2");
const FAILURE_FILE = path.join(OUTPUT_DIR, "failure.json");
const CHILD_SCRIPT = path.resolve("test/year2/mechanics-regression-browser-rc2.mjs");
const CHILD_TIMEOUT_MS = 210_000;
const TAIL_LIMIT = 24_000;

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.rm(FAILURE_FILE, { force: true }).catch(() => {});

let lastStage = "startup";
let stdoutTail = "";
let stderrTail = "";
let stdoutPending = "";
let timedOut = false;
let settled = false;

function boundedTail(current, chunk) {
  const next = current + chunk;
  return next.length > TAIL_LIMIT ? next.slice(-TAIL_LIMIT) : next;
}

function inspectStages(chunk) {
  stdoutPending += chunk;
  const lines = stdoutPending.split(/\r?\n/);
  stdoutPending = lines.pop() || "";
  for (const line of lines) {
    const match = line.match(/^\[RC2\]\s+(.+)$/);
    if (match) lastStage = match[1].trim();
  }
}

async function persistFailure({ reason, exitCode = null, signal = null, error = null }) {
  const payload = {
    status: "FAIL",
    contract: "YEAR2_MECHANICS_REGRESSION_RC2_DIAGNOSTIC",
    reason,
    lastStage,
    exitCode,
    signal,
    childTimeoutMs: CHILD_TIMEOUT_MS,
    error: error ? {
      name: error.name || "Error",
      message: error.message || String(error),
      stack: error.stack || null
    } : null,
    stdoutTail,
    stderrTail
  };
  await fs.writeFile(FAILURE_FILE, JSON.stringify(payload, null, 2));
  console.error(`[RC2-DIAGNOSTIC] failure persisted: ${FAILURE_FILE}`);
  console.error(JSON.stringify({
    status: payload.status,
    reason: payload.reason,
    lastStage: payload.lastStage,
    exitCode: payload.exitCode,
    signal: payload.signal
  }, null, 2));
}

const child = spawn(process.execPath, [CHILD_SCRIPT], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"]
});

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  stdoutTail = boundedTail(stdoutTail, chunk);
  inspectStages(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  stderrTail = boundedTail(stderrTail, chunk);
});

const timeout = setTimeout(() => {
  timedOut = true;
  console.error(`[RC2-DIAGNOSTIC] child timeout after ${CHILD_TIMEOUT_MS} ms at stage: ${lastStage}`);
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!settled) child.kill("SIGKILL");
  }, 5_000).unref();
}, CHILD_TIMEOUT_MS);

timeout.unref();

try {
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  settled = true;
  clearTimeout(timeout);

  if (stdoutPending) {
    const match = stdoutPending.match(/^\[RC2\]\s+(.+)$/);
    if (match) lastStage = match[1].trim();
  }

  if (timedOut) {
    await persistFailure({
      reason: "child-timeout",
      exitCode: result.exitCode,
      signal: result.signal
    });
    process.exitCode = 124;
  } else if (result.exitCode !== 0) {
    await persistFailure({
      reason: "child-exit-nonzero",
      exitCode: result.exitCode,
      signal: result.signal
    });
    process.exitCode = result.exitCode || 1;
  } else {
    console.log(JSON.stringify({
      status: "PASS",
      contract: "YEAR2_MECHANICS_REGRESSION_RC2_DIAGNOSTIC",
      lastStage
    }, null, 2));
  }
} catch (error) {
  settled = true;
  clearTimeout(timeout);
  await persistFailure({ reason: "supervisor-error", error });
  process.exitCode = 1;
}
