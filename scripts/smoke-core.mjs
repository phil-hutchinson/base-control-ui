#!/usr/bin/env node
// Smoke-tests a packed core tarball in plain Node 22: installs it into an
// empty folder outside the repository, plays the pinned game
// (src/core/stateHash.test.ts) once with
// seededRandom and once replayed per call with recordedRandom, checking
// both reach the pinned hash, then type-checks a one-line consumer against
// the published declarations with the repository's own tsc under Node's
// `nodenext` module resolution. No Vite and no test framework are involved
// in either check.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const consumerTsconfig = {
  compilerOptions: {
    module: "nodenext",
    moduleResolution: "nodenext",
    target: "ES2022",
    strict: true,
    skipLibCheck: false,
    noEmit: true,
  },
  include: ["consumer.ts"],
};

const consumerSource = `import { CORE_BUILD } from "base-control-core";
console.log(CORE_BUILD);
`;

/**
 * Written into the temporary project and run with plain Node: imports the
 * installed package by name, then plays the same pinned game as
 * src/core/stateHash.test.ts, once with seededRandom and once replayed per
 * call from the recorded draws with recordedRandom, checking both reach
 * the same pinned hash as the unit test. A deliberate change to that hash
 * must edit both.
 */
const runScript = `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CORE_BUILD,
  applyPly,
  parsePly,
  recordedRandom,
  seededRandom,
  stateHash,
  startGame,
} from "base-control-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const installedPackage = JSON.parse(
  readFileSync(
    path.join(here, "node_modules", "base-control-core", "package.json"),
    "utf8",
  ),
);
const expectedBuild = installedPackage.version.replace(/^0\\.0\\.0-/, "");
assert.equal(
  CORE_BUILD,
  expectedBuild,
  \`CORE_BUILD "\${CORE_BUILD}" does not match installed package version "\${installedPackage.version}"\`,
);

const PINNED_SETUP = {
  playstyle: "steal",
  rounds: 30,
  fleetSize: 5,
  chargedNodes: 4,
  combat: false,
  scoring: "bonus",
  planetBonus: "off",
  planetActivity: "race",
  playerMatching: "required",
  artwork: [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8],
};
const PINNED_SEED = 20240614;
const PINNED_PLIES = [
  "1: H15J13",
  "2: L15N13",
  "3: J13L15",
  "4: N13L11",
  "5: O10M12",
  "6: O6M8",
  "7: M12O14",
  "8: M8O10",
];
const PINNED_HASH = "92eca44a0af5bd46";

function playWithSeededRandom() {
  const random = seededRandom(PINNED_SEED);
  const started = startGame(PINNED_SETUP, random);
  let state = started.state;
  const callDraws = [started.draws];
  for (const plyText of PINNED_PLIES) {
    const parsed = parsePly(plyText);
    assert.equal(parsed.ok, true, \`expected \${plyText} to parse\`);
    const applied = applyPly(state, parsed.plyNumber, parsed.ply, random);
    assert.equal(
      applied.outcome,
      "applied",
      \`expected \${plyText} to apply, got \${JSON.stringify(applied)}\`,
    );
    state = applied.state;
    callDraws.push(applied.draws);
  }
  return { state, callDraws };
}

function replayWithRecordedRandom(callDraws) {
  let callIndex = 0;
  const started = startGame(
    PINNED_SETUP,
    recordedRandom(callDraws[callIndex++]),
  );
  let state = started.state;
  for (const plyText of PINNED_PLIES) {
    const parsed = parsePly(plyText);
    const applied = applyPly(
      state,
      parsed.plyNumber,
      parsed.ply,
      recordedRandom(callDraws[callIndex++]),
    );
    state = applied.state;
  }
  return state;
}

const { state: seededState, callDraws } = playWithSeededRandom();
const seededHash = stateHash(seededState);
assert.equal(seededHash, PINNED_HASH, "pinned game did not reach the pinned hash");

const recordedState = replayWithRecordedRandom(callDraws);
assert.equal(
  stateHash(recordedState),
  PINNED_HASH,
  "recorded replay did not reach the pinned hash",
);

console.log(
  \`CORE_BUILD: \${CORE_BUILD} (matches installed package version \${installedPackage.version})\`,
);
console.log(\`pinned hash: \${seededHash}\`);
`;

function main() {
  const tarballArgument = process.argv[2];
  if (!tarballArgument) {
    console.error("usage: node scripts/smoke-core.mjs <path-to-tarball>");
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const tarballPath = path.resolve(repoRoot, tarballArgument);
  const tscBin = path.join(repoRoot, "node_modules", ".bin", "tsc");

  const projectDir = mkdtempSync(
    path.join(tmpdir(), "base-control-core-smoke-"),
  );

  try {
    writeFileSync(
      path.join(projectDir, "package.json"),
      `${JSON.stringify(
        { name: "core-smoke", private: true, type: "module" },
        null,
        2,
      )}\n`,
    );

    execFileSync(
      "npm",
      ["install", tarballPath, "--no-save", "--no-audit", "--no-fund"],
      { cwd: projectDir, stdio: "inherit" },
    );

    writeFileSync(path.join(projectDir, "run.mjs"), runScript);
    execFileSync(process.execPath, [path.join(projectDir, "run.mjs")], {
      cwd: projectDir,
      stdio: "inherit",
    });

    writeFileSync(path.join(projectDir, "consumer.ts"), consumerSource);
    writeFileSync(
      path.join(projectDir, "tsconfig.json"),
      `${JSON.stringify(consumerTsconfig, null, 2)}\n`,
    );
    execFileSync(
      tscBin,
      ["--project", path.join(projectDir, "tsconfig.json")],
      { cwd: projectDir, stdio: "inherit" },
    );

    console.log("Core smoke test passed.");
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
}

main();
