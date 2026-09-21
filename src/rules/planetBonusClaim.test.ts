// The claim a landing pays (rules.md §3.4): the helper in `ply.ts` that
// `applyMove` and `applyAttack` both call, and the `planet-bonus-claimed`
// effect it raises. Kept apart from `ply.test.ts`, already large, as a
// sibling test file the way `planetBonus.test.ts` and `bonusPlanets.test.ts`
// sit beside the rules-layer modules they cover.

import { describe, expect, it } from "vitest";
import { PLANETS } from "./planets";
import { type Square, squareAt, squareFromName, squareName } from "./board";
import type { ShipId } from "./fleet";
import {
  type BonusPlanetEntry,
  type GameState,
  type Ship,
  type NodeStatus,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { applyAttack, applyMove } from "./ply";
import type { PowerLevel } from "./power";
import { drawIndex } from "./random";
import {
  DEFAULT_CHARGED_NODE_COUNT,
  type ChargedNodeCount,
  type NodeState,
} from "./nodes";
import {
  DEFAULT_NODE_ROTATION,
  type NodeRotationSetting,
} from "./nodeRotation";
import { DEFAULT_PLANET_BONUS, type PlanetBonusSetting } from "./planetBonus";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: Square | string,
  power: PowerLevel = 4,
): Ship {
  return {
    id,
    side,
    square: typeof square === "string" ? squareFromName(square) : square,
    power,
  };
}

/** The square directly below `square`, one row down — always on the board for any of the twelve planets, whose rows all sit well clear of row 1. */
function belowSquare(square: Square): Square {
  return squareAt(square.column, square.row - 1);
}

function nodeStatuses(
  states: Readonly<Record<string, NodeState | readonly [NodeState, number]>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, entry]) => {
      const [state, level] = Array.isArray(entry) ? entry : [entry, 0];
      return [name, { state, level }];
    }),
  );
}

function entry(square: Square, claimedOnPly?: number): BonusPlanetEntry {
  return claimedOnPly === undefined ? { square } : { square, claimedOnPly };
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  nodes?: Readonly<Record<string, NodeState | readonly [NodeState, number]>>;
  plyNumber?: number;
  chargedNodeCount?: ChargedNodeCount;
  energy?: { green: number; red: number };
  nodeRotation?: NodeRotationSetting;
  planetBonus?: PlanetBonusSetting;
  bonusPlanets?: Readonly<Record<"green" | "red", readonly BonusPlanetEntry[]>>;
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    openingSeed: 1,
    nodeRotation: config.nodeRotation ?? DEFAULT_NODE_ROTATION,
    rotators: [],
    planetBonus: config.planetBonus ?? DEFAULT_PLANET_BONUS,
    bonusPlanets: config.bonusPlanets ?? { green: [], red: [] },
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: "simple",
  };
}

