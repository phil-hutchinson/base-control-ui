import { describe, expect, it } from "vitest";
import {
  BAYS,
  CLOCKWISE_BAYS,
  STARTING_RETURN_POSITION_INDEX,
  bayNumberingFrom,
  driftReturnPositionIndex,
  isBay,
} from "./bays";
import {
  COLUMN_LETTERS,
  type Square,
  isOnBoard,
  squareAt,
  squareName,
} from "./board";
import { STARTING_FLEET } from "./fleet";

/**
 * The 56 squares on the board's outer edge, in clockwise order starting at
 * the top-left corner (A15): along the top left to right, down the right
 * side, along the bottom right to left, and up the left side.
 */
function perimeterRing(): Square[] {
  const ring: Square[] = [];
  const columns = COLUMN_LETTERS;
  const last = columns.length - 1;

  for (const column of columns) {
    ring.push(squareAt(column, 15));
  }
  for (let row = 14; row >= 1; row--) {
    ring.push(squareAt(columns[last], row));
  }
  for (let index = last - 1; index >= 0; index--) {
    ring.push(squareAt(columns[index], 1));
  }
  for (let row = 2; row <= 14; row++) {
    ring.push(squareAt(columns[0], row));
  }

  return ring;
}

describe("bays", () => {
  it("has exactly fourteen bays", () => {
    expect(BAYS).toHaveLength(14);
  });

  it("lies entirely on the outer edge", () => {
    for (const bay of BAYS) {
      const onEdge =
        bay.column === "A" ||
        bay.column === "O" ||
        bay.row === 1 ||
        bay.row === 15;
      expect(onEdge).toBe(true);
    }
  });

  it("contains no corner", () => {
    const corners = new Set(["A1", "A15", "O1", "O15"]);
    for (const bay of BAYS) {
      expect(corners.has(squareName(bay))).toBe(false);
    }
  });

  it("has every bay on the board", () => {
    for (const bay of BAYS) {
      expect(isOnBoard(bay.column, bay.row)).toBe(true);
    }
  });

  it("sits every fourth square around the 56-square perimeter", () => {
    const ring = perimeterRing();
    expect(ring).toHaveLength(56);

    const ringNames = ring.map(squareName);
    const bayIndices = BAYS.map((bay) => {
      const index = ringNames.indexOf(squareName(bay));
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    }).sort((a, b) => a - b);

    for (let i = 1; i < bayIndices.length; i++) {
      expect(bayIndices[i] - bayIndices[i - 1]).toBe(4);
    }
    // The gap wrapping from the last bay back to the first is also four.
    expect(56 - bayIndices[bayIndices.length - 1] + bayIndices[0]).toBe(4);
  });

  it("matches isBay for every bay and rejects a sample of non-bay squares", () => {
    for (const bay of BAYS) {
      expect(isBay(bay)).toBe(true);
    }
    expect(isBay(squareAt("A", 1))).toBe(false);
    expect(isBay(squareAt("H", 8))).toBe(false);
    expect(isBay(squareAt("O", 15))).toBe(false);
  });
});

describe("CLOCKWISE_BAYS", () => {
  it("has fourteen entries", () => {
    expect(CLOCKWISE_BAYS).toHaveLength(14);
  });

  it("is a permutation of BAYS", () => {
    const bayNames = new Set(BAYS.map(squareName));
    const clockwiseNames = CLOCKWISE_BAYS.map(squareName);

    expect(new Set(clockwiseNames)).toEqual(bayNames);
    expect(clockwiseNames).toHaveLength(new Set(clockwiseNames).size);
  });

  it("matches rules.md §4's starting-fleet listing square for square", () => {
    expect(CLOCKWISE_BAYS.map(squareName)).toEqual(
      STARTING_FLEET.map((entry) => squareName(entry.square)),
    );
  });

  it("moves four squares along the 56-square perimeter between consecutive entries, in one direction, wrapping once", () => {
    const ring = perimeterRing();
    const ringNames = ring.map(squareName);
    const clockwiseIndices = CLOCKWISE_BAYS.map((bay) => {
      const index = ringNames.indexOf(squareName(bay));
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    });

    for (let i = 1; i < clockwiseIndices.length; i++) {
      const step =
        (clockwiseIndices[i] - clockwiseIndices[i - 1] + ring.length) %
        ring.length;
      expect(step).toBe(4);
    }
    const wrap =
      (clockwiseIndices[0] -
        clockwiseIndices[clockwiseIndices.length - 1] +
        ring.length) %
      ring.length;
    expect(wrap).toBe(4);
  });
});

describe("driftReturnPositionIndex", () => {
  it("moves from H15's index to D15's index", () => {
    const h15Index = STARTING_RETURN_POSITION_INDEX;
    const d15Index = CLOCKWISE_BAYS.length - 1;

    expect(squareName(CLOCKWISE_BAYS[h15Index])).toBe("H15");
    expect(squareName(CLOCKWISE_BAYS[d15Index])).toBe("D15");
    expect(driftReturnPositionIndex(h15Index)).toBe(d15Index);
  });

  it("returns to the start after fourteen applications", () => {
    let index = STARTING_RETURN_POSITION_INDEX;
    for (let i = 0; i < CLOCKWISE_BAYS.length; i++) {
      index = driftReturnPositionIndex(index);
    }
    expect(index).toBe(STARTING_RETURN_POSITION_INDEX);
  });

  it("never leaves the range 0–13", () => {
    let index = STARTING_RETURN_POSITION_INDEX;
    for (let i = 0; i < 30; i++) {
      index = driftReturnPositionIndex(index);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CLOCKWISE_BAYS.length);
    }
  });
});

describe("bayNumberingFrom", () => {
  it("has fourteen entries with no repeats", () => {
    const order = bayNumberingFrom(STARTING_RETURN_POSITION_INDEX);
    expect(order).toHaveLength(14);
    expect(new Set(order.map(squareName)).size).toBe(14);
  });

  it("puts position 1 first and the next clockwise bay second", () => {
    const order = bayNumberingFrom(STARTING_RETURN_POSITION_INDEX);
    expect(squareName(order[0])).toBe(
      squareName(CLOCKWISE_BAYS[STARTING_RETURN_POSITION_INDEX]),
    );
    expect(squareName(order[1])).toBe(
      squareName(
        CLOCKWISE_BAYS[
          (STARTING_RETURN_POSITION_INDEX + 1) % CLOCKWISE_BAYS.length
        ],
      ),
    );
  });

  it("wraps from the last ring entry back to the first", () => {
    const lastIndex = CLOCKWISE_BAYS.length - 1;
    const order = bayNumberingFrom(lastIndex);
    expect(squareName(order[0])).toBe(squareName(CLOCKWISE_BAYS[lastIndex]));
    expect(squareName(order[1])).toBe(squareName(CLOCKWISE_BAYS[0]));
  });
});
