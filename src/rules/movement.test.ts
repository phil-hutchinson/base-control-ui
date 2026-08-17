import { describe, expect, it } from "vitest";
import { isOnBoard, squareFromName, squareName } from "./board";
import { reachFrom } from "./movement";
import type { ShieldCount } from "./shields";

function destinationNames(origin: string, shields: ShieldCount): string[] {
  return reachFrom(squareFromName(origin), shields)
    .map((entry) => squareName(entry.destination))
    .sort();
}

describe("reachFrom", () => {
  it("matches §6's table exactly from an unobstructed centre square", () => {
    expect(destinationNames("H8", 4)).toEqual(["G8", "H7", "H9", "I8"].sort());

    expect(destinationNames("H8", 3)).toEqual(
      ["G7", "G8", "G9", "H7", "H9", "I7", "I8", "I9"].sort(),
    );

    expect(destinationNames("H8", 2)).toEqual(
      [
        "F8",
        "G7",
        "G8",
        "G9",
        "H6",
        "H7",
        "H9",
        "H10",
        "I7",
        "I8",
        "I9",
        "J8",
      ].sort(),
    );

    expect(destinationNames("H8", 1)).toEqual(
      [
        "F6",
        "F8",
        "F10",
        "G7",
        "G8",
        "G9",
        "H6",
        "H7",
        "H9",
        "H10",
        "I7",
        "I8",
        "I9",
        "J6",
        "J8",
        "J10",
      ].sort(),
    );

    expect(destinationNames("H8", 0)).toEqual(
      [
        "E8",
        "F6",
        "F8",
        "F10",
        "G7",
        "G8",
        "G9",
        "H5",
        "H6",
        "H7",
        "H9",
        "H10",
        "H11",
        "I7",
        "I8",
        "I9",
        "J6",
        "J8",
        "J10",
        "K8",
      ].sort(),
    );

    expect(destinationNames("H8", 4)).toHaveLength(4);
    expect(destinationNames("H8", 3)).toHaveLength(8);
    expect(destinationNames("H8", 2)).toHaveLength(12);
    expect(destinationNames("H8", 1)).toHaveLength(16);
    expect(destinationNames("H8", 0)).toHaveLength(20);
  });

  it("accumulates downward: each shield count's set is a superset of the next higher's", () => {
    const shieldCounts: readonly ShieldCount[] = [4, 3, 2, 1, 0];

    for (let index = 0; index < shieldCounts.length - 1; index++) {
      const fewerShieldsSet = new Set(
        destinationNames("H8", shieldCounts[index]),
      );
      const moreShieldsSet = new Set(
        destinationNames("H8", shieldCounts[index + 1]),
      );

      for (const square of fewerShieldsSet) {
        expect(moreShieldsSet.has(square)).toBe(true);
      }
    }
  });

  it("never reaches three squares diagonally, at any shield count", () => {
    for (const shields of [0, 1, 2, 3, 4] as const) {
      const destinations = destinationNames("H8", shields);
      expect(destinations).not.toContain("K11");
      expect(destinations).not.toContain("E5");
    }
  });

  it("is clipped by the board's edges", () => {
    for (const shields of [0, 1, 2, 3, 4] as const) {
      const cornerEntries = reachFrom(squareFromName("A1"), shields);
      const edgeEntries = reachFrom(squareFromName("A8"), shields);

      for (const entry of [...cornerEntries, ...edgeEntries]) {
        expect(isOnBoard(entry.destination.column, entry.destination.row)).toBe(
          true,
        );
        for (const square of entry.passedOver) {
          expect(isOnBoard(square.column, square.row)).toBe(true);
        }
      }

      const unobstructedCount = destinationNames("H8", shields).length;
      expect(cornerEntries.length).toBeLessThan(unobstructedCount);
      expect(edgeEntries.length).toBeLessThan(unobstructedCount);
    }
  });

  it("names the squares passed over, excluding the origin and the destination", () => {
    const origin = squareFromName("H8");

    const threeSquareEntry = reachFrom(origin, 0).find(
      (entry) => squareName(entry.destination) === "K8",
    );
    expect(threeSquareEntry).toBeDefined();
    expect(threeSquareEntry?.passedOver.map(squareName)).toEqual(["I8", "J8"]);

    const twoSquareEntry = reachFrom(origin, 2).find(
      (entry) => squareName(entry.destination) === "J8",
    );
    expect(twoSquareEntry).toBeDefined();
    expect(twoSquareEntry?.passedOver.map(squareName)).toEqual(["I8"]);

    const oneSquareEntry = reachFrom(origin, 4).find(
      (entry) => squareName(entry.destination) === "I8",
    );
    expect(oneSquareEntry).toBeDefined();
    expect(oneSquareEntry?.passedOver).toEqual([]);
  });
});
