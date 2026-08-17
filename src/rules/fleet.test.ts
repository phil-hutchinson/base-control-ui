import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName } from "./board";
import { STARTING_FLEET, startingShipAt } from "./fleet";
import { isShieldCount } from "./shields";

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
      const rotatedShip = startingShipAt(rotatedSquare);

      expect(rotatedShip).toBeDefined();
      expect(rotatedShip?.side).not.toBe(entry.side);
    }
  });

  it("finds no starting ship on an ordinary square", () => {
    expect(startingShipAt(squareAt("H", 8))).toBeUndefined();
    expect(startingShipAt(squareAt("A", 1))).toBeUndefined();
  });

  it("gives every ship a shield count within the 0-4 range", () => {
    for (const entry of STARTING_FLEET) {
      expect(isShieldCount(entry.shields)).toBe(true);
    }
  });

  it("starts every ship on 0 shields", () => {
    for (const entry of STARTING_FLEET) {
      expect(entry.shields).toBe(0);
    }
  });

  it("gives every ship a distinct id, seven a side, numbered 1-7 with no gaps", () => {
    const ids = STARTING_FLEET.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(14);

    for (const side of ["green", "red"] as const) {
      const sideNumbers = STARTING_FLEET.filter(
        (entry) => entry.side === side,
      ).map((entry) => {
        const [prefix, numberText] = entry.id.split("-");
        expect(prefix).toBe(side);
        return Number(numberText);
      });

      expect(new Set(sideNumbers)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    }
  });

  it("numbers each side's ids in ascending order within the fleet list", () => {
    for (const side of ["green", "red"] as const) {
      const sideNumbers = STARTING_FLEET.filter(
        (entry) => entry.side === side,
      ).map((entry) => Number(entry.id.split("-")[1]));

      expect(sideNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it("assigns green-1 to H15 and red-1 to L15", () => {
    const green1 = startingShipAt(squareAt("H", 15));
    const red1 = startingShipAt(squareAt("L", 15));

    expect(green1?.id).toBe("green-1");
    expect(red1?.id).toBe("red-1");
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