describe("a move that lands on a bonus planet", () => {
  it("pays the moving side, records the claim ply and raises the effect", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      plyNumber: 7,
      planetBonus: "three",
      bonusPlanets: { green: [entry(planet)], red: [] },
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.green).toBe(3);
    expect(result.state.energy.red).toBe(0);
    expect(result.state.bonusPlanets.green).toEqual([entry(planet, 7)]);
    expect(result.effects).toContainEqual({
      type: "planet-bonus-claimed",
      side: "green",
      square: planet,
      amount: 3,
    });
  });

  it("raises the claim before the ply-ended effect", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      planetBonus: "two",
      bonusPlanets: { green: [entry(planet)], red: [] },
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const claimIndex = result.effects.findIndex(
      (effect) => effect.type === "planet-bonus-claimed",
    );
    const plyEndedIndex = result.effects.findIndex(
      (effect) => effect.type === "ply-ended",
    );
    expect(claimIndex).toBeGreaterThanOrEqual(0);
    expect(plyEndedIndex).toBeGreaterThan(claimIndex);
  });

  it("pays nothing for a planet dealt to the other side", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      planetBonus: "three",
      bonusPlanets: { green: [], red: [entry(planet)] },
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.green).toBe(0);
    expect(result.state.bonusPlanets.red).toEqual([entry(planet)]);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "planet-bonus-claimed" }),
    );
  });

  it("pays nothing the second time the same ship returns to an already-claimed planet", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [ship("green-1", "green", planet, 0), ship("red-1", "red", "A1")],
      plyNumber: 3,
      energy: { green: 3, red: 0 },
      planetBonus: "three",
      bonusPlanets: { green: [entry(planet, 1)], red: [] },
    });

    const left = applyMove(state, "green-1", belowSquare(planet));
    expect(left.outcome).toBe("applied");
    if (left.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    // Green's own move ends its ply, so red gets a turn of its own — an
    // unrelated filler move, well away from the planet — before green can
    // move again.
    const fillerMove = applyMove(left.state, "red-1", squareFromName("A2"));
    expect(fillerMove.outcome).toBe("applied");
    if (fillerMove.outcome !== "applied") {
      throw new Error("expected the filler move to be applied");
    }
    const returned = applyMove(fillerMove.state, "green-1", planet);
    expect(returned.outcome).toBe("applied");
    if (returned.outcome !== "applied") {
      throw new Error("expected the move back to be applied");
    }
    expect(returned.state.energy.green).toBe(3);
    expect(returned.state.bonusPlanets.green).toEqual([entry(planet, 1)]);
    expect(returned.effects).not.toContainEqual(
      expect.objectContaining({ type: "planet-bonus-claimed" }),
    );
  });

  it("pays nothing the second time a different one of the same side's ships lands on an already-claimed planet", () => {
    const [planet, otherPlanet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", otherPlanet, 4),
        ship("green-2", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      plyNumber: 3,
      energy: { green: 3, red: 0 },
      planetBonus: "three",
      bonusPlanets: { green: [entry(planet, 2)], red: [] },
    });

    const result = applyMove(state, "green-2", planet);
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.green).toBe(3);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "planet-bonus-claimed" }),
    );
  });

  it("pays each side once, independently, for a planet shared by both — green claiming first", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      plyNumber: 1,
      planetBonus: "two",
      bonusPlanets: { green: [entry(planet)], red: [entry(planet)] },
    });

    const result = applyMove(state, "green-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.green).toBe(2);
    expect(result.state.energy.red).toBe(0);
    // Red's own entry for the same planet is untouched: green's claim takes
    // nothing from it, and red is still free to claim it in a later turn.
    expect(result.state.bonusPlanets.red).toEqual([entry(planet)]);
  });

  it("pays each side once, independently, for a planet shared by both — red claiming first", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", "A1"),
        ship("red-1", "red", belowSquare(planet)),
      ],
      sideToMove: "red",
      plyNumber: 1,
      planetBonus: "two",
      bonusPlanets: { green: [entry(planet)], red: [entry(planet)] },
    });

    const result = applyMove(state, "red-1", planet);

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.red).toBe(2);
    expect(result.state.energy.green).toBe(0);
    expect(result.state.bonusPlanets.green).toEqual([entry(planet)]);
  });

  it("pays nothing at all when the setting is off, and raises no effect", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      planetBonus: "off",
      bonusPlanets: { green: [entry(planet)], red: [] },
    });

    const result = applyMove(state, "green-1", planet);
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(result.state.energy.green).toBe(0);
    expect(result.state.bonusPlanets.green).toEqual([entry(planet)]);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "planet-bonus-claimed" }),
    );
  });

  it("pays 2 under two and 3 under three", () => {
    const [planet] = PLANETS;
    const twoState = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      planetBonus: "two",
      bonusPlanets: { green: [entry(planet)], red: [] },
    });
    const twoResult = applyMove(twoState, "green-1", planet);
    expect(twoResult.outcome).toBe("applied");
    if (twoResult.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(twoResult.state.energy.green).toBe(2);

    const threeState = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      planetBonus: "three",
      bonusPlanets: { green: [entry(planet)], red: [] },
    });
    const threeResult = applyMove(threeState, "green-1", planet);
    expect(threeResult.outcome).toBe("applied");
    if (threeResult.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    expect(threeResult.state.energy.green).toBe(3);
  });

  it("under the planet rotation setting, a landing that claims still rotates the queue exactly once, after the claim", () => {
    const [planet] = PLANETS;
    const state = buildState({
      ships: [
        ship("green-1", "green", belowSquare(planet)),
        ship("red-1", "red", "A1"),
      ],
      nodeRotation: "planet",
      planetBonus: "three",
      bonusPlanets: { green: [entry(planet)], red: [] },
    });

    const result = applyMove(state, "green-1", planet);
    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the move to be applied");
    }
    const rotations = result.effects.filter(
      (effect) => effect.type === "queue-rotated",
    );
    expect(rotations).toHaveLength(1);
    const claimIndex = result.effects.findIndex(
      (effect) => effect.type === "planet-bonus-claimed",
    );
    const rotationIndex = result.effects.findIndex(
      (effect) => effect.type === "queue-rotated",
    );
    expect(claimIndex).toBeGreaterThanOrEqual(0);
    expect(rotationIndex).toBeGreaterThan(claimIndex);
  });
});

