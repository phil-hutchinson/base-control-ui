import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName, type Square } from "./board";
import { mulberry32 } from "./random";
import {
  DORMANT_RECOVERY_TABLE,
  EMPTY_NODE_DRAIN_TABLE,
  HELD_NODE_DRAIN_TABLE,
  NODE_CAPACITY,
  OPENING_DRAIN_TABLE,
  OPENING_PRESSURE_TABLE,
  PRESSURE_CAP,
  SITES,
  TARGET_CHARGED_SITES,
  type WeightedAmount,
  dealOpeningBoard,
  drawTableAmount,
  siteCyclePosition,
} from "./sites";

const COLUMN_INDEX = new Map(
  COLUMN_LETTERS.map((letter, index) => [letter, index]),
);
const COLUMN_AT = new Map(
  COLUMN_LETTERS.map((letter, index) => [index, letter]),
);

/** The square that mirrors the given one across column H. */
function mirrorAcrossColumnH(square: Square): Square {
  const index = COLUMN_INDEX.get(square.column);
  if (index === undefined) {
    throw new Error(`unknown column ${square.column}`);
  }
  const mirroredColumn = COLUMN_AT.get(14 - index);
  if (mirroredColumn === undefined) {
    throw new Error("mirror across column H left the board");
  }
  return squareAt(mirroredColumn, square.row);
}

/** The square that mirrors the given one across row 8. */
function mirrorAcrossRow8(square: Square): Square {
  return squareAt(square.column, 16 - square.row);
}

