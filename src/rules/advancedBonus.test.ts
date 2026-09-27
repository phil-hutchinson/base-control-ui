import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ADVANCED_BONUS_KINDS,
  type AdvancedBonusEntry,
  type AdvancedBonusKind,
  advancedBonusPoints,
  dealAdvancedBonuses,
  drawAdvancedBonusKind,
  drawAdvancedBonusPlanet,
  isAdvancedBonusKindAvailable,
  resolveAdvancedBonusClaim,
} from "./advancedBonus";
import { type Square, squareFromName, squareName } from "./board";
import type { NodeStatus, Ship } from "./gameState";
import { CHARGED_NODE_COUNTS, type ChargedNodeCount } from "./nodes";
import { PLANETS } from "./planets";
import { PLAYER_MATCHING_SETTINGS } from "./playerMatching";
import { MAX_POWER, type PowerLevel } from "./power";
import { mulberry32 } from "./random";
import { SCORING_SETTINGS } from "./scoring";

function ship(
  id: string,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function bonuses(
  first: readonly [Square, AdvancedBonusKind],
  second: readonly [Square, AdvancedBonusKind],
): readonly [AdvancedBonusEntry, AdvancedBonusEntry] {
  return [
    { square: first[0], kind: first[1] },
    { square: second[0], kind: second[1] },
  ];
}

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

describe("drawAdvancedBonusKind (steal.md §10)", () => {
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
    expect(advancedBonusPoints(4, "double", "bonus", "medium")).toBe(10);
    expect(advancedBonusPoints(5, "required", "simple", "large")).toBe(6);
    expect(advancedBonusPoints(5, "double", "bonus", "large")).toBe(15);
  });
});

