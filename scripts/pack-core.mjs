#!/usr/bin/env node
// Packs dist-core/package/ (built by npm run build:core) into a tarball
// named by the commit hash the package was built from (story.md
// "Packaging"), rather than npm's own name-and-version filename.

import { execFileSync } from "node:child_process";
import { readFileSync, renameSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const distCore = path.join(repoRoot, "dist-core");
const packageDir = path.join(distCore, "package");

const packageJson = JSON.parse(
  readFileSync(path.join(packageDir, "package.json"), "utf8"),
);
const hashMatch = /^0\.0\.0-(.+)$/.exec(packageJson.version);
if (!hashMatch) {
  console.error(
    `dist-core/package/package.json's version "${packageJson.version}" is ` +
      "not of the form 0.0.0-<hash>; run npm run build:core first.",
  );
  process.exit(1);
}
const hash = hashMatch[1];

const packOutput = execFileSync(
  "npm",
  ["pack", packageDir, "--pack-destination", distCore, "--json"],
  { encoding: "utf8", cwd: repoRoot },
);
const [{ filename }] = JSON.parse(packOutput);

const target = path.join(distCore, `core-${hash}.tgz`);
renameSync(path.join(distCore, filename), target);
console.log(`Packed ${target}`);
