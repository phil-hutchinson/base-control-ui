import { describe, expect, it } from "vitest";
import { COLUMN_LETTERS, type Square, squareAt, squareName } from "./board";
import { DEFAULT_FLEET_SIZE, startingFleet } from "./fleet";
import type { NodeStatus } from "./gameState";
import { CHARGED_NODE_COUNTS } from "./nodes";
import { mulberry32 } from "./random";
import {
  dealStealOpeningBoard,
  isNodeHeld,
  nodeAnchor,
  NODE_SIGNALS,
  squaresForSignal,
} from "./steal";

const FLEET_SQUARES = startingFleet(DEFAULT_FLEET_SIZE).map(
  (entry) => entry.square,
);

/** The 121 squares C3-M13, in board order — §3.2's strict pool interior. */
function interiorSquares(): Square[] {
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

/** Whether two squares are orthogonally or diagonally adjacent. */
function isAdjacent(a: Square, b: Square): boolean {
  const columnDelta =
    COLUMN_LETTERS.indexOf(a.column) - COLUMN_LETTERS.indexOf(b.column);
  return Math.abs(columnDelta) <= 1 && Math.abs(a.row - b.row) <= 1;
}

function nodes(
  entries: Readonly<Record<string, NodeStatus>>,
): Readonly<Record<string, NodeStatus>> {
  return entries;
}

describe("squaresForSignal", () => {
  it("returns a signal's squares in board order, regardless of insertion order", () => {
    const map = nodes({
      L8: { state: "prospective", level: 0, signal: 0 },
      B4: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 1 },
    });

    expect(squaresForSignal(map, 0).map(squareName)).toEqual(["B4", "L8"]);
    expect(squaresForSignal(map, 1).map(squareName)).toEqual(["H8"]);
    expect(squaresForSignal(map, 2)).toEqual([]);
  });
});

describe("isNodeHeld", () => {
  it("is true when one of a signal's squares is charged", () => {
    const map = nodes({
      B4: { state: "charged", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(isNodeHeld(map, 0)).toBe(true);
  });

  it("is false when both of a signal's squares are prospective", () => {
    const map = nodes({
      B4: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(isNodeHeld(map, 0)).toBe(false);
  });
});

describe("nodeAnchor", () => {
  it("is the charged square when the node is Held", () => {
    const map = nodes({
      B4: { state: "charged", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(squareName(nodeAnchor(map, 0))).toBe("B4");
  });

  it("is the one square present when only one has been placed", () => {
    const map = nodes({
      B4: { state: "prospective", level: 0, signal: 0 },
    });
    expect(squareName(nodeAnchor(map, 0))).toBe("B4");
  });

  it("throws for an Open node, which carries no single square to anchor on", () => {
    const map = nodes({
      B4: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(() => nodeAnchor(map, 0)).toThrow(RangeError);
  });

  it("throws for a signal with no squares at all", () => {
    expect(() => nodeAnchor(nodes({}), 0)).toThrow(RangeError);
  });
});

describe("dealStealOpeningBoard (steal.md §7)", () => {
  it.each(CHARGED_NODE_COUNTS)(
    "deals 2 x %d prospective squares, two per signal, none charged, inactive or depleted",
    (nodeCount) => {
      const [dealt] = dealStealOpeningBoard(FLEET_SQUARES, nodeCount, 12345);

      const entries = Object.values(dealt);
      expect(entries).toHaveLength(nodeCount * 2);
      for (const status of entries) {
        expect(status.state).toBe("prospective");
        expect(status.level).toBe(0);
      }

      for (const signal of NODE_SIGNALS.slice(0, nodeCount)) {
        expect(squaresForSignal(dealt, signal)).toHaveLength(2);
      }
    },
  );

  it("puts at least one of each signal's two squares in the strict pool's interior, since the first is always drawn from it", () => {
    const [dealt] = dealStealOpeningBoard(FLEET_SQUARES, 5, 99);

    for (const signal of NODE_SIGNALS) {
      const names = squaresForSignal(dealt, signal).map(squareName);
      expect(
        names.filter((name) => INTERIOR_NAMES.has(name)).length,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("never places a signal's two squares adjacent to each other", () => {
    const [dealt] = dealStealOpeningBoard(FLEET_SQUARES, 5, 4242);

    for (const signal of NODE_SIGNALS) {
      const squares = squaresForSignal(dealt, signal);
      expect(squares).toHaveLength(2);
      expect(isAdjacent(squares[0], squares[1])).toBe(false);
    }
  });

  it("never places a node under a ship", () => {
    const [dealt] = dealStealOpeningBoard(FLEET_SQUARES, 5, 777);
    const shipNames = new Set(FLEET_SQUARES.map(squareName));

    for (const name of Object.keys(dealt)) {
      expect(shipNames.has(name)).toBe(false);
    }
  });

  it("deals the same board for the same seed, and a different board for a different seed", () => {
    const [first] = dealStealOpeningBoard(FLEET_SQUARES, 4, 1000);
    const [second] = dealStealOpeningBoard(FLEET_SQUARES, 4, 1000);
    const [third] = dealStealOpeningBoard(FLEET_SQUARES, 4, 1001);

    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
  });

  it("advances the seed by exactly 2 x nodeCount mulberry32 steps", () => {
    const seed = 55;
    for (const nodeCount of CHARGED_NODE_COUNTS) {
      let expectedSeed = seed;
      for (let step = 0; step < nodeCount * 2; step++) {
        [, expectedSeed] = mulberry32(expectedSeed);
      }

      const [, nextSeed] = dealStealOpeningBoard(
        FLEET_SQUARES,
        nodeCount,
        seed,
      );

      expect(nextSeed).toBe(expectedSeed);
    }
  });
});
