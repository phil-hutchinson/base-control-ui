import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName, type Square } from "./board";
import {
  FLEET_SIZES,
  MAX_SHIPS_PER_SIDE,
  startingFleet,
  type FleetEntry,
  type FleetSize,
} from "./fleet";
import { isPowerLevel, MAX_POWER } from "./power";

/** §4's seven-a-side layout, clockwise from H15. */
const SEVEN_A_SIDE: readonly [string, "green" | "red"][] = [
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

/**
 * §4's six-a-side layout, clockwise from H15: H15 and H1 start empty, so the
 * list starts at L15, the first occupied bay after H15, and skips straight
 * from L1 to D1 where H1 would otherwise sit.
 */
const SIX_A_SIDE: readonly [string, "green" | "red"][] = [
  ["L15", "red"],
  ["O14", "green"],
  ["O10", "red"],
  ["O6", "green"],
  ["O2", "red"],
  ["L1", "green"],
  ["D1", "green"],
  ["A2", "red"],
  ["A6", "green"],
  ["A10", "red"],
  ["A14", "green"],
  ["D15", "red"],
];

/**
 * §4's five-a-side layout, clockwise from H15: O14, O2, A14 and A2 start
 * empty, and the colours on the two four-bay edges are reversed from the
 * seven-ship game.
 */
const FIVE_A_SIDE: readonly [string, "green" | "red"][] = [
  ["H15", "green"],
  ["L15", "red"],
  ["O10", "green"],
  ["O6", "red"],
  ["L1", "green"],
  ["H1", "red"],
  ["D1", "green"],
  ["A6", "red"],
  ["A10", "green"],
  ["D15", "red"],
];

const LAYOUTS_BY_FLEET_SIZE: Readonly<
  Record<FleetSize, readonly [string, "green" | "red"][]>
> = {
  5: FIVE_A_SIDE,
  6: SIX_A_SIDE,
  7: SEVEN_A_SIDE,
};

/** §4's empty starting bays, per fleet size. */
const EMPTY_BAYS_BY_FLEET_SIZE: Readonly<Record<FleetSize, readonly string[]>> =
  {
    5: ["O14", "O2", "A14", "A2"],
    6: ["H15", "H1"],
    7: [],
  };

function entryBySquare(
  fleet: readonly FleetEntry[],
  square: Square,
): FleetEntry | undefined {
  return fleet.find((entry) => squareName(entry.square) === squareName(square));
}

describe("FLEET_SIZES", () => {
  it("is largest first, so the leftmost start-screen choice is the default game", () => {
    expect(FLEET_SIZES).toEqual([7, 6, 5]);
  });

  it("puts the largest fleet size in MAX_SHIPS_PER_SIDE regardless of list order", () => {
    expect(MAX_SHIPS_PER_SIDE).toBe(7);
  });
});

describe.each(FLEET_SIZES)("starting fleet for %i a side", (fleetSize) => {
  const fleet = startingFleet(fleetSize);
  const expectedLayout = LAYOUTS_BY_FLEET_SIZE[fleetSize];

  it("matches §4's transcribed layout, square by square, in clockwise order", () => {
    expect(
      fleet.map((entry) => [squareName(entry.square), entry.side] as const),
    ).toEqual(expectedLayout);
  });

  it(`has ${fleetSize * 2} ships, ${fleetSize} a side`, () => {
    expect(fleet).toHaveLength(fleetSize * 2);
    const green = fleet.filter((entry) => entry.side === "green");
    const red = fleet.filter((entry) => entry.side === "red");
    expect(green).toHaveLength(fleetSize);
    expect(red).toHaveLength(fleetSize);
  });

  it("stands every ship on a bay, one ship per bay, and leaves §4's empty bays empty", () => {
    const bayNames = new Set(BAYS.map(squareName));
    const fleetSquareNames = fleet.map((entry) => squareName(entry.square));

    for (const name of fleetSquareNames) {
      expect(bayNames.has(name)).toBe(true);
    }
    expect(new Set(fleetSquareNames).size).toBe(fleetSquareNames.length);

    for (const emptyBay of EMPTY_BAYS_BY_FLEET_SIZE[fleetSize]) {
      expect(fleetSquareNames).not.toContain(emptyBay);
    }
    expect(fleetSquareNames).toHaveLength(
      bayNames.size - EMPTY_BAYS_BY_FLEET_SIZE[fleetSize].length,
    );
  });

  it("gives every ship a power level within the 0-4 range, and starts every ship at full power", () => {
    for (const entry of fleet) {
      expect(isPowerLevel(entry.power)).toBe(true);
      expect(entry.power).toBe(MAX_POWER);
    }
  });

  it("gives every ship a distinct id, numbered 1..N per side with no gaps", () => {
    const ids = fleet.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    const expectedNumbers = Array.from(
      { length: fleetSize },
      (_, index) => index + 1,
    );

    for (const side of ["green", "red"] as const) {
      const sideNumbers = fleet
        .filter((entry) => entry.side === side)
        .map((entry) => {
          const [prefix, numberText] = entry.id.split("-");
          expect(prefix).toBe(side);
          return Number(numberText);
        });

      expect(new Set(sideNumbers)).toEqual(new Set(expectedNumbers));
    }
  });

  it("numbers each side's ids in ascending order within the fleet list", () => {
    const expectedNumbers = Array.from(
      { length: fleetSize },
      (_, index) => index + 1,
    );

    for (const side of ["green", "red"] as const) {
      const sideNumbers = fleet
        .filter((entry) => entry.side === side)
        .map((entry) => Number(entry.id.split("-")[1]));

      expect(sideNumbers).toEqual(expectedNumbers);
    }
  });

  it("is a half-turn rotation of itself, so the two fleets mirror each other", () => {
    const columnIndex = new Map(
      COLUMN_LETTERS.map((letter, index) => [letter, index]),
    );
    const columnAt = new Map(
      COLUMN_LETTERS.map((letter, index) => [index, letter]),
    );

    for (const entry of fleet) {
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
      const rotatedShip = entryBySquare(fleet, rotatedSquare);

      expect(rotatedShip).toBeDefined();
      expect(rotatedShip?.side).not.toBe(entry.side);
    }
  });
});

describe("alternation around the clockwise ring", () => {
  // Holds for the seven- and five-ship layouts, which alternate all the way
  // round, including the wraparound. It does not hold for the six-ship
  // layout by design (rules.md §4): dropping H15 leaves D15 red next to L15
  // red, and dropping H1 leaves L1 green next to D1 green.
  it.each([7, 5] as const)(
    "alternates sides around the clockwise ring, including the wraparound, at %i a side",
    (fleetSize) => {
      const fleet = startingFleet(fleetSize);
      for (let index = 0; index < fleet.length; index++) {
        const current = fleet[index];
        const next = fleet[(index + 1) % fleet.length];
        expect(next.side).not.toBe(current.side);
      }
    },
  );
});

describe("startingFleet(7)", () => {
  it("assigns green-1 to H15 and red-1 to L15", () => {
    const fleet = startingFleet(7);
    const green1 = entryBySquare(fleet, squareAt("H", 15));
    const red1 = entryBySquare(fleet, squareAt("L", 15));

    expect(green1?.id).toBe("green-1");
    expect(red1?.id).toBe("red-1");
  });
});
