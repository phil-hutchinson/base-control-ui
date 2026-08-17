import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { STARTING_FLEET } from "./fleet";
import { shipsBySquare, siteStateAt, startingGameState } from "./gameState";

describe("startingGameState", () => {
  it("has fourteen ships matching STARTING_FLEET entry for entry", () => {
    const state = startingGameState();

    expect(state.ships).toHaveLength(14);
    state.ships.forEach((ship, index) => {
      const entry = STARTING_FLEET[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
      expect(ship.shields).toBe(entry.shields);
    });
  });

  it("has green to move, two actions remaining, and nothing moved", () => {
    const state = startingGameState();

    expect(state.sideToMove).toBe("green");
    expect(state.actionsRemaining).toBe(2);
    expect(state.movedThisPly).toEqual([]);
  });

  it("gives every site a state: five active, twelve dormant, none charged or depleted", () => {
    const state = startingGameState();

    const activeSites = ["H8", "E5", "K5", "E11", "K11"];
    const dormantSites = [
      "F2",
      "J2",
      "B4",
      "H4",
      "N4",
      "D8",
      "L8",
      "B12",
      "H12",
      "N12",
      "F14",
      "J14",
    ];

    for (const name of activeSites) {
      expect(siteStateAt(state, squareFromName(name))).toBe("active");
    }
    for (const name of dormantSites) {
      expect(siteStateAt(state, squareFromName(name))).toBe("dormant");
    }

    const allStates = Object.values(state.siteStates);
    expect(allStates.filter((s) => s === "active")).toHaveLength(5);
    expect(allStates.filter((s) => s === "dormant")).toHaveLength(12);
    expect(allStates.filter((s) => s === "charged")).toHaveLength(0);
    expect(allStates.filter((s) => s === "depleted")).toHaveLength(0);
  });

  it("gives a non-site square no state", () => {
    const state = startingGameState();

    expect(siteStateAt(state, squareFromName("A1"))).toBeUndefined();
  });

  it("finds a ship on each of the fourteen bay squares and none on an ordinary square", () => {
    const state = startingGameState();
    const index = shipsBySquare(state);

    for (const entry of STARTING_FLEET) {
      const ship = index.get(squareName(entry.square));
      expect(ship?.id).toBe(entry.id);
    }

    expect(index.get("H8")).toBeUndefined();
  });

  it("builds equal but independent values each time", () => {
    const first = startingGameState();
    const second = startingGameState();

    expect(first).toEqual(second);
    expect(first.ships).not.toBe(second.ships);
    expect(first.siteStates).not.toBe(second.siteStates);
    expect(first.movedThisPly).not.toBe(second.movedThisPly);
  });
});
