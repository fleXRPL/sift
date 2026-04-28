#!/usr/bin/env node
/**
 * sift — top-level CLI for the Sift clinical intelligence application.
 *
 * Usage:
 *   node sift.mjs <command> [options]
 *   npm start          → run
 *   ./sift.mjs run     → full dev stack
 *
 * Commands:
 *   run     Start backend + frontend + Tauri (with pre-flight checks)
 *   debug   Same as run, but with verbose/debug logging enabled
 *   check   Verify all dependencies and services without starting anything
 *   deps    Install all npm dependencies (root + frontend + backend)
 *   stop    Stop any sift-related processes by port
 *   help    Show this message
 */

import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

// ─── constants ────────────────────────────────────────────────────────────────

const ROOT = resolve(new URL(".", import.meta.url).pathname);
const OLLAMA_BASE = "http://127.0.0.1:11434";
const BACKEND_PORT = Number(process.env.PORT ?? 4000);
const OLLAMA_DEFAULT_MODEL = "llama3.2";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

// ─── helpers ──────────────────────────────────────────────────────────────────

function log(level, msg) {
  const icons = { ok: `${GREEN}✓${RESET}`, warn: `${YELLOW}⚠${RESET}`, fail: `${RED}✗${RESET}`, info: `${CYAN}→${RESET}` };
  console.log(`  ${icons[level] ?? "·"} ${msg}`);
}

function header(text) {
  console.log(`\n${BOLD}${CYAN}${text}${RESET}`);
}

function dim(text) {
  return `${DIM}${text}${RESET}`;
}

