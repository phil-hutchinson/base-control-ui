// Checks that src/core/index.ts exports exactly the agreed runtime names
// (story.md "The core's entry point") - no more, no less. Types are erased
// at runtime and so are not part of this list; they are exercised by the
// type-checked uses throughout the other core tests.

import { describe, expect, it } from "vitest";
import * as core from "./index";

const EXPECTED_RUNTIME_EXPORTS = [
  "CORE_BUILD",
  "RULES_VERSION",
  "parseSetup",
  "startGame",
  "freshSeed",
  "seededRandom",
  "recordedRandom",
  "DesyncError",
  "parsePly",
  "formatPly",
  "applyPly",
  "toMove",
  "result",
  "stateHash",
  "canonicalState",
];

describe("the core's entry point", () => {
  it("exports exactly the agreed runtime names", () => {
    expect(new Set(Object.keys(core))).toEqual(
      new Set(EXPECTED_RUNTIME_EXPORTS),
    );
  });
});