describe("sites", () => {
  it("has exactly seventeen sites, no duplicates", () => {
    expect(SITES).toHaveLength(17);
    const names = new Set(SITES.map(squareName));
    expect(names.size).toBe(17);
  });

  it("lies entirely in the interior of the board", () => {
    for (const site of SITES) {
      expect(site.column).not.toBe("A");
      expect(site.column).not.toBe("O");
      expect(site.row).not.toBe(1);
      expect(site.row).not.toBe(15);
    }
  });

  it("is unchanged by a mirror across column H", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossColumnH(site);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("is unchanged by a mirror across row 8", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossRow8(site);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("shares no square with a bay", () => {
    const bayNames = new Set(BAYS.map(squareName));
    for (const site of SITES) {
      expect(bayNames.has(squareName(site))).toBe(false);
    }
  });

  it("matches §3.2's table row by row", () => {
    const expected = [
      "F2",
      "J2",
      "B4",
      "H4",
      "N4",
      "E5",
      "K5",
      "D8",
      "H8",
      "L8",
      "E11",
      "K11",
      "B12",
      "H12",
      "N12",
      "F14",
      "J14",
    ];

    expect(SITES.map(squareName)).toEqual(expected);
  });
});

describe("the board's charged target (rules.md §8.1, §8.2)", () => {
  it("aims to keep five sites charged", () => {
    expect(TARGET_CHARGED_SITES).toBe(5);
  });
});

describe("capacity and pressure cap (rules.md §8.3, §8.2)", () => {
  it("has a node capacity of 60 and a pressure cap of 50", () => {
    expect(NODE_CAPACITY).toBe(60);
    expect(PRESSURE_CAP).toBe(50);
  });
});

/** Every distinct amount a table can draw, in ascending order. */
function amounts(table: readonly WeightedAmount[]): readonly number[] {
  return table.map((entry) => entry.amount);
}

/** The weighted average a table's outcomes and weights predict. */
function expectedAverage(table: readonly WeightedAmount[]): number {
  const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
  return (
    table.reduce((sum, entry) => sum + entry.amount * entry.weight, 0) /
    totalWeight
  );
}

describe.each([
  {
    name: "the opening drain table",
    table: OPENING_DRAIN_TABLE,
    outcomes: [0, 5, 10, 15, 20, 25, 30, 35, 40],
    average: 14,
  },
  {
    name: "the opening pressure table",
    table: OPENING_PRESSURE_TABLE,
    outcomes: [1, 5, 10, 15, 20, 25, 30, 40, 50],
    average: 12.79,
  },
  {
    name: "the empty-node drain table",
    table: EMPTY_NODE_DRAIN_TABLE,
    outcomes: [1, 2, 3],
    average: 2.1,
  },
  {
    name: "the held-node drain table",
    table: HELD_NODE_DRAIN_TABLE,
    outcomes: [3, 4, 5, 6],
    average: 4.6,
  },
  {
    name: "the dormant recovery table",
    table: DORMANT_RECOVERY_TABLE,
    outcomes: [4, 5, 6, 7, 8],
    average: 6.0,
  },
])("$name (rules.md §8.1, §8.2, §8.3)", ({ table, outcomes, average }) => {
  it("has exactly the outcomes the rules table lists", () => {
    expect(amounts(table)).toEqual(outcomes);
  });

  it("has weights that sum to 100", () => {
    const total = table.reduce((sum, entry) => sum + entry.weight, 0);
    expect(total).toBe(100);
  });

  it("has the weighted average the rules table gives", () => {
    expect(expectedAverage(table)).toBeCloseTo(average, 5);
  });

  it("draws only the listed outcomes, at frequencies close to their weights", () => {
    const DRAWS = 20_000;
    const counts = new Map<number, number>(outcomes.map((o) => [o, 0]));
    let seed = 7;
    for (let i = 0; i < DRAWS; i++) {
      const [amount, nextSeed] = drawTableAmount(seed, table);
      seed = nextSeed;
      expect(outcomes).toContain(amount);
      counts.set(amount, (counts.get(amount) ?? 0) + 1);
    }

    for (const entry of table) {
      const observedShare = (counts.get(entry.amount) ?? 0) / DRAWS;
      const expectedShare = entry.weight / 100;
      expect(observedShare).toBeGreaterThan(expectedShare - 0.03);
      expect(observedShare).toBeLessThan(expectedShare + 0.03);
    }
  });
});

describe("the opening drain table's cap (rules.md §8.1, §8.3)", () => {
  it("never exceeds two-thirds of capacity, leaving at least 20 to reach", () => {
    for (const entry of OPENING_DRAIN_TABLE) {
      expect(entry.amount).toBeLessThanOrEqual((2 / 3) * NODE_CAPACITY);
      expect(NODE_CAPACITY - entry.amount).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("dealing the opening board (rules.md §8.1)", () => {
  const siteNames = new Set(SITES.map(squareName));
  const drainAmounts = new Set(
    OPENING_DRAIN_TABLE.map((entry) => entry.amount),
  );
  const pressureAmounts = new Set(
    OPENING_PRESSURE_TABLE.map((entry) => entry.amount),
  );

  it("deals exactly the seventeen sites, five charged and twelve active, none dormant", () => {
    const [siteStates] = dealOpeningBoard(1);

    expect(new Set(Object.keys(siteStates))).toEqual(siteNames);

    const charged = Object.values(siteStates).filter(
      (status) => status.state === "charged",
    );
    const active = Object.values(siteStates).filter(
      (status) => status.state === "active",
    );
    const dormant = Object.values(siteStates).filter(
      (status) => status.state === "dormant",
    );

    expect(charged).toHaveLength(5);
    expect(active).toHaveLength(12);
    expect(dormant).toHaveLength(0);
  });

  it("draws every charged level from the opening drain table and every active level from the opening pressure table", () => {
    const [siteStates] = dealOpeningBoard(1);

    for (const status of Object.values(siteStates)) {
      if (status.state === "charged") {
        expect(drainAmounts.has(status.level)).toBe(true);
      } else {
        expect(pressureAmounts.has(status.level)).toBe(true);
      }
    }
  });

  it("never deals a charged node above two-thirds of capacity, leaving at least 20 to reach", () => {
    let seed = 1;
    for (let i = 0; i < 200; i++) {
      const [siteStates, nextSeed] = dealOpeningBoard(seed);
      seed = nextSeed;
      for (const status of Object.values(siteStates)) {
        if (status.state === "charged") {
          expect(status.level).toBeLessThanOrEqual((2 / 3) * NODE_CAPACITY);
          expect(NODE_CAPACITY - status.level).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it("deals the same board and the same next seed from the same seed", () => {
    const [firstStates, firstNextSeed] = dealOpeningBoard(12345);
    const [secondStates, secondNextSeed] = dealOpeningBoard(12345);

    expect(secondStates).toEqual(firstStates);
    expect(secondNextSeed).toBe(firstNextSeed);
  });

  it("deals a different board from a different seed (confirmed for this pair; any other distinct pair is expected to work the same way)", () => {
    const [firstStates] = dealOpeningBoard(12345);
    const [secondStates] = dealOpeningBoard(54321);

    expect(secondStates).not.toEqual(firstStates);
  });

  it("advances the seed by exactly 22 steps", () => {
    const seed = 987654321;
    const [, nextSeed] = dealOpeningBoard(seed);

    let expectedSeed = seed;
    for (let i = 0; i < 22; i++) {
      const [, advanced] = mulberry32(expectedSeed);
      expectedSeed = advanced;
    }

    expect(nextSeed).toBe(expectedSeed);
  });

  it("charges every site in a share close to 5/17 and draws levels at frequencies close to their tables' weights, over many deals", () => {
    const DEALS = 20_000;
    const chargeCounts = new Map(SITES.map((site) => [squareName(site), 0]));
    const drainCounts = new Map(
      OPENING_DRAIN_TABLE.map((entry) => [entry.amount, 0]),
    );
    const pressureCounts = new Map(
      OPENING_PRESSURE_TABLE.map((entry) => [entry.amount, 0]),
    );

    let seed = 42;
    for (let i = 0; i < DEALS; i++) {
      const [siteStates, nextSeed] = dealOpeningBoard(seed);
      seed = nextSeed;

      for (const [name, status] of Object.entries(siteStates)) {
        if (status.state === "charged") {
          chargeCounts.set(name, (chargeCounts.get(name) ?? 0) + 1);
          drainCounts.set(
            status.level,
            (drainCounts.get(status.level) ?? 0) + 1,
          );
        } else {
          pressureCounts.set(
            status.level,
            (pressureCounts.get(status.level) ?? 0) + 1,
          );
        }
      }
    }

    const expectedChargeShare = TARGET_CHARGED_SITES / SITES.length;
    for (const count of chargeCounts.values()) {
      const share = count / DEALS;
      expect(share).toBeGreaterThan(expectedChargeShare - 0.02);
      expect(share).toBeLessThan(expectedChargeShare + 0.02);
    }

    const totalDrains = [...drainCounts.values()].reduce((a, b) => a + b, 0);
    for (const entry of OPENING_DRAIN_TABLE) {
      const share = (drainCounts.get(entry.amount) ?? 0) / totalDrains;
      const expectedShare = entry.weight / 100;
      expect(share).toBeGreaterThan(expectedShare - 0.03);
      expect(share).toBeLessThan(expectedShare + 0.03);
    }

    const totalPressures = [...pressureCounts.values()].reduce(
      (a, b) => a + b,
      0,
    );
    for (const entry of OPENING_PRESSURE_TABLE) {
      const share = (pressureCounts.get(entry.amount) ?? 0) / totalPressures;
      const expectedShare = entry.weight / 100;
      expect(share).toBeGreaterThan(expectedShare - 0.03);
      expect(share).toBeLessThan(expectedShare + 0.03);
    }
  });
});

describe("the site cycle position (rules.md §8.3, §8.2)", () => {
  it("has charged report 0 at drain 0 and 1 at capacity", () => {
    expect(siteCyclePosition("charged", 0)).toBe(0);
    expect(siteCyclePosition("charged", NODE_CAPACITY)).toBe(1);
  });

  it("clamps charged outside [0, 1]", () => {
    expect(siteCyclePosition("charged", -10)).toBe(0);
    expect(siteCyclePosition("charged", NODE_CAPACITY + 10)).toBe(1);
  });

  it("has dormant report 0 at a level of capacity (just gone dormant) and 1 at level 0 (fully recovered)", () => {
    expect(siteCyclePosition("dormant", NODE_CAPACITY)).toBe(0);
    expect(siteCyclePosition("dormant", 0)).toBe(1);
  });

  it("clamps dormant outside [0, 1], including a level carried above capacity", () => {
    expect(siteCyclePosition("dormant", NODE_CAPACITY + 10)).toBe(0);
    expect(siteCyclePosition("dormant", -10)).toBe(1);
  });

  it("has active report 0 at pressure 1 and 1 at the pressure cap", () => {
    expect(siteCyclePosition("active", 1)).toBe(0);
    expect(siteCyclePosition("active", PRESSURE_CAP)).toBe(1);
  });

  it("clamps active outside [0, 1]", () => {
    expect(siteCyclePosition("active", 0)).toBe(0);
    expect(siteCyclePosition("active", PRESSURE_CAP + 10)).toBe(1);
  });
});
