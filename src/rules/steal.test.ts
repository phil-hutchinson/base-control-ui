import { describe, expect, it } from "vitest";
import {
  ALL_SQUARES,
  COLUMN_LETTERS,
  type Square,
  squareAt,
  squareName,
} from "./board";
import { DEFAULT_FLEET_SIZE, startingFleet } from "./fleet";
import type { NodeStatus } from "./gameState";
import { drawStealProspectiveSquare, legalNodePool } from "./nodePlacement";
import { CHARGED_NODE_COUNTS } from "./nodes";
import { drawIndex, drawWeightedIndex, mulberry32 } from "./random";
import {
  abandonNode,
  addExtraProspectiveSquares,
  claimNode,
  dealStealOpeningBoard,
  everyNodeHasExtra,
  matchedSignalForSide,
  nodeAnchor,
  NODE_SIGNALS,
  nodeCarriesExtra,
  shuffleProspectiveSignals,
  sideMatchedToSignal,
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

const ALL_SQUARE_NAMES = ALL_SQUARES.map(squareName);

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

describe("matchedSignalForSide and sideMatchedToSignal (steal.md §9)", () => {
  it("matches red to the second-to-last signal and green to the last", () => {
    expect(matchedSignalForSide("red", 5)).toBe(3);
    expect(matchedSignalForSide("green", 5)).toBe(4);
    expect(matchedSignalForSide("red", 4)).toBe(2);
    expect(matchedSignalForSide("green", 4)).toBe(3);
    expect(matchedSignalForSide("red", 3)).toBe(1);
    expect(matchedSignalForSide("green", 3)).toBe(2);
  });

  it("is the inverse of sideMatchedToSignal for every node count", () => {
    for (const nodeCount of CHARGED_NODE_COUNTS) {
      expect(
        sideMatchedToSignal(matchedSignalForSide("red", nodeCount), nodeCount),
      ).toBe("red");
      expect(
        sideMatchedToSignal(
          matchedSignalForSide("green", nodeCount),
          nodeCount,
        ),
      ).toBe("green");
    }
  });

  it("maps every other signal to no side", () => {
    for (const nodeCount of CHARGED_NODE_COUNTS) {
      for (const signal of NODE_SIGNALS.slice(0, nodeCount)) {
        if (
          signal !== matchedSignalForSide("red", nodeCount) &&
          signal !== matchedSignalForSide("green", nodeCount)
        ) {
          expect(sideMatchedToSignal(signal, nodeCount)).toBeUndefined();
        }
      }
    }
  });
});

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

describe("nodeAnchor", () => {
  it("is the charged square when the node is Held", () => {
    const map = nodes({
      B4: { state: "charged", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(nodeAnchor(map, 0).map(squareName)).toEqual(["B4"]);
  });

  it("is the charged square when the node is Held and carries an extra", () => {
    const map = nodes({
      B4: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(nodeAnchor(map, 0).map(squareName)).toEqual(["B4"]);
  });

  it("is the one square present when only one has been placed", () => {
    const map = nodes({
      B4: { state: "prospective", level: 0, signal: 0 },
    });
    expect(nodeAnchor(map, 0).map(squareName)).toEqual(["B4"]);
  });

  it("is both prospective squares of an Open node with two", () => {
    const map = nodes({
      B4: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(nodeAnchor(map, 0).map(squareName)).toEqual(["B4", "L8"]);
  });

  it("is all three prospective squares of an Open node carrying an extra", () => {
    const map = nodes({
      B4: { state: "prospective", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
      F6: { state: "prospective", level: 0, signal: 1 },
    });
    expect(nodeAnchor(map, 0).map(squareName)).toEqual(["B4", "H8", "L8"]);
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

describe("claimNode (steal.md §3)", () => {
  it("claims an Open node: charges the landed square, discards the other, and draws one fresh prospective", () => {
    const before: Record<string, NodeStatus> = {
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("H", 8);
    const shipSquares = [claimedSquare];

    const result = claimNode(before, 0, claimedSquare, shipSquares, 4242);

    expect(result.releasedSquare).toBeUndefined();
    expect(result.discardedSquares).toEqual([squareAt("L", 8)]);
    expect(result.nodes.H8).toEqual({ state: "charged", level: 0, signal: 0 });
    expect(result.nodes.L8).toBeUndefined();
    expect(Object.keys(result.nodes).sort()).toEqual(
      ["H8", squareName(result.newProspective)].sort(),
    );
    expect(result.nodes[squareName(result.newProspective)]).toEqual({
      state: "prospective",
      level: 0,
      signal: 0,
    });

    const pool = legalNodePool([claimedSquare], shipSquares, "widened");
    expect(pool.map(squareName)).toContain(squareName(result.newProspective));
  });

  it("claims a Held node: releases the previous charged square, with no square discarded", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("H", 8);

    const result = claimNode(before, 0, claimedSquare, [claimedSquare], 17);

    expect(result.releasedSquare).toEqual(squareAt("G", 8));
    expect(result.discardedSquares).toEqual([]);
    expect(result.nodes.G8).toBeUndefined();
    expect(result.nodes.H8).toEqual({ state: "charged", level: 0, signal: 0 });
  });

  it("draws its fresh prospective against every other node's squares, leaving them untouched", () => {
    const before: Record<string, NodeStatus> = {
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
    };
    const claimedSquare = squareAt("H", 8);

    const result = claimNode(before, 0, claimedSquare, [claimedSquare], 8);

    expect(result.nodes.C3).toEqual(before.C3);
    expect(result.nodes.D4).toEqual(before.D4);

    const expected = drawStealProspectiveSquare(
      [claimedSquare, squareAt("C", 3), squareAt("D", 4)],
      [claimedSquare],
      [squareAt("C", 3), squareAt("D", 4)],
      [claimedSquare],
      8,
    );
    expect(squareName(result.newProspective)).toBe(squareName(expected[0]));
    expect(result.nextSeed).toBe(expected[1]);
  });

  it("advances the seed by exactly one mulberry32 step", () => {
    const before: Record<string, NodeStatus> = {
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("H", 8);
    const seed = 321;

    const [, expectedSeed] = mulberry32(seed);
    const result = claimNode(before, 0, claimedSquare, [claimedSquare], seed);

    expect(result.nextSeed).toBe(expectedSeed);
  });

  it("deals the same result for the same seed, and a different one for a different seed", () => {
    const before: Record<string, NodeStatus> = {
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("H", 8);

    const first = claimNode(before, 0, claimedSquare, [claimedSquare], 9);
    const second = claimNode(before, 0, claimedSquare, [claimedSquare], 9);
    const third = claimNode(before, 0, claimedSquare, [claimedSquare], 10);

    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
  });

  it("claims a prospective square of an Open node carrying an extra, leaving it Held with exactly two squares (steal.md §10)", () => {
    const before: Record<string, NodeStatus> = {
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("H", 8);

    const result = claimNode(before, 0, claimedSquare, [claimedSquare], 4242);

    expect(result.discardedSquares).toEqual([squareAt("L", 8)]);
    expect(result.nodes.H8).toEqual({ state: "charged", level: 0, signal: 0 });
    expect(result.nodes.L8).toBeUndefined();
    expect(Object.keys(result.nodes).sort()).toEqual(
      ["H8", squareName(result.newProspective)].sort(),
    );
  });

  it("claims a Held node carrying an extra: releases the charged square and discards the other prospective square", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("H", 8);

    const result = claimNode(before, 0, claimedSquare, [claimedSquare], 17);

    expect(result.releasedSquare).toEqual(squareAt("G", 8));
    expect(result.discardedSquares).toEqual([squareAt("L", 8)]);
    expect(result.nodes.G8).toBeUndefined();
    expect(result.nodes.L8).toBeUndefined();
    expect(result.nodes.H8).toEqual({ state: "charged", level: 0, signal: 0 });
  });

  it("claims an Open node carrying an extra by landing on any one of its three squares, discarding the other two", () => {
    const before: Record<string, NodeStatus> = {
      H8: { state: "prospective", level: 0, signal: 0 },
      K5: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("L", 8);

    const result = claimNode(before, 0, claimedSquare, [claimedSquare], 4242);

    expect(result.discardedSquares.map(squareName).sort()).toEqual(
      ["H8", "K5"].sort(),
    );
    expect(result.nodes.L8).toEqual({ state: "charged", level: 0, signal: 0 });
  });

  it("treats a holder relocating onto one of its own node's two prospective squares as a claim, releasing the charged square and discarding the other", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const claimedSquare = squareAt("L", 8);

    const result = claimNode(before, 0, claimedSquare, [claimedSquare], 17);

    expect(result.releasedSquare).toEqual(squareAt("G", 8));
    expect(result.discardedSquares).toEqual([squareAt("H", 8)]);
    expect(result.nodes.L8).toEqual({ state: "charged", level: 0, signal: 0 });
  });
});

describe("abandonNode (steal.md §4)", () => {
  it("vacates the charged square and draws a second prospective anchored on the survivor", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
    };
    const vacatedSquare = squareAt("G", 8);

    const result = abandonNode(before, 0, vacatedSquare, [], 654);

    expect(result.nodes.G8).toBeUndefined();
    expect(result.nodes.H8).toEqual({
      state: "prospective",
      level: 0,
      signal: 0,
    });
    expect(Object.keys(result.nodes).sort()).toEqual(
      ["H8", squareName(result.newProspective)].sort(),
    );
    expect(result.nodes[squareName(result.newProspective)]).toEqual({
      state: "prospective",
      level: 0,
      signal: 0,
    });

    const pool = legalNodePool([vacatedSquare], [], "widened");
    expect(pool.map(squareName)).toContain(squareName(result.newProspective));
  });

  it("advances the seed by exactly one mulberry32 step", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
    };
    const seed = 111;

    const [, expectedSeed] = mulberry32(seed);
    const result = abandonNode(before, 0, squareAt("G", 8), [], seed);

    expect(result.nextSeed).toBe(expectedSeed);
  });

  it("deals the same result for the same seed, and a different one for a different seed", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
    };

    const first = abandonNode(before, 0, squareAt("G", 8), [], 2);
    const second = abandonNode(before, 0, squareAt("G", 8), [], 2);
    const third = abandonNode(before, 0, squareAt("G", 8), [], 3);

    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
  });

  it("leaving a Held node carrying an extra leaves it Open with three prospective squares, still carrying the extra", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const vacatedSquare = squareAt("G", 8);

    const result = abandonNode(before, 0, vacatedSquare, [], 654);

    expect(result.nodes.G8).toBeUndefined();
    expect(result.nodes.H8).toEqual({
      state: "prospective",
      level: 0,
      signal: 0,
    });
    expect(result.nodes.L8).toEqual({
      state: "prospective",
      level: 0,
      signal: 0,
    });
    expect(squaresForSignal(result.nodes, 0)).toHaveLength(3);
    expect(nodeCarriesExtra(result.nodes, 0)).toBe(true);
  });

  it("anchors the new square on both remaining prospective squares when leaving a Held node carrying an extra", () => {
    const before: Record<string, NodeStatus> = {
      G8: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
    };
    const vacatedSquare = squareAt("G", 8);
    const shipSquares = [squareAt("D", 4)];
    const seed = 654;

    const result = abandonNode(before, 0, vacatedSquare, shipSquares, seed);

    const expected = drawStealProspectiveSquare(
      [squareAt("H", 8), squareAt("L", 8)],
      [squareAt("H", 8), squareAt("L", 8)],
      [],
      shipSquares,
      seed,
    );
    expect(squareName(result.newProspective)).toBe(squareName(expected[0]));
    expect(result.nextSeed).toBe(expected[1]);
  });
});

describe("nodeCarriesExtra (steal.md §10)", () => {
  it("is false for a Held node with one prospective square, true with two", () => {
    const held = nodes({
      B4: { state: "charged", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(nodeCarriesExtra(held, 0)).toBe(false);
    expect(
      nodeCarriesExtra(
        { ...held, L8: { state: "prospective", level: 0, signal: 0 } },
        0,
      ),
    ).toBe(true);
  });

  it("is false for an Open node with two prospective squares, true with three", () => {
    const open = nodes({
      B4: { state: "prospective", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
    });
    expect(nodeCarriesExtra(open, 0)).toBe(false);
    expect(
      nodeCarriesExtra(
        { ...open, L8: { state: "prospective", level: 0, signal: 0 } },
        0,
      ),
    ).toBe(true);
  });
});

describe("everyNodeHasExtra (steal.md §10)", () => {
  it("is false while any node up to nodeCount lacks an extra", () => {
    const map = nodes({
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
      M12: { state: "prospective", level: 0, signal: 0 },
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      E5: { state: "charged", level: 0, signal: 2 },
      F6: { state: "prospective", level: 0, signal: 2 },
      F9: { state: "prospective", level: 0, signal: 2 },
    });
    expect(everyNodeHasExtra(map, 3)).toBe(false);
  });

  it("is true once every node up to nodeCount carries an extra", () => {
    const map = nodes({
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
      M12: { state: "prospective", level: 0, signal: 0 },
      C3: { state: "prospective", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      J4: { state: "prospective", level: 0, signal: 1 },
      E5: { state: "charged", level: 0, signal: 2 },
      F6: { state: "prospective", level: 0, signal: 2 },
      F9: { state: "prospective", level: 0, signal: 2 },
    });
    expect(everyNodeHasExtra(map, 3)).toBe(true);
  });
});

describe("addExtraProspectiveSquares (steal.md §10)", () => {
  const before: Record<string, NodeStatus> = {
    H8: { state: "prospective", level: 0, signal: 0 },
    L8: { state: "prospective", level: 0, signal: 0 },
    C3: { state: "prospective", level: 0, signal: 1 },
    D4: { state: "prospective", level: 0, signal: 1 },
    J4: { state: "prospective", level: 0, signal: 1 },
    F5: { state: "prospective", level: 0, signal: 2 },
    F9: { state: "prospective", level: 0, signal: 2 },
  };

  it("adds exactly one square to each node not carrying an extra, none to a node that already carries one, in signal order", () => {
    const result = addExtraProspectiveSquares(before, 3, [], 4242);

    expect(result.nodes.C3).toEqual(before.C3);
    expect(result.nodes.D4).toEqual(before.D4);
    expect(result.nodes.J4).toEqual(before.J4);
    expect(result.addedSquares).toHaveLength(2);

    const [firstAdded, secondAdded] = result.addedSquares;
    expect(result.nodes[squareName(firstAdded)]).toEqual({
      state: "prospective",
      level: 0,
      signal: 0,
    });
    expect(result.nodes[squareName(secondAdded)]).toEqual({
      state: "prospective",
      level: 0,
      signal: 2,
    });

    for (const signal of [0, 1, 2] as const) {
      expect(squaresForSignal(result.nodes, signal)).toHaveLength(3);
      expect(nodeCarriesExtra(result.nodes, signal)).toBe(true);
    }
    expect(everyNodeHasExtra(result.nodes, 3)).toBe(true);
  });

  it("consumes exactly one seed step per square added", () => {
    const seed = 4242;
    const result = addExtraProspectiveSquares(before, 3, [], seed);

    let expectedSeed = seed;
    for (let step = 0; step < result.addedSquares.length; step++) {
      [, expectedSeed] = mulberry32(expectedSeed);
    }
    expect(result.nextSeed).toBe(expectedSeed);
  });

  it("deals the same result for the same seed, and a different one for a different seed", () => {
    const first = addExtraProspectiveSquares(before, 3, [], 9);
    const second = addExtraProspectiveSquares(before, 3, [], 9);
    const third = addExtraProspectiveSquares(before, 3, [], 10);

    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
  });

  it("adds nothing, and does not touch the seed, once every node already has its extra", () => {
    const everyoneHasExtra: Record<string, NodeStatus> = {
      H8: { state: "prospective", level: 0, signal: 0 },
      L8: { state: "prospective", level: 0, signal: 0 },
      M12: { state: "prospective", level: 0, signal: 0 },
      C3: { state: "charged", level: 0, signal: 1 },
      D4: { state: "prospective", level: 0, signal: 1 },
      J4: { state: "prospective", level: 0, signal: 1 },
      F5: { state: "prospective", level: 0, signal: 2 },
      F9: { state: "prospective", level: 0, signal: 2 },
      K13: { state: "prospective", level: 0, signal: 2 },
    };
    const result = addExtraProspectiveSquares(everyoneHasExtra, 3, [], 4242);

    expect(result.addedSquares).toEqual([]);
    expect(result.nodes).toEqual(everyoneHasExtra);
    expect(result.nextSeed).toBe(4242);
  });

  it("draws each added square from the widened pool, off every other node's squares and every ship", () => {
    const shipSquares = [squareAt("A", 1), squareAt("O", 15)];
    const result = addExtraProspectiveSquares(before, 3, shipSquares, 777);

    const occupiedBefore = new Set(Object.keys(before));
    const shipNames = new Set(shipSquares.map(squareName));
    for (const square of result.addedSquares) {
      const name = squareName(square);
      expect(occupiedBefore.has(name)).toBe(false);
      expect(shipNames.has(name)).toBe(false);
    }
  });
});

describe("shuffleProspectiveSignals (steal.md §10)", () => {
  /** Every prospective square's signal, keyed by square name. */
  function prospectiveSignals(
    map: Readonly<Record<string, NodeStatus>>,
  ): Record<string, NodeStatus["signal"]> {
    const result: Record<string, NodeStatus["signal"]> = {};
    for (const [name, status] of Object.entries(map)) {
      if (status.state === "prospective") {
        result[name] = status.signal;
      }
    }
    return result;
  }

  /** How many prospective squares each signal has. */
  function prospectiveCounts(
    map: Readonly<Record<string, NodeStatus>>,
  ): Map<NodeStatus["signal"], number> {
    const counts = new Map<NodeStatus["signal"], number>();
    for (const signal of Object.values(prospectiveSignals(map))) {
      counts.set(signal, (counts.get(signal) ?? 0) + 1);
    }
    return counts;
  }

  /** The invariants every shuffle keeps, whatever the draws. */
  function expectShuffleInvariants(
    before: Readonly<Record<string, NodeStatus>>,
    after: Readonly<Record<string, NodeStatus>>,
  ): void {
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    for (const [name, status] of Object.entries(before)) {
      if (status.state === "charged") {
        expect(after[name]).toEqual(status);
      } else {
        expect(after[name]?.state).toBe("prospective");
        expect(after[name]?.level).toBe(0);
      }
    }
    expect(prospectiveCounts(after)).toEqual(prospectiveCounts(before));
  }

  /** The seed `steps` mulberry32 steps on from `seed`. */
  function seedAfter(seed: number, steps: number): number {
    let result = seed;
    for (let step = 0; step < steps; step++) {
      [, result] = mulberry32(result);
    }
    return result;
  }

  // Five signals: 0 Held with an extra, 1 Open, 2 Open with an extra,
  // 3 Held, 4 Open. Red's matched signal is 3, green's 4.
  const fiveNodes: Record<string, NodeStatus> = {
    G8: { state: "charged", level: 0, signal: 0 },
    H8: { state: "prospective", level: 0, signal: 0 },
    L8: { state: "prospective", level: 0, signal: 0 },
    C3: { state: "prospective", level: 0, signal: 1 },
    D5: { state: "prospective", level: 0, signal: 1 },
    E10: { state: "prospective", level: 0, signal: 2 },
    K12: { state: "prospective", level: 0, signal: 2 },
    N2: { state: "prospective", level: 0, signal: 2 },
    B13: { state: "charged", level: 0, signal: 3 },
    M4: { state: "prospective", level: 0, signal: 3 },
    F13: { state: "prospective", level: 0, signal: 4 },
    J2: { state: "prospective", level: 0, signal: 4 },
  };
  const fiveNodesProspectiveCount = 10;

  it.each(["off", "double", "required"] as const)(
    "moves no square, leaves every charged square alone and keeps each node's count (player-matching %s)",
    (playerMatching) => {
      for (let seed = 1; seed <= 200; seed++) {
        const result = shuffleProspectiveSignals(
          fiveNodes,
          5,
          playerMatching,
          seed,
        );
        expectShuffleInvariants(fiveNodes, result.nodes);
      }
    },
  );

  it.each(["off", "double", "required"] as const)(
    "consumes exactly two seed steps per prospective square (player-matching %s)",
    (playerMatching) => {
      const seed = 4242;
      const result = shuffleProspectiveSignals(
        fiveNodes,
        5,
        playerMatching,
        seed,
      );
      expect(result.nextSeed).toBe(
        seedAfter(seed, 2 * fiveNodesProspectiveCount),
      );
    },
  );

  it.each(["off", "double", "required"] as const)(
    "reports exactly the squares whose signal changed, with their old and new signals, in board order (player-matching %s)",
    (playerMatching) => {
      const boardOrder = ALL_SQUARES.map(squareName);
      for (let seed = 1; seed <= 200; seed++) {
        const result = shuffleProspectiveSignals(
          fiveNodes,
          5,
          playerMatching,
          seed,
        );
        const expected = boardOrder.flatMap((name) => {
          const before = fiveNodes[name];
          const after = result.nodes[name];
          return before?.state === "prospective" &&
            after?.signal !== before.signal
            ? [{ name, oldSignal: before.signal, newSignal: after?.signal }]
            : [];
        });
        expect(
          result.recoloredSquares.map(({ square, oldSignal, newSignal }) => ({
            name: squareName(square),
            oldSignal,
            newSignal,
          })),
        ).toEqual(expected);
      }
    },
  );

  it("deals the same result for the same seed, and a different one for a different seed", () => {
    const first = shuffleProspectiveSignals(fiveNodes, 5, "required", 9);
    const second = shuffleProspectiveSignals(fiveNodes, 5, "required", 9);
    const third = shuffleProspectiveSignals(fiveNodes, 5, "required", 10);

    expect(second).toEqual(first);
    expect(third).not.toEqual(first);
  });

  it("places red's or green's signal first, on a square that carried a different signal", () => {
    // The first placement draws a signal weighted over red's and green's
    // unplaced counts, then a square among those not carrying it before.
    const seed = 31;
    const before = prospectiveSignals(fiveNodes);
    const squares = Object.keys(before).sort(
      (a, b) => ALL_SQUARE_NAMES.indexOf(a) - ALL_SQUARE_NAMES.indexOf(b),
    );
    const [signalIndex, seedAfterSignal] = drawWeightedIndex(seed, [1, 2]);
    const firstSignal = ([3, 4] as const)[signalIndex];
    const candidates = squares.filter((name) => before[name] !== firstSignal);
    const [squareIndex] = drawIndex(seedAfterSignal, candidates.length);

    const result = shuffleProspectiveSignals(fiveNodes, 5, "double", seed);
    expect(result.nodes[candidates[squareIndex]]?.signal).toBe(firstSignal);
  });

  it.each(["double", "required"] as const)(
    "always puts red or green on at least one square that was a different signal before (player-matching %s)",
    (playerMatching) => {
      const boards: readonly [Record<string, NodeStatus>, 3 | 4 | 5][] = [
        [fiveNodes, 5],
        [
          {
            C3: { state: "prospective", level: 0, signal: 0 },
            D5: { state: "prospective", level: 0, signal: 0 },
            H8: { state: "prospective", level: 0, signal: 0 },
            G8: { state: "charged", level: 0, signal: 1 },
            K12: { state: "prospective", level: 0, signal: 1 },
            B13: { state: "charged", level: 0, signal: 2 },
            M4: { state: "prospective", level: 0, signal: 2 },
          },
          3,
        ],
      ];
      for (const [board, nodeCount] of boards) {
        const before = prospectiveSignals(board);
        const matched = new Set([
          matchedSignalForSide("red", nodeCount),
          matchedSignalForSide("green", nodeCount),
        ]);
        for (let seed = 1; seed <= 300; seed++) {
          const after = prospectiveSignals(
            shuffleProspectiveSignals(board, nodeCount, playerMatching, seed)
              .nodes,
          );
          const moved = Object.keys(before).some((name) => {
            const signal = after[name];
            return (
              signal !== undefined &&
              matched.has(signal) &&
              before[name] !== signal
            );
          });
          expect(moved).toBe(true);
        }
      }
    },
  );

  it("falls back to every empty square when no square with a different signal is left", () => {
    // Signal 0 owns three of the five prospective squares, so once signals 1
    // and 2 have taken the only two squares that were not 0's, signal 0's
    // placements have nowhere different to go.
    const board: Record<string, NodeStatus> = {
      C3: { state: "prospective", level: 0, signal: 0 },
      D5: { state: "prospective", level: 0, signal: 0 },
      H8: { state: "prospective", level: 0, signal: 0 },
      G8: { state: "charged", level: 0, signal: 1 },
      K12: { state: "prospective", level: 0, signal: 1 },
      B13: { state: "charged", level: 0, signal: 2 },
      M4: { state: "prospective", level: 0, signal: 2 },
    };
    for (const playerMatching of ["off", "double", "required"] as const) {
      for (let seed = 1; seed <= 300; seed++) {
        const result = shuffleProspectiveSignals(
          board,
          3,
          playerMatching,
          seed,
        );
        expectShuffleInvariants(board, result.nodes);
        expect(result.nextSeed).toBe(seedAfter(seed, 10));
      }
    }
  });

  it.each([3, 4, 5] as const)(
    "shuffles every opening deal of %d nodes with player-matching off, keeping every invariant",
    (nodeCount) => {
      const [dealt] = dealStealOpeningBoard(FLEET_SQUARES, nodeCount, 777);
      const outcomes = new Set<string>();
      for (let seed = 1; seed <= 50; seed++) {
        const result = shuffleProspectiveSignals(dealt, nodeCount, "off", seed);
        expectShuffleInvariants(dealt, result.nodes);
        expect(result.nextSeed).toBe(seedAfter(seed, 2 * 2 * nodeCount));
        outcomes.add(JSON.stringify(prospectiveSignals(result.nodes)));
      }
      expect(outcomes.size).toBeGreaterThan(1);
    },
  );
});
