import { describe, expect, it } from "vitest";
import { ALL_SQUARES, squareFromName, squareName } from "./board";
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
import { DEFAULT_NODE_PLAYSTYLE, NODE_PLAYSTYLES } from "./nodePlaystyle";
import { dealStealOpeningBoard } from "./steal";
import { legalDestinations } from "./movement";
import { dealActivityBonuses } from "./activityBonus";
import { DEFAULT_PLANET_ACTIVITY } from "./planetActivity";
import { PLANET_BONUS_SETTINGS } from "./planetBonus";
import {
  DEFAULT_PLAYER_MATCHING,
  PLAYER_MATCHING_SETTINGS,
} from "./playerMatching";
import { isPlanet } from "./planets";
import { MAX_POWER } from "./power";
import { applyMove } from "./ply";
import { mulberry32 } from "./random";
import { ROTATOR_SECTIONS } from "./rotators";
import { DEFAULT_SCORING, SCORING_SETTINGS } from "./scoring";

const SEED = 12345;
const STARTING_FLEET = startingFleet(DEFAULT_FLEET_SIZE);
const STARTING_FLEET_SQUARES = STARTING_FLEET.map((entry) => entry.square);

describe("startingGameState", () => {
  it("has ten ships matching STARTING_FLEET entry for entry", () => {
    const state = startingGameState(SEED);

    expect(state.ships).toHaveLength(10);
    state.ships.forEach((ship, index) => {
      const entry = STARTING_FLEET[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
      expect(ship.power).toBe(entry.power);
    });
  });

  it("has green to move, ply 1 and the deal's advanced seed", () => {
    const state = startingGameState(SEED, { nodePlaystyle: "planet" });
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
    const state = startingGameState(SEED, { nodePlaystyle: "planet" });
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
    const state = startingGameState(SEED, { nodePlaystyle: "planet" });

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

  it("defaults to a five-a-side fleet when none is given", () => {
    const state = startingGameState(SEED);
    const expected = startingFleet(DEFAULT_FLEET_SIZE);

    expect(state.ships).toHaveLength(10);
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
    const fourASide = startingGameState(SEED, {
      lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      fleetSize: 4,
    });

    const expectedFive = startingFleet(5);
    expect(fiveASide.ships).toHaveLength(10);
    fiveASide.ships.forEach((ship, index) => {
      const entry = expectedFive[index];
      expect(ship.id).toBe(entry.id);
      expect(ship.side).toBe(entry.side);
      expect(ship.square).toEqual(entry.square);
    });

    const expectedFour = startingFleet(4);
    expect(fourASide.ships).toHaveLength(8);
    fourASide.ships.forEach((ship, index) => {
      const entry = expectedFour[index];
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
    const state = startingGameState(SEED, {
      nodePlaystyle: "planet",
      chargedNodeCount: 3,
    });

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

  it("defaults to bonus scoring, the app's default, when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.scoring).toBe("bonus");
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

  it("defaults to the steal playstyle, the app's default, with an empty rotator list, when none is given", () => {
    const state = startingGameState(SEED);

    expect(state.nodePlaystyle).toBe("steal");
    expect(state.nodePlaystyle).toBe(DEFAULT_NODE_PLAYSTYLE);
    expect(state.rotators).toEqual([]);
  });

  it("takes a given node playstyle, changing nothing else about the state", () => {
    const continuousPlaystyle = startingGameState(SEED, {
      nodePlaystyle: "continuous",
    });
    const planetPlaystyle = startingGameState(SEED, {
      nodePlaystyle: "planet",
    });

    expect(planetPlaystyle.nodePlaystyle).toBe("planet");
    expect(planetPlaystyle.rotators).toEqual([]);
    expect({
      ...planetPlaystyle,
      nodePlaystyle: continuousPlaystyle.nodePlaystyle,
    }).toEqual(continuousPlaystyle);
  });

  it("is one of the offered node playstyles, exactly the one given", () => {
    const state = startingGameState(SEED, { nodePlaystyle: "dedicated" });

    expect(NODE_PLAYSTYLES).toContain(state.nodePlaystyle);
    expect(state.nodePlaystyle).toBe("dedicated");
  });

  it("carries nodePlaystyle unchanged through a move, for the game's lifetime", () => {
    const state = startingGameState(SEED, { nodePlaystyle: "planet" });
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
    expect(result.state.nodePlaystyle).toBe("planet");
  });

  it.each(["CONTINUOUS", "planets", "rotator", ""])(
    "throws a RangeError for a node playstyle of %j",
    (nodePlaystyle) => {
      expect(() => startingGameState(SEED, { nodePlaystyle })).toThrow(
        RangeError,
      );
    },
  );

  it("leaves the rotator list empty at continuous and planet, whatever the seed", () => {
    for (const nodePlaystyle of ["continuous", "planet"] as const) {
      const state = startingGameState(SEED, { nodePlaystyle });
      expect(state.rotators).toEqual([]);
    }
  });

  it("places up to six rotators under dedicated, at most one per section, none on a planet, a ship or a node", () => {
    const state = startingGameState(SEED, { nodePlaystyle: "dedicated" });

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

  it("leaves randomSeed unaffected by node playstyle at continuous and planet, but advanced further at dedicated", () => {
    const continuous = startingGameState(SEED, { nodePlaystyle: "continuous" });
    const planet = startingGameState(SEED, { nodePlaystyle: "planet" });
    const dedicated = startingGameState(SEED, { nodePlaystyle: "dedicated" });

    expect(planet.randomSeed).toBe(continuous.randomSeed);
    expect(dedicated.randomSeed).not.toBe(continuous.randomSeed);
  });

  it("defaults to off, with both sides' bonus lists empty and no seed spent on a deal", () => {
    const implicit = startingGameState(SEED);
    const explicit = startingGameState(SEED, { planetBonus: "off" });

    expect(implicit.planetBonus).toBe("off");
    expect(implicit.bonusPlanets).toEqual({ green: [], red: [] });
    expect(implicit).toEqual(explicit);
  });

  it("deals each side three distinct planets in board order, none claimed, spending six seed steps beyond the off game", () => {
    const off = startingGameState(SEED, {
      nodePlaystyle: "planet",
      planetBonus: "off",
    });
    const on = startingGameState(SEED, {
      nodePlaystyle: "planet",
      planetBonus: "three",
    });

    expect(on.planetBonus).toBe("three");
    for (const side of ["green", "red"] as const) {
      const entries = on.bonusPlanets[side];
      expect(entries).toHaveLength(3);
      const names = entries.map((entry) => squareName(entry.square));
      expect(new Set(names).size).toBe(3);
      names.forEach((name) =>
        expect(isPlanet(squareFromName(name))).toBe(true),
      );
      entries.forEach((entry) => expect(entry.claimedOnPly).toBeUndefined());
      const indexes = entries.map((entry) =>
        ALL_SQUARES.findIndex(
          (square) => squareName(square) === squareName(entry.square),
        ),
      );
      expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    }

    let expectedSeed = off.randomSeed;
    for (let step = 0; step < 6; step++) {
      [, expectedSeed] = mulberry32(expectedSeed);
    }
    expect(on.randomSeed).toBe(expectedSeed);
  });

  it("deals the same six planets whatever the amount, since the amount does not affect the draw", () => {
    const two = startingGameState(SEED, {
      nodePlaystyle: "planet",
      planetBonus: "two",
    });
    const three = startingGameState(SEED, {
      nodePlaystyle: "planet",
      planetBonus: "three",
    });

    expect({ ...two, planetBonus: three.planetBonus }).toEqual(three);
  });

  it.each(["TWO", "on", "3", ""])(
    "throws a RangeError for a planet bonus setting of %j",
    (planetBonus) => {
      expect(() => startingGameState(SEED, { planetBonus })).toThrow(
        RangeError,
      );
    },
  );

  it.each(["two", "three"] as const)(
    "throws a RangeError for a planet bonus of %s paired with the steal node playstyle",
    (planetBonus) => {
      expect(() =>
        startingGameState(SEED, { nodePlaystyle: "steal", planetBonus }),
      ).toThrow(RangeError);
    },
  );

  it("is one of the offered planet bonus settings, exactly the one given", () => {
    const state = startingGameState(SEED, {
      nodePlaystyle: "planet",
      planetBonus: "two",
    });

    expect(PLANET_BONUS_SETTINGS).toContain(state.planetBonus);
    expect(state.planetBonus).toBe("two");
  });

  it("deals bonus planets after the rotator draw, leaving the rotator set unaffected by the setting", () => {
    const bonusOff = startingGameState(SEED, {
      nodePlaystyle: "dedicated",
      planetBonus: "off",
    });
    const bonusOn = startingGameState(SEED, {
      nodePlaystyle: "dedicated",
      planetBonus: "three",
    });

    expect(bonusOn.rotators).toEqual(bonusOff.rotators);
  });
});

describe("startingGameState under steal (steal.md §7)", () => {
  it("deals the board dealStealOpeningBoard deals for the same seed: 2N prospective squares, no charged, inactive or depleted square, and no rotators", () => {
    const state = startingGameState(SEED, {
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
    });
    const [dealt] = dealStealOpeningBoard(STARTING_FLEET_SQUARES, 4, SEED);

    expect(state.nodes).toEqual(dealt);
    expect(Object.values(state.nodes)).toHaveLength(8);
    for (const status of Object.values(state.nodes)) {
      expect(status.state).toBe("prospective");
      expect(status.level).toBe(0);
    }
    expect(state.rotators).toEqual([]);
  });

  it.each(CHARGED_NODE_COUNTS)(
    "opens with exactly 2 x %d prospective squares and no charged square anywhere",
    (chargedNodeCount) => {
      const state = startingGameState(SEED, {
        nodePlaystyle: "steal",
        chargedNodeCount,
      });

      const statuses = Object.values(state.nodes);
      expect(statuses).toHaveLength(chargedNodeCount * 2);
      expect(statuses.every((status) => status.state === "prospective")).toBe(
        true,
      );
    },
  );

  it("deals the same steal board for the same seed, and a different one for a different seed", () => {
    const first = startingGameState(SEED, { nodePlaystyle: "steal" });
    const second = startingGameState(SEED, { nodePlaystyle: "steal" });
    const third = startingGameState(SEED + 1, { nodePlaystyle: "steal" });

    expect(second.nodes).toEqual(first.nodes);
    expect(third.nodes).not.toEqual(first.nodes);
  });

  it("consumes exactly 2N seed steps for the deal, leaving the planet resources deal to run afterwards unchanged", () => {
    const withoutBonus = startingGameState(SEED, {
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
      planetActivity: "off",
    });
    const [, seedAfterDeal] = dealStealOpeningBoard(
      STARTING_FLEET_SQUARES,
      4,
      SEED,
    );
    expect(withoutBonus.randomSeed).toBe(seedAfterDeal);

    const withBonus = startingGameState(SEED, {
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
      planetActivity: "race",
    });
    expect(withBonus.activityBonuses).toHaveLength(2);
    expect(withBonus.randomSeed).not.toBe(seedAfterDeal);
  });
});

describe("startingGameState's planetActivity field (rules.md §3.4, steal.md §10)", () => {
  it("defaults to race, the app's default, when none is given under steal", () => {
    const state = startingGameState(SEED, { nodePlaystyle: "steal" });

    expect(state.planetActivity).toBe("race");
    expect(state.planetActivity).toBe(DEFAULT_PLANET_ACTIVITY);
  });

  it("is exactly the one given under steal", () => {
    const state = startingGameState(SEED, {
      nodePlaystyle: "steal",
      planetActivity: "race",
    });

    expect(state.planetActivity).toBe("race");
    expect(state.planetBonus).toBe("off");
  });

  it("is exactly stable when stable is given under steal", () => {
    const state = startingGameState(SEED, {
      nodePlaystyle: "steal",
      planetActivity: "stable",
    });

    expect(state.planetActivity).toBe("stable");
    expect(state.planetBonus).toBe("off");
    expect(state.activityBonuses).toHaveLength(2);
  });

  it.each(["RACE", "STABLE", "advanced", "two", "on", ""])(
    "throws a RangeError for a planet resources setting of %j",
    (planetActivity) => {
      expect(() =>
        startingGameState(SEED, { nodePlaystyle: "steal", planetActivity }),
      ).toThrow(RangeError);
    },
  );

  it.each(
    (["continuous", "planet", "dedicated"] as const).flatMap((nodePlaystyle) =>
      (["stable", "race"] as const).map(
        (planetActivity) => [planetActivity, nodePlaystyle] as const,
      ),
    ),
  )(
    "throws a RangeError for %s paired with the %s node playstyle",
    (planetActivity, nodePlaystyle) => {
      expect(() =>
        startingGameState(SEED, { nodePlaystyle, planetActivity }),
      ).toThrow(RangeError);
    },
  );

  it.each(["continuous", "planet", "dedicated"] as const)(
    "accepts off paired with the %s node playstyle",
    (nodePlaystyle) => {
      const state = startingGameState(SEED, {
        nodePlaystyle,
        planetActivity: "off",
      });

      expect(state.planetActivity).toBe("off");
    },
  );
});

describe("startingGameState's activityBonuses field (steal.md §10)", () => {
  it("is empty with planet resources off under steal, whose seed consumption is unaffected", () => {
    const withOff = startingGameState(SEED, {
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
      planetActivity: "off",
    });
    const [, seedAfterDeal] = dealStealOpeningBoard(
      STARTING_FLEET_SQUARES,
      4,
      SEED,
    );
    expect(withOff.activityBonuses).toEqual([]);
    expect(withOff.randomSeed).toBe(seedAfterDeal);
  });

  it("is empty under every planet bonus setting outside steal", () => {
    for (const planetBonus of PLANET_BONUS_SETTINGS) {
      const state = startingGameState(SEED, {
        nodePlaystyle: "planet",
        planetBonus,
      });
      expect(state.activityBonuses).toEqual([]);
    }
  });

  it("deals exactly two bonuses, on two distinct empty planets, of two distinct kinds, with bonusPlanets left empty", () => {
    const state = startingGameState(SEED, {
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
      planetActivity: "race",
    });

    expect(state.activityBonuses).toHaveLength(2);
    const [first, second] = state.activityBonuses;
    expect(squareName(first.square)).not.toBe(squareName(second.square));
    expect(first.kind).not.toBe(second.kind);
    for (const entry of state.activityBonuses) {
      expect(isPlanet(entry.square)).toBe(true);
      expect(
        state.ships.some(
          (ship) => squareName(ship.square) === squareName(entry.square),
        ),
      ).toBe(false);
    }
    expect(state.bonusPlanets).toEqual({ green: [], red: [] });
  });

  it("consumes exactly four seed steps more than the same seed with planet resources off, leaving the nodes and ships unaffected", () => {
    const withoutActivity = startingGameState(SEED, {
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
      planetActivity: "off",
    });
    const withRace = startingGameState(SEED, {
      nodePlaystyle: "steal",
      chargedNodeCount: 4,
      planetActivity: "race",
    });

    expect(withRace.nodes).toEqual(withoutActivity.nodes);
    expect(withRace.ships).toEqual(withoutActivity.ships);

    let expectedSeed = withoutActivity.randomSeed;
    for (let step = 0; step < 4; step++) {
      [, expectedSeed] = mulberry32(expectedSeed);
    }
    expect(withRace.randomSeed).toBe(expectedSeed);
  });

  it.each(CHARGED_NODE_COUNTS)(
    "under race at %d nodes, deals exactly the pair and leaves exactly the seed dealActivityBonuses gives from the post-board seed",
    (chargedNodeCount) => {
      const state = startingGameState(SEED, {
        nodePlaystyle: "steal",
        chargedNodeCount,
        planetActivity: "race",
      });
      const [nodes, seedAfterBoard] = dealStealOpeningBoard(
        STARTING_FLEET_SQUARES,
        chargedNodeCount,
        SEED,
      );
      const [bonuses, nextSeed] = dealActivityBonuses(
        nodes,
        chargedNodeCount,
        state.ships,
        seedAfterBoard,
      );

      expect(state.activityBonuses).toEqual(bonuses);
      expect(state.randomSeed).toBe(nextSeed);
      expect(state.ships.every((ship) => ship.power === MAX_POWER)).toBe(true);
      expect(
        dealActivityBonuses(nodes, chargedNodeCount, [], seedAfterBoard),
      ).toEqual([bonuses, nextSeed]);
    },
  );

  it.each(CHARGED_NODE_COUNTS)(
    "deals the same pair and leaves the same seed under stable as under race, at %d nodes",
    (chargedNodeCount) => {
      for (const seed of [SEED, SEED + 1, 12345]) {
        const stable = startingGameState(seed, {
          nodePlaystyle: "steal",
          chargedNodeCount,
          planetActivity: "stable",
        });
        const race = startingGameState(seed, {
          nodePlaystyle: "steal",
          chargedNodeCount,
          planetActivity: "race",
        });

        expect(stable.activityBonuses).toEqual(race.activityBonuses);
        expect(stable.randomSeed).toBe(race.randomSeed);
        expect(stable.nodes).toEqual(race.nodes);
      }
    },
  );

  it("deals the same pair for the same seed, and a different one for a different seed", () => {
    const first = startingGameState(SEED, {
      nodePlaystyle: "steal",
      planetActivity: "race",
    });
    const second = startingGameState(SEED, {
      nodePlaystyle: "steal",
      planetActivity: "race",
    });
    const third = startingGameState(SEED + 1, {
      nodePlaystyle: "steal",
      planetActivity: "race",
    });

    expect(second.activityBonuses).toEqual(first.activityBonuses);
    expect(third.activityBonuses).not.toEqual(first.activityBonuses);
  });
});

describe("startingGameState's playerMatching field (steal.md §9)", () => {
  it("defaults to required, the app's default, when none is given under steal", () => {
    const state = startingGameState(SEED, { nodePlaystyle: "steal" });

    expect(state.playerMatching).toBe("required");
    expect(state.playerMatching).toBe(DEFAULT_PLAYER_MATCHING);
  });

  it.each(PLAYER_MATCHING_SETTINGS)(
    "stores a given setting of %j under steal",
    (playerMatching) => {
      const state = startingGameState(SEED, {
        nodePlaystyle: "steal",
        playerMatching,
      });

      expect(state.playerMatching).toBe(playerMatching);
    },
  );

  it.each(["OFF", "doubled", "require", ""])(
    "throws a RangeError for a playerMatching setting of %j",
    (playerMatching) => {
      expect(() =>
        startingGameState(SEED, { nodePlaystyle: "steal", playerMatching }),
      ).toThrow(RangeError);
    },
  );

  it.each(["continuous", "planet", "dedicated"] as const)(
    "throws a RangeError for double or required paired with the %s node playstyle",
    (nodePlaystyle) => {
      expect(() =>
        startingGameState(SEED, { nodePlaystyle, playerMatching: "double" }),
      ).toThrow(RangeError);
      expect(() =>
        startingGameState(SEED, {
          nodePlaystyle,
          playerMatching: "required",
        }),
      ).toThrow(RangeError);
    },
  );

  it.each(["continuous", "planet", "dedicated"] as const)(
    "does not throw for off paired with the %s node playstyle",
    (nodePlaystyle) => {
      expect(() =>
        startingGameState(SEED, { nodePlaystyle, playerMatching: "off" }),
      ).not.toThrow();
    },
  );

  it.each([SEED, SEED + 1, SEED + 2])(
    "deals exactly the board an off game deals from seed %d, for double and required, at every node count (D2 — no seed steps)",
    (seed) => {
      for (const chargedNodeCount of CHARGED_NODE_COUNTS) {
        const off = startingGameState(seed, {
          nodePlaystyle: "steal",
          chargedNodeCount,
          playerMatching: "off",
        });

        for (const playerMatching of ["double", "required"] as const) {
          const matched = startingGameState(seed, {
            nodePlaystyle: "steal",
            chargedNodeCount,
            playerMatching,
          });

          expect(matched.nodes).toEqual(off.nodes);
          expect(matched.randomSeed).toBe(off.randomSeed);
        }
      }
    },
  );
});

describe("startingGameState's defaults, resolved for the chosen node playstyle", () => {
  it("starts steal, with player-matching required, planet resources race and planet bonus off, when no option is given", () => {
    const state = startingGameState(SEED);

    expect(state.nodePlaystyle).toBe("steal");
    expect(state.playerMatching).toBe("required");
    expect(state.planetActivity).toBe("race");
    expect(state.planetBonus).toBe("off");
    expect(state.activityBonuses).toHaveLength(2);
  });

  it.each(["continuous", "planet", "dedicated"] as const)(
    "starts %s with player-matching off, planet resources off and planet bonus off when only the playstyle is given",
    (nodePlaystyle) => {
      const state = startingGameState(SEED, { nodePlaystyle });

      expect(state.nodePlaystyle).toBe(nodePlaystyle);
      expect(state.playerMatching).toBe("off");
      expect(state.planetActivity).toBe("off");
      expect(state.planetBonus).toBe("off");
      expect(state.activityBonuses).toEqual([]);
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
