import { describe, expect, it } from "vitest";
import { COLUMN_LETTERS, squareAt } from "../rules/board";
import { allShapesFrom } from "../rules/movement";
import type { MovementCostOffset } from "./movementCosts";
import { movementCostOffsets } from "./movementCosts";

function sortOffsets(
  offsets: readonly MovementCostOffset[],
): readonly MovementCostOffset[] {
  return [...offsets].sort((a, b) =>
    a.deltaColumn !== b.deltaColumn
      ? a.deltaColumn - b.deltaColumn
      : a.deltaRow - b.deltaRow,
  );
}

function find(
  offsets: readonly MovementCostOffset[],
  deltaColumn: number,
  deltaRow: number,
): MovementCostOffset | undefined {
  return offsets.find(
    (offset) =>
      offset.deltaColumn === deltaColumn && offset.deltaRow === deltaRow,
  );
}

describe("movementCostOffsets", () => {
  const offsets = movementCostOffsets();

  it("returns exactly twenty offsets", () => {
    expect(offsets).toHaveLength(20);
  });

  it("costs the four orthogonal neighbours 0", () => {
    for (const [deltaColumn, deltaRow] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      expect(find(offsets, deltaColumn, deltaRow)?.cost).toBe(0);
    }
  });

  it("costs the four diagonal neighbours 1", () => {
    for (const [deltaColumn, deltaRow] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      expect(find(offsets, deltaColumn, deltaRow)?.cost).toBe(1);
    }
  });

  it("costs the four straight two-step squares 2", () => {
    for (const [deltaColumn, deltaRow] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ] as const) {
      expect(find(offsets, deltaColumn, deltaRow)?.cost).toBe(2);
    }
  });

  it("costs the eight L-shaped two-step squares 2", () => {
    for (const [deltaColumn, deltaRow] of [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ] as const) {
      expect(find(offsets, deltaColumn, deltaRow)?.cost).toBe(2);
    }
  });

  it("has no offset for the centre or the four (±2, ±2) corners", () => {
    for (const [deltaColumn, deltaRow] of [
      [0, 0],
      [2, 2],
      [2, -2],
      [-2, 2],
      [-2, -2],
    ] as const) {
      expect(find(offsets, deltaColumn, deltaRow)).toBeUndefined();
    }
  });

  it("does not change with the origin chosen, as long as it is central", () => {
    const secondOrigin = squareAt("L", 12);
    const secondOriginColumnIndex = COLUMN_LETTERS.indexOf(secondOrigin.column);

    const fromSecondOrigin = allShapesFrom(secondOrigin).map((entry) => ({
      deltaColumn:
        COLUMN_LETTERS.indexOf(entry.destination.column) -
        secondOriginColumnIndex,
      deltaRow: entry.destination.row - secondOrigin.row,
      cost: entry.cost,
    }));

    expect(sortOffsets(fromSecondOrigin)).toEqual(sortOffsets(offsets));
  });
});