describe("a fight's placement", () => {
  it("pays the attacker when its own return planet is one of its three", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
      planetBonus: "three",
    });

    const [attackerIndex, seedAfterAttacker] = drawIndex(
      state.randomSeed,
      PLANETS.length,
    );
    const attackerPlanet = PLANETS[attackerIndex];
    const defenderPool = PLANETS.filter(
      (square) => squareName(square) !== squareName(attackerPlanet),
    );
    drawIndex(seedAfterAttacker, defenderPool.length);

    const withBonus: GameState = {
      ...state,
      bonusPlanets: { green: [entry(attackerPlanet)], red: [] },
    };
    const result = applyAttack(withBonus, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.energy.green).toBe(3);
    expect(result.state.energy.red).toBe(0);
    expect(result.effects).toContainEqual({
      type: "planet-bonus-claimed",
      side: "green",
      square: attackerPlanet,
      amount: 3,
    });
    expect(result.state.bonusPlanets.green).toEqual([entry(attackerPlanet, 1)]);
  });

  it("pays the defender when its own return planet is one of its three", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
      planetBonus: "two",
    });

    const [attackerIndex, seedAfterAttacker] = drawIndex(
      state.randomSeed,
      PLANETS.length,
    );
    const attackerPlanet = PLANETS[attackerIndex];
    const defenderPool = PLANETS.filter(
      (square) => squareName(square) !== squareName(attackerPlanet),
    );
    const [defenderIndex] = drawIndex(seedAfterAttacker, defenderPool.length);
    const defenderPlanet = defenderPool[defenderIndex];

    const withBonus: GameState = {
      ...state,
      bonusPlanets: { green: [], red: [entry(defenderPlanet)] },
    };
    const result = applyAttack(withBonus, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.energy.green).toBe(0);
    expect(result.state.energy.red).toBe(2);
    expect(result.effects).toContainEqual({
      type: "planet-bonus-claimed",
      side: "red",
      square: defenderPlanet,
      amount: 2,
    });
  });

  it("pays both sides when both returns land on their own bonus planets, attacker's claim before the defender's", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
      planetBonus: "three",
    });

    const [attackerIndex, seedAfterAttacker] = drawIndex(
      state.randomSeed,
      PLANETS.length,
    );
    const attackerPlanet = PLANETS[attackerIndex];
    const defenderPool = PLANETS.filter(
      (square) => squareName(square) !== squareName(attackerPlanet),
    );
    const [defenderIndex] = drawIndex(seedAfterAttacker, defenderPool.length);
    const defenderPlanet = defenderPool[defenderIndex];

    const withBonus: GameState = {
      ...state,
      bonusPlanets: {
        green: [entry(attackerPlanet)],
        red: [entry(defenderPlanet)],
      },
    };
    const result = applyAttack(withBonus, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.energy.green).toBe(3);
    expect(result.state.energy.red).toBe(3);

    const claims = result.effects.filter(
      (effect) => effect.type === "planet-bonus-claimed",
    );
    expect(claims).toEqual([
      {
        type: "planet-bonus-claimed",
        side: "green",
        square: attackerPlanet,
        amount: 3,
      },
      {
        type: "planet-bonus-claimed",
        side: "red",
        square: defenderPlanet,
        amount: 3,
      },
    ]);
  });

  it("pays nothing on a fight when the setting is off", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 2)],
      planetBonus: "off",
    });

    const [attackerIndex] = drawIndex(state.randomSeed, PLANETS.length);
    const attackerPlanet = PLANETS[attackerIndex];

    const withBonus: GameState = {
      ...state,
      bonusPlanets: { green: [entry(attackerPlanet)], red: [] },
    };
    const result = applyAttack(withBonus, "green-1", squareFromName("H9"));

    expect(result.outcome).toBe("applied");
    if (result.outcome !== "applied") {
      throw new Error("expected the attack to be applied");
    }
    expect(result.state.energy.green).toBe(0);
    expect(result.state.energy.red).toBe(0);
    expect(result.effects).not.toContainEqual(
      expect.objectContaining({ type: "planet-bonus-claimed" }),
    );
  });
});
