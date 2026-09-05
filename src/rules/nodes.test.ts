import { describe, expect, it } from "vitest";
import {
  ALL_SQUARES,
  BOARD_SIZE,
  COLUMN_LETTERS,
  squareAt,
  squareFromName,
  squareName,
  type Square,
} from "./board";
import { PLANETS } from "./planets";
import { DEFAULT_FLEET_SIZE, startingFleet } from "./fleet";
import { mulberry32 } from "./random";
import {
  DEPLETED_RECOVERY_TABLE,
  EMPTY_NODE_DRAIN_TABLE,
  HELD_NODE_DRAIN_TABLE,
  NODE_CAPACITY,
  NODE_COUNT,
  OPENING_DRAIN_TABLE,
  OPENING_PRESSURE_TABLE,
  PRESSURE_CAP,
  TARGET_CHARGED_NODES,
  type WeightedAmount,
  dealOpeningBoard,
  drawTableAmount,
  nodeCyclePosition,
} from "./nodes";

/** The 121 squares C3-M13 — the interior §3.2's two ring exclusions leave. */
function interiorSquares(): readonly Square[] {
  const columns = "CDEFGHIJKLM".split("") as Square["column"][];
  const squares: Square[] = [];
  for (let row = 3; row <= 13; row++) {
    for (const column of columns) {
      squares.push(squareAt(column, row));
    }
  }
  return squares;
}

const INTERIOR_NAMES = new Set(interiorSquares().map(squareName));

/** Whether two squares are orthogonally or diagonally adjacent (§3.2 constraint 5). */
function isAdjacent(a: Square, b: Square): boolean {
  const columnDelta =
    COLUMN_LETTERS.indexOf(a.column) - COLUMN_LETTERS.indexOf(b.column);
  return Math.abs(columnDelta) <= 1 && Math.abs(a.row - b.row) <= 1;
}

const FLEET_SQUARES = startingFleet(DEFAULT_FLEET_SIZE).map(
  (entry) => entry.square,
);

/**
 * The names of the squares that satisfy all six of §3.2's constraints on an
 * empty board with no ships: the interior, minus the twelve planets and every
 * square orthogonally or diagonally adjacent to one. Derived from `PLANETS`
 * rather than typed out, so the set follows the geometry — this restates
 * §3.2's rule, not `legalNodePool`'s implementation.
 */
const LEGAL_SQUARE_NAMES: readonly string[] = ALL_SQUARES.filter((square) => {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const inInterior =
    columnIndex >= 2 &&
    columnIndex <= COLUMN_LETTERS.length - 3 &&
    square.row >= 3 &&
    square.row <= BOARD_SIZE - 2;
  return (
    inInterior &&
    !PLANETS.some(
      (planet) =>
        Math.abs(COLUMN_LETTERS.indexOf(planet.column) - columnIndex) <= 1 &&
        Math.abs(planet.row - square.row) <= 1,
    )
  );
}).map(squareName);

