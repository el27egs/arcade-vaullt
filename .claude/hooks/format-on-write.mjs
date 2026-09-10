#!/usr/bin/env node
// PostToolUse hook (Write | Edit): runs Prettier, and ESLint --fix for
// JS/TS files, on whatever file Claude just created or edited. Scoped to
// Arcade Vault via .claude/settings.json — never exits non-zero, so it
// never blocks the tool call that triggered it.

import { existsSync } from "node:fs";
import { extname } from "node:path";
import { spawnSync } from "node:child_process";

const ESLINT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

function readStdin() {
  const chunks = [];
  return new Promise((resolve) => {
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
  });
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: ["ignore", "inherit", "inherit"] });
  if (result.error) {
    console.error(`[format-on-write] failed to run ${command}: ${result.error.message}`);
  }
}

const raw = await readStdin();

let filePath;
try {
  const payload = JSON.parse(raw);
  filePath = payload?.tool_input?.file_path;
} catch {
  process.exit(0);
}

if (!filePath || !existsSync(filePath)) {
  process.exit(0);
}

run("npx", ["prettier", "--write", "--ignore-unknown", filePath]);

if (ESLINT_EXTENSIONS.has(extname(filePath))) {
  run("npx", ["eslint", "--fix", filePath]);
}

process.exit(0);
