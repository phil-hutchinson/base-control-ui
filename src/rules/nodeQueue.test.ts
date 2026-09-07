import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  chebyshevDistance,
  squareAt,
  squareName,
} from "./board";
import { PLANETS, isPlanet } from "./planets";
import { legalNodePool } from "./nodePlacement";
import { mulberry32 } from "./random";
import {
  INACTIVE_NODE_COUNT,
  type InactiveNodeDraw,
  type NodePriority,
  PRIORITY_PERMUTATIONS,
  TOP_NODE_PRIORITY,
  inactivePriority,
  orderByPriorityDescending,
  refillQueue,
  rotatePriority,
} from "./nodeQueue";

/** A fixed four-charged board, spread well apart from the board's edges and from each other, for the refill tests to draw a fresh trio against. */
const CHARGED_SQUARES: readonly Square[] = [
  squareAt("D", 4),
  squareAt("L", 4),
  squareAt("D", 12),
  squareAt("L", 12),
];

function isAdjacent(a: Square, b: Square): boolean {
  return chebyshevDistance(a, b) <= 1;
}

/** Whether a square sits exactly one ring in from the nearest edge — the ring the widened pool opens up that the strict pool keeps closed. */
function isOneRingFromEdge(square: Square): boolean {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const columnDistance = Math.min(
    columnIndex,
    COLUMN_LETTERS.length - 1 - columnIndex,
  );
  const rowDistance = Math.min(square.row - 1, BOARD_SIZE - square.row);
  return Math.min(columnDistance, rowDistance) === 1;
}

describe("constants", () => {
  it("keeps the queue at three nodes with priority three charging next", () => {
    expect(INACTIVE_NODE_COUNT).toBe(3);
    expect(TOP_NODE_PRIORITY).toBe(3);
  });

  it("lists the six permutations of (1, 2, 3) in lexicographic order", () => {
    expect(PRIORITY_PERMUTATIONS).toEqual([
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ]);
  });
});

