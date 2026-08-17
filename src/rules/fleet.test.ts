import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName } from "./board";
import { STARTING_FLEET, startingSideAt } from "./fleet";

describe("starting fleet", () => {
  it("has fourteen ships, seven a side", () => {
    expect(STARTING_FLEET).toHaveLength(14);
    const green = STARTING_FLEET.filter((entry) => entry.side === "green");
    const red = STARTING_FLEET.filter((entry) => entry.side === "red");
    expect(green).toHaveLength(7);
    expect(red).toHaveLength(7);
  });

  it("stands every ship on a bay, one ship per bay", () => {
    const bayNames = new Set(BAYS.map(squareName));
    const fleetSquareNames = STARTING_FLEET.map((entry) =>
      squareName(entry.square),
    );

    for (const name of fleetSquareNames) {
      expect(bayNames.has(name)).toBe(true);
    }
    expect(new Set(fleetSquareNames).size).toBe(14);
    expect(fleetSquareNames.length).toBe(bayNames.size);
  });

  it("alternates sides around the clockwise ring, including the wraparound", () => {
    for (let index = 0; index < STARTING_FLEET.length; index++) {
      const current = STARTING_FLEET[index];
      const next = STARTING_FLEET[(index + 1) % STARTING_FLEET.length];
      expect(next.side).not.toBe(current.side);
    }
  });

  it("is a half-turn rotation of itself, so the two fleets mirror each other", () => {
    const columnIndex = new Map(
      COLUMN_LETTERS.map((letter, index) => [letter, index]),
    );
    const columnAt = new Map(
      COLUMN_LETTERS.map((letter, index) => [index, letter]),
    );

    for (const entry of STARTING_FLEET) {
      const index = columnIndex.get(entry.square.column);
      if (index === undefined) {
        throw new Error(`unknown column ${entry.square.column}`);
      }
      const rotatedColumn = columnAt.get(14 - index);
      const rotatedRow = 16 - entry.square.row;
      if (rotatedColumn === undefined) {
        throw new Error("rotation left the board");
      }
      const rotatedSquare = squareAt(rotatedColumn, rotatedRow);
      const rotatedSide = startingSideAt(rotatedSquare);

      expect(rotatedSide).toBeDefined();
      expect(rotatedSide).not.toBe(entry.side);
    }
  });

  it("finds no starting side on an ordinary square", () => {
    expect(startingSideAt(squareAt("H", 8))).toBeUndefined();
    expect(startingSideAt(squareAt("A", 1))).toBeUndefined();
  });

  it("matches §4's transcribed clockwise order from H15", () => {
    const expected: [string, "green" | "red"][] = [
      ["H15", "green"],
      ["L15", "red"],
      ["O14", "green"],
      ["O10", "red"],
      ["O6", "green"],
      ["O2", "red"],
      ["L1", "green"],
      ["H1", "red"],
      ["D1", "green"],
      ["A2", "red"],
      ["A6", "green"],
      ["A10", "red"],
      ["A14", "green"],
      ["D15", "red"],
    ];

    expect(
      STARTING_FLEET.map(
        (entry) => [squareName(entry.square), entry.side] as const,
      ),
    ).toEqual(expected);
  });
});
