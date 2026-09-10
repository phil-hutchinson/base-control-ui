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
  CHARGED_NODE_COUNTS,
  DEFAULT_CHARGED_NODE_COUNT,
  dealOpeningBoard,
  isChargedNodeCount,
  type ChargedNodeCount,
} from "./nodes";
import { INACTIVE_NODE_COUNT } from "./nodeQueue";

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

describe("the offered charged-node counts (rules.md §8.1)", () => {
  it("is largest first, so the leftmost start-screen choice is the default game", () => {
    expect(CHARGED_NODE_COUNTS).toEqual([5, 4, 3]);
  });

  it("defaults to five, the app's default", () => {
    expect(DEFAULT_CHARGED_NODE_COUNT).toBe(5);
    expect(CHARGED_NODE_COUNTS).toContain(DEFAULT_CHARGED_NODE_COUNT);
  });

  it.each([3, 4, 5])("accepts %i as a valid charged-node count", (value) => {
    expect(isChargedNodeCount(value)).toBe(true);
  });

  it.each([2, 6, 0, 4.5, NaN])(
    "rejects %s as a valid charged-node count",
    (value) => {
      expect(isChargedNodeCount(value)).toBe(false);
    },
  );
});

describe.each(CHARGED_NODE_COUNTS)(
  "dealing the opening board at %i charged (rules.md §8.1)",
  (chargedNodeCount: ChargedNodeCount) => {
    const totalNodes = chargedNodeCount + INACTIVE_NODE_COUNT;

    it(`deals exactly ${totalNodes} nodes, ${chargedNodeCount} charged and three inactive, none depleted`, () => {
      const [nodes] = dealOpeningBoard(FLEET_SQUARES, chargedNodeCount, 1);

      expect(Object.keys(nodes)).toHaveLength(totalNodes);

      const charged = Object.values(nodes).filter(
        (status) => status.state === "charged",
      );
      const inactive = Object.values(nodes).filter(
        (status) => status.state === "inactive",
      );
      const depleted = Object.values(nodes).filter(
        (status) => status.state === "depleted",
      );

      expect(charged).toHaveLength(chargedNodeCount);
      expect(inactive).toHaveLength(INACTIVE_NODE_COUNT);
      expect(depleted).toHaveLength(0);
    });

    it("deals every charged node at baseline — no countdown until a ship steps on it", () => {
      let seed = 1;
      for (let i = 0; i < 200; i++) {
        const [nodes, nextSeed] = dealOpeningBoard(
          FLEET_SQUARES,
          chargedNodeCount,
          seed,
        );
        seed = nextSeed;
        for (const status of Object.values(nodes)) {
          if (status.state === "charged") {
            expect(status.level).toBe(0);
          }
        }
      }
    });

    it("deals the three inactive nodes priorities {1, 2, 3}, one each, never a repeat", () => {
      let seed = 1;
      for (let i = 0; i < 300; i++) {
        const [nodes, nextSeed] = dealOpeningBoard(
          FLEET_SQUARES,
          chargedNodeCount,
          seed,
        );
        seed = nextSeed;

        const priorities = Object.values(nodes)
          .filter((status) => status.state === "inactive")
          .map((status) => status.level)
          .sort();
        expect(priorities).toEqual([1, 2, 3]);
      }
    });

    it("deals every square legal under §3.2 — the charged squares inside C3-M13, none on the outer edge, off any ship, no two dealt squares adjacent — over many seeds", () => {
      const fleetNames = new Set(FLEET_SQUARES.map(squareName));
      let seed = 1;
      for (let i = 0; i < 500; i++) {
        const [nodes, nextSeed] = dealOpeningBoard(
          FLEET_SQUARES,
          chargedNodeCount,
          seed,
        );
        seed = nextSeed;

        const names = Object.keys(nodes);
        const dealtSquares = names.map(squareFromName);

        // The charged squares are always drawn from the strict pool
        // (rules.md §3.2), so they stay inside the 11 x 11 interior; the
        // inactive trio's second and third squares are drawn from the
        // widened pool (§8.2's refill procedure), which may land one ring in
        // from the edge — outside the interior, but never on the outer edge
        // itself.
        for (const name of names) {
          if (nodes[name].state === "charged") {
            expect(INTERIOR_NAMES.has(name)).toBe(true);
          }
          expect(fleetNames.has(name)).toBe(false);
        }
        for (const square of dealtSquares) {
          expect(square.row).not.toBe(1);
          expect(square.row).not.toBe(BOARD_SIZE);
          expect(square.column).not.toBe("A");
          expect(square.column).not.toBe("O");
        }

        for (let a = 0; a < dealtSquares.length; a++) {
          for (let b = a + 1; b < dealtSquares.length; b++) {
            expect(isAdjacent(dealtSquares[a], dealtSquares[b])).toBe(false);
          }
        }
      }
    });

    it("deals the same board and the same next seed from the same seed", () => {
      const [firstStates, firstNextSeed] = dealOpeningBoard(
        FLEET_SQUARES,
        chargedNodeCount,
        12345,
      );
      const [secondStates, secondNextSeed] = dealOpeningBoard(
        FLEET_SQUARES,
        chargedNodeCount,
        12345,
      );

      expect(secondStates).toEqual(firstStates);
      expect(secondNextSeed).toBe(firstNextSeed);
    });

    it("deals a different board from a different seed (confirmed for this pair; any other distinct pair is expected to work the same way)", () => {
      const [firstStates] = dealOpeningBoard(
        FLEET_SQUARES,
        chargedNodeCount,
        12345,
      );
      const [secondStates] = dealOpeningBoard(
        FLEET_SQUARES,
        chargedNodeCount,
        54321,
      );

      expect(secondStates).not.toEqual(firstStates);
    });

    it(`advances the seed by exactly ${chargedNodeCount + 4} steps`, () => {
      const seed = 987654321;
      const [, nextSeed] = dealOpeningBoard(
        FLEET_SQUARES,
        chargedNodeCount,
        seed,
      );

      let expectedSeed = seed;
      for (let i = 0; i < chargedNodeCount + 4; i++) {
        const [, advanced] = mulberry32(expectedSeed);
        expectedSeed = advanced;
      }

      expect(nextSeed).toBe(expectedSeed);
    });

    // The pool is a fixed 51 squares whose balance is settled by the planet
    // geometry itself (planets.test.ts checks that geometry directly): over
    // many deals, every legal square is dealt at least once.
    it("deals every one of the 51 legal squares at least once, over many deals", () => {
      const DEALS = 3_000;
      const seenSquares = new Set<string>();

      let seed = 1;
      for (let i = 0; i < DEALS; i++) {
        const [nodes, nextSeed] = dealOpeningBoard(
          FLEET_SQUARES,
          chargedNodeCount,
          seed,
        );
        seed = nextSeed;

        for (const name of Object.keys(nodes)) {
          seenSquares.add(name);
        }
      }

      for (const name of LEGAL_SQUARE_NAMES) {
        expect(seenSquares.has(name), name).toBe(true);
      }
    });
  },
);
