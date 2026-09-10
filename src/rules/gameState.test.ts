import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { DEFAULT_FLEET_SIZE, FLEET_SIZES, startingFleet } from "./fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import {
  type GameState,
  type NodeStatus,
  markOutOfTime,
  shipsBySquare,
  nodeSquares,
  nodeStateAt,
  nodeStatusAt,
  startingGameState,
} from "./gameState";
import {
  CHARGED_NODE_COUNTS,
  DEFAULT_CHARGED_NODE_COUNT,
  dealOpeningBoard,
} from "./nodes";
import { INACTIVE_NODE_COUNT } from "./nodeQueue";
import { MAX_POWER } from "./power";

const SEED = 12345;
const STARTING_FLEET = startingFleet(DEFAULT_FLEET_SIZE);
const STARTING_FLEET_SQUARES = STARTING_FLEET.map((entry) => entry.square);

describe("startingGameState", () => {
  it("has twelve ships matching STARTING_FLEET entry for entry", () => {
    const state = startingGameState(SEED);

    expect(state.ships).toHaveLength(12);
    state.ships.forEach((ship, index) => {
      const entry = STARTING_FLEET[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
      expect(ship.power).toBe(entry.power);
    });
  });

  it("has green to move, one action remaining, nothing moved, ply 1 and the deal's advanced seed", () => {
    const state = startingGameState(SEED);
    const [, dealtSeed] = dealOpeningBoard(
      STARTING_FLEET_SQUARES,
      DEFAULT_CHARGED_NODE_COUNT,
      SEED,
    );

    expect(state.sideToMove).toBe("green");
    expect(state.actionsRemaining).toBe(1);
    expect(state.actedThisPly).toEqual([]);
    expect(state.plyNumber).toBe(1);
    expect(state.randomSeed).toBe(dealtSeed);
    expect(state.randomSeed).not.toBe(SEED);
  });

  it("remembers the seed the deal started from, distinct from the seed it left behind", () => {
    const state = startingGameState(SEED);

    expect(state.openingSeed).toBe(SEED);
    expect(state.openingSeed).not.toBe(state.randomSeed);
  });

  it("deals the board dealOpeningBoard deals for the same seed: five charged, three inactive, none depleted", () => {
    const state = startingGameState(SEED);
    const [dealt] = dealOpeningBoard(
      STARTING_FLEET_SQUARES,
      DEFAULT_CHARGED_NODE_COUNT,
      SEED,
    );

    expect(state.nodes).toEqual(dealt);

    const allStatuses = Object.values(state.nodes);
    expect(allStatuses).toHaveLength(
      DEFAULT_CHARGED_NODE_COUNT + INACTIVE_NODE_COUNT,
    );
    expect(
      allStatuses.filter((status) => status.state === "charged"),
    ).toHaveLength(DEFAULT_CHARGED_NODE_COUNT);
    expect(
      allStatuses.filter((status) => status.state === "inactive"),
    ).toHaveLength(INACTIVE_NODE_COUNT);
    expect(
      allStatuses.filter((status) => status.state === "depleted"),
    ).toHaveLength(0);
  });

  it("deals every charged node at baseline (no countdown) and every inactive level a priority of {1, 2, 3}", () => {
    const state = startingGameState(SEED);

    const priorities: number[] = [];
    for (const status of Object.values(state.nodes)) {
      if (status.state === "charged") {
        expect(status.level).toBe(0);
      } else {
        priorities.push(status.level);
      }
    }
    expect(priorities.sort()).toEqual([1, 2, 3]);
  });

  it("deals the same board for the same seed, and a different board for a different seed", () => {
    const first = startingGameState(SEED);
    const second = startingGameState(SEED);
    const other = startingGameState(SEED + 1);

    expect(second.nodes).toEqual(first.nodes);
    expect(other.nodes).not.toEqual(first.nodes);
  });

  it("gives a non-node square no state or status", () => {
    const state = startingGameState(SEED);

    expect(nodeStateAt(state, squareFromName("A1"))).toBeUndefined();
    expect(nodeStatusAt(state, squareFromName("A1"))).toBeUndefined();
  });

  it("agrees with nodeStatusAt: the state matches, and the status carries the clock", () => {
    const state = startingGameState(SEED);

    for (const square of nodeSquares(state)) {
      const status = nodeStatusAt(state, square);
      expect(status?.state).toBe(nodeStateAt(state, square));
      expect(status).toBeDefined();
    }
  });

  it("finds a ship on each of the twelve starting-fleet squares and none on an ordinary square", () => {
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
    expect(first.nodes).not.toBe(second.nodes);
    expect(first.actedThisPly).not.toBe(second.actedThisPly);
  });

  it("starts both sides at 0 energy", () => {
    const state = startingGameState(SEED);

    expect(state.energy).toEqual({ green: 0, red: 0 });
  });

  it("starts neither side out of time", () => {
    const state = startingGameState(SEED);

    expect(state.outOfTime).toEqual({ green: false, red: false });
  });

  it("defaults to a hundred-round length when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.lengthInRounds).toBe(DEFAULT_GAME_LENGTH_ROUNDS);
  });

  it("takes a given length, changing nothing else about the state", () => {
    const defaultLength = startingGameState(SEED);
    const shortGame = startingGameState(SEED, { lengthInRounds: 3 });

    expect(shortGame.lengthInRounds).toBe(3);
    expect({
      ...shortGame,
      lengthInRounds: defaultLength.lengthInRounds,
    }).toEqual(defaultLength);
  });

  it.each([0, -1, 2.5])("throws a RangeError for a length of %s", (length) => {
    expect(() => startingGameState(SEED, { lengthInRounds: length })).toThrow(
      RangeError,
    );
  });

  it("defaults to a six-a-side fleet when none is given", () => {
    const state = startingGameState(SEED);
    const expected = startingFleet(DEFAULT_FLEET_SIZE);

    expect(state.ships).toHaveLength(12);
    state.ships.forEach((ship, index) => {
      expect(ship.id).toBe(expected[index].id);
      expect(ship.side).toBe(expected[index].side);
      expect(ship.square).toEqual(expected[index].square);
    });
  });

  it("takes a given fleet size, dealing that layout's ships", () => {
    const fiveASide = startingGameState(SEED, {
      lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      fleetSize: 5,
    });
    const sixASide = startingGameState(SEED, {
      lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      fleetSize: 6,
    });

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

  it("deals the same board for the same seed whatever the fleet size", () => {
    const smallestFleetSize = Math.min(...FLEET_SIZES);
    const largestFleetSize = Math.max(...FLEET_SIZES);
    const smallestASide = startingGameState(SEED, {
      lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      fleetSize: smallestFleetSize,
    });
    const largestASide = startingGameState(SEED, {
      lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      fleetSize: largestFleetSize,
    });

    expect(smallestASide.nodes).toEqual(largestASide.nodes);
  });

  it("starts every ship at full power whatever the fleet size", () => {
    for (const fleetSize of FLEET_SIZES) {
      const state = startingGameState(SEED, {
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        fleetSize,
      });
      for (const ship of state.ships) {
        expect(ship.power).toBe(MAX_POWER);
      }
    }
  });

  it.each([2, 7, 8, 6.5])(
    "throws a RangeError for a fleet size of %s",
    (fleetSize) => {
      expect(() =>
        startingGameState(SEED, {
          lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
          fleetSize,
        }),
      ).toThrow(RangeError);
    },
  );

  it("defaults to five charged nodes, §8.1's standard game, when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.chargedNodeCount).toBe(DEFAULT_CHARGED_NODE_COUNT);
  });

  it("takes a given charged-node count, dealing that many charged and leaving everything else about the state alone", () => {
    const defaultCount = startingGameState(SEED);
    const fourCharged = startingGameState(SEED, { chargedNodeCount: 4 });

    expect(fourCharged.chargedNodeCount).toBe(4);
    expect({
      ...fourCharged,
      chargedNodeCount: defaultCount.chargedNodeCount,
      nodes: defaultCount.nodes,
      randomSeed: defaultCount.randomSeed,
    }).toEqual(defaultCount);
  });

  it("is one of the offered charged-node counts, exactly the one given", () => {
    const state = startingGameState(SEED, { chargedNodeCount: 4 });

    expect(CHARGED_NODE_COUNTS).toContain(state.chargedNodeCount);
    expect(state.chargedNodeCount).toBe(4);
  });

  it.each([3, 6, 0, 4.5])(
    "throws a RangeError for a charged-node count of %s",
    (chargedNodeCount) => {
      expect(() => startingGameState(SEED, { chargedNodeCount })).toThrow(
        RangeError,
      );
    },
  );
});

describe("markOutOfTime", () => {
  it("sets the given side's flag, leaving the other side and everything else untouched", () => {
    const state = startingGameState(SEED);

    const result = markOutOfTime(state, "green");

    expect(result.outOfTime).toEqual({ green: true, red: false });
    expect({ ...result, outOfTime: state.outOfTime }).toEqual(state);
  });

  it("sets both sides independently", () => {
    const state = startingGameState(SEED);

    const bothOut = markOutOfTime(markOutOfTime(state, "green"), "red");

    expect(bothOut.outOfTime).toEqual({ green: true, red: true });
  });

  it("is a no-op, returning the same object, when the side is already out of time", () => {
    const state = markOutOfTime(startingGameState(SEED), "green");

    const result = markOutOfTime(state, "green");

    expect(result).toBe(state);
  });
});

/** A state built from `startingGameState`, with its node record replaced. */
function boardWith(nodes: Readonly<Record<string, NodeStatus>>): GameState {
  return { ...startingGameState(SEED), nodes };
}

describe("nodeSquares", () => {
  it("returns board order for a hand-built board, not insertion order", () => {
    const state = boardWith({
      L8: { state: "charged", level: 1 },
      B4: { state: "inactive", level: 1 },
      H8: { state: "depleted", level: 1 },
    });

    expect(nodeSquares(state).map(squareName)).toEqual(["B4", "H8", "L8"]);
  });

  it("returns only the squares present in state.nodes", () => {
    const state = boardWith({ H8: { state: "charged", level: 1 } });

    expect(nodeSquares(state).map(squareName)).toEqual(["H8"]);
  });

  it("returns an empty list for a board with no nodes", () => {
    const state = boardWith({});

    expect(nodeSquares(state)).toEqual([]);
  });

  it("is independent of the order state.nodes' keys were inserted in", () => {
    const inOrder = boardWith({
      B4: { state: "inactive", level: 1 },
      H8: { state: "depleted", level: 1 },
      L8: { state: "charged", level: 1 },
    });
    const scrambled = boardWith({
      L8: { state: "charged", level: 1 },
      B4: { state: "inactive", level: 1 },
      H8: { state: "depleted", level: 1 },
    });

    expect(nodeSquares(scrambled)).toEqual(nodeSquares(inOrder));
  });
});
