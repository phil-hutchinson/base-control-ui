import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RULES_VERSION } from "./rulesVersion";

const rulesPath = fileURLToPath(
  new URL("../../doc/ruleset/rules.md", import.meta.url),
);
const changelogPath = fileURLToPath(
  new URL("../../doc/ruleset/changelog.md", import.meta.url),
);

function readRulesVersion(): string {
  const rulesText = readFileSync(rulesPath, "utf-8");
  const match = /\*\*Rules version: (.+)\*\*/.exec(rulesText);
  if (!match) {
    throw new Error("Could not find a rules version line in rules.md");
  }
  return match[1];
}

function changelogHasEntryFor(version: string): boolean {
  const changelogText = readFileSync(changelogPath, "utf-8");
  return new RegExp(`^## ${version} `, "m").test(changelogText);
}

describe("RULES_VERSION", () => {
  it("matches the version stated in rules.md", () => {
    expect(RULES_VERSION).toBe(readRulesVersion());
  });

  it("has a changelog entry", () => {
    expect(changelogHasEntryFor(RULES_VERSION)).toBe(true);
  });
});
