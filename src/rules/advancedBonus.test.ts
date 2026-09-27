import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ADVANCED_BONUS_KINDS,
  type AdvancedBonusKind,
  advancedBonusPoints,
  dealAdvancedBonuses,
  drawAdvancedBonusKind,
  drawAdvancedBonusPlanet,
  isAdvancedBonusKindAvailable,
} from "./advancedBonus";
import { squareName } from "./board";
import type { NodeStatus } from "./gameState";
import { CHARGED_NODE_COUNTS, type ChargedNodeCount } from "./nodes";
import { PLANETS } from "./planets";
import { PLAYER_MATCHING_SETTINGS } from "./playerMatching";
import { mulberry32 } from "./random";
import { SCORING_SETTINGS } from "./scoring";

const NO_NODES: Readonly<Record<string, NodeStatus>> = {};

/** A node map for `nodeCount` signals, each already carrying an extra. */
function everyNodeWithExtra(
  nodeCount: ChargedNodeCount,
): Readonly<Record<string, NodeStatus>> {
  const nodes: Record<string, NodeStatus> = {};
  PLANETS.slice(0, nodeCount).forEach((square, signal) => {
    nodes[squareName(square)] = {
      state: "prospective",
      level: 0,
      signal: signal as NodeStatus["signal"],
      extra: true,
    };
  });
  return nodes;
}

describe("the six advanced bonus kinds (steal.md §10)", () => {
  it("are, in table order, the six named kinds", () => {
    expect(ADVANCED_BONUS_KINDS).toEqual([
      "small-points",
      "medium-points",
      "large-points",
      "fuel",
      "additional-nodes",
      "node-scramble",
    ]);
  });
});

describe("isAdvancedBonusKindAvailable (steal.md §10)", () => {
  it("is always available for every kind but additional nodes", () => {
    for (const kind of ADVANCED_BONUS_KINDS) {
      if (kind === "additional-nodes") {
        continue;
      }
      expect(isAdvancedBonusKindAvailable(kind, NO_NODES, 3)).toBe(true);
      expect(isAdvancedBonusKindAvailable(kind, everyNodeWithExtra(3), 3)).toBe(
        true,
      );
    }
  });

  it("makes additional nodes unavailable exactly when every node already has an extra", () => {
    expect(isAdvancedBonusKindAvailable("additional-nodes", NO_NODES, 3)).toBe(
      true,
    );
    expect(
      isAdvancedBonusKindAvailable(
        "additional-nodes",
        everyNodeWithExtra(3),
        3,
      ),
    ).toBe(false);
  });
});

describe("drawAdvancedBonusKind (steal.md §10, D6)", () => {
  it("advances the seed by exactly one mulberry32 step", () => {
    const [, nextSeed] = drawAdvancedBonusKind(777, NO_NODES, 4);
    const [, expectedSeed] = mulberry32(777);
    expect(nextSeed).toBe(expectedSeed);
  });

  it("never draws an excluded kind, over many seeds", () => {
    const excluded = new Set<AdvancedBonusKind>(["large-points", "fuel"]);
    let seed = 12345;
    for (let i = 0; i < 500; i++) {
      const [kind, nextSeed] = drawAdvancedBonusKind(
        seed,
        NO_NODES,
        5,
        excluded,
      );
      expect(excluded.has(kind)).toBe(false);
      seed = nextSeed;
    }
  });

  it("never draws additional nodes once every node has its extra", () => {
    const everyExtra = everyNodeWithExtra(3);
    let seed = 54321;
    for (let i = 0; i < 500; i++) {
      const [kind, nextSeed] = drawAdvancedBonusKind(seed, everyExtra, 3);
      expect(kind).not.toBe("additional-nodes");
      seed = nextSeed;
    }
  });

  it("draws each kind with a frequency close to its share of the weights, over a large sample", () => {
    const counts: Record<AdvancedBonusKind, number> = {
      "small-points": 0,
      "medium-points": 0,
      "large-points": 0,
      fuel: 0,
      "additional-nodes": 0,
      "node-scramble": 0,
    };
    const sampleSize = 20000;
    let seed = 999;
    for (let i = 0; i < sampleSize; i++) {
      const [kind, nextSeed] = drawAdvancedBonusKind(seed, NO_NODES, 5);
      counts[kind]++;
      seed = nextSeed;
    }

    const expectedShare: Record<AdvancedBonusKind, number> = {
      "small-points": 30 / 126,
      "medium-points": 40 / 126,
      "large-points": 20 / 126,
      fuel: 16 / 126,
      "additional-nodes": 10 / 126,
      "node-scramble": 10 / 126,
    };

    for (const kind of ADVANCED_BONUS_KINDS) {
      const observed = counts[kind] / sampleSize;
      expect(observed).toBeGreaterThan(expectedShare[kind] - 0.03);
      expect(observed).toBeLessThan(expectedShare[kind] + 0.03);
    }
  });
});