describe("the point table mirrors steal.md §10", () => {
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

describe("dealAdvancedBonuses (steal.md §10)", () => {
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

describe("resolveAdvancedBonusClaim (steal.md §10)", () => {
  const [claimedPlanet, survivorPlanet] = PLANETS;

  function stateFor(config: {
    readonly kind: AdvancedBonusKind;
    readonly survivorKind?: AdvancedBonusKind;
    readonly nodes?: Readonly<Record<string, NodeStatus>>;
    readonly ships?: readonly Ship[];
    readonly playerMatching?: "off" | "double" | "required";
    readonly scoring?: "simple" | "bonus";
    readonly randomSeed?: number;
  }) {
    return {
      nodes: config.nodes ?? NO_NODES,
      ships: config.ships ?? [
        ship("green-1", "green", squareName(claimedPlanet)),
      ],
      advancedBonuses: bonuses(
        [claimedPlanet, config.kind],
        [survivorPlanet, config.survivorKind ?? "medium-points"],
      ),
      chargedNodeCount: 3 as ChargedNodeCount,
      playerMatching: config.playerMatching ?? "off",
      scoring: config.scoring ?? "simple",
      randomSeed: config.randomSeed ?? 4242,
    };
  }

  it("throws when the landed planet carries neither current bonus", () => {
    const state = stateFor({ kind: "small-points" });
    expect(() => resolveAdvancedBonusClaim(state, "green", PLANETS[5])).toThrow(
      RangeError,
    );
  });

  it("a points kind reports the table's amount and leaves nodes and ships untouched", () => {
    const state = stateFor({
      kind: "large-points",
      survivorKind: "fuel",
      playerMatching: "off",
      scoring: "simple",
    });
    const result = resolveAdvancedBonusClaim(state, "green", claimedPlanet);

    expect(result.outcome.kind).toBe("large-points");
    expect(result.outcome.pointsAwarded).toBe(
      advancedBonusPoints(3, "off", "simple", "large"),
    );
    expect(result.outcome.poweredShipIds).toEqual([]);
    expect(result.outcome.addedSquares).toEqual([]);
    expect(result.outcome.removedSquares).toEqual([]);
    expect(result.nodes).toEqual(state.nodes);
    expect(result.ships).toEqual(state.ships);
  });

  it("Fuel raises every one of the claiming side's ships below the maximum by one, and leaves the opponent's untouched", () => {
    const ships: Ship[] = [
      ship("green-1", "green", squareName(claimedPlanet), 3),
      ship("green-2", "green", "A5", MAX_POWER),
      ship("green-3", "green", "B6", 2),
      ship("red-1", "red", "C7", 3),
    ];
    const state = stateFor({ kind: "fuel", ships });
    const result = resolveAdvancedBonusClaim(state, "green", claimedPlanet);

    expect([...result.outcome.poweredShipIds].sort()).toEqual([
      "green-1",
      "green-3",
    ]);
    const byId = new Map(result.ships.map((s) => [s.id, s]));
    expect(byId.get("green-1")?.power).toBe(4);
    expect(byId.get("green-2")?.power).toBe(MAX_POWER);
    expect(byId.get("green-3")?.power).toBe(3);
    expect(byId.get("red-1")?.power).toBe(3);
    expect(result.outcome.pointsAwarded).toBe(0);
  });

  it("Additional nodes gives an extra to every node lacking one, and consumes one seed step per square added", () => {
    const nodes: Record<string, NodeStatus> = {
      G8: { state: "prospective", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      C3: { state: "prospective", level: 0, signal: 1, extra: true },
      D4: { state: "prospective", level: 0, signal: 1 },
      F9: { state: "prospective", level: 0, signal: 2 },
      F5: { state: "prospective", level: 0, signal: 2 },
    };
    const state = stateFor({ kind: "additional-nodes", nodes });
    const result = resolveAdvancedBonusClaim(state, "green", claimedPlanet);

    expect(result.outcome.addedSquares).toHaveLength(2);
    for (const signal of [0, 1, 2] as const) {
      const extras = Object.entries(result.nodes).filter(
        ([, status]) => status.signal === signal && status.extra === true,
      );
      expect(extras).toHaveLength(1);
    }
    expect(result.outcome.removedSquares).toEqual([]);
    expect(result.outcome.pointsAwarded).toBe(0);
  });

  it("Node scramble leaves charged squares and extras in place and redraws every ordinary prospective square", () => {
    const nodes: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0, extra: true },
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      F5: { state: "prospective", level: 0, signal: 2 },
      K12: { state: "prospective", level: 0, signal: 2 },
      N2: { state: "prospective", level: 0, signal: 2, extra: true },
    };
    const state = stateFor({ kind: "node-scramble", nodes });
    const result = resolveAdvancedBonusClaim(state, "green", claimedPlanet);

    expect(result.nodes.G8).toEqual(nodes.G8);
    expect(result.nodes.L8).toEqual(nodes.L8);
    expect(result.nodes.N2).toEqual(nodes.N2);
    expect(result.outcome.removedSquares.map(squareName).sort()).toEqual(
      ["C3", "D4", "F5", "H8", "K12"].sort(),
    );
    expect(result.outcome.addedSquares).toHaveLength(5);
    expect(result.outcome.pointsAwarded).toBe(0);
  });

  it("redraws the surviving bonus to a kind other than the one it was, over many seeds", () => {
    for (let seed = 0; seed < 300; seed++) {
      const state = stateFor({
        kind: "small-points",
        survivorKind: "fuel",
        randomSeed: seed,
      });
      const result = resolveAdvancedBonusClaim(state, "green", claimedPlanet);
      expect(result.outcome.survivor.oldKind).toBe("fuel");
      expect(result.outcome.survivor.newKind).not.toBe("fuel");
    }
  });

  it("draws the new bonus a kind other than the survivor's new kind, over many seeds", () => {
    for (let seed = 0; seed < 300; seed++) {
      const state = stateFor({
        kind: "small-points",
        survivorKind: "fuel",
        randomSeed: seed,
      });
      const result = resolveAdvancedBonusClaim(state, "green", claimedPlanet);
      expect(result.outcome.newBonus.kind).not.toBe(
        result.outcome.survivor.newKind,
      );
    }
  });

  it("gives the new bonus a planet neither ship-occupied nor the survivor's own, over many seeds", () => {
    const occupiedPlanet = PLANETS[2];
    for (let seed = 0; seed < 100; seed++) {
      const state = stateFor({
        kind: "small-points",
        ships: [
          ship("green-1", "green", squareName(claimedPlanet)),
          ship("red-1", "red", squareName(occupiedPlanet)),
        ],
        randomSeed: seed,
      });
      const result = resolveAdvancedBonusClaim(state, "green", claimedPlanet);
      expect(squareName(result.outcome.newBonus.square)).not.toBe(
        squareName(survivorPlanet),
      );
      expect(squareName(result.outcome.newBonus.square)).not.toBe(
        squareName(occupiedPlanet),
      );
    }
  });

  it("keeps the survivor in its own slot and puts the new bonus in the claimed slot, whichever slot was claimed", () => {
    const claimedFirst = stateFor({ kind: "small-points" });
    const resultClaimedFirst = resolveAdvancedBonusClaim(
      claimedFirst,
      "green",
      claimedPlanet,
    );
    expect(squareName(resultClaimedFirst.advancedBonuses[0].square)).not.toBe(
      squareName(claimedPlanet),
    );
    expect(squareName(resultClaimedFirst.advancedBonuses[1].square)).toBe(
      squareName(survivorPlanet),
    );

    const claimedSecond = stateFor({ kind: "small-points" });
    const resultClaimedSecond = resolveAdvancedBonusClaim(
      claimedSecond,
      "green",
      survivorPlanet,
    );
    expect(squareName(resultClaimedSecond.advancedBonuses[1].square)).not.toBe(
      squareName(survivorPlanet),
    );
    expect(squareName(resultClaimedSecond.advancedBonuses[0].square)).toBe(
      squareName(claimedPlanet),
    );
  });

  it("is deterministic for a seed, and differs for a different seed", () => {
    const first = resolveAdvancedBonusClaim(
      stateFor({ kind: "small-points", randomSeed: 9 }),
      "green",
      claimedPlanet,
    );
    const second = resolveAdvancedBonusClaim(
      stateFor({ kind: "small-points", randomSeed: 9 }),
      "green",
      claimedPlanet,
    );
    const third = resolveAdvancedBonusClaim(
      stateFor({ kind: "small-points", randomSeed: 10 }),
      "green",
      claimedPlanet,
    );

    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
  });
});
