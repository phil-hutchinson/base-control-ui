import { describe, expect, it } from "vitest";
import { squareFromName, squareName } from "./board";
import { DEFAULT_COMBAT_ENABLED } from "./combatSetting";
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
import { DEFAULT_NODE_ROTATION, NODE_ROTATION_SETTINGS } from "./nodeRotation";
import { legalDestinations } from "./movement";
import { isPlanet } from "./planets";
import { MAX_POWER } from "./power";
import { applyMove } from "./ply";
import { ROTATOR_SECTIONS } from "./rotators";
import { DEFAULT_SCORING, SCORING_SETTINGS } from "./scoring";

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

  it("has green to move, ply 1 and the deal's advanced seed", () => {
    const state = startingGameState(SEED);
    const [, dealtSeed] = dealOpeningBoard(
      STARTING_FLEET_SQUARES,
      DEFAULT_CHARGED_NODE_COUNT,
      SEED,
    );

    expect(state.sideToMove).toBe("green");
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

  it("defaults to five charged nodes, the app's default, when none is given", () => {
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

  it("takes a charged-node count of three, dealing six nodes: three charged, three inactive, none depleted", () => {
    const state = startingGameState(SEED, { chargedNodeCount: 3 });

    const states = Object.values(state.nodes).map((status) => status.state);

    expect(state.chargedNodeCount).toBe(3);
    expect(states).toHaveLength(3 + INACTIVE_NODE_COUNT);
    expect(states.filter((nodeState) => nodeState === "charged")).toHaveLength(
      3,
    );
    expect(states.filter((nodeState) => nodeState === "inactive")).toHaveLength(
      INACTIVE_NODE_COUNT,
    );
    expect(states).not.toContain("depleted");
  });

  it("is one of the offered charged-node counts, exactly the one given", () => {
    const state = startingGameState(SEED, { chargedNodeCount: 4 });

    expect(CHARGED_NODE_COUNTS).toContain(state.chargedNodeCount);
    expect(state.chargedNodeCount).toBe(4);
  });

  it.each([2, 6, 0, 4.5])(
    "throws a RangeError for a charged-node count of %s",
    (chargedNodeCount) => {
      expect(() => startingGameState(SEED, { chargedNodeCount })).toThrow(
        RangeError,
      );
    },
  );

  it("defaults to combat off, the app's default, when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.combatEnabled).toBe(false);
    expect(state.combatEnabled).toBe(DEFAULT_COMBAT_ENABLED);
  });

  it("takes a given combat setting, changing nothing else about the state", () => {
    const defaultCombat = startingGameState(SEED);
    const combatOn = startingGameState(SEED, { combatEnabled: true });

    expect(combatOn.combatEnabled).toBe(true);
    expect({
      ...combatOn,
      combatEnabled: defaultCombat.combatEnabled,
    }).toEqual(defaultCombat);
  });

  it("carries combatEnabled unchanged through a move, for the game's lifetime", () => {
    const state = startingGameState(SEED, { combatEnabled: true });
    const ship = state.ships.find(
      (candidate) => legalDestinations(state, candidate.id).length > 0,
    );
    if (ship === undefined) {
      throw new Error("expected at least one ship with a legal move");
    }
    const [destination] = legalDestinations(state, ship.id);

    const result = applyMove(state, ship.id, destination);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.combatEnabled).toBe(true);
  });

  it("defaults to simple scoring, the app's default, when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.scoring).toBe("simple");
    expect(state.scoring).toBe(DEFAULT_SCORING);
  });

  it("takes a given scoring setting, changing nothing else about the state", () => {
    const defaultScoring = startingGameState(SEED);
    const bonusScoring = startingGameState(SEED, { scoring: "bonus" });

    expect(bonusScoring.scoring).toBe("bonus");
    expect({
      ...bonusScoring,
      scoring: defaultScoring.scoring,
    }).toEqual(defaultScoring);
  });

  it("is one of the offered scoring settings, exactly the one given", () => {
    const state = startingGameState(SEED, { scoring: "bonus" });

    expect(SCORING_SETTINGS).toContain(state.scoring);
    expect(state.scoring).toBe("bonus");
  });

  it("carries scoring unchanged through a move, for the game's lifetime", () => {
    const state = startingGameState(SEED, { scoring: "bonus" });
    const ship = state.ships.find(
      (candidate) => legalDestinations(state, candidate.id).length > 0,
    );
    if (ship === undefined) {
      throw new Error("expected at least one ship with a legal move");
    }
    const [destination] = legalDestinations(state, ship.id);

    const result = applyMove(state, ship.id, destination);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.scoring).toBe("bonus");
  });

  it.each(["SIMPLE", "flat", "triangular", ""])(
    "throws a RangeError for a scoring setting of %j",
    (scoring) => {
      expect(() => startingGameState(SEED, { scoring })).toThrow(RangeError);
    },
  );

  it("defaults to continuous node rotation, the app's default, with an empty rotator list, when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.nodeRotation).toBe("continuous");
    expect(state.nodeRotation).toBe(DEFAULT_NODE_ROTATION);
    expect(state.rotators).toEqual([]);
  });

  it("takes a given node rotation setting, changing nothing else about the state", () => {
    const defaultRotation = startingGameState(SEED);
    const planetRotation = startingGameState(SEED, { nodeRotation: "planet" });

    expect(planetRotation.nodeRotation).toBe("planet");
    expect(planetRotation.rotators).toEqual([]);
    expect({
      ...planetRotation,
      nodeRotation: defaultRotation.nodeRotation,
    }).toEqual(defaultRotation);
  });

  it("is one of the offered node rotation settings, exactly the one given", () => {
    const state = startingGameState(SEED, { nodeRotation: "dedicated" });

    expect(NODE_ROTATION_SETTINGS).toContain(state.nodeRotation);
    expect(state.nodeRotation).toBe("dedicated");
  });

  it("carries nodeRotation unchanged through a move, for the game's lifetime", () => {
    const state = startingGameState(SEED, { nodeRotation: "planet" });
    const ship = state.ships.find(
      (candidate) => legalDestinations(state, candidate.id).length > 0,
    );
    if (ship === undefined) {
      throw new Error("expected at least one ship with a legal move");
    }
    const [destination] = legalDestinations(state, ship.id);

    const result = applyMove(state, ship.id, destination);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.nodeRotation).toBe("planet");
  });

  it.each(["CONTINUOUS", "planets", "rotator", ""])(
    "throws a RangeError for a node rotation setting of %j",
    (nodeRotation) => {
      expect(() => startingGameState(SEED, { nodeRotation })).toThrow(
        RangeError,
      );
    },
  );

  it("leaves the rotator list empty at continuous and planet, whatever the seed", () => {
    for (const nodeRotation of ["continuous", "planet"] as const) {
      const state = startingGameState(SEED, { nodeRotation });
      expect(state.rotators).toEqual([]);
    }
  });

  it("places up to six rotators under dedicated, at most one per section, none on a planet, a ship or a node", () => {
    const state = startingGameState(SEED, { nodeRotation: "dedicated" });

    expect(state.rotators.length).toBeGreaterThan(0);
    expect(state.rotators.length).toBeLessThanOrEqual(6);

    const shipNames = new Set(
      state.ships.map((ship) => squareName(ship.square)),
    );
    const nodeNames = new Set(Object.keys(state.nodes));

    for (const square of state.rotators) {
      const name = squareName(square);
      expect(isPlanet(square)).toBe(false);
      expect(shipNames.has(name)).toBe(false);
      expect(nodeNames.has(name)).toBe(false);
    }

    const sectionsHit = new Set(
      state.rotators.map((square) =>
        ROTATOR_SECTIONS.findIndex((section) =>
          section.squares.some((s) => squareName(s) === squareName(square)),
        ),
      ),
    );
    expect(sectionsHit.size).toBe(state.rotators.length);
  });

  it("leaves randomSeed unaffected by node rotation at continuous and planet, but advanced further at dedicated", () => {
    const continuous = startingGameState(SEED, { nodeRotation: "continuous" });
    const planet = startingGameState(SEED, { nodeRotation: "planet" });
    const dedicated = startingGameState(SEED, { nodeRotation: "dedicated" });

    expect(planet.randomSeed).toBe(continuous.randomSeed);
    expect(dedicated.randomSeed).not.toBe(continuous.randomSeed);
  });
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
