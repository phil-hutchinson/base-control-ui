#!/usr/bin/env node
// Builds the core package into dist-core/package/ (story.md "Packaging"):
// type declarations from tsconfig.core.json, rewritten to resolve under
// Node's `nodenext` module resolution, an ES module bundled by Vite with
// CORE_BUILD substituted for the commit the package is built from, and a
// generated package.json. Refuses on a dirty working tree, so a package
// can never claim a commit it was not built from.

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const distCore = path.join(repoRoot, "dist-core");
const packageDir = path.join(distCore, "package");
const typesDir = path.join(packageDir, "types");

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", cwd: repoRoot });
}

function refuseIfDirty() {
  const status = run("git", ["status", "--porcelain"]);
  if (status.trim() !== "") {
    console.error(
      "build:core refuses to run on a dirty working tree: commit or " +
        "stash every change first, so the package can only ever claim a " +
        "commit it was actually built from.",
    );
    process.exit(1);
  }
}

function commitHash() {
  return run("git", ["rev-parse", "--short=7", "HEAD"]).trim();
}

/**
 * Rewrites every extensionless relative import/export specifier in `.d.ts`
 * files under `dir` to end in `.js`. The source's own relative imports are
 * extensionless (bundler resolution), which a consumer compiling with
 * Node's `nodenext` resolution cannot follow inside a declaration file.
 */
function rewriteDeclarationSpecifiers(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteDeclarationSpecifiers(entryPath);
      continue;
    }
    if (!entry.name.endsWith(".d.ts")) {
      continue;
    }
    const original = readFileSync(entryPath, "utf8");
    const rewritten = original.replace(
      /from "(\.[^"]*)"/g,
      (match, specifier) =>
        /\.[a-zA-Z]+$/.test(specifier) ? match : `from "${specifier}.js"`,
    );
    if (rewritten !== original) {
      writeFileSync(entryPath, rewritten);
    }
  }
}

function emitDeclarations() {
  const tsc = path.join(repoRoot, "node_modules", ".bin", "tsc");
  run(tsc, [
    "--project",
    "tsconfig.core.json",
    "--noEmit",
    "false",
    "--declaration",
    "true",
    "--emitDeclarationOnly",
    "true",
    "--outDir",
    typesDir,
  ]);
  rewriteDeclarationSpecifiers(typesDir);
}

async function bundleModule(hash) {
  const { build } = await import("vite");
  process.env.CORE_BUILD_HASH = hash;
  await build({ configFile: path.join(repoRoot, "vite.core.config.ts") });
}

function writePackageJson(hash) {
  const packageJson = {
    name: "base-control-core",
    version: `0.0.0-${hash}`,
    type: "module",
    exports: {
      ".": {
        types: "./types/core/index.d.ts",
        import: "./index.js",
      },
    },
    engines: { node: ">=22" },
  };
  writeFileSync(
    path.join(packageDir, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
}

refuseIfDirty();
const hash = commitHash();
rmSync(distCore, { recursive: true, force: true });
mkdirSync(packageDir, { recursive: true });
emitDeclarations();
await bundleModule(hash);
writePackageJson(hash);
console.log(`Built base-control-core 0.0.0-${hash} into ${packageDir}`);
