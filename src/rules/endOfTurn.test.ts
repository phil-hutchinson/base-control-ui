import { describe, expect, it } from "vitest";
import { squareFromName, squareName, type Square } from "./board";
import { runEndOfTurn, type NodeReplacedEffect } from "./endOfTurn";
import type { ShipId } from "./fleet";
import { legalNodePool } from "./nodePlacement";
import { PLANETS } from "./planets";
import {
  type GameState,
  type Ship,
  type NodeStatus,
  nodeSquares,
  startingGameState,
} from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { applyPassGuard } from "./ply";
import type { PowerLevel } from "./power";
import {
  NODE_CAPACITY,
  NODE_COUNT,
  PRESSURE_CAP,
  STARTING_PRESSURE,
  type NodeState,
} from "./nodes";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<Record<string, readonly [NodeState, number]>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, [state, level]]) => [
      name,
      { state, level },
    ]),
  );
}

function buildState(config: {
  ships?: readonly Ship[];
  nodes?: Readonly<Record<string, readonly [NodeState, number]>>;
  sideToMove?: "green" | "red";
  plyNumber?: number;
  randomSeed?: number;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: config.randomSeed ?? 1,
    openingSeed: config.randomSeed ?? 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

describe("runEndOfTurn — step 1, the planet gain (§3.1, §4.1)", () => {
  const PLANET_SQUARE_NAME = squareName(PLANETS[0]);
  const OTHER_PLANET_SQUARE_NAME = squareName(PLANETS[1]);

  it("gains 2 for a ship charging alone on a planet", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 2)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(4);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 4,
      amount: 2,
    });
  });

  it("gains 1 each for two ships charging at once", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [
        ship("green-1", "green", PLANET_SQUARE_NAME, 2),
        ship("green-2", "green", OTHER_PLANET_SQUARE_NAME, 3),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(3);
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(4);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 3,
      amount: 1,
    });
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-2",
      side: "green",
      square: squareFromName(OTHER_PLANET_SQUARE_NAME),
      power: 4,
      amount: 1,
    });
  });

  it("excludes a ship already at the maximum from the count, so it neither gains nor denies a lone shipmate the double rate", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [
        ship("green-1", "green", PLANET_SQUARE_NAME, 4),
        ship("green-2", "green", OTHER_PLANET_SQUARE_NAME, 6),
      ],
    });

    const result = runEndOfTurn(state);

    // green-2 is already full, so it does not count towards the charging
    // total: green-1 is the only ship actually charging, and takes the lone
    // rate of 2, with no cap to bite.
    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(6);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 6,
      amount: 2,
    });
    expect(
      result.effects.filter((effect) => effect.type === "power-gained"),
    ).toHaveLength(1);
  });

  it("caps the double rate at the maximum, reporting only the amount that actually landed", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 5)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(PLANET_SQUARE_NAME),
      power: 6,
      amount: 1,
    });
  });

  it("takes the charging count once, at the start of the pass, so a ship reaching the maximum mid-pass does not raise the rate for the ship after it", () => {
    // Two ships charging at the pass's start means the rate is 1 for both,
    // fleet order first. green-1 reaches the maximum on its own point, which
    // would leave green-2 as the only ship still below it if the count were
    // taken again — the fixed-at-entry count means green-2 still only gains
    // 1, not 2.
    const state = buildState({
      sideToMove: "green",
      ships: [
        ship("green-1", "green", PLANET_SQUARE_NAME, 5),
        ship("green-2", "green", OTHER_PLANET_SQUARE_NAME, 4),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(5);
    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-2",
      side: "green",
      square: squareFromName(OTHER_PLANET_SQUARE_NAME),
      power: 5,
      amount: 1,
    });
  });

  it("leaves a ship already at 6 power on a planet at 6 and raises no effect for it", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 6)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "green-1")?.power).toBe(6);
    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });

  it("collects no energy for a ship recovering on a planet", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("green-1", "green", PLANET_SQUARE_NAME, 2)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("gains nothing for a ship of the other side sitting on a planet this turn", () => {
    const state = buildState({
      sideToMove: "green",
      ships: [ship("red-1", "red", PLANET_SQUARE_NAME, 2)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.ships.find((s) => s.id === "red-1")?.power).toBe(2);
    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 1, nodes no longer touch power (§4.1)", () => {
  it("leaves a ship holding a charged node with the power it had, however long it holds it, while still collecting energy", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 1],
        K5: ["inactive", 1],
        L8: ["charged", 1],
        E11: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 3),
        ship("green-2", "green", "K5", 3),
        ship("green-3", "green", "D2", 3),
        ship("green-4", "green", "L8", 0),
        ship("green-5", "green", "H12", 4),
        ship("red-1", "red", "E11", 3),
      ],
    });

    const result = runEndOfTurn(state);

    const shipPower = (id: ShipId): PowerLevel | undefined =>
      result.state.ships.find((s) => s.id === id)?.power;

    expect(shipPower("green-1")).toBe(3);
    expect(shipPower("green-2")).toBe(3);
    expect(shipPower("green-3")).toBe(3);
    expect(shipPower("green-4")).toBe(0);
    expect(shipPower("green-5")).toBe(4);
    expect(shipPower("red-1")).toBe(3);

    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
    expect(result.effects[0]).toEqual({
      type: "energy-collected",
      side: "green",
      amount: 3,
      newTotal: 3,
      squares: [squareFromName("H8"), squareFromName("L8")],
    });
    // Step 4: the board is one node short of four, and K5 is the only
    // inactive node, so it is charged deterministically — the draw needs no
    // choice among a pool of one. Every charged node's level is small (1),
    // so step 3's drain draw never reaches capacity and adds no effect of
    // its own.
    expect(result.effects).toContainEqual({
      type: "node-charged",
      square: squareFromName("K5"),
    });
  });

  it("leaves a ship on a depleted node with the power it had, while still paying the energy penalty", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["depleted", 1],
        K5: ["inactive", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "K5", 2),
        ship("green-3", "green", "D2", 2),
        ship("red-1", "red", "H8", 2),
      ],
    });

    const result = runEndOfTurn(state);

    const shipPower = (id: ShipId): PowerLevel | undefined =>
      result.state.ships.find((s) => s.id === id)?.power;

    expect(shipPower("green-1")).toBe(2);
    expect(shipPower("green-2")).toBe(2);
    expect(shipPower("green-3")).toBe(2);
    expect(shipPower("red-1")).toBe(2);

    expect(
      result.effects.some((effect) => effect.type === "power-gained"),
    ).toBe(false);
  });

  it("reports only the planet gain when one ship recovers on a planet while another holds a charged node", () => {
    const planetSquareName = squareName(PLANETS[0]);
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [
        ship("green-1", "green", planetSquareName, 2),
        ship("green-2", "green", "H8", 3),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "power-gained",
      shipId: "green-1",
      side: "green",
      square: squareFromName(planetSquareName),
      power: 4,
      amount: 2,
    });
    expect(result.state.ships.find((s) => s.id === "green-2")?.power).toBe(3);
  });
});