describe("drawAdvancedBonusPlanet (steal.md §10)", () => {
  it("draws uniformly from the given list and advances the seed by one step", () => {
    const [square, nextSeed] = drawAdvancedBonusPlanet(42, PLANETS);
    expect(PLANETS.some((p) => squareName(p) === squareName(square))).toBe(
      true,
    );
    const [, expectedSeed] = mulberry32(42);
    expect(nextSeed).toBe(expectedSeed);
  });

  it("draws every planet in a single-element list", () => {
    const [square] = drawAdvancedBonusPlanet(1, [PLANETS[5]]);
    expect(squareName(square)).toBe(squareName(PLANETS[5]));
  });
});

describe("advancedBonusPoints (steal.md §10)", () => {
  it("pays the table's spot amounts", () => {
    expect(advancedBonusPoints(3, "off", "simple", "small")).toBe(2);
    expect(advancedBonusPoints(3, "off", "bonus", "large")).toBe(8);
    expect(advancedBonusPoints(4, "double", "bonus", "medium")).toBe(8);
    expect(advancedBonusPoints(5, "required", "simple", "large")).toBe(6);
    expect(advancedBonusPoints(5, "double", "bonus", "large")).toBe(15);
  });
});

describe("the point table mirrors steal.md §10 (D12)", () => {
  it("agrees with the code for all 18 node-count/matching/scoring cells", () => {
    const stealMdPath = fileURLToPath(
      new URL("../../doc/ruleset/steal.md", import.meta.url),
    );
    const stealMdText = readFileSync(stealMdPath, "utf-8");
    const rowPattern =
      /\|\s*(\d)\s*\|\s*(off|double|required)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\|/g;

    const rows: {
      nodes: ChargedNodeCount;
      matching: "off" | "double" | "required";
      simple: [number, number, number];
      bonus: [number, number, number];
    }[] = [];
    let match: RegExpExecArray | null;
    while ((match = rowPattern.exec(stealMdText)) !== null) {
      rows.push({
        nodes: Number(match[1]) as ChargedNodeCount,
        matching: match[2] as "off" | "double" | "required",
        simple: [Number(match[3]), Number(match[4]), Number(match[5])],
        bonus: [Number(match[6]), Number(match[7]), Number(match[8])],
      });
    }

    expect(rows).toHaveLength(
      CHARGED_NODE_COUNTS.length * PLAYER_MATCHING_SETTINGS.length,
    );

    for (const row of rows) {
      const [smallSimple, mediumSimple, largeSimple] = row.simple;
      const [smallBonus, mediumBonus, largeBonus] = row.bonus;
      expect(
        advancedBonusPoints(row.nodes, row.matching, "simple", "small"),
      ).toBe(smallSimple);
      expect(
        advancedBonusPoints(row.nodes, row.matching, "simple", "medium"),
      ).toBe(mediumSimple);
      expect(
        advancedBonusPoints(row.nodes, row.matching, "simple", "large"),
      ).toBe(largeSimple);
      expect(
        advancedBonusPoints(row.nodes, row.matching, "bonus", "small"),
      ).toBe(smallBonus);
      expect(
        advancedBonusPoints(row.nodes, row.matching, "bonus", "medium"),
      ).toBe(mediumBonus);
      expect(
        advancedBonusPoints(row.nodes, row.matching, "bonus", "large"),
      ).toBe(largeBonus);
    }

    for (const nodeCount of CHARGED_NODE_COUNTS) {
      for (const matching of PLAYER_MATCHING_SETTINGS) {
        expect(
          rows.some(
            (row) => row.nodes === nodeCount && row.matching === matching,
          ),
        ).toBe(true);
      }
    }
  });

  for (const scoring of SCORING_SETTINGS) {
    it(`covers every ${scoring} scoring cell without throwing`, () => {
      for (const nodeCount of CHARGED_NODE_COUNTS) {
        for (const matching of PLAYER_MATCHING_SETTINGS) {
          for (const size of ["small", "medium", "large"] as const) {
            expect(() =>
              advancedBonusPoints(nodeCount, matching, scoring, size),
            ).not.toThrow();
          }
        }
      }
    });
  }
});

describe("dealAdvancedBonuses (steal.md §10, D4)", () => {
  it("deals two distinct planets, of two distinct kinds, both from the twelve planets", () => {
    const [[first, second]] = dealAdvancedBonuses(NO_NODES, 4, 2024);

    expect(squareName(first.square)).not.toBe(squareName(second.square));
    expect(first.kind).not.toBe(second.kind);
    for (const entry of [first, second]) {
      expect(
        PLANETS.some((p) => squareName(p) === squareName(entry.square)),
      ).toBe(true);
    }
  });

  it("consumes exactly four seed steps", () => {
    const [, nextSeed] = dealAdvancedBonuses(NO_NODES, 4, 2024);
    let expectedSeed = 2024;
    for (let step = 0; step < 4; step++) {
      [, expectedSeed] = mulberry32(expectedSeed);
    }
    expect(nextSeed).toBe(expectedSeed);
  });

  it("is deterministic for a seed, and differs for a different seed", () => {
    const [firstBonuses] = dealAdvancedBonuses(NO_NODES, 4, 555);
    const [secondBonuses] = dealAdvancedBonuses(NO_NODES, 4, 555);
    const [thirdBonuses] = dealAdvancedBonuses(NO_NODES, 4, 556);

    expect(secondBonuses).toEqual(firstBonuses);
    expect(thirdBonuses).not.toEqual(firstBonuses);
  });
});