describe("refillQueue", () => {
  it("deals three distinct squares, none adjacent to each other, to a charged node or to a planet, and none on the outer edge, over many seeds", () => {
    for (let seed = 0; seed < 200; seed++) {
      const [nodes] = refillQueue(CHARGED_SQUARES, CHARGED_SQUARES, [], seed);

      expect(nodes).toHaveLength(3);
      const names = nodes.map((node) => squareName(node.square));
      expect(new Set(names).size).toBe(3);

      for (const node of nodes) {
        expect(node.square.row).not.toBe(1);
        expect(node.square.row).not.toBe(BOARD_SIZE);
        expect(node.square.column).not.toBe("A");
        expect(node.square.column).not.toBe("O");
        expect(isPlanet(node.square)).toBe(false);
        for (const planet of PLANETS) {
          expect(isAdjacent(node.square, planet)).toBe(false);
        }
        for (const charged of CHARGED_SQUARES) {
          expect(isAdjacent(node.square, charged)).toBe(false);
        }
      }

      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          expect(isAdjacent(nodes[a].square, nodes[b].square)).toBe(false);
        }
      }
    }
  });

  it("never draws a square that already holds a node, or that a ship stands on", () => {
    const occupied = [...CHARGED_SQUARES, squareAt("H", 8)];
    const shipSquares = [squareAt("F", 6)];

    for (let seed = 0; seed < 100; seed++) {
      const [nodes] = refillQueue(occupied, CHARGED_SQUARES, shipSquares, seed);
      const names = nodes.map((node) => squareName(node.square));

      expect(names).not.toContain("H8");
      expect(names).not.toContain("F6");
    }
  });

  it("draws the first square from the strict pool, and the second and third from the widened pool computed against the squares drawn so far", () => {
    for (let seed = 0; seed < 100; seed++) {
      const [nodes] = refillQueue(CHARGED_SQUARES, CHARGED_SQUARES, [], seed);

      const strictPool = legalNodePool(CHARGED_SQUARES, []);
      expect(strictPool.map(squareName)).toContain(squareName(nodes[0].square));

      const widenedPoolAfterFirst = legalNodePool(
        [...CHARGED_SQUARES, nodes[0].square],
        [],
        "widened",
      );
      expect(widenedPoolAfterFirst.map(squareName)).toContain(
        squareName(nodes[1].square),
      );

      const widenedPoolAfterSecond = legalNodePool(
        [...CHARGED_SQUARES, nodes[0].square, nodes[1].square],
        [],
        "widened",
      );
      expect(widenedPoolAfterSecond.map(squareName)).toContain(
        squareName(nodes[2].square),
      );
    }
  });

  it("lands the second or third square one ring in from the edge at least once over several thousand seeds — the point of widening the pool", () => {
    let sawRingOneSquare = false;

    for (let seed = 0; seed < 3000 && !sawRingOneSquare; seed++) {
      const [nodes] = refillQueue(CHARGED_SQUARES, CHARGED_SQUARES, [], seed);
      sawRingOneSquare =
        isOneRingFromEdge(nodes[1].square) ||
        isOneRingFromEdge(nodes[2].square);
    }

    expect(sawRingOneSquare).toBe(true);
  });

  it("always deals exactly the priorities {1, 2, 3}, with no repeat", () => {
    for (let seed = 0; seed < 300; seed++) {
      const [nodes] = refillQueue(CHARGED_SQUARES, CHARGED_SQUARES, [], seed);
      const priorities = nodes.map((node) => node.priority).sort();

      expect(priorities).toEqual([1, 2, 3]);
    }
  });

  it("deals each of the six priority permutations roughly a sixth of the time, over several thousand refills", () => {
    const counts = PRIORITY_PERMUTATIONS.map(() => 0);
    const trials = 6000;
    let seed = 20260906;

    for (let i = 0; i < trials; i++) {
      const [nodes, nextSeed] = refillQueue(
        CHARGED_SQUARES,
        CHARGED_SQUARES,
        [],
        seed,
      );
      seed = nextSeed;

      const order = nodes.map((node) => node.priority);
      const index = PRIORITY_PERMUTATIONS.findIndex(
        (permutation) =>
          permutation[0] === order[0] &&
          permutation[1] === order[1] &&
          permutation[2] === order[2],
      );
      expect(index).toBeGreaterThanOrEqual(0);
      counts[index] += 1;
    }

    for (const count of counts) {
      expect(count / trials).toBeGreaterThan(0.1);
      expect(count / trials).toBeLessThan(0.23);
    }
  });

  it("advances the seed by exactly four mulberry32 steps", () => {
    const seed = 55;
    let expectedSeed = seed;
    for (let step = 0; step < 4; step++) {
      [, expectedSeed] = mulberry32(expectedSeed);
    }

    const [, nextSeed] = refillQueue(
      CHARGED_SQUARES,
      CHARGED_SQUARES,
      [],
      seed,
    );

    expect(nextSeed).toBe(expectedSeed);
  });

  it("returns the same trio, in the same order, with the same priorities, for the same seed", () => {
    const first = refillQueue(CHARGED_SQUARES, CHARGED_SQUARES, [], 4242);
    const second = refillQueue(CHARGED_SQUARES, CHARGED_SQUARES, [], 4242);

    expect(first).toEqual(second);
  });

  it("spreads a freshly dealt trio measurably apart: mean smallest pairwise gap above 4.5 over several thousand refills", () => {
    // story.md measured 5.08 for the weighted draw against 3.98 unweighted,
    // over the same pools; this leaves comfortable margin below the
    // weighted figure alone.
    const trials = 4000;
    let seed = 900001;
    let totalMinimumGap = 0;

    for (let i = 0; i < trials; i++) {
      const [nodes, nextSeed] = refillQueue(
        CHARGED_SQUARES,
        CHARGED_SQUARES,
        [],
        seed,
      );
      seed = nextSeed;

      let minimumGap = Infinity;
      for (let a = 0; a < nodes.length; a++) {
        for (let b = a + 1; b < nodes.length; b++) {
          minimumGap = Math.min(
            minimumGap,
            chebyshevDistance(nodes[a].square, nodes[b].square),
          );
        }
      }
      totalMinimumGap += minimumGap;
    }

    expect(totalMinimumGap / trials).toBeGreaterThan(4.5);
  });
});

describe("inactivePriority", () => {
  it("reads the priority straight off the status's level", () => {
    expect(inactivePriority({ level: 1 })).toBe(1);
    expect(inactivePriority({ level: 2 })).toBe(2);
    expect(inactivePriority({ level: 3 })).toBe(3);
  });
});

describe("rotatePriority", () => {
  it("maps 1 to 2, 2 to 3 and 3 to 1", () => {
    expect(rotatePriority(1)).toBe(2);
    expect(rotatePriority(2)).toBe(3);
    expect(rotatePriority(3)).toBe(1);
  });

  it("is a cycle of length three", () => {
    let priority: NodePriority = 1;
    priority = rotatePriority(priority);
    priority = rotatePriority(priority);
    expect(priority).toBe(3);
    priority = rotatePriority(priority);
    expect(priority).toBe(1);
  });
});

describe("orderByPriorityDescending", () => {
  it("puts priority 3 first, then 2, then 1", () => {
    const nodes: InactiveNodeDraw[] = [
      { square: squareAt("D", 4), priority: 1 },
      { square: squareAt("L", 4), priority: 3 },
      { square: squareAt("D", 12), priority: 2 },
    ];

    const ordered = orderByPriorityDescending(nodes);

    expect(ordered.map((node) => node.priority)).toEqual([3, 2, 1]);
  });

  it("does not mutate the array it is given", () => {
    const nodes: InactiveNodeDraw[] = [
      { square: squareAt("D", 4), priority: 1 },
      { square: squareAt("L", 4), priority: 3 },
    ];
    const original = [...nodes];

    orderByPriorityDescending(nodes);

    expect(nodes).toEqual(original);
  });
});
