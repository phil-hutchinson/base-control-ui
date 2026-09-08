import { describe, expect, it } from "vitest";
import {
  CHARGED_COUNTDOWN_PLIES,
  EXIT_COUNTDOWN_PLIES,
  TRAP_COUNTDOWN_PLIES,
  countdownNumber,
  nodeCyclePosition,
  spendPly,
} from "./countdown";

describe("constants", () => {
  it("sets both charged and trap countdowns to eleven plies, and the exit to two", () => {
    expect(CHARGED_COUNTDOWN_PLIES).toBe(11);
    expect(TRAP_COUNTDOWN_PLIES).toBe(11);
    expect(EXIT_COUNTDOWN_PLIES).toBe(2);
  });
});

describe("spendPly", () => {
  it("subtracts one ply", () => {
    expect(spendPly(11)).toBe(10);
    expect(spendPly(1)).toBe(0);
  });

  it("floors at zero", () => {
    expect(spendPly(0)).toBe(0);
  });
});

describe("countdownNumber", () => {
  // rules.md §8.3's charged-hold table, pinned row for row.
  const CHARGED_ROW: readonly [pliesLeft: number, expected: number][] = [
    [11, 6],
    [10, 5],
    [9, 5],
    [8, 4],
    [7, 4],
    [6, 3],
    [5, 3],
    [4, 2],
    [3, 2],
    [2, 1],
    [1, 1],
  ];

  // rules.md §8.3's trap table, pinned row for row.
  const TRAP_ROW: readonly [pliesLeft: number, expected: number][] = [
    [11, 5],
    [10, 5],
    [9, 4],
    [8, 4],
    [7, 3],
    [6, 3],
    [5, 2],
    [4, 2],
    [3, 1],
    [2, 1],
    [1, 1],
  ];

  it.each(CHARGED_ROW)(
    "reads %i plies left on a held charged node as %i",
    (pliesLeft, expected) => {
      expect(countdownNumber("charged", pliesLeft, true)).toBe(expected);
    },
  );

  it.each(TRAP_ROW)(
    "reads %i plies left on a trap as %i",
    (pliesLeft, expected) => {
      expect(countdownNumber("depleted", pliesLeft, true)).toBe(expected);
    },
  );

  it("shows no number on a charged node with no countdown", () => {
    expect(countdownNumber("charged", 0, false)).toBeUndefined();
    expect(countdownNumber("charged", 0, true)).toBeUndefined();
  });

  it("shows no number on an exit node, whatever plies it has left", () => {
    expect(countdownNumber("depleted", 2, false)).toBeUndefined();
    expect(countdownNumber("depleted", 1, false)).toBeUndefined();
  });

  it("shows no number on an inactive node", () => {
    expect(countdownNumber("inactive", 2, false)).toBeUndefined();
    expect(countdownNumber("inactive", 2, true)).toBeUndefined();
  });
});

describe("nodeCyclePosition", () => {
  it("sits at the minimum for a charged node with no countdown", () => {
    expect(nodeCyclePosition("charged", 0, false)).toBe(0);
    expect(nodeCyclePosition("charged", 0, true)).toBe(0);
  });

  it("starts a charged countdown at the minimum and ends it at the maximum", () => {
    expect(nodeCyclePosition("charged", 11, true)).toBe(0);
    expect(nodeCyclePosition("charged", 1, true)).toBe(1);
  });

  it("rises by exactly one tenth per ply on a held charged node", () => {
    const positions = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((plies) =>
      nodeCyclePosition("charged", plies, true),
    );
    for (let index = 1; index < positions.length; index++) {
      expect(positions[index] - positions[index - 1]).toBeCloseTo(0.1);
    }
  });

  it("travels a trap the same way as a held charged node", () => {
    for (const plies of [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) {
      expect(nodeCyclePosition("depleted", plies, true)).toBeCloseTo(
        nodeCyclePosition("charged", plies, true),
      );
    }
  });

  it("sits at the minimum for an exit node at both of its plies", () => {
    expect(nodeCyclePosition("depleted", 2, false)).toBe(0);
    expect(nodeCyclePosition("depleted", 1, false)).toBe(0);
  });

  it("never returns a position outside [0, 1]", () => {
    const states: readonly ["charged" | "depleted", number, boolean][] = [
      ["charged", 0, false],
      ["charged", 11, true],
      ["charged", 1, true],
      ["depleted", 11, true],
      ["depleted", 1, true],
      ["depleted", 2, false],
      ["depleted", 1, false],
      ["depleted", 0, true],
    ];
    for (const [state, plies, hasShip] of states) {
      const position = nodeCyclePosition(state, plies, hasShip);
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThanOrEqual(1);
    }
  });
});