describe("the board's charged target (rules.md §8.1, §8.2)", () => {
  it("aims to keep four nodes charged", () => {
    expect(TARGET_CHARGED_NODES).toBe(4);
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
    name: "the depleted recovery table",
    table: DEPLETED_RECOVERY_TABLE,
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
  const drainAmounts = new Set(
    OPENING_DRAIN_TABLE.map((entry) => entry.amount),
  );
  const pressureAmounts = new Set(
    OPENING_PRESSURE_TABLE.map((entry) => entry.amount),
  );

  it("deals exactly twelve nodes, four charged and eight inactive, none depleted", () => {
    const [nodes] = dealOpeningBoard(FLEET_SQUARES, 1);

    expect(Object.keys(nodes)).toHaveLength(NODE_COUNT);

    const charged = Object.values(nodes).filter(
      (status) => status.state === "charged",
    );
    const inactive = Object.values(nodes).filter(
      (status) => status.state === "inactive",
    );
    const depleted = Object.values(nodes).filter(
      (status) => status.state === "depleted",
    );

    expect(charged).toHaveLength(TARGET_CHARGED_NODES);
    expect(inactive).toHaveLength(NODE_COUNT - TARGET_CHARGED_NODES);
    expect(depleted).toHaveLength(0);
  });

  it("deals every square legal under §3.2 — inside C3-M13, off any ship, no two dealt squares adjacent — over many seeds", () => {
    const fleetNames = new Set(FLEET_SQUARES.map(squareName));
    let seed = 1;
    for (let i = 0; i < 500; i++) {
      const [nodes, nextSeed] = dealOpeningBoard(FLEET_SQUARES, seed);
      seed = nextSeed;

      const names = Object.keys(nodes);
      const dealtSquares = names.map(squareFromName);

      for (const name of names) {
        expect(INTERIOR_NAMES.has(name)).toBe(true);
        expect(fleetNames.has(name)).toBe(false);
      }

      for (let a = 0; a < dealtSquares.length; a++) {
        for (let b = a + 1; b < dealtSquares.length; b++) {
          expect(isAdjacent(dealtSquares[a], dealtSquares[b])).toBe(false);
        }
      }
    }
  });

  it("draws every charged level from the opening drain table and every inactive level from the opening pressure table", () => {
    const [nodes] = dealOpeningBoard(FLEET_SQUARES, 1);

    for (const status of Object.values(nodes)) {
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
      const [nodes, nextSeed] = dealOpeningBoard(FLEET_SQUARES, seed);
      seed = nextSeed;
      for (const status of Object.values(nodes)) {
        if (status.state === "charged") {
          expect(status.level).toBeLessThanOrEqual((2 / 3) * NODE_CAPACITY);
          expect(NODE_CAPACITY - status.level).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it("deals the same board and the same next seed from the same seed", () => {
    const [firstStates, firstNextSeed] = dealOpeningBoard(FLEET_SQUARES, 12345);
    const [secondStates, secondNextSeed] = dealOpeningBoard(
      FLEET_SQUARES,
      12345,
    );

    expect(secondStates).toEqual(firstStates);
    expect(secondNextSeed).toBe(firstNextSeed);
  });

  it("deals a different board from a different seed (confirmed for this pair; any other distinct pair is expected to work the same way)", () => {
    const [firstStates] = dealOpeningBoard(FLEET_SQUARES, 12345);
    const [secondStates] = dealOpeningBoard(FLEET_SQUARES, 54321);

    expect(secondStates).not.toEqual(firstStates);
  });

  it("advances the seed by exactly 24 steps", () => {
    const seed = 987654321;
    const [, nextSeed] = dealOpeningBoard(FLEET_SQUARES, seed);

    let expectedSeed = seed;
    for (let i = 0; i < 24; i++) {
      const [, advanced] = mulberry32(expectedSeed);
      expectedSeed = advanced;
    }

    expect(nextSeed).toBe(expectedSeed);
  });

  it("draws levels at frequencies close to their tables' weights, over many deals", () => {
    // Each deal now costs a `legalNodePool` scan per placement rather than a
    // constant-size array lookup, so this is far fewer deals than the old
    // fixed-square version — still tens of thousands of level draws, which is
    // plenty to hold the same 3% margin.
    const DEALS = 3_000;
    const drainCounts = new Map(
      OPENING_DRAIN_TABLE.map((entry) => [entry.amount, 0]),
    );
    const pressureCounts = new Map(
      OPENING_PRESSURE_TABLE.map((entry) => [entry.amount, 0]),
    );

    let seed = 42;
    for (let i = 0; i < DEALS; i++) {
      const [nodes, nextSeed] = dealOpeningBoard(FLEET_SQUARES, seed);
      seed = nextSeed;

      for (const status of Object.values(nodes)) {
        if (status.state === "charged") {
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

  // The pool is a fixed 51 squares whose balance is settled by the planet
  // geometry itself (planets.test.ts checks that geometry directly): over
  // many deals, every legal square is dealt at least once.
  it("deals every one of the 51 legal squares at least once, over many deals", () => {
    const DEALS = 3_000;
    const seenSquares = new Set<string>();

    let seed = 1;
    for (let i = 0; i < DEALS; i++) {
      const [nodes, nextSeed] = dealOpeningBoard(FLEET_SQUARES, seed);
      seed = nextSeed;

      for (const name of Object.keys(nodes)) {
        seenSquares.add(name);
      }
    }

    for (const name of LEGAL_SQUARE_NAMES) {
      expect(seenSquares.has(name), name).toBe(true);
    }
  });
});

describe("the node cycle position (rules.md §8.3, §8.2)", () => {
  it("has charged report 0 at drain 0 and 1 at capacity", () => {
    expect(nodeCyclePosition("charged", 0)).toBe(0);
    expect(nodeCyclePosition("charged", NODE_CAPACITY)).toBe(1);
  });

  it("clamps charged outside [0, 1]", () => {
    expect(nodeCyclePosition("charged", -10)).toBe(0);
    expect(nodeCyclePosition("charged", NODE_CAPACITY + 10)).toBe(1);
  });

  it("has depleted report 0 at a level of capacity (just gone depleted) and 1 at level 0 (fully recovered)", () => {
    expect(nodeCyclePosition("depleted", NODE_CAPACITY)).toBe(0);
    expect(nodeCyclePosition("depleted", 0)).toBe(1);
  });

  it("clamps depleted outside [0, 1], including a level carried above capacity", () => {
    expect(nodeCyclePosition("depleted", NODE_CAPACITY + 10)).toBe(0);
    expect(nodeCyclePosition("depleted", -10)).toBe(1);
  });

  it("has inactive report 0 at pressure 1 and 1 at the pressure cap", () => {
    expect(nodeCyclePosition("inactive", 1)).toBe(0);
    expect(nodeCyclePosition("inactive", PRESSURE_CAP)).toBe(1);
  });

  it("clamps inactive outside [0, 1]", () => {
    expect(nodeCyclePosition("inactive", 0)).toBe(0);
    expect(nodeCyclePosition("inactive", PRESSURE_CAP + 10)).toBe(1);
  });
});