function checkCommand(cmd) {
  try {
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function commandVersion(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function fetchJson(url, timeout = 3000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function depsInstalled(dir) {
  return existsSync(join(dir, "node_modules"));
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── check command ────────────────────────────────────────────────────────────

function checkNode(issues) {
  const nodeVer = commandVersion("node --version");
  const nodeMaj = nodeVer ? Number.parseInt(nodeVer.replace("v", ""), 10) : 0;
  if (nodeMaj >= 18) {
    log("ok", `Node.js ${nodeVer}`);
  } else {
    log("fail", `Node.js not found or < 18 (found: ${nodeVer ?? "none"})`);
    issues.push("Node.js 18+ required");
  }
}

function checkRust(issues) {
  const rustVer = commandVersion("rustc --version");
  if (rustVer) {
    log("ok", `Rust: ${rustVer}`);
  } else {
    log("warn", "rustc not found — Tauri host cannot be compiled");
    issues.push("rustc not found");
  }
}

function checkDeps(issues) {
  const depsRoot = depsInstalled(ROOT);
  const depsFront = depsInstalled(join(ROOT, "frontend"));
  const depsBack = depsInstalled(join(ROOT, "backend"));
  if (depsRoot && depsFront && depsBack) {
    log("ok", "npm dependencies installed (root, frontend, backend)");
  } else {
    const missing = [!depsRoot && "root", !depsFront && "frontend", !depsBack && "backend"]
      .filter(Boolean)
      .join(", ");
    log("warn", `npm dependencies missing in: ${missing}`);
    log("info", `Run ${BOLD}node sift.mjs deps${RESET} to install`);
    issues.push(`npm deps missing: ${missing}`);
  }
}

function modelMatchLabel(found, configured) {
  if (found === configured) return "";
  return dim(` (configured: ${configured})`);
}

function modelAvailableList(ids) {
  const preview = ids.slice(0, 6).join(", ");
  const extra = ids.length > 6 ? ` +${ids.length - 6} more` : "";
  return `${preview}${extra}`;
}

async function checkOllama(issues) {
  const models = await fetchJson(`${OLLAMA_BASE}/v1/models`);
  if (!models?.data) {
    log("fail", `Ollama not reachable at ${OLLAMA_BASE}`);
    log("info", `Start Ollama Desktop or: ${BOLD}ollama serve${RESET}`);
    issues.push("Ollama not running");
    return { ollamaOk: false, modelOk: false };
  }

  const ids = models.data.map((m) => m.id);
  log("ok", `Ollama reachable at ${OLLAMA_BASE} — ${ids.length} model(s) available`);

  const configured = process.env.SIFT_LLM_MODEL ?? OLLAMA_DEFAULT_MODEL;
  const exact = ids.find((id) => id === configured);
  const partial = ids.find((id) => id.startsWith(configured.split(":")[0]));
  const found = exact ?? partial;

  if (found) {
    log("ok", `Model available: ${BOLD}${found}${RESET}${modelMatchLabel(found, configured)}`);
    return { ollamaOk: true, modelOk: true };
  }

  log("warn", `Model ${BOLD}${configured}${RESET} not found in Ollama`);
  log("info", `Available: ${modelAvailableList(ids)}`);
  log("info", `Run: ${BOLD}ollama pull ${configured}${RESET}  or change model in Settings`);
  issues.push(`Model "${configured}" not in Ollama`);
  return { ollamaOk: true, modelOk: false };
}

async function runCheck(opts = {}) {
  const { quiet = false } = opts;
  const issues = [];

  if (!quiet) header("Pre-flight checks");

  checkNode(issues);
  checkRust(issues);
  checkDeps(issues);
  const { ollamaOk, modelOk } = await checkOllama(issues);

  // Summary
  if (!quiet) {
    console.log("");
    if (issues.length === 0) {
      console.log(`  ${GREEN}${BOLD}All checks passed.${RESET} Ready to start.\n`);
    } else {
      console.log(`  ${YELLOW}${BOLD}${issues.length} warning(s) / issue(s):${RESET}`);
      issues.forEach((i) => console.log(`    · ${i}`));
      console.log("");
    }
  }

  return { ok: issues.filter((i) => i.startsWith("Node") || i.startsWith("npm")).length === 0, ollamaOk, modelOk, issues };
}

// ─── deps command ─────────────────────────────────────────────────────────────

function runDeps() {
  header("Installing dependencies");
  for (const dir of [ROOT, join(ROOT, "frontend"), join(ROOT, "backend")]) {
    const label = dir === ROOT ? "root" : dir.split("/").at(-1);
    log("info", `npm install — ${label}`);
    const result = spawnSync("npm", ["install"], { cwd: dir, stdio: "inherit", shell: process.platform === "win32" });
    if (result.status !== 0) {
      log("fail", `npm install failed in ${label}`);
      process.exit(1);
    }
    log("ok", `${label} done`);
  }
  console.log(`\n  ${GREEN}${BOLD}All dependencies installed.${RESET}\n`);
}

// ─── stop command ─────────────────────────────────────────────────────────────

function runStop() {
  header("Stopping Sift processes");
  if (process.platform === "win32") {
    log("info", `Killing processes on port ${BACKEND_PORT}`);
    spawnSync("cmd", ["/c", `for /f "tokens=5" %a in ('netstat -aon ^| find ":${BACKEND_PORT}"') do taskkill /f /pid %a`], { stdio: "inherit", shell: true });
  } else {
    for (const port of [BACKEND_PORT, 1420]) {
      const result = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
      const pids = (result.stdout ?? "").trim().split("\n").filter(Boolean);
      if (pids.length) {
        log("info", `Killing PID(s) on :${port} — ${pids.join(", ")}`);
        spawnSync("kill", ["-9", ...pids], { stdio: "inherit" });
        log("ok", `Port ${port} cleared`);
      } else {
        log("info", `Nothing on :${port}`);
      }
    }
  }
  console.log("");
}

// ─── run / debug command ──────────────────────────────────────────────────────

async function runDev(debug = false) {
  console.log(`\n${BOLD}${CYAN}Sift${RESET} — local clinical intelligence\n`);

  const { ok, ollamaOk, modelOk } = await runCheck({ quiet: false });

  if (!ok) {
    console.log(`${RED}${BOLD}Critical dependencies missing. Fix the issues above, then re-run.${RESET}\n`);
    process.exit(1);
  }

  if (!ollamaOk || !modelOk) {
    const configured = process.env.SIFT_LLM_MODEL ?? OLLAMA_DEFAULT_MODEL;
    console.log(`${YELLOW}Warning:${RESET} Ollama or the configured model (${BOLD}${configured}${RESET}) is not ready.`);
    console.log(`         Sift will start but clinical synthesis will use the offline fallback.\n`);

    const answer = await prompt("  Continue anyway? [Y/n] ");
    if (answer.toLowerCase() === "n") {
      console.log("\n  Aborted.\n");
      process.exit(0);
    }
    console.log("");
  }

  header("Starting Sift");

  const env = {
    ...process.env,
    FORCE_COLOR: "1",
  };
  if (debug) {
    env.DEBUG = "sift:*";
    env.RUST_LOG = "debug";
    log("info", "Debug mode enabled (DEBUG=sift:* RUST_LOG=debug)");
  }

  const concurrentlyArgs = [
    "concurrently",
    "--kill-others-on-fail",
    "-n", "backend,ui,tauri",
    "-c", "blue,green,magenta",
    "npm run dev --prefix backend",
    "npm run dev --prefix frontend",
    "npx tauri dev",
  ];

  log("info", "backend  → http://127.0.0.1:4000");
  log("info", "frontend → http://localhost:1420");
  log("info", "tauri    → native window");
  console.log(`\n  ${DIM}Ctrl+C to stop all processes.${RESET}\n`);

  const child = spawn("npx", concurrentlyArgs, {
    cwd: ROOT,
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      child.kill(sig);
    });
  }

  child.on("exit", (code) => {
    console.log(`\n${DIM}Sift processes exited (${code ?? 0}).${RESET}\n`);
    process.exit(code ?? 0);
  });
}

// ─── help ─────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
${BOLD}${CYAN}Sift${RESET} — local clinical intelligence

${BOLD}Usage:${RESET}
  node sift.mjs <command>
  npm start                  shortcut for "run"

${BOLD}Commands:${RESET}
  ${BOLD}run${RESET}      Start backend, frontend, and Tauri desktop app.
           Runs pre-flight checks first (deps, Ollama, model).

  ${BOLD}debug${RESET}    Same as run with verbose logging (DEBUG=sift:* RUST_LOG=debug).

  ${BOLD}check${RESET}    Verify all dependencies and services without starting anything.
           Checks: Node.js, Rust, npm deps, Ollama availability, model.

  ${BOLD}deps${RESET}     Install npm dependencies for root, frontend, and backend.
           Equivalent to running npm install in all three directories.

  ${BOLD}stop${RESET}     Kill any processes running on the Sift ports (4000, 1420).

  ${BOLD}package${RESET}  Compile backend TypeScript and bundle it into a Windows
           standalone executable in src-tauri/binaries/ using pkg.

  ${BOLD}help${RESET}     Show this message.

${BOLD}Ollama:${RESET}
  Sift defaults to ${BOLD}http://127.0.0.1:11434/v1${RESET} (Ollama Desktop / ollama serve).
  Default model: ${BOLD}llama3.2${RESET} — change in Settings or set SIFT_LLM_MODEL.
  Override model for this session:
    ${DIM}SIFT_LLM_MODEL=qwen2.5:14b node sift.mjs run${RESET}
`);
}

// ─── entrypoint ───────────────────────────────────────────────────────────────

const [, , cmd = "help", ...args] = process.argv;

switch (cmd) {
  case "run":
    await runDev(false);
    break;
  case "debug":
    await runDev(true);
    break;
  case "check":
    await runCheck({ quiet: false });
    break;
  case "deps":
    runDeps();
    break;
  case "stop":
    runStop();
    break;
  case "package": {
    header("Packaging backend sidecar");
    let pkgScript;
    if (process.platform === "win32") {
      pkgScript = "package";
    } else if (process.arch === "arm64") {
      pkgScript = "package:mac-arm";
    } else {
      pkgScript = "package:mac-x64";
    }
    log("info", `npm run ${pkgScript} — backend → src-tauri/binaries/`);
    const pkgResult = spawnSync("npm", ["run", pkgScript], {
      cwd: join(ROOT, "backend"),
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (pkgResult.status !== 0) {
      log("fail", "Backend packaging failed");
      process.exit(1);
    }
    log("ok", "Backend binary written to src-tauri/binaries/");
    console.log("");
    break;
  }
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    console.error(`\n  ${RED}Unknown command: ${cmd}${RESET}\n`);
    showHelp();
    process.exit(1);
}