describe("runEndOfTurn — step 3, drain (§8.3)", () => {
  it("rises an empty node's drain by 1, 2 or 3, and never anything else", () => {
    const observed = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const state = buildState({
        nodes: { H8: ["charged", 0] },
        randomSeed: seed,
      });
      const result = runEndOfTurn(state);
      const level = result.state.nodes.H8.level;
      expect([1, 2, 3]).toContain(level);
      observed.add(level);
    }
    expect(observed).toEqual(new Set([1, 2, 3]));
  });

  it("rises a held node's drain by 3, 4, 5 or 6, and never anything else, whichever side the ship belongs to", () => {
    for (const side of ["green", "red"] as const) {
      const observed = new Set<number>();
      for (let seed = 1; seed <= 300; seed++) {
        const state = buildState({
          nodes: { H8: ["charged", 0] },
          ships: [ship("ship-1", side, "H8", 4)],
          randomSeed: seed,
        });
        const result = runEndOfTurn(state);
        const level = result.state.nodes.H8.level;
        expect([3, 4, 5, 6]).toContain(level);
        observed.add(level);
      }
      expect(observed).toEqual(new Set([3, 4, 5, 6]));
    }
  });

  it("goes depleted, carrying its level unclamped, once drain reaches or passes capacity, trapping the ship on it (§8.5)", () => {
    // Any drawn amount (empty table's minimum is 1) crosses capacity from
    // NODE_CAPACITY - 1, so this is deterministic without pinning a seed.
    const state = buildState({
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
      ships: [ship("green-1", "green", "H8", 1)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(result.state.nodes.H8.level).toBeGreaterThanOrEqual(NODE_CAPACITY);
    expect(result.effects).toEqual([
      {
        type: "energy-collected",
        side: "green",
        amount: 1,
        newTotal: 1,
        squares: [squareFromName("H8")],
      },
      { type: "node-ran-out", square: squareFromName("H8") },
      {
        type: "ship-trapped",
        shipId: "green-1",
        side: "green",
        square: squareFromName("H8"),
      },
    ]);
    // Holding a charged node no longer costs power (§4.1), so green's own
    // ship is untouched by step 1 even as step 3 spends the node out from
    // under it in the same sequence — it simply stays there, trapped, at
    // the power it started with.
    const untouchedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(untouchedShip?.power).toBe(1);
    expect(untouchedShip?.square).toEqual(squareFromName("H8"));
  });

  it("goes depleted with nothing further to report when the node was empty", () => {
    const state = buildState({
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(result.effects).toEqual([
      { type: "node-ran-out", square: squareFromName("H8") },
    ]);
  });

  it("stays charged, unaffected, when drain is nowhere near capacity", () => {
    const state = buildState({
      nodes: { H8: ["charged", 0] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("charged");
    expect(
      result.effects.some((effect) => effect.type === "node-ran-out"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — lifetimes (§8.3)", () => {
  /** Drives a single charged node from `startLevel` until it goes depleted, counting plies. */
  function pliesUntilDepleted(
    startLevel: number,
    seed: number,
    held: boolean,
  ): number {
    let state = buildState({
      nodes: { H8: ["charged", startLevel] },
      ships: held ? [ship("green-1", "green", "H8", 4)] : [],
      randomSeed: seed,
    });
    let plies = 0;
    for (;;) {
      const result = runEndOfTurn(state);
      plies += 1;
      if (result.state.nodes.H8.state === "depleted") {
        return plies;
      }
      state = result.state;
    }
  }

  it("holds a node from the ply it is charged for about 13 plies", () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const average =
      SEEDS.reduce((sum, seed) => sum + pliesUntilDepleted(0, seed, true), 0) /
      SEEDS.length;

    expect(average).toBeGreaterThan(9);
    expect(average).toBeLessThan(17);
  });

  it("leaves a node nobody visits running for about 28 plies", () => {
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const average =
      SEEDS.reduce((sum, seed) => sum + pliesUntilDepleted(0, seed, false), 0) /
      SEEDS.length;

    expect(average).toBeGreaterThan(21);
    expect(average).toBeLessThan(36);
  });
});

describe("runEndOfTurn — step 6, retirement and replacement (§8.2, §3.2)", () => {
  it("retires a depleted node once its level reaches zero or below, replacing it with one new inactive node at pressure 1", () => {
    // The recovery table's minimum draw is 4, so a level of 4 is guaranteed
    // to reach zero or below on a single draw, regardless of seed.
    const state = buildState({
      nodes: { H8: ["depleted", 4] },
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toHaveLength(1);
    const [effect] = result.effects;
    if (effect.type !== "node-replaced") {
      throw new Error(`expected a node-replaced effect, got "${effect.type}"`);
    }
    expect(squareName(effect.retiredSquare)).toBe("H8");
    const newName = squareName(effect.newSquare);
    expect(newName).not.toBe("H8");

    expect(result.state.nodes.H8).toBeUndefined();
    expect(Object.keys(result.state.nodes)).toEqual([newName]);
    expect(result.state.nodes[newName]).toEqual({
      state: "inactive",
      level: STARTING_PRESSURE,
    });
  });

  it("draws the replacement from a square legal under §3.2 given the board at that moment, and never the retiring node's own square", () => {
    const state = buildState({
      nodes: {
        H8: ["depleted", 4],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        L8: ["charged", 1],
        D8: ["charged", 1],
      },
      ships: [ship("green-1", "green", "A1"), ship("red-1", "red", "O15")],
    });

    const result = runEndOfTurn(state);

    const replaced = result.effects.find(
      (effect): effect is NodeReplacedEffect => effect.type === "node-replaced",
    );
    if (replaced === undefined) {
      throw new Error("expected a node-replaced effect");
    }
    expect(squareName(replaced.retiredSquare)).toBe("H8");
    expect(squareName(replaced.newSquare)).not.toBe("H8");

    // Legal given the board as it stood the instant before the draw: H8
    // already removed, the surviving nodes and the ships' squares (ships
    // never move during end-of-turn, so these are also where they started).
    const survivingNodeSquares = nodeSquares(result.state).filter(
      (square) => squareName(square) !== squareName(replaced.newSquare),
    );
    const pool = legalNodePool(
      survivingNodeSquares,
      result.state.ships.map((s) => s.square),
      replaced.retiredSquare,
    );
    expect(pool.map(squareName)).toContain(squareName(replaced.newSquare));
  });

  it("keeps the node count at twelve across a retirement", () => {
    const chargedNames = ["C3", "E3", "G3", "I3", "K3"];
    const depletedName = "M3";
    const inactiveNames = ["C5", "E5", "G5", "I5", "K5", "M5"];
    const state = buildState({
      nodes: {
        ...Object.fromEntries(
          chargedNames.map((name) => [name, ["charged", 1] as const]),
        ),
        // The recovery table's minimum draw is 4, guaranteeing retirement.
        [depletedName]: ["depleted", 4],
        ...Object.fromEntries(
          inactiveNames.map((name) => [name, ["inactive", 10] as const]),
        ),
      },
    });
    expect(Object.keys(state.nodes)).toHaveLength(NODE_COUNT);

    const result = runEndOfTurn(state);

    expect(result.state.nodes[depletedName]).toBeUndefined();
    expect(Object.keys(result.state.nodes)).toHaveLength(NODE_COUNT);
  });

  it("handles two retirements in the same sequence one after another, in board order, so the second replacement lands beside neither the first nor any surviving node", () => {
    const state = buildState({
      nodes: {
        H8: ["depleted", 4],
        K5: ["depleted", 4],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    const replacements = result.effects.filter(
      (effect): effect is NodeReplacedEffect => effect.type === "node-replaced",
    );
    expect(replacements).toHaveLength(2);
    // Board order: K5 (row 5) is processed before H8 (row 8).
    expect(
      replacements.map((effect) => squareName(effect.retiredSquare)),
    ).toEqual(["K5", "H8"]);

    expect(result.state.nodes.H8).toBeUndefined();
    expect(result.state.nodes.K5).toBeUndefined();
    expect(Object.keys(result.state.nodes)).toHaveLength(5);

    const finalSquares = nodeSquares(result.state);
    const isAdjacent = (a: Square, b: Square): boolean =>
      Math.abs(a.row - b.row) <= 1 &&
      Math.abs(
        "ABCDEFGHIJKLMNO".indexOf(a.column) -
          "ABCDEFGHIJKLMNO".indexOf(b.column),
      ) <= 1;
    for (const square of finalSquares) {
      const others = finalSquares.filter(
        (other) => squareName(other) !== squareName(square),
      );
      expect(others.some((other) => isAdjacent(square, other))).toBe(false);
    }
  });

  it("lets a later replacement in the same sequence land on the square an earlier retirement just vacated", () => {
    // Seed 6, found by search: D3 (board order's first of the two) retires
    // and is replaced at J8, then H8 retires and is replaced at D3 itself —
    // the square D3's own retirement just freed. Only the square a node's
    // own retirement vacates is excluded from that node's own draw; a
    // square freed earlier in the same sequence is not excluded from a
    // later one.
    const state = buildState({
      nodes: {
        D3: ["depleted", 4],
        H8: ["depleted", 4],
        K12: ["charged", 1],
        K13: ["charged", 1],
        M6: ["charged", 1],
      },
      randomSeed: 6,
    });

    const result = runEndOfTurn(state);

    const replacements = result.effects.filter(
      (effect): effect is NodeReplacedEffect => effect.type === "node-replaced",
    );
    expect(
      replacements.map((effect) => squareName(effect.retiredSquare)),
    ).toEqual(["D3", "H8"]);
    expect(squareName(replacements[0].newSquare)).toBe("J8");
    expect(squareName(replacements[1].newSquare)).toBe("D3");
    expect(result.state.nodes.D3.state).toBe("inactive");
    expect(result.state.nodes.H8).toBeUndefined();
  });

  it("does not retire a node that only went depleted during this very sequence", () => {
    // H8's level guarantees it crosses capacity in step 3 (see the drain
    // tests above): it is genuinely `charged`, not `depleted`, at the start
    // of this state, so `runEndOfTurn` derives an empty depleted-before-ply
    // set on its own and step 6 must not touch H8 even though it is
    // depleted by the time step 6 runs.
    const state = buildState({
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(
      result.effects.some((effect) => effect.type === "node-replaced"),
    ).toBe(false);
    // It first has a chance to retire at the end of the next ply, once it
    // truly was depleted when that one began — `result.state` genuinely has
    // H8 depleted, so this second call derives it into the set on its own.
    const nextResult = runEndOfTurn(result.state);
    expect(
      nextResult.state.nodes.H8 === undefined ||
        nextResult.state.nodes.H8.level < result.state.nodes.H8.level,
    ).toBe(true);
  });

  it("retires a node ended at half capacity in roughly half the plies a full one takes", () => {
    function pliesToRetire(startLevel: number, seed: number): number {
      let state = buildState({
        nodes: { H8: ["depleted", startLevel] },
        randomSeed: seed,
      });
      let plies = 0;
      for (;;) {
        const result = runEndOfTurn(state);
        plies += 1;
        if (result.state.nodes.H8 === undefined) {
          return plies;
        }
        state = result.state;
      }
    }

    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const averageHalf =
      SEEDS.reduce((sum, seed) => sum + pliesToRetire(30, seed), 0) /
      SEEDS.length;
    const averageFull =
      SEEDS.reduce((sum, seed) => sum + pliesToRetire(60, seed), 0) /
      SEEDS.length;

    expect(averageHalf).toBeGreaterThan(averageFull * 0.3);
    expect(averageHalf).toBeLessThan(averageFull * 0.7);
  });

  it("keeps the two clocks symmetric across a retirement: a replacement is inactive through the whole of the next turn, first charged in that turn's draw, and first drains the turn after that", () => {
    // H8 is guaranteed to retire this ply (level 4); F2 is guaranteed to run
    // out this ply (level NODE_CAPACITY - 1, empty). Both are genuine at the
    // start of this state, so `runEndOfTurn` derives the right
    // depleted-before-ply set on its own.
    const turnN = buildState({
      nodes: {
        H8: ["depleted", 4],
        F2: ["charged", NODE_CAPACITY - 1],
      },
    });

    const afterTurnN = runEndOfTurn(turnN);

    expect(afterTurnN.state.nodes.F2.state).toBe("depleted");
    expect(
      afterTurnN.effects.some((effect) => effect.type === "node-charged"),
    ).toBe(false);
    const replaced = afterTurnN.effects.find(
      (effect): effect is NodeReplacedEffect => effect.type === "node-replaced",
    );
    if (replaced === undefined) {
      throw new Error("expected a node-replaced effect");
    }
    const replacementName = squareName(replaced.newSquare);
    // Untouched by turn N's own step 5, which already ran before step 6
    // wrote it.
    expect(afterTurnN.state.nodes[replacementName]).toEqual({
      state: "inactive",
      level: STARTING_PRESSURE,
    });

    // Turn N+1: the replacement is the board's only inactive node, so the
    // shortfall (F2 is depleted, nothing charged) charges it deterministically.
    const afterTurnNPlus1 = runEndOfTurn(afterTurnN.state);
    expect(afterTurnNPlus1.effects).toContainEqual({
      type: "node-charged",
      square: replaced.newSquare,
    });
    expect(afterTurnNPlus1.state.nodes[replacementName].state).toBe("charged");

    // Turn N+2: now charged, it first drains.
    const afterTurnNPlus2 = runEndOfTurn(afterTurnNPlus1.state);
    expect(afterTurnNPlus2.state.nodes[replacementName].level).toBeGreaterThan(
      afterTurnNPlus1.state.nodes[replacementName].level,
    );
  });
});

describe("runEndOfTurn — the trap: ship-trapped and ship-freed (§7, §8.1, §8.5)", () => {
  it("reports node-replaced then ship-freed, keeping the freed ship's square and power, when a retiring node had a ship on it", () => {
    // The recovery table's minimum draw is 4, so a level of 4 is guaranteed
    // to retire on a single draw, regardless of seed.
    const state = buildState({
      nodes: { H8: ["depleted", 4] },
      ships: [ship("green-1", "green", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.findIndex((effect) => effect.type === "node-replaced"),
    ).toBe(0);
    expect(result.effects[1]).toEqual({
      type: "ship-freed",
      shipId: "green-1",
      side: "green",
      square: squareFromName("H8"),
    });
    const freedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(freedShip?.square).toEqual(squareFromName("H8"));
    expect(freedShip?.power).toBe(3);
  });

  it("reports no ship-freed when a retiring node had no ship on it", () => {
    const state = buildState({
      nodes: { H8: ["depleted", 4] },
    });

    const result = runEndOfTurn(state);

    expect(result.effects.some((effect) => effect.type === "ship-freed")).toBe(
      false,
    );
  });

  it("does not free the ship a node traps in step 3 of the same sequence — step 6 only touches nodes depleted before the ply began", () => {
    // Any drawn amount (empty table's minimum is 1) crosses capacity from
    // NODE_CAPACITY - 1, so H8 is guaranteed to go depleted in step 3 here,
    // never having been depleted before this ply began.
    const state = buildState({
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
      ships: [ship("green-1", "green", "H8", 1)],
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8.state).toBe("depleted");
    expect(
      result.effects.some((effect) => effect.type === "ship-trapped"),
    ).toBe(true);
    expect(result.effects.some((effect) => effect.type === "ship-freed")).toBe(
      false,
    );
    expect(
      result.effects.some((effect) => effect.type === "node-replaced"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 4, the charge draw never charges a node that only appears in step 6 of the same sequence (§8.6 step ordering)", () => {
  it("leaves the board with nothing charged when the only inactive candidate is a node retiring this very ply", () => {
    // H8 is guaranteed to retire this ply (level 4, see above); F2 is
    // guaranteed to run out this ply (level NODE_CAPACITY - 1, empty). H8 is
    // genuinely depleted, and F2 genuinely charged, before this ply begins,
    // so `runEndOfTurn` derives the right depleted-before-ply set on its own.
    const state = buildState({
      nodes: {
        H8: ["depleted", 4],
        F2: ["charged", NODE_CAPACITY - 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toBeUndefined();
    expect(result.state.nodes.F2.state).toBe("depleted");
    expect(result.effects).toContainEqual({
      type: "node-ran-out",
      square: squareFromName("F2"),
    });
    expect(
      result.effects.some((effect) => effect.type === "node-replaced"),
    ).toBe(true);
    expect(
      result.effects.some((effect) => effect.type === "node-charged"),
    ).toBe(false);
  });
});

describe("runEndOfTurn — step 5, pressure (§8.2)", () => {
  it("gains a point of pressure every ply it stays inactive", () => {
    // Four other nodes are already charged so the board is not short and
    // H8 cannot itself be drawn by step 4 — this isolates step 5.
    const state = buildState({
      nodes: {
        H8: ["inactive", 10],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        L8: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({
      state: "inactive",
      level: 11,
    });
  });

  it("stops at the pressure cap and never exceeds it", () => {
    const state = buildState({
      nodes: {
        H8: ["inactive", PRESSURE_CAP],
        F2: ["charged", 1],
        J2: ["charged", 1],
        B4: ["charged", 1],
        L8: ["charged", 1],
      },
    });

    const result = runEndOfTurn(state);

    expect(result.state.nodes.H8).toEqual({
      state: "inactive",
      level: PRESSURE_CAP,
    });
  });
});

describe("runEndOfTurn — step 2, the energy collection (§8.4)", () => {
  it("emits no effect and leaves both totals unchanged when nothing is held", () => {
    // Depleted rather than inactive, so step 4's charge draw has no pool to
    // draw these two from and this stays a pure test of step 2 alone.
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["depleted", 0], K5: ["depleted", 0] },
      ships: [ship("green-1", "green", "D2")],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.filter((effect) => effect.type !== "node-replaced"),
    ).toEqual([]);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("pays the side that just played and leaves the other side's total untouched", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
  });

  it("pays for three held nodes, carrying the count, the amount, the new total and the squares", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: {
        H8: ["charged", 1],
        K5: ["charged", 1],
        L8: ["charged", 1],
      },
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("green-2", "green", "K5", 0),
        ship("green-3", "green", "L8", 0),
      ],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 6,
      newTotal: 6,
      squares: [
        squareFromName("K5"),
        squareFromName("H8"),
        squareFromName("L8"),
      ],
    });
    expect(result.state.energy).toEqual({ green: 6, red: 0 });
  });

  it("pays for a node whose drain reaches capacity at the end of this very turn (before step 3 ticks)", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", NODE_CAPACITY - 1] },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
    expect(result.state.nodes.H8.state).toBe("depleted");
  });

  it("collects energy for a node held regardless of the holding ship's own power (§4.1: holding a node no longer touches it)", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [ship("green-1", "green", "H8", 0)],
    });

    const result = runEndOfTurn(state);

    expect(result.effects).toContainEqual({
      type: "energy-collected",
      side: "green",
      amount: 1,
      newTotal: 1,
      squares: [squareFromName("H8")],
    });
    const ship1 = result.state.ships.find((s) => s.id === "green-1");
    expect(ship1?.power).toBe(0);
  });

  it("pays this side nothing for a node held by the opponent", () => {
    const state = buildState({
      sideToMove: "green",
      nodes: { H8: ["charged", 1] },
      ships: [ship("red-1", "red", "H8", 3)],
    });

    const result = runEndOfTurn(state);

    expect(
      result.effects.some((effect) => effect.type === "energy-collected"),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 0, red: 0 });
  });

  it("never lowers a total: standing on several depleted nodes costs nothing", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: {
          H8: ["depleted", 0],
          K5: ["depleted", 0],
          L8: ["depleted", 0],
          D8: ["depleted", 0],
        },
        ships: [
          ship("green-1", "green", "H8", 0),
          ship("green-2", "green", "K5", 0),
          ship("green-3", "green", "L8", 0),
          ship("green-4", "green", "D8", 0),
        ],
      }),
      energy: { green: 3, red: 7 },
    };

    const result = runEndOfTurn(state);

    expect(result.state.energy.green).toBeGreaterThanOrEqual(3);
    expect(result.state.energy.red).toBeGreaterThanOrEqual(7);
    for (const effect of result.effects) {
      if (effect.type === "energy-collected") {
        expect(effect.newTotal).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("runEndOfTurn — a passed ply still settles both directions in full (§8.6 runs in full for a pass)", () => {
  it("pays the side that passes while standing on a charged node, through applyPassGuard", () => {
    // green-1 sits on K5, a charged node, having already acted this ply: it
    // has no move left (already acted) and no enemy stands anywhere near it
    // to attack, so it passes — but §8.6 still runs in full for that passed
    // turn, and green is still standing on the node.
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { K5: ["charged", 1] },
        ships: [ship("green-1", "green", "K5", 1)],
      }),
      actedThisPly: ["green-1" as ShipId],
      actionsRemaining: 1,
    };

    const result = applyPassGuard(state);

    expect(result.effect?.type).toBe("ply-passed");
    // Holding a charged node no longer costs power (§4.1), so green-1's
    // power is untouched by the pass; only the energy collection fires.
    expect(result.effect?.endOfTurn).toEqual([
      {
        type: "energy-collected",
        side: "green",
        amount: 1,
        newTotal: 1,
        squares: [squareFromName("K5")],
      },
    ]);
    expect(result.state.energy).toEqual({ green: 1, red: 0 });
    const passedShip = result.state.ships.find((s) => s.id === "green-1");
    expect(passedShip?.power).toBe(1);
  });

  it("costs the side that passes nothing while standing on a depleted node, through applyPassGuard", () => {
    const state = {
      ...buildState({
        sideToMove: "green",
        nodes: { K5: ["depleted", 0] },
        ships: [ship("green-1", "green", "K5", 1)],
      }),
      actedThisPly: ["green-1" as ShipId],
      actionsRemaining: 1,
      energy: { green: 5, red: 0 },
    };

    const result = applyPassGuard(state);

    expect(result.effect?.type).toBe("ply-passed");
    expect(
      result.effect?.endOfTurn.some(
        (effect) =>
          effect.type === "energy-collected" || effect.type === "power-gained",
      ),
    ).toBe(false);
    expect(result.state.energy).toEqual({ green: 5, red: 0 });
  });
});

describe("runEndOfTurn — the opening board does not fall into lockstep (§8.1)", () => {
  it("does not run all four opening nodes out on the same ply", () => {
    const SEEDS = [20260828, 20260829, 20260830, 20260831, 20260832];
    const PLIES_TO_RUN = 60;

    for (const seed of SEEDS) {
      let state = startingGameState(seed, DEFAULT_GAME_LENGTH_ROUNDS);
      // Whichever nodes the game opened with, not a fixed list.
      const openingSquares = Object.keys(state.nodes).filter(
        (name) => state.nodes[name]?.state === "charged",
      );
      const runOutPly = new Map<string, number>();

      for (let ply = 1; ply <= PLIES_TO_RUN; ply++) {
        const result = runEndOfTurn(state);
        for (const effect of result.effects) {
          if (effect.type === "node-ran-out") {
            const name = squareName(effect.square);
            if (openingSquares.includes(name) && !runOutPly.has(name)) {
              runOutPly.set(name, ply);
            }
          }
        }
        state = { ...result.state, plyNumber: result.state.plyNumber + 1 };
      }

      const plies = openingSquares
        .filter((name) => runOutPly.has(name))
        .map((name) => runOutPly.get(name));
      if (plies.length === openingSquares.length) {
        expect(new Set(plies).size).toBeGreaterThan(1);
      }
    }
  });
});
