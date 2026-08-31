import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { DEFAULT_FLEET_SIZE, startingFleet } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  shipsBySquare,
  siteStateAt,
  siteStatusAt,
  startingGameState,
} from "./gameState";

const SEED = 12345;
const STARTING_FLEET = startingFleet(7);

describe("startingGameState", () => {
  it("has fourteen ships matching STARTING_FLEET entry for entry", () => {
    const state = startingGameState(SEED);

    expect(state.ships).toHaveLength(14);
    state.ships.forEach((ship, index) => {
      const entry = STARTING_FLEET[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
      expect(ship.power).toBe(entry.power);
    });
  });

  it("has green to move, one action remaining, nothing moved, ply 1 and the given seed", () => {
    const state = startingGameState(SEED);

    expect(state.sideToMove).toBe("green");
    expect(state.actionsRemaining).toBe(1);
    expect(state.actedThisPly).toEqual([]);
    expect(state.plyNumber).toBe(1);
    expect(state.randomSeed).toBe(SEED);
  });

  it("gives every site a status: five charged at drain 0, twelve active at pressure 1, none dormant", () => {
    const state = startingGameState(SEED);

    const chargedSites = ["H8", "E5", "K5", "E11", "K11"];
    const activeSites = [
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

    for (const name of chargedSites) {
      const status = siteStatusAt(state, squareFromName(name));
      expect(status?.state).toBe("charged");
      expect(status?.level).toBe(0);
    }
    for (const name of activeSites) {
      const status = siteStatusAt(state, squareFromName(name));
      expect(status?.state).toBe("active");
      expect(status?.level).toBe(1);
    }

    const allStatuses = Object.values(state.siteStates);
    expect(allStatuses).toHaveLength(17);
    expect(
      allStatuses.filter((status) => status.state === "charged"),
    ).toHaveLength(5);
    expect(
      allStatuses.filter((status) => status.state === "active"),
    ).toHaveLength(12);
    expect(
      allStatuses.filter((status) => status.state === "dormant"),
    ).toHaveLength(0);
  });

  it("gives a non-site square no state or status", () => {
    const state = startingGameState(SEED);

    expect(siteStateAt(state, squareFromName("A1"))).toBeUndefined();
    expect(siteStatusAt(state, squareFromName("A1"))).toBeUndefined();
  });

  it("agrees with siteStatusAt: the state matches, and the status carries the clock", () => {
    const state = startingGameState(SEED);

    for (const name of ["H8", "F2", "K5"]) {
      const square = squareFromName(name);
      const status = siteStatusAt(state, square);
      expect(status?.state).toBe(siteStateAt(state, square));
      expect(status).toBeDefined();
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
    expect(first.actedThisPly).not.toBe(second.actedThisPly);
  });

  it("starts both sides at 0 energy", () => {
    const state = startingGameState(SEED);

    expect(state.energy).toEqual({ green: 0, red: 0 });
  });

  it("defaults to a hundred-round length when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.lengthInRounds).toBe(DEFAULT_GAME_LENGTH_ROUNDS);
  });

  it("takes a given length, changing nothing else about the state", () => {
    const defaultLength = startingGameState(SEED);
    const shortGame = startingGameState(SEED, 3);

    expect(shortGame.lengthInRounds).toBe(3);
    expect({
      ...shortGame,
      lengthInRounds: defaultLength.lengthInRounds,
    }).toEqual(defaultLength);
  });

  it.each([0, -1, 2.5])("throws a RangeError for a length of %s", (length) => {
    expect(() => startingGameState(SEED, length)).toThrow(RangeError);
  });

  it("defaults to a seven-a-side fleet when none is given", () => {
    const state = startingGameState(SEED);
    const expected = startingFleet(DEFAULT_FLEET_SIZE);

    expect(state.ships).toHaveLength(14);
    state.ships.forEach((ship, index) => {
      expect(ship.id).toBe(expected[index].id);
      expect(ship.side).toBe(expected[index].side);
      expect(ship.square).toEqual(expected[index].square);
    });
  });

  it("takes a given fleet size, dealing that layout's ships", () => {
    const fiveASide = startingGameState(SEED, DEFAULT_GAME_LENGTH_ROUNDS, 5);
    const sixASide = startingGameState(SEED, DEFAULT_GAME_LENGTH_ROUNDS, 6);

    const expectedFive = startingFleet(5);
    expect(fiveASide.ships).toHaveLength(10);
    fiveASide.ships.forEach((ship, index) => {
      const entry = expectedFive[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
    });

    const expectedSix = startingFleet(6);
    expect(sixASide.ships).toHaveLength(12);
    sixASide.ships.forEach((ship, index) => {
      const entry = expectedSix[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
    });
  });

  it("starts every ship at full power whatever the fleet size", () => {
    for (const fleetSize of [5, 6, 7] as const) {
      const state = startingGameState(
        SEED,
        DEFAULT_GAME_LENGTH_ROUNDS,
        fleetSize,
      );
      for (const ship of state.ships) {
        expect(ship.power).toBe(4);
      }
    }
  });

  it.each([4, 8, 6.5])(
    "throws a RangeError for a fleet size of %s",
    (fleetSize) => {
      expect(() =>
        startingGameState(SEED, DEFAULT_GAME_LENGTH_ROUNDS, fleetSize),
      ).toThrow(RangeError);
    },
  );
});
