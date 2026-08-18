import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { STARTING_FLEET } from "./fleet";
import {
  shipsBySquare,
  siteStateAt,
  siteStatusAt,
  startingGameState,
} from "./gameState";

const SEED = 12345;

describe("startingGameState", () => {
  it("has fourteen ships matching STARTING_FLEET entry for entry", () => {
    const state = startingGameState(SEED);

    expect(state.ships).toHaveLength(14);
    state.ships.forEach((ship, index) => {
      const entry = STARTING_FLEET[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
      expect(ship.shields).toBe(entry.shields);
    });
  });

  it("has green to move, two actions remaining, nothing moved, ply 1 and the given seed", () => {
    const state = startingGameState(SEED);

    expect(state.sideToMove).toBe("green");
    expect(state.actionsRemaining).toBe(2);
    expect(state.movedThisPly).toEqual([]);
    expect(state.plyNumber).toBe(1);
    expect(state.randomSeed).toBe(SEED);
  });

  it("gives every site a status: five active, twelve dormant, none charged or depleted, all entered on ply 0", () => {
    const state = startingGameState(SEED);

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

    const allStatuses = Object.values(state.siteStates);
    expect(allStatuses).toHaveLength(17);
    expect(
      allStatuses.filter((status) => status.state === "active"),
    ).toHaveLength(5);
    expect(
      allStatuses.filter((status) => status.state === "dormant"),
    ).toHaveLength(12);
    expect(
      allStatuses.filter((status) => status.state === "charged"),
    ).toHaveLength(0);
    expect(
      allStatuses.filter((status) => status.state === "depleted"),
    ).toHaveLength(0);
    for (const status of allStatuses) {
      expect(status.enteredOnPly).toBe(0);
    }
  });

  it("gives a non-site square no state or status", () => {
    const state = startingGameState(SEED);

    expect(siteStateAt(state, squareFromName("A1"))).toBeUndefined();
    expect(siteStatusAt(state, squareFromName("A1"))).toBeUndefined();
  });

  it("agrees with siteStatusAt: the state matches, and the status carries the clock", () => {
    const state = startingGameState(SEED);

    for (const name of ["H8", "F2"]) {
      const square = squareFromName(name);
      expect(siteStatusAt(state, square)).toEqual({
        state: siteStateAt(state, square),
        enteredOnPly: 0,
      });
    }
  });

  it("finds a ship on each of the fourteen bay squares and none on an ordinary square", () => {
    const state = startingGameState(SEED);
    const index = shipsBySquare(state);

    for (const entry of STARTING_FLEET) {
      const ship = index.get(squareName(entry.square));
      expect(ship?.id).toBe(entry.id);
    }

    expect(index.get("H8")).toBeUndefined();
  });

  it("builds equal but independent values each time", () => {
    const first = startingGameState(SEED);
    const second = startingGameState(SEED);

    expect(first).toEqual(second);
    expect(first.ships).not.toBe(second.ships);
    expect(first.siteStates).not.toBe(second.siteStates);
    expect(first.movedThisPly).not.toBe(second.movedThisPly);
  });
});
